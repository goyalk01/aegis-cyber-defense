"""
graph_engine.py
Builds graph-ready logs and a precomputed graph model for O(1) API reads.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
import hashlib


DEFAULT_TIMESTAMP = "1970-01-01T00:00:00Z"


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _safe_iso_timestamp(value: str | None) -> str:
    parsed = _parse_timestamp(value)
    if not parsed:
        return DEFAULT_TIMESTAMP
    return parsed.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _normalize_headers(headers: object) -> list[str]:
    if not isinstance(headers, list):
        return []
    cleaned = [str(h).strip().lower() for h in headers if str(h).strip()]
    # Deterministic ordering prevents noisy fingerprint drift.
    return sorted(cleaned)


def _derive_target_node(source_node: str, log_id: str, all_nodes: list[str]) -> str:
    if not all_nodes:
        return source_node

    seed = int(hashlib.md5(log_id.encode("utf-8")).hexdigest()[:8], 16)
    idx = seed % len(all_nodes)
    target = all_nodes[idx]
    if target == source_node and len(all_nodes) > 1:
        target = all_nodes[(idx + 1) % len(all_nodes)]
    return target


def build_graph_ready_logs(
    normalized_logs: list[dict],
    node_registry: list[dict],
    alerts: list[dict] | None = None,
) -> list[dict]:
    """
    Build strict graph-ready records:
    {source_node,target_node,timestamp,headers,user_agent,response_time_ms,interval}
    """
    registry_map = {
        str(node.get("node_id", "")).strip(): node
        for node in node_registry
        if str(node.get("node_id", "")).strip()
    }
    all_nodes = sorted(registry_map.keys())

    alerts_by_log_id = {}
    if alerts:
        alerts_by_log_id = {
            str(a.get("log_id", "")).strip(): a for a in alerts if str(a.get("log_id", "")).strip()
        }

    last_seen_ts_by_source: dict[str, datetime] = {}
    graph_logs: list[dict] = []
    missing_headers_count = 0

    for log in normalized_logs:
        source_node = str(log.get("node_id", "")).strip()
        log_id = str(log.get("log_id", "")).strip()
        if not source_node or not log_id:
            continue

        ts_iso = _safe_iso_timestamp(log.get("timestamp"))
        ts_obj = _parse_timestamp(ts_iso)

        node_meta = registry_map.get(source_node, {})
        user_agent = str(
            log.get("user_agent") or node_meta.get("user_agent") or "UNKNOWN-UA"
        ).strip() or "UNKNOWN-UA"

        raw_headers = log.get("headers")
        if not isinstance(raw_headers, list):
            missing_headers_count += 1
            raw_headers = [
                f"x-node:{source_node.lower()}",
                f"x-region:{str(log.get('region', 'unknown')).lower()}",
                f"x-schema:v{int(log.get('schema_version', -1))}",
            ]

        headers = _normalize_headers(raw_headers)
        response_time_ms = int(log.get("response_time_ms", -1)) if str(log.get("response_time_ms", "")).lstrip("-").isdigit() else -1

        prev_ts = last_seen_ts_by_source.get(source_node)
        if ts_obj and prev_ts:
            interval = max(int((ts_obj - prev_ts).total_seconds()), 0)
        elif ts_obj:
            interval = 0
        else:
            interval = -1

        if ts_obj:
            last_seen_ts_by_source[source_node] = ts_obj

        target_node = str(log.get("target_node") or "").strip()
        if not target_node:
            target_node = _derive_target_node(source_node, log_id, all_nodes)

        alert = alerts_by_log_id.get(log_id, {})

        graph_logs.append(
            {
                "log_id": log_id,
                "source_node": source_node,
                "target_node": target_node,
                "timestamp": ts_iso,
                "headers": headers,
                "user_agent": user_agent,
                "response_time_ms": response_time_ms,
                "interval": interval,
                "severity_score": float(alert.get("severity_score", 0)),
                "alert_level": str(alert.get("alert_level", "CLEAN")),
            }
        )

    if missing_headers_count > 0:
        print(f"[GRAPH_ENGINE] WARN: Missing headers fallback applied for {missing_headers_count} logs")

    return graph_logs


def build_graph_model(graph_logs: list[dict]) -> dict:
    """
    Build graph model with adjacency, edge metadata and centrality.
    """
    adjacency: dict[str, set[str]] = defaultdict(set)
    edge_accumulator: dict[tuple[str, str], dict] = {}
    node_severity: dict[str, float] = defaultdict(float)
    node_type: dict[str, str] = defaultdict(lambda: "CLEAN")

    level_rank = {"CLEAN": 0, "SUSPICIOUS": 1, "HIGH_RISK": 2, "ATTACK": 3}

    for item in graph_logs:
        src = str(item.get("source_node", "")).strip()
        tgt = str(item.get("target_node", "")).strip()
        if not src or not tgt:
            continue

        adjacency[src].add(tgt)
        adjacency.setdefault(tgt, set())

        key = (src, tgt)
        if key not in edge_accumulator:
            edge_accumulator[key] = {
                "source_node": src,
                "target_node": tgt,
                "user_agent": item.get("user_agent", "UNKNOWN-UA"),
                "headers": item.get("headers", []),
                "interval": item.get("interval", -1),
                "count": 0,
                "avg_response_time_ms": 0.0,
            }

        edge_accumulator[key]["count"] += 1
        rt = item.get("response_time_ms", -1)
        if isinstance(rt, (int, float)) and rt >= 0:
            prev = edge_accumulator[key]["avg_response_time_ms"]
            cnt = edge_accumulator[key]["count"]
            edge_accumulator[key]["avg_response_time_ms"] = round(((prev * (cnt - 1)) + rt) / cnt, 2)

        src_level = str(item.get("alert_level", "CLEAN"))
        src_severity = float(item.get("severity_score", 0))
        if src_severity >= node_severity[src]:
            node_severity[src] = src_severity
        if level_rank.get(src_level, 0) > level_rank.get(node_type[src], 0):
            node_type[src] = src_level

    all_nodes = sorted(adjacency.keys())
    total_nodes = len(all_nodes)

    centrality = {
        node: round((len(adjacency[node]) / total_nodes), 4) if total_nodes else 0.0
        for node in all_nodes
    }

    nodes = [
        {
            "id": node,
            "node_id": node,
            "out_degree": len(adjacency[node]),
            "centrality": centrality[node],
            "severity_score": round(node_severity.get(node, 0.0), 2),
            "node_type": node_type.get(node, "CLEAN"),
        }
        for node in all_nodes
    ]

    links = [
        {
            "source": src,
            "target": tgt,
            "count": data["count"],
            "weight": data["count"],
            "interval": data["interval"],
            "user_agent": data["user_agent"],
            "headers": data["headers"],
            "avg_response_time_ms": data["avg_response_time_ms"],
        }
        for (src, tgt), data in sorted(edge_accumulator.items(), key=lambda x: (x[0][0], x[0][1]))
    ]

    graph_dict = {node: sorted(list(neighbors)) for node, neighbors in adjacency.items()}

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_nodes": total_nodes,
        "total_edges": len(links),
        "graph_summary": {
            "total_nodes": total_nodes,
            "total_edges": len(links),
        },
        "graph": graph_dict,
        "edge_data": links,
        "centrality": centrality,
        "nodes": nodes,
        "links": links,
    }
