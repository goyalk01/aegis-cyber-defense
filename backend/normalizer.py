"""
normalizer.py — AEGIS Data Pipeline
Responsibility: Core normalization engine.
  - Builds lookup maps from node_registry and schema_versions
  - Processes each system_log into a unified NormalizedLog dict
  - Never crashes — all errors are caught and logged
  - Returns a list of NormalizedLog dicts ready for the detection engine
"""

import sys
from typing import Any
from utils import safe_get, safe_int, safe_str, safe_str_upper, normalize_timestamp, validate_base64_hardware_id

# ──────────────────────────────────────────────
# DEFAULT / SENTINEL VALUES
# ──────────────────────────────────────────────
DEFAULT_HTTP_STATUS = -1       # -1 = unknown/missing → treated as ATTACK
DEFAULT_RESPONSE_TIME = -1     # -1 = unknown/missing
DEFAULT_STATUS = "UNKNOWN"
DEFAULT_REGION = "UNKNOWN"
DEFAULT_NODE_NAME = "UNKNOWN"


# ══════════════════════════════════════════════
# STEP 1: BUILD LOOKUP MAPS
# ══════════════════════════════════════════════

def build_node_registry_map(node_registry: list[dict]) -> dict[str, dict]:
    """
    Convert node_registry list → dict keyed by node_id.
    Enables O(1) lookup when processing logs.

    Input:
        [{ "node_id": "NODE-001", "node_name": "Alpha", "region": "US-EAST", ... }]

    Output:
        { "NODE-001": { "node_name": "Alpha", "region": "US-EAST", ... } }
    """
    registry_map = {}
    for node in node_registry:
        node_id = safe_str(node.get("node_id"))
        if not node_id:
            continue
        registry_map[node_id] = node
    print(f"[NORMALIZER] Built node registry map with {len(registry_map)} nodes")
    return registry_map


def build_schema_map(schema_versions: list[dict]) -> dict[int, dict]:
    """
    Convert schema_versions list → dict keyed by version number (int).
    Enables O(1) field_map lookup per log.

    Input:
        [{ "version": 1, "field_map": { "http_status": "http_code", ... } }]

    Output:
        { 1: { "http_status": "http_code", ... }, 2: {...}, 3: {...} }
    """
    schema_map = {}
    for schema in schema_versions:
        version = schema.get("version")
        field_map = schema.get("field_map")
        if version is None or not isinstance(field_map, dict):
            print(
                f"[NORMALIZER] WARN: Invalid schema entry skipped — {schema}",
                file=sys.stderr,
            )
            continue
        try:
            version_int = int(version)
        except (ValueError, TypeError):
            print(
                f"[NORMALIZER] WARN: Schema version '{version}' is not an integer — skipped",
                file=sys.stderr,
            )
            continue
        schema_map[version_int] = field_map
    print(f"[NORMALIZER] Built schema map for versions: {sorted(schema_map.keys())}")
    return schema_map


# ══════════════════════════════════════════════
# STEP 2: EXTRACT FIELDS USING SCHEMA MAPPING
# ══════════════════════════════════════════════

def extract_with_schema(log: dict, field_map: dict, canonical_key: str, default: Any = None) -> Any:
    """
    Extract a canonical field value from a raw log using the field_map.

    Logic:
        1. Look up the actual field name for this schema version.
        2. Fetch the value from the raw log using that name.
        3. Return default if field_map entry missing OR value is None.

    Example:
        log = { "http_code": 500 }
        field_map = { "http_status": "http_code" }
        extract_with_schema(log, field_map, "http_status") → 500

        log = { "status_code": None }
        extract_with_schema(log, field_map, "http_status", default=-1) → -1
    """
    actual_key = field_map.get(canonical_key)
    if actual_key is None:
        return default
    return log.get(actual_key, default)


# ══════════════════════════════════════════════
# STEP 3: NORMALIZE A SINGLE LOG
# ══════════════════════════════════════════════

def normalize_log(
    log: dict,
    registry_map: dict[str, dict],
    schema_map: dict[int, dict],
) -> dict | None:
    """
    Convert one raw system_log entry into a NormalizedLog dict.

    Returns None if the log cannot be processed at all (missing node_id or log_id).
    Returns a NormalizedLog dict with a 'parse_warnings' list for soft errors.

    Output structure:
    {
        "log_id": str,
        "node_id": str,
        "node_name": str,
        "region": str,
        "schema_version": int,
        "schema_known": bool,
        "reported_status": str,
        "http_status": int,
        "response_time_ms": int,
        "hardware_id_b64": str | None,
        "hardware_id_valid": bool,
        "hardware_id_decoded": str | None,
        "hardware_id_reason": str | None,
        "timestamp": str,
        "parse_warnings": list[str]   # soft errors — does not prevent processing
    }
    """
    warnings = []

    # ── Guard: log_id and node_id are mandatory ───────────────────────────
    log_id = safe_str(log.get("log_id"))
    node_id = safe_str(log.get("node_id"))

    if not log_id or not node_id:
        print(
            f"[NORMALIZER] ERROR: Log missing log_id or node_id — skipping: {log}",
            file=sys.stderr,
        )
        return None  # Hard failure — cannot identify this record

    # ── Determine schema version ──────────────────────────────────────────
    schema_version_raw = log.get("schema_version")
    schema_version = safe_int(schema_version_raw, default=-1)
    schema_known = schema_version in schema_map

    if not schema_known:
        warnings.append(
            f"Unknown schema_version={schema_version_raw} — fields may not map correctly"
        )
        # Fallback: try to find fields by common v1 names as best-effort
        field_map = schema_map.get(1, {})
    else:
        field_map = schema_map[schema_version]

    # ── Extract core fields using schema mapping ───────────────────────────
    raw_reported_status = extract_with_schema(log, field_map, "reported_status", default=None)
    raw_http_status = extract_with_schema(log, field_map, "http_status", default=None)
    raw_response_time = extract_with_schema(log, field_map, "response_time_ms", default=None)

    reported_status = safe_str_upper(raw_reported_status, default=DEFAULT_STATUS)
    http_status = safe_int(raw_http_status, default=DEFAULT_HTTP_STATUS)
    response_time_ms = safe_int(raw_response_time, default=DEFAULT_RESPONSE_TIME)

    # Soft warnings for missing critical numeric fields
    if http_status == DEFAULT_HTTP_STATUS:
        warnings.append(f"http_status is missing or null — defaulted to {DEFAULT_HTTP_STATUS}")
    if response_time_ms == DEFAULT_RESPONSE_TIME:
        warnings.append(f"response_time_ms is missing or null — defaulted to {DEFAULT_RESPONSE_TIME}")

    # ── Timestamp normalization ───────────────────────────────────────────
    timestamp = normalize_timestamp(log.get("timestamp"))
    if timestamp == "UNKNOWN":
        warnings.append("timestamp is missing or invalid — set to UNKNOWN")

    # ── Node metadata lookup (O(1) dict access) ───────────────────────────
    node_meta = registry_map.get(node_id)
    if node_meta is None:
        warnings.append(f"node_id='{node_id}' not found in node_registry — using defaults")
        node_name = DEFAULT_NODE_NAME
        region = DEFAULT_REGION
        # Use hardware_id from the log itself since node_registry can't supply it
        hardware_id_b64_raw = log.get("hardware_id_b64")
    else:
        node_name = safe_str(node_meta.get("node_name"), default=DEFAULT_NODE_NAME)
        region = safe_str(node_meta.get("region"), default=DEFAULT_REGION)
        # Prefer hardware_id from node_registry (authoritative), fallback to log
        hardware_id_b64_raw = node_meta.get("hardware_id_b64") or log.get("hardware_id_b64")

    # ── Base64 hardware ID validation pipeline ────────────────────────────
    hw_result = validate_base64_hardware_id(hardware_id_b64_raw)
    if not hw_result["valid"]:
        warnings.append(f"hardware_id issue: {hw_result['reason']}")

    # ── Assemble normalized log ───────────────────────────────────────────
    return {
        "log_id": log_id,
        "node_id": node_id,
        "node_name": node_name,
        "region": region,
        "schema_version": schema_version,
        "schema_known": schema_known,
        "reported_status": reported_status,
        "http_status": http_status,
        "response_time_ms": response_time_ms,
        "hardware_id_b64": safe_str(hardware_id_b64_raw) if hardware_id_b64_raw else None,
        "hardware_id_valid": hw_result["valid"],
        "hardware_id_decoded": hw_result["decoded"],
        "hardware_id_reason": hw_result["reason"],
        "timestamp": timestamp,
        "parse_warnings": warnings,
    }


# ══════════════════════════════════════════════
# STEP 4: FULL PIPELINE — PROCESS ALL LOGS
# ══════════════════════════════════════════════

def normalize_all(
    system_logs: list[dict],
    node_registry: list[dict],
    schema_versions: list[dict],
) -> list[dict]:
    """
    Full normalization pipeline. Single-pass processing.

    Steps:
        1. Build registry_map from node_registry  (O(n) once)
        2. Build schema_map from schema_versions   (O(n) once)
        3. Loop each log → normalize_log()         (O(m) single pass)
        4. Collect results, skip Nones

    Returns:
        List of NormalizedLog dicts, ready for the detection engine.
        Bad records are skipped (never crash), warnings are embedded.
    """
    # Build lookup maps ONCE before processing any logs
    registry_map = build_node_registry_map(node_registry)
    schema_map = build_schema_map(schema_versions)

    normalized_logs = []
    skipped = 0
    total_rows = len(system_logs)

    for raw_log in system_logs:
        try:
            result = normalize_log(raw_log, registry_map, schema_map)
            if result is None:
                skipped += 1
                continue
            normalized_logs.append(result)
        except Exception as e:
            # Catch-all: no single bad log should stop the entire pipeline
            log_id = raw_log.get("log_id", "UNKNOWN") if isinstance(raw_log, dict) else "UNKNOWN"
            print(
                f"[NORMALIZER] CRITICAL: Unexpected error on log '{log_id}' — {e}. Skipping.",
                file=sys.stderr,
            )
            skipped += 1

    print(
        f"[NORMALIZER] Done: normalized={len(normalized_logs)}, skipped={skipped}"
    )

    integrity_summary = {
        "total_rows": total_rows,
        "valid_rows": len(normalized_logs),
        "dropped_rows": skipped,
    }
    # Exposed as function attribute so callers can persist/report without changing API.
    normalize_all.last_integrity_summary = integrity_summary
    print(f"[NORMALIZER] Integrity summary: {integrity_summary}")
    return normalized_logs
