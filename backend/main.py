"""
main.py — AEGIS Data Pipeline & Detection Engine
Full end-to-end entry point:
    1. Load all 3 JSON datasets
    2. Normalize logs → unified structure
    3. Run detection engine → alerts + metrics
    4. Save normalized_logs.json and alerts.json
    5. Expose in-memory state for FastAPI endpoints

Usage (standalone):  python main.py
Usage (from FastAPI): from main import alerts, metrics_summary
"""

import json
import os
import sys

# ── Ensure all sibling modules resolve correctly ─────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
sys.path.insert(0, BASE_DIR)

from loader import load_all
from normalizer import normalize_all
from detector import detect_all

# ── In-memory state (loaded once at startup, reused by API endpoints) ─────────
normalized_logs: list[dict] = []
alerts: list[dict] = []
metrics_summary: dict = {}
_pipeline_ready: bool = False


def save_json(data: list | dict, filename: str) -> None:
    """Save data to data/<filename> — silent on failure."""
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        path = os.path.join(DATA_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"[MAIN] Saved {len(data) if isinstance(data, list) else 1} records → {path}")
    except Exception as e:
        print(f"[MAIN] WARN: Could not save {filename} — {e}", file=sys.stderr)


def run_pipeline(data_dir: str = DATA_DIR) -> tuple[list[dict], dict]:
    """
    Execute the full AEGIS pipeline.

    Returns:
        (alerts, metrics_summary)
    """
    global normalized_logs, alerts, metrics_summary, _pipeline_ready

    print("\n" + "=" * 60)
    print("  AEGIS — Full Pipeline Run")
    print("=" * 60)

    # ── Step 1: Load datasets ─────────────────────────────────────────────
    system_logs, node_registry, schema_versions = load_all(data_dir)

    if not system_logs:
        print("[MAIN] ERROR: No system logs loaded — aborting pipeline", file=sys.stderr)
        _pipeline_ready = False
        return [], {}

    # ── Step 2: Normalize ─────────────────────────────────────────────────
    normalized_logs = normalize_all(system_logs, node_registry, schema_versions)
    save_json(normalized_logs, "normalized_logs.json")

    if not normalized_logs:
        print("[MAIN] ERROR: No logs normalized — aborting detection", file=sys.stderr)
        _pipeline_ready = False
        return [], {}

    # ── Step 3: Detect ────────────────────────────────────────────────────
    alerts, metrics_summary = detect_all(normalized_logs)
    save_json(alerts, "alerts.json")
    save_json(metrics_summary, "metrics.json")

    _pipeline_ready = True

    print("\n" + "=" * 60)
    print(f"  Pipeline Complete")
    print(f"  Logs processed : {metrics_summary.get('total_logs_processed', 0)}")
    print(f"  ATTACK         : {metrics_summary.get('attack_count', 0)}")
    print(f"  HIGH_RISK      : {metrics_summary.get('high_risk_count', 0)}")
    print(f"  SUSPICIOUS     : {metrics_summary.get('suspicious_count', 0)}")
    print(f"  CLEAN          : {metrics_summary.get('clean_count', 0)}")
    print(f"  Invalid HW IDs : {metrics_summary.get('invalid_hw_count', 0)}")
    print("=" * 60 + "\n")

    return alerts, metrics_summary


def get_alerts(
    level: str | None = None,
    region: str | None = None,
    node_id: str | None = None,
    page: int = 1,
    limit: int = 50,
) -> dict:
    """
    Filtered, paginated alerts — used directly by GET /alerts FastAPI endpoint.

    Args:
        level    : Filter by alert_level (ATTACK/HIGH_RISK/SUSPICIOUS/CLEAN)
        region   : Filter by region string (case-insensitive)
        node_id  : Filter by exact node_id
        page     : 1-based page number
        limit    : Records per page (max 100)

    Returns dict with: total, page, limit, alerts[]
    """
    filtered = alerts  # start from full in-memory list

    if level and level.upper() in ("ATTACK", "HIGH_RISK", "SUSPICIOUS", "CLEAN"):
        filtered = [a for a in filtered if a["alert_level"] == level.upper()]

    if region:
        region_upper = region.upper()
        filtered = [a for a in filtered if a.get("region", "").upper() == region_upper]

    if node_id:
        filtered = [a for a in filtered if a.get("node_id") == node_id]

    # Sort by severity_score descending (highest threat first)
    filtered = sorted(filtered, key=lambda a: a["severity_score"], reverse=True)

    # Paginate
    limit = min(max(limit, 1), 100)  # clamp 1–100
    page  = max(page, 1)
    offset = (page - 1) * limit
    page_data = filtered[offset: offset + limit]

    return {
        "total": len(filtered),
        "page":  page,
        "limit": limit,
        "alerts": page_data,
    }


def get_metrics() -> dict:
    """Return the pre-computed metrics summary for GET /metrics."""
    return metrics_summary


if __name__ == "__main__":
    run_pipeline()
