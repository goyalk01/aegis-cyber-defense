"""
routes.py — AEGIS API Routes Layer
Defines all HTTP endpoints.
Delegates business logic to service layer.
"""

from typing import Optional
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from api.service import (
    get_root,
    get_health,
    read_alerts,
    read_metrics,
    run_pipeline,
    get_summary,
    get_graph,
    get_fingerprints,
    get_command_node,
    DEFAULT_LIMIT,
    MAX_LIMIT
)

# ── Router Instance ────────────────────────────────────────────────────────────
router = APIRouter()


# ── Response Builder ───────────────────────────────────────────────────────────

def build_response(result: dict):
    """
    Build HTTP response from service result.
    Extracts internal _code for error responses.
    """
    status_code = result.pop("_code", None)

    if status_code:
        return JSONResponse(status_code=status_code, content=result)

    return result


# ── System Endpoints ───────────────────────────────────────────────────────────

@router.get("/", tags=["System"], summary="API Root")
def root():
    """
    Root endpoint - API status and available endpoints.
    """
    return get_root()


@router.get("/health", tags=["System"], summary="Health Check")
def health():
    """
    Health check - service status verification.
    """
    return get_health()


# ── Detection Endpoints ────────────────────────────────────────────────────────

@router.get("/alerts", tags=["Detection"], summary="Get Alerts")
def alerts(
    level: Optional[str] = Query(
        None,
        description="Filter by alert level: ATTACK, HIGH_RISK, SUSPICIOUS, CLEAN"
    ),
    region: Optional[str] = Query(
        None,
        description="Filter by region (case-insensitive)"
    ),
    node_id: Optional[str] = Query(
        None,
        description="Filter by exact node_id"
    ),
    limit: Optional[int] = Query(
        DEFAULT_LIMIT,
        description=f"Limit results (default: {DEFAULT_LIMIT}, max: {MAX_LIMIT})",
        ge=1,
        le=MAX_LIMIT
    )
):
    """
    Get detection alerts with optional filtering.

    **Filters:**
    - `level`: ATTACK, HIGH_RISK, SUSPICIOUS, CLEAN
    - `region`: Region name (case-insensitive)
    - `node_id`: Exact node identifier
    - `limit`: Max results (1-100, default 50)

    **Sorting:** severity_score DESC, timestamp DESC
    """
    return build_response(read_alerts(level=level, region=region, node_id=node_id, limit=limit))


@router.get("/metrics", tags=["Detection"], summary="Get Metrics")
def metrics():
    """
    Get pipeline metrics summary.

    **Includes:**
    - Total logs processed
    - Alert counts by severity
    - Attack/threat percentages
    - Nodes under attack
    """
    return build_response(read_metrics())


@router.get("/summary", tags=["Detection"], summary="Get Summary")
def summary():
    """
    Get combined summary of metrics and critical alerts.

    **Includes:**
    - Key metrics overview
    - Top 5 critical alerts (ATTACK + HIGH_RISK)
    - Nodes currently under attack
    """
    return build_response(get_summary())


@router.get("/graph", tags=["Attribution"], summary="Get Graph")
def graph():
    """Get precomputed network graph and metadata."""
    return build_response(get_graph())


@router.get("/fingerprints", tags=["Attribution"], summary="Get Fingerprints")
def fingerprints():
    """Get fingerprint clusters identified from metadata behavior."""
    return build_response(get_fingerprints())


@router.get("/command-node", tags=["Attribution"], summary="Get Command Node")
def command_node():
    """Get current command node attribution with confidence and reasons."""
    return build_response(get_command_node())


# ── Pipeline Endpoints ─────────────────────────────────────────────────────────

@router.post("/run-pipeline", tags=["Pipeline"], summary="Run Pipeline")
def trigger_pipeline():
    """
    Trigger the AEGIS detection pipeline.

    **Pipeline Steps:**
    1. Load system logs
    2. Normalize data
    3. Run detection engine
    4. Generate alerts and metrics

    **Returns:** Execution summary with counts
    """
    return build_response(run_pipeline())
