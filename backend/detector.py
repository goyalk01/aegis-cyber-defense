"""
detector.py — AEGIS Detection Engine
Responsibility: Main orchestrator. Wires together evaluator functions,
applies priority logic, computes severity scores, and builds alert dicts.
ML anomaly detection runs as a first-class detection channel alongside rules.
Exposes: detect_all(normalized_logs) → List[Alert]
"""

import sys
import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from rules import (
    RULES,
    PRIORITY_ORDER,
    SEVERITY_BASE,
    SEVERITY_REASON_BONUS,
)
from evaluator import RULE_EVALUATORS


# --- LOAD ML MODEL ---
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'log_anomaly_model.pkl')
try:
    ISO_FOREST = joblib.load(MODEL_PATH)
    print(f"[DETECTOR] ML Anomaly Model loaded successfully.", file=sys.stderr)
except Exception as e:
    ISO_FOREST = None
    print(f"[DETECTOR] WARN: Could not load ML model: {e}", file=sys.stderr)


# ──────────────────────────────────────────────
# ML ANOMALY SCORE THRESHOLDS
# IsolationForest score_samples() returns negative scores.
# More negative = more anomalous.
# These thresholds are calibrated to the model's decision boundary.
# ──────────────────────────────────────────────
ML_ATTACK_SCORE     = -0.65   # score <= this → ATTACK-level anomaly
ML_HIGH_RISK_SCORE  = -0.62   # score <= this → HIGH_RISK anomaly
ML_SUSPICIOUS_SCORE = -0.56   # score <= this → SUSPICIOUS anomaly
# Above -0.56 → normal (no ML trigger)


# ──────────────────────────────────────────────
# RULE LEVEL SETS — pre-computed for O(1) lookup
# Includes both static rules AND ML synthetic rule IDs
# ──────────────────────────────────────────────

_ATTACK_RULE_IDS    = {r["id"] for r in RULES if r["level"] == "ATTACK"} | {"ml_anomaly_critical"}
_HIGH_RISK_RULE_IDS = {r["id"] for r in RULES if r["level"] == "HIGH_RISK"} | {"ml_anomaly_high"}
_SUSPICIOUS_RULE_IDS = {r["id"] for r in RULES if r["level"] == "SUSPICIOUS"} | {"ml_anomaly_suspicious"}
# INFO-level rules contribute reasons but do NOT affect alert level


def apply_rules(log: dict) -> dict[str, str]:
    triggered = {}
    for rule_id, evaluator_fn in RULE_EVALUATORS.items():
        try:
            fired, reason = evaluator_fn(log)
            if fired and reason:
                triggered[rule_id] = reason
        except Exception as e:
            print(
                f"[DETECTOR] WARN: Rule '{rule_id}' raised exception on log "
                f"'{log.get('log_id', '?')}' — {e}. Skipping rule.",
                file=sys.stderr,
            )
    return triggered


def _safe_float(val) -> float:
    """Helper to prevent ValueError on empty strings from CSVs"""
    try:
        if val is None or val == "":
            return 0.0
        return float(val)
    except:
        return 0.0


def apply_ml_detection(log: dict) -> dict[str, str]:
    """
    Run ML anomaly detection as an independent detection channel.
    Returns a dict of synthetic rule_id → reason (same format as apply_rules).
    Uses anomaly scores for granular severity classification:
      - Critical anomaly (score <= -0.65) → ml_anomaly_critical (ATTACK level)
      - High anomaly    (score <= -0.62) → ml_anomaly_high     (HIGH_RISK level)
      - Mild anomaly    (score <= -0.56) → ml_anomaly_suspicious (SUSPICIOUS level)
    """
    if not ISO_FOREST:
        return {}

    try:
        http_code = _safe_float(log.get("http_status", log.get("http_response_code", 200)))
        rt = _safe_float(log.get("response_time_ms", 0))
        load_val = _safe_float(log.get("load_val", 0))
        l_v1 = _safe_float(log.get("L_V1", 0))

        features = pd.DataFrame([{
            'http_response_code': http_code,
            'response_time_ms': rt,
            'load_val': load_val,
            'L_V1': l_v1,
        }])

        # Use score_samples for granular classification instead of binary predict
        anomaly_score = ISO_FOREST.score_samples(features)[0]

        if anomaly_score <= ML_ATTACK_SCORE:
            return {
                "ml_anomaly_critical": (
                    f"[ML] Critical anomaly detected "
                    f"(score={anomaly_score:.3f}, http={http_code:.0f}, "
                    f"rt={rt:.0f}ms)"
                )
            }
        elif anomaly_score <= ML_HIGH_RISK_SCORE:
            return {
                "ml_anomaly_high": (
                    f"[ML] High-risk anomaly detected "
                    f"(score={anomaly_score:.3f}, http={http_code:.0f}, "
                    f"rt={rt:.0f}ms)"
                )
            }
        elif anomaly_score <= ML_SUSPICIOUS_SCORE:
            return {
                "ml_anomaly_suspicious": (
                    f"[ML] Suspicious behavior detected "
                    f"(score={anomaly_score:.3f}, http={http_code:.0f}, "
                    f"rt={rt:.0f}ms)"
                )
            }

    except Exception as e:
        print(
            f"[DETECTOR] WARN: ML detection error on log "
            f"'{log.get('log_id', '?')}' — {e}.",
            file=sys.stderr,
        )

    return {}


def determine_level(triggered_rules: dict[str, str]) -> str:
    if any(rule_id in triggered_rules for rule_id in _ATTACK_RULE_IDS):
        return "ATTACK"
    if any(rule_id in triggered_rules for rule_id in _HIGH_RISK_RULE_IDS):
        return "HIGH_RISK"
    if any(rule_id in triggered_rules for rule_id in _SUSPICIOUS_RULE_IDS):
        return "SUSPICIOUS"
    return "CLEAN"


def compute_severity(alert_level: str, triggered_rules: dict[str, str]) -> int:
    base = SEVERITY_BASE.get(alert_level, 0)
    bonus = sum(
        SEVERITY_REASON_BONUS.get(rule_id, 0)
        for rule_id in triggered_rules
    )
    # ML rules get their own severity bonuses
    if "ml_anomaly_critical" in triggered_rules:
        bonus += 20
    elif "ml_anomaly_high" in triggered_rules:
        bonus += 12
    elif "ml_anomaly_suspicious" in triggered_rules:
        bonus += 6
    return min(base + bonus, 100)


def build_alert(log: dict, alert_level: str, triggered_rules: dict[str, str]) -> dict:
    reasons = list(triggered_rules.values())
    rule_ids = list(triggered_rules.keys())
    severity = compute_severity(alert_level, triggered_rules)

    # confidence_score — ML detections boost confidence
    confidence_score = min(len(reasons) * 25, 100)
    has_ml = any(rid.startswith("ml_anomaly") for rid in rule_ids)
    if has_ml:
        confidence_score = min(confidence_score + 25, 100)

    primary_reason = reasons[0] if reasons else None
    ingestion_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "log_id":           log.get("log_id", "UNKNOWN"),
        "node_id":          log.get("node_id", "UNKNOWN"),
        "node_name":        log.get("node_name", "UNKNOWN"),
        "region":           log.get("region", "UNKNOWN"),
        "timestamp":        log.get("timestamp", "UNKNOWN"),
        "ingestion_time":   ingestion_time,
        "alert_level":      alert_level,
        "severity_score":   severity,
        "confidence_score": confidence_score,
        "is_anomaly":       alert_level != "CLEAN",
        "primary_reason":   primary_reason,
        "reasons":          reasons,
        "rule_ids":         rule_ids,
        "source_data": {
            "reported_status":    log.get("reported_status", "UNKNOWN"),
            "http_status":        log.get("http_status", -1),
            "response_time_ms":   log.get("response_time_ms", -1),
            "hardware_id_b64":    log.get("hardware_id_b64"),
            "hardware_id_valid":  log.get("hardware_id_valid", False),
            "hardware_id_decoded": log.get("hardware_id_decoded"),
            "schema_version":     log.get("schema_version", -1),
            "schema_known":       log.get("schema_known", False),
        },
        "parse_warnings": log.get("parse_warnings", []),
    }


def evaluate_log(log: dict) -> dict | None:
    if not isinstance(log, dict):
        print("[DETECTOR] ERROR: log is not a dict — skipping", file=sys.stderr)
        return None

    log_id = str(log.get("log_id") or "").strip()
    node_id = str(log.get("node_id") or "").strip()
    if not log_id or not node_id:
        print(
            f"[DETECTOR] ERROR: log missing log_id or node_id — skipping: {log}",
            file=sys.stderr,
        )
        return None

    # Run BOTH detection channels and merge results
    rule_triggered = apply_rules(log)
    ml_triggered = apply_ml_detection(log)

    # Merge: ML findings are added to the same triggered dict
    # If a log already has rule-based ATTACK, ML still adds its reason
    # for richer context, but won't downgrade the level
    all_triggered = {**rule_triggered, **ml_triggered}

    level = determine_level(all_triggered)
    alert = build_alert(log, level, all_triggered)
    return alert


def detect_all(normalized_logs: list[dict]) -> tuple[list[dict], dict]:
    alerts = []
    skipped = 0

    counts = {"ATTACK": 0, "HIGH_RISK": 0, "SUSPICIOUS": 0, "CLEAN": 0}
    latencies = []
    invalid_hw = 0
    attacked_nodes = set()
    schema_versions_seen = set()
    ml_detection_count = 0

    for raw_log in normalized_logs:
        try:
            alert = evaluate_log(raw_log)
            if alert is None:
                skipped += 1
                continue

            alerts.append(alert)

            level = alert["alert_level"]
            counts[level] = counts.get(level, 0) + 1

            # Track ML detections separately
            if any(rid.startswith("ml_anomaly") for rid in alert.get("rule_ids", [])):
                ml_detection_count += 1

            rt = alert["source_data"].get("response_time_ms", -1)
            if rt != -1:
                latencies.append(rt)

            if not alert["source_data"].get("hardware_id_valid", True):
                invalid_hw += 1

            if level == "ATTACK":
                attacked_nodes.add(alert["node_id"])

            sv = alert["source_data"].get("schema_version", -1)
            if sv != -1:
                schema_versions_seen.add(sv)

        except Exception as e:
            log_id = raw_log.get("log_id", "?") if isinstance(raw_log, dict) else "?"
            print(
                f"[DETECTOR] CRITICAL: Unexpected error on log '{log_id}' — {e}. Skipping.",
                file=sys.stderr,
            )
            skipped += 1

    avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else 0.0

    summary = {
        "total_logs_processed": len(alerts) + skipped,
        "total_alerts":         len(alerts),
        "skipped":              skipped,
        "attack_count":         counts["ATTACK"],
        "high_risk_count":      counts["HIGH_RISK"],
        "suspicious_count":     counts["SUSPICIOUS"],
        "clean_count":          counts["CLEAN"],
        "ml_detection_count":   ml_detection_count,
        "avg_response_time_ms": avg_latency,
        "invalid_hw_count":     invalid_hw,
        "nodes_under_attack":   sorted(attacked_nodes),
        "schema_versions_seen": sorted(schema_versions_seen),
    }

    print(
        f"[DETECTOR] Done: total={len(alerts)}, ATTACK={counts['ATTACK']}, "
        f"HIGH_RISK={counts['HIGH_RISK']}, SUSPICIOUS={counts['SUSPICIOUS']}, "
        f"CLEAN={counts['CLEAN']}, ML_detections={ml_detection_count}, skipped={skipped}"
    )
    return alerts, summary