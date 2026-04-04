"""
attribution_engine.py
Ranks nodes and identifies the most likely command node.
Uses weighted scoring based on network topology and behavioral fingerprints.

ML Integration:
  - XGBoost model for C2 probability scoring
  - Graph heuristics for topology-based attribution
  - Explainable AI: every prediction includes human-readable reasons

Output Format:
  {
    "command_node": "NODE-XXX",
    "confidence_score": 0.92,
    "reasons": ["High centrality", "Repeated fingerprint", ...],
    "top_candidates": [{"node": "...", "score": ...}]
  }
"""

from __future__ import annotations

import os
import sys
import joblib
import pandas as pd
import numpy as np
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, Any

# ──────────────────────────────────────────────
# ATTRIBUTION WEIGHTS (tuned for best results)
# ──────────────────────────────────────────────
W1_OUT_DEGREE = 0.4
W2_FINGERPRINT_MATCHES = 0.35
W3_CENTRALITY = 0.25

# ML model blending ratio (60% ML, 40% heuristics when model available)
ML_WEIGHT = 0.6
HEURISTIC_WEIGHT = 0.4

# ──────────────────────────────────────────────
# ML MODEL LOADING WITH VALIDATION
# ──────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'c2_ranking_model.pkl')
LOGS_PATH = os.path.join(os.path.dirname(__file__), 'data', 'system_logs.csv')

XGB_MODEL: Optional[Any] = None
MODEL_LOADED_SUCCESSFULLY = False


def _validate_model(model: Any) -> bool:
    """Validate that the loaded model has required methods."""
    required_methods = ['predict_proba', 'predict']
    return all(hasattr(model, method) for method in required_methods)


def _load_ml_model() -> Optional[Any]:
    """Load ML model with validation and error handling."""
    global XGB_MODEL, MODEL_LOADED_SUCCESSFULLY
    
    if not os.path.exists(MODEL_PATH):
        print(f"[ATTRIBUTION] INFO: ML model not found at {MODEL_PATH}, using heuristics only", file=sys.stderr)
        return None
    
    try:
        model = joblib.load(MODEL_PATH)
        if _validate_model(model):
            MODEL_LOADED_SUCCESSFULLY = True
            print(f"[ATTRIBUTION] ML model loaded and validated successfully", file=sys.stderr)
            return model
        else:
            print(f"[ATTRIBUTION] WARN: ML model missing required methods, using heuristics", file=sys.stderr)
            return None
    except Exception as e:
        print(f"[ATTRIBUTION] WARN: Could not load ML model: {e}", file=sys.stderr)
        return None


# Initialize model on module load
XGB_MODEL = _load_ml_model()


def _build_explainable_reasons(
    node_id: str,
    out_degree: int,
    fp_matches: int,
    centrality: float,
    ml_probability: float,
    intervals: list[float],
) -> list[str]:
    """
    Generate human-readable attribution reasons for explainability.
    Each reason explains WHY the node is considered a command node candidate.
    """
    reasons = []
    
    # ML-based explanation (most important)
    if MODEL_LOADED_SUCCESSFULLY and ml_probability > 0.65:
        if ml_probability > 0.85:
            reasons.append(f"[ML] High C2 confidence: {ml_probability:.0%} match to known attack patterns")
        elif ml_probability > 0.75:
            reasons.append(f"[ML] Elevated C2 probability: {ml_probability:.0%} behavioral similarity")
        else:
            reasons.append(f"[ML] Moderate C2 signal: {ml_probability:.0%} pattern match")
    
    # Centrality-based explanations
    if centrality >= 0.3:
        reasons.append("Extremely high network centrality — primary communication hub")
    elif centrality >= 0.2:
        reasons.append("High centrality — significant control over network traffic")
    elif centrality >= 0.1:
        reasons.append("Moderate centrality — notable influence in graph")
    elif centrality >= 0.05:
        reasons.append("Elevated centrality position")
    
    # Fingerprint pattern explanations
    if fp_matches >= 20:
        reasons.append(f"Repeated fingerprint cluster ({fp_matches} matches) — strong automation signature")
    elif fp_matches >= 10:
        reasons.append(f"Multiple fingerprint matches ({fp_matches}) — consistent behavioral pattern")
    elif fp_matches >= 5:
        reasons.append(f"Fingerprint pattern detected ({fp_matches} matches)")
    elif fp_matches >= 3:
        reasons.append("Multiple fingerprint occurrences")
    
    # Timing consistency check (indicates automation/C2)
    if len(intervals) >= 3:
        span = max(intervals) - min(intervals) if intervals else float('inf')
        avg_interval = sum(intervals) / len(intervals)
        if span <= 2:
            reasons.append(f"Highly regular timing (±{span:.1f}s variance) — automated beacon behavior")
        elif span <= 5:
            reasons.append(f"Consistent timing pattern (avg: {avg_interval:.1f}s) — scripted activity")
        elif span <= 15:
            reasons.append("Moderately consistent request intervals")
    
    # Connection volume explanations
    if out_degree >= 50:
        reasons.append(f"Extremely high connection volume ({out_degree} outgoing) — command distribution hub")
    elif out_degree >= 25:
        reasons.append(f"High outgoing connections ({out_degree}) — significant target reach")
    elif out_degree >= 15:
        reasons.append(f"Significant connection count ({out_degree} targets)")
    elif out_degree >= 8:
        reasons.append("Notable outgoing connection activity")
    
    # Fallback if no specific reasons triggered
    if not reasons:
        reasons.append("Elevated network activity relative to baseline")
    
    return reasons


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

    # Build fingerprint match counts per node
    fp_matches_by_node = defaultdict(int)
    for fp in fingerprints:
        occurrences = int(fp.get("occurrences", 0))
        for node_id in fp.get("nodes", []):
            fp_matches_by_node[str(node_id)] += occurrences

    # Build outgoing interval data for timing analysis
    outgoing_intervals_by_node = defaultdict(list)
    outgoing_counts_by_node = defaultdict(int)
    for link in links:
        src = str(link.get("source", "")).strip()
        interval = link.get("interval", -1)
        count = int(link.get("count", 1))
        if src:
            outgoing_counts_by_node[src] += count
            if isinstance(interval, (int, float)) and interval >= 0:
                outgoing_intervals_by_node[src].append(float(interval))

    # --- PREPARE ML FEATURES ---
    node_stats = {}
    if XGB_MODEL and os.path.exists(LOGS_PATH):
        try:
            logs_df = pd.read_csv(LOGS_PATH)
            stats = logs_df.groupby('node_id').agg(
                avg_response_time=('response_time_ms', 'mean'),
                max_response_time=('response_time_ms', 'max'),
                log_count=('log_id', 'count'),
                error_count=('http_response_code', lambda x: (x >= 400).sum())
            ).to_dict(orient='index')
            node_stats = stats
        except Exception:
            pass # Fall back to heuristics if CSV fails to read

    candidates = []
    for node in nodes:
        node_id = str(node.get("node_id") or node.get("id") or "").strip()
        if not node_id:
            continue

        out_degree = int(node.get("out_degree", 0))
        fp_matches = int(fp_matches_by_node.get(node_id, 0))
        cent = float(centrality.get(node_id, 0.0))

        # Noise filter: ignore nodes with very weak signals
        if out_degree <= 0 and fp_matches <= 1:
            continue

        # --- ML PREDICTION ---
        ml_probability = 0.0
        if XGB_MODEL and MODEL_LOADED_SUCCESSFULLY and node_id in node_stats:
            try:
                ns = node_stats[node_id]
                features = np.array([[
                    ns.get('avg_response_time', 0),
                    ns.get('max_response_time', 0),
                    ns.get('log_count', 0),
                    ns.get('error_count', 0)
                ]])
                # Get probability of class 1 (is_infected = True)
                ml_probability = float(XGB_MODEL.predict_proba(features)[0][1])
            except Exception as e:
                print(f"[ATTRIBUTION] WARN: ML prediction failed for {node_id}: {e}", file=sys.stderr)
                ml_probability = 0.0

        # Calculate heuristic score
        heuristic_score = (out_degree * W1_OUT_DEGREE) + (fp_matches * W2_FINGERPRINT_MATCHES) + (cent * W3_CENTRALITY)

        # Blend ML and Heuristics (configurable weights)
        if XGB_MODEL and MODEL_LOADED_SUCCESSFULLY:
            score = (ml_probability * ML_WEIGHT) + (heuristic_score * HEURISTIC_WEIGHT)
        else:
            score = heuristic_score

        # Get timing intervals for this node
        intervals = outgoing_intervals_by_node.get(node_id, [])

        # Build explainable reasons using dedicated function
        reasons = _build_explainable_reasons(
            node_id=node_id,
            out_degree=out_degree,
            fp_matches=fp_matches,
            centrality=cent,
            ml_probability=ml_probability,
            intervals=intervals,
        )

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

    # Sort by score descending
    candidates.sort(key=lambda c: c["score"], reverse=True)
    top = candidates[0]

    # Calculate confidence based on score distribution
    max_score = candidates[0]["score"] if candidates else 1.0
    second_score = candidates[1]["score"] if len(candidates) > 1 else 0.0
    
    # Higher confidence if there's a clear winner
    score_gap = (max_score - second_score) / max_score if max_score > 0 else 0
    base_confidence = 0.55 + (max_score / (max_score + 3.0))
    confidence = min(0.99, round(base_confidence + (score_gap * 0.15), 2))

    # Build simplified top candidates for UI
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