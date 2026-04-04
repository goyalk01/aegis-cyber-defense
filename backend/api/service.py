"""
service.py — AEGIS API Service Layer
Handles all file I/O and pipeline execution.
Provides clean, reusable functions for the routes layer.
"""

import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

# ── Centralized Path Configuration ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

ALERTS_FILE = os.path.join(DATA_DIR, "alerts.json")
METRICS_FILE = os.path.join(DATA_DIR, "metrics.json")
NORMALIZED_LOGS_FILE = os.path.join(DATA_DIR, "normalized_logs.json")
NODE_REGISTRY_FILE = os.path.join(DATA_DIR, "node_registry.json")
GRAPH_FILE = os.path.join(DATA_DIR, "graph.json")
FINGERPRINTS_FILE = os.path.join(DATA_DIR, "fingerprints.json")
COMMAND_NODE_FILE = os.path.join(DATA_DIR, "command_node.json")

# ── Constants ──────────────────────────────────────────────────────────────────
API_VERSION = "1.0"
DEFAULT_LIMIT = 50
MAX_LIMIT = 500  # Increased for better alert viewing

# Ensure main module can be imported
sys.path.insert(0, BASE_DIR)


# ── Utility Functions ──────────────────────────────────────────────────────────

def get_timestamp() -> str:
    """Return current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_request_id() -> str:
    """Generate unique request ID."""
    return str(uuid.uuid4())[:8]


def log(level: str, message: str) -> None:
    """Simple logger for debugging."""
    print(f"[{level}] {get_timestamp()} - {message}")


def success_response(data: dict, request_id: str, start_time: float) -> dict:
    """Wrap data in standard success response format."""
    return {
        "status": "success",
        "data": data,
        "timestamp": get_timestamp(),
        "version": API_VERSION,
        "request_id": request_id,
        "processing_time_ms": round((time.time() - start_time) * 1000, 2)
    }


def error_response(message: str, request_id: str, start_time: float) -> dict:
    """Create standard error response format."""
    return {
        "status": "error",
        "message": message,
        "timestamp": get_timestamp(),
        "version": API_VERSION,
        "request_id": request_id,
        "processing_time_ms": round((time.time() - start_time) * 1000, 2)
    }


def load_json_file(path: str) -> tuple[list | dict | None, str | None]:
    """
    Safe JSON file loader with comprehensive error handling.

    Args:
        path: Absolute path to JSON file

    Returns:
        (data, None) on success
        (None, error_message) on failure
    """
    if not os.path.exists(path):
        return None, f"File not found: {os.path.basename(path)}"

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().strip()

        if not content:
            return None, f"File is empty: {os.path.basename(path)}"

        data = json.loads(content)
        return data, None

    except json.JSONDecodeError as e:
        return None, f"Invalid JSON in {os.path.basename(path)}: {str(e)}"
    except PermissionError:
        return None, f"Permission denied: {os.path.basename(path)}"
    except Exception as e:
        return None, f"Error reading {os.path.basename(path)}: {str(e)}"


def get_total_nodes() -> int:
    """Get total nodes from registry file."""
    node_data, _ = load_json_file(NODE_REGISTRY_FILE)
    if not node_data:
        return 0
    if isinstance(node_data, list):
        return len(node_data)
    if isinstance(node_data, dict) and "nodes" in node_data:
        return len(node_data["nodes"])
    return 0


def calculate_percentage(count: int, total: int) -> float:
    """Calculate percentage safely."""
    return round((count / total * 100), 2) if total > 0 else 0.0


# ── Service Functions ──────────────────────────────────────────────────────────

def get_root() -> dict:
    """Root endpoint response."""
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] GET /")

    return success_response({
        "message": "AEGIS API Running",
        "endpoints": [
            "/health",
            "/alerts",
            "/metrics",
            "/summary",
            "/graph",
            "/fingerprints",
            "/command-node",
            "/run-pipeline",
        ]
    }, request_id, start_time)


def get_health() -> dict:
    """Health check response."""
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] GET /health")

    return success_response({
        "service": "healthy"
    }, request_id, start_time)


def read_alerts(
    level: Optional[str] = None,
    region: Optional[str] = None,
    node_id: Optional[str] = None,
    limit: Optional[int] = None
) -> dict:
    """
    Read and optionally filter alerts from alerts.json.

    Args:
        level: Filter by alert level (ATTACK, HIGH_RISK, SUSPICIOUS, CLEAN)
        region: Filter by region (case-insensitive)
        node_id: Filter by exact node_id
        limit: Limit number of results (default: 50, max: 100)

    Returns:
        Standard success/error response
    """
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] GET /alerts (level={level}, region={region}, node_id={node_id}, limit={limit})")

    data, error = load_json_file(ALERTS_FILE)

    if error:
        if "not found" in error.lower():
            return {
                **error_response("No alerts file found. Run the pipeline first.", request_id, start_time),
                "_code": 404
            }
        log("ERROR", f"[{request_id}] {error}")
        return {**error_response(error, request_id, start_time), "_code": 500}

    # Extract alerts list
    if isinstance(data, list):
        alerts_list = data
    elif isinstance(data, dict) and "alerts" in data:
        alerts_list = data["alerts"]
    else:
        alerts_list = []

    # Apply filters safely
    filtered = alerts_list

    if level and isinstance(level, str):
        level_upper = level.strip().upper()
        if level_upper in ("ATTACK", "HIGH_RISK", "SUSPICIOUS", "CLEAN"):
            filtered = [a for a in filtered if a.get("alert_level") == level_upper]

    if region and isinstance(region, str):
        region_upper = region.strip().upper()
        filtered = [a for a in filtered if a.get("region", "").upper() == region_upper]

    if node_id and isinstance(node_id, str):
        node_id_clean = node_id.strip()
        filtered = [a for a in filtered if a.get("node_id") == node_id_clean]

    # Sort by severity_score DESC, then timestamp DESC
    filtered = sorted(
        filtered,
        key=lambda a: (
            a.get("severity_score", 0),
            a.get("timestamp", "")
        ),
        reverse=True
    )

    # Apply limit with safety bounds
    effective_limit = DEFAULT_LIMIT
    if limit is not None:
        effective_limit = min(max(int(limit), 1), MAX_LIMIT)

    filtered = filtered[:effective_limit]

    # Get last generation timestamp from most recent alert
    last_generated = None
    if alerts_list:
        ingestion_times = [a.get("ingestion_time") for a in alerts_list if a.get("ingestion_time")]
        if ingestion_times:
            last_generated = max(ingestion_times)

    return success_response({
        "total": len(filtered),
        "limit": effective_limit,
        "last_generated": last_generated,
        "alerts": filtered
    }, request_id, start_time)


def read_metrics() -> dict:
    """
    Read metrics from metrics.json with enhanced calculations.

    Returns:
        Standard success/error response with enriched metrics
    """
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] GET /metrics")

    data, error = load_json_file(METRICS_FILE)

    if error:
        if "not found" in error.lower():
            return {
                **error_response("No metrics file found. Run the pipeline first.", request_id, start_time),
                "_code": 404
            }
        log("ERROR", f"[{request_id}] {error}")
        return {**error_response(error, request_id, start_time), "_code": 500}

    if not data:
        return {**error_response("No metrics available", request_id, start_time), "_code": 404}

    # Extract values
    total_logs = data.get("total_logs_processed", 0)
    attack_count = data.get("attack_count", 0)
    high_risk_count = data.get("high_risk_count", 0)
    suspicious_count = data.get("suspicious_count", 0)
    clean_count = data.get("clean_count", 0)

    # Build enhanced metrics
    ml_detection_count = data.get("ml_detection_count", 0)

    enhanced_metrics = {
        "total_logs": total_logs,
        "total_alerts": data.get("total_alerts", 0),
        "attack_count": attack_count,
        "high_risk_count": high_risk_count,
        "suspicious_count": suspicious_count,
        "clean_count": clean_count,
        "ml_detection_count": ml_detection_count,
        "attack_percentage": calculate_percentage(attack_count, total_logs),
        "high_risk_percentage": calculate_percentage(high_risk_count, total_logs),
        "suspicious_percentage": calculate_percentage(suspicious_count, total_logs),
        "threat_percentage": calculate_percentage(attack_count + high_risk_count + suspicious_count, total_logs),
        "total_nodes": get_total_nodes(),
        "invalid_hw_count": data.get("invalid_hw_count", 0),
        "avg_response_time_ms": data.get("avg_response_time_ms", 0),
        "nodes_under_attack": data.get("nodes_under_attack", []),
        "schema_versions_seen": data.get("schema_versions_seen", [])
    }

    return success_response(enhanced_metrics, request_id, start_time)


def run_pipeline() -> dict:
    """
    Execute the AEGIS detection pipeline.

    Returns:
        Standard success/error response with pipeline summary
    """
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] POST /run-pipeline - Pipeline triggered")

    try:
        from main import run_pipeline as execute_pipeline

        alerts, metrics = execute_pipeline()

        total_logs = metrics.get("total_logs_processed", 0) if metrics else 0
        attack_count = metrics.get("attack_count", 0) if metrics else 0
        alerts_generated = len(alerts) if alerts else 0

        log("INFO", f"[{request_id}] Pipeline completed: {alerts_generated} alerts, {total_logs} logs processed")

        return success_response({
            "message": "Pipeline executed successfully",
            "alerts_generated": alerts_generated,
            "logs_processed": total_logs,
            "attack_count": attack_count,
            "high_risk_count": metrics.get("high_risk_count", 0) if metrics else 0,
            "suspicious_count": metrics.get("suspicious_count", 0) if metrics else 0,
            "clean_count": metrics.get("clean_count", 0) if metrics else 0,
            "attack_percentage": calculate_percentage(attack_count, total_logs)
        }, request_id, start_time)

    except ImportError as e:
        log("ERROR", f"[{request_id}] Pipeline import failed: {str(e)}")
        return {**error_response(f"Pipeline module not found: {str(e)}", request_id, start_time), "_code": 500}
    except Exception as e:
        log("ERROR", f"[{request_id}] Pipeline execution failed: {str(e)}")
        return {**error_response(f"Pipeline execution failed: {str(e)}", request_id, start_time), "_code": 500}


def get_summary() -> dict:
    """
    Get combined summary of metrics and recent critical alerts.

    Returns:
        Standard success/error response with summary data
    """
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] GET /summary")

    # Load metrics directly (avoid nested response wrapping)
    metrics_data, metrics_error = load_json_file(METRICS_FILE)

    if metrics_error:
        if "not found" in metrics_error.lower():
            return {
                **error_response("No data available. Run the pipeline first.", request_id, start_time),
                "_code": 404
            }
        log("ERROR", f"[{request_id}] {metrics_error}")
        return {**error_response(metrics_error, request_id, start_time), "_code": 500}

    # Load alerts directly
    alerts_data, _ = load_json_file(ALERTS_FILE)
    alerts_list = []
    if alerts_data:
        if isinstance(alerts_data, list):
            alerts_list = alerts_data
        elif isinstance(alerts_data, dict) and "alerts" in alerts_data:
            alerts_list = alerts_data["alerts"]

    # Sort by severity DESC, timestamp DESC
    sorted_alerts = sorted(
        alerts_list,
        key=lambda a: (a.get("severity_score", 0), a.get("timestamp", "")),
        reverse=True
    )

    # Filter critical alerts (ATTACK + HIGH_RISK), limit 5
    critical_alerts = [
        a for a in sorted_alerts
        if a.get("alert_level") in ("ATTACK", "HIGH_RISK")
    ][:5]

    # Extract metrics values
    total_logs = metrics_data.get("total_logs_processed", 0)
    attack_count = metrics_data.get("attack_count", 0)
    high_risk_count = metrics_data.get("high_risk_count", 0)

    suspicious_count = metrics_data.get("suspicious_count", 0)
    ml_detection_count = metrics_data.get("ml_detection_count", 0)

    summary = {
        "metrics": {
            "total_logs": total_logs,
            "total_alerts": metrics_data.get("total_alerts", 0),
            "attack_count": attack_count,
            "high_risk_count": high_risk_count,
            "suspicious_count": suspicious_count,
            "clean_count": metrics_data.get("clean_count", 0),
            "ml_detection_count": ml_detection_count,
            "attack_percentage": calculate_percentage(attack_count, total_logs),
            "threat_percentage": calculate_percentage(attack_count + high_risk_count + suspicious_count, total_logs),
            "total_nodes": get_total_nodes()
        },
        "critical_alerts": {
            "count": len(critical_alerts),
            "alerts": critical_alerts
        },
        "nodes_under_attack": metrics_data.get("nodes_under_attack", [])
    }

    return success_response(summary, request_id, start_time)


def get_graph() -> dict:
    """Get precomputed graph model."""
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] GET /graph")

    data, error = load_json_file(GRAPH_FILE)
    if error:
        if "not found" in error.lower():
            return {
                **error_response("No graph data found. Run the pipeline first.", request_id, start_time),
                "_code": 404,
            }
        log("ERROR", f"[{request_id}] {error}")
        return {**error_response(error, request_id, start_time), "_code": 500}

    if not isinstance(data, dict):
        return {
            **error_response("Invalid graph data format", request_id, start_time),
            "_code": 500,
        }

    return success_response(data, request_id, start_time)


def get_fingerprints() -> dict:
    """Get fingerprint clusters."""
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] GET /fingerprints")

    data, error = load_json_file(FINGERPRINTS_FILE)
    if error:
        if "not found" in error.lower():
            return {
                **error_response("No fingerprint data found. Run the pipeline first.", request_id, start_time),
                "_code": 404,
            }
        log("ERROR", f"[{request_id}] {error}")
        return {**error_response(error, request_id, start_time), "_code": 500}

    if not isinstance(data, dict):
        return {
            **error_response("Invalid fingerprint data format", request_id, start_time),
            "_code": 500,
        }

    return success_response(data, request_id, start_time)


def get_command_node() -> dict:
    """Get latest command node attribution result."""
    start_time = time.time()
    request_id = get_request_id()
    log("INFO", f"[{request_id}] GET /command-node")

    data, error = load_json_file(COMMAND_NODE_FILE)
    if error:
        if "not found" in error.lower():
            return {
                **error_response("No command node data found. Run the pipeline first.", request_id, start_time),
                "_code": 404,
            }
        log("ERROR", f"[{request_id}] {error}")
        return {**error_response(error, request_id, start_time), "_code": 500}

    if not isinstance(data, dict):
        return {
            **error_response("Invalid command node data format", request_id, start_time),
            "_code": 500,
        }

    return success_response(data, request_id, start_time)
