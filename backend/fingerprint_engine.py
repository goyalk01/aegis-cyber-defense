"""
fingerprint_engine.py
Builds behavioral fingerprints from graph-ready logs.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib


COMMON_USER_AGENT_MARKERS = (
    "mozilla/",
    "chrome/",
    "safari/",
    "edge/",
    "aegis-node/2.0",
)


def _interval_bucket(interval: int) -> str:
    if interval < 0:
        return "unknown"
    if interval == 0:
        return "zero"
    if interval <= 5:
        return "1_5s"
    if interval <= 30:
        return "6_30s"
    if interval <= 120:
        return "31_120s"
    return "121s_plus"


def _fingerprint_key(headers: list[str], user_agent: str, interval_bucket: str) -> str:
    payload = str(headers) + user_agent + str(interval_bucket)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _is_common_user_agent(ua: str) -> bool:
    lowered = ua.lower()
    return any(marker in lowered for marker in COMMON_USER_AGENT_MARKERS)


def build_fingerprint_clusters(
    graph_logs: list[dict],
    min_frequency: int = 2,
    common_ua_cutoff_ratio: float = 0.1,
) -> dict:
    """
    Build fingerprint clusters with noise filtering.
    """
    if not graph_logs:
        return {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_fingerprints": 0,
            "fingerprints": [],
            "node_fingerprint_counts": {},
        }

    ua_counts = Counter(str(log.get("user_agent", "UNKNOWN-UA")) for log in graph_logs)
    total_logs = len(graph_logs)

    clusters: dict[str, dict] = defaultdict(
        lambda: {
            "nodes": set(),
            "count": 0,
            "headers": [],
            "user_agents": Counter(),
            "interval_buckets": Counter(),
        }
    )
    node_fp_counts: dict[str, int] = Counter()

    for log in graph_logs:
        source_node = str(log.get("source_node", "")).strip()
        headers = log.get("headers") if isinstance(log.get("headers"), list) else []
        normalized_headers = [str(h).strip().lower() for h in headers if str(h).strip()]
        user_agent = str(log.get("user_agent", "UNKNOWN-UA")).strip() or "UNKNOWN-UA"
        bucket = _interval_bucket(int(log.get("interval", -1)))

        key = _fingerprint_key(normalized_headers, user_agent, bucket)

        clusters[key]["nodes"].add(source_node)
        clusters[key]["count"] += 1
        clusters[key]["headers"] = normalized_headers
        clusters[key]["user_agents"][user_agent] += 1
        clusters[key]["interval_buckets"][bucket] += 1
        node_fp_counts[source_node] += 1

    filtered = []
    for fp_key, data in clusters.items():
        if data["count"] < max(1, min_frequency):
            continue

        dominant_ua, dominant_count = data["user_agents"].most_common(1)[0]
        dominant_ratio = dominant_count / data["count"] if data["count"] else 0
        global_ua_ratio = ua_counts[dominant_ua] / total_logs if total_logs else 0

        # Noise filter: globally common + generic user-agent signatures.
        if _is_common_user_agent(dominant_ua) and global_ua_ratio >= common_ua_cutoff_ratio:
            continue

        confidence = min(
            0.99,
            round(0.45 + (0.05 * data["count"]) + (0.08 * len(data["nodes"])) + (0.1 * dominant_ratio), 2),
        )

        filtered.append(
            {
                "fingerprint_id": f"fp_{fp_key[:12]}",
                "fingerprint_key": fp_key,
                "occurrences": data["count"],
                "nodes": sorted([n for n in data["nodes"] if n]),
                "headers": data["headers"],
                "user_agent": dominant_ua,
                "interval_bucket": data["interval_buckets"].most_common(1)[0][0],
                "confidence": confidence,
            }
        )

    filtered.sort(key=lambda x: (x["occurrences"], x["confidence"]), reverse=True)

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_fingerprints": len(filtered),
        "fingerprints": filtered,
        "node_fingerprint_counts": dict(node_fp_counts),
    }
