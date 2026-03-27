"""
evaluator.py — AEGIS Detection Engine
Responsibility: Pure rule evaluation functions.
  - One function per rule: takes a normalized log, returns (triggered: bool, reason_str: str)
  - No side effects. Easily testable.
  - All string comparisons are uppercase-safe.
  - All integer checks guard against sentinel -1.
"""

from rules import (
    HTTP_ATTACK_THRESHOLD,
    HTTP_SERVER_ERROR_THRESHOLD,
    LATENCY_HIGH_RISK_MS,
    LATENCY_SUSPICIOUS_MS,
    SENTINEL_INT,
)


# ──────────────────────────────────────────────
# HELPER: safe field extraction
# ──────────────────────────────────────────────

def _get_str(log: dict, key: str, default: str = "") -> str:
    """Return uppercased string value from log, or default."""
    val = log.get(key)
    if val is None:
        return default
    return str(val).strip().upper()


def _get_int(log: dict, key: str, default: int = SENTINEL_INT) -> int:
    """Return int value from log, or default. Guards against None."""
    val = log.get(key)
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


# ══════════════════════════════════════════════
# ATTACK RULE EVALUATORS
# ══════════════════════════════════════════════

def check_status_contradiction(log: dict) -> tuple[bool, str]:
    """
    Rule: reported_status == "OPERATIONAL" AND http_status >= 400
    Catches nodes that lie about being healthy.
    Returns (triggered, reason_string)
    """
    reported = _get_str(log, "reported_status")
    http = _get_int(log, "http_status")

    # Guard: only fire if http_status is a real value (not sentinel)
    if http == SENTINEL_INT:
        return False, ""

    if reported == "OPERATIONAL" and http >= HTTP_ATTACK_THRESHOLD:
        return (
            True,
            f"Deceptive node: reports OPERATIONAL but HTTP={http} (>= {HTTP_ATTACK_THRESHOLD})",
        )
    return False, ""


def check_server_error(log: dict) -> tuple[bool, str]:
    """
    Rule: http_status >= 500 (always ATTACK, regardless of reported_status)
    A 500-range response is a server-side failure — no excuses.
    """
    http = _get_int(log, "http_status")

    if http == SENTINEL_INT:
        return False, ""

    if http >= HTTP_SERVER_ERROR_THRESHOLD:
        return (
            True,
            f"Server failure: HTTP={http} (>= {HTTP_SERVER_ERROR_THRESHOLD})",
        )
    return False, ""


def check_invalid_hardware_id(log: dict) -> tuple[bool, str]:
    """
    Rule: hardware_id_valid == False
    Already determined by Step 1 Base64 validation pipeline.
    """
    hw_valid = log.get("hardware_id_valid")

    # Explicit False check — None (missing field) also treated as invalid
    if hw_valid is False or hw_valid is None:
        reason_detail = log.get("hardware_id_reason") or "hardware_id_b64 is missing or failed validation"
        return True, f"Invalid hardware ID: {reason_detail}"
    return False, ""


def check_unknown_http_status(log: dict) -> tuple[bool, str]:
    """
    Rule: http_status == -1 (sentinel = missing field from Step 1)
    Cannot confirm node health without HTTP status. Treat as ATTACK.
    """
    http = _get_int(log, "http_status")
    if http == SENTINEL_INT:
        return True, "HTTP status is missing (field not found in log) — node health unverifiable"
    return False, ""


# ══════════════════════════════════════════════
# HIGH_RISK RULE EVALUATORS
# ══════════════════════════════════════════════

def check_extreme_latency(log: dict) -> tuple[bool, str]:
    """
    Rule: response_time_ms >= 3000
    Extreme latency indicates active DoS or severe resource exhaustion.
    Skipped if response_time_ms == -1 (missing field).
    """
    rt = _get_int(log, "response_time_ms")

    if rt == SENTINEL_INT:
        return False, ""  # Missing latency — skip this rule, don't penalize

    if rt >= LATENCY_HIGH_RISK_MS:
        return True, f"Extreme latency: {rt}ms (>= {LATENCY_HIGH_RISK_MS}ms threshold)"
    return False, ""


# ══════════════════════════════════════════════
# SUSPICIOUS RULE EVALUATORS
# ══════════════════════════════════════════════

def check_elevated_latency(log: dict) -> tuple[bool, str]:
    """
    Rule: 1500ms <= response_time_ms < 3000ms
    IMPORTANT: Only fires in the 1500–2999ms band.
    extreme_latency handles >= 3000ms separately.
    This makes the two latency rules mutually exclusive — no double-firing.
    Skipped if response_time_ms == -1 (missing field).
    """
    rt = _get_int(log, "response_time_ms")

    if rt == SENTINEL_INT:
        return False, ""

    # Mutually exclusive with extreme_latency: only fire BELOW the HIGH_RISK threshold
    if LATENCY_SUSPICIOUS_MS <= rt < LATENCY_HIGH_RISK_MS:
        return True, f"Elevated latency: {rt}ms (>= {LATENCY_SUSPICIOUS_MS}ms, < {LATENCY_HIGH_RISK_MS}ms)"
    return False, ""


# ══════════════════════════════════════════════
# INFORMATIONAL CHECKS (reasons only, no level change)
# ══════════════════════════════════════════════

def check_schema_unknown(log: dict) -> tuple[bool, str]:
    """
    Informational: schema_version was not recognized.
    Adds a warning reason but does not raise alert level on its own.
    """
    schema_known = log.get("schema_known", True)
    if not schema_known:
        ver = log.get("schema_version", "?")
        return True, f"Unknown schema version={ver} — field mapping may be incomplete"
    return False, ""


# ══════════════════════════════════════════════
# RULE TABLE: maps rule_id → evaluator function
# Add new rules by adding an entry here + a function above.
# ══════════════════════════════════════════════

RULE_EVALUATORS = {
    # ATTACK rules
    "status_contradiction":  check_status_contradiction,
    "server_error":          check_server_error,
    "invalid_hardware_id":   check_invalid_hardware_id,
    "unknown_http_status":   check_unknown_http_status,
    # HIGH_RISK rules
    "extreme_latency":       check_extreme_latency,
    # SUSPICIOUS rules
    "elevated_latency":      check_elevated_latency,
    # INFO (reasons-only)
    "schema_unknown":        check_schema_unknown,
}
