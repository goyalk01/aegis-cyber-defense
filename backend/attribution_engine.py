"""
attribution_engine.py
Ranks nodes and identifies the most likely command node.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone


W1_OUT_DEGREE = 0.4
W2_FINGERPRINT_MATCHES = 0.35
W3_CENTRALITY = 0.25


def detect_command_node(graph_payload: dict, fingerprint_payload: dict) -> dict:
    nodes = graph_payload.get("nodes", []) if isinstance(graph_payload, dict) else []
    links = graph_payload.get("links", []) if isinstance(graph_payload, dict) else []
    centrality = graph_payload.get("centrality", {}) if isinstance(graph_payload, dict) else {}

    fingerprints = (
        fingerprint_payload.get("fingerprints", [])
        if isinstance(fingerprint_payload, dict)
        else []
    )

    if not nodes:
        return {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "command_node": None,
            "confidence_score": 0.0,
            "reasons": ["No graph data available"],
            "candidates": [],
            "top_candidates": [],
        }

    fp_matches_by_node = defaultdict(int)
    for fp in fingerprints:
        occurrences = int(fp.get("occurrences", 0))
        for node_id in fp.get("nodes", []):
            fp_matches_by_node[str(node_id)] += occurrences

    outgoing_intervals_by_node = defaultdict(list)
    for link in links:
        src = str(link.get("source", "")).strip()
        interval = link.get("interval", -1)
        if src and isinstance(interval, (int, float)) and interval >= 0:
            outgoing_intervals_by_node[src].append(float(interval))

    candidates = []
    for node in nodes:
        node_id = str(node.get("node_id") or node.get("id") or "").strip()
        if not node_id:
            continue

        out_degree = int(node.get("out_degree", 0))
        fp_matches = int(fp_matches_by_node.get(node_id, 0))
        cent = float(centrality.get(node_id, 0.0))

        # Noise filter: ignore nodes with very weak signals.
        if out_degree <= 0 and fp_matches <= 1:
            continue

        score = (out_degree * W1_OUT_DEGREE) + (fp_matches * W2_FINGERPRINT_MATCHES) + (cent * W3_CENTRALITY)

        reasons = []
        if cent >= 0.2:
            reasons.append("High centrality")
        if fp_matches >= 2:
            reasons.append("Repeated fingerprint")

        intervals = outgoing_intervals_by_node.get(node_id, [])
        if len(intervals) >= 2:
            span = max(intervals) - min(intervals)
            if span <= 10:
                reasons.append("Consistent intervals")

        if not reasons:
            reasons.append("High outgoing connections")

        candidates.append(
            {
                "node_id": node_id,
                "score": round(score, 4),
                "out_degree": out_degree,
                "fingerprint_matches": fp_matches,
                "centrality": round(cent, 4),
                "reasons": reasons,
            }
        )

    if not candidates:
        return {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "command_node": None,
            "confidence_score": 0.0,
            "reasons": ["No strong command node signal found"],
            "candidates": [],
            "top_candidates": [],
        }

    candidates.sort(key=lambda c: c["score"], reverse=True)
    top = candidates[0]

    max_score = candidates[0]["score"] if candidates else 1.0
    confidence = min(0.99, round(0.55 + (max_score / (max_score + 2.0)), 2))

    top_candidates = [
        {"node": c["node_id"], "score": round(c["score"], 4)}
        for c in candidates[:3]
    ]

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "command_node": top["node_id"],
        "confidence_score": confidence,
        "reasons": top["reasons"],
        "candidates": candidates[:5],
        "top_candidates": top_candidates,
    }
