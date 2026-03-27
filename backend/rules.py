"""
rules.py — AEGIS Detection Engine
Responsibility: Centralized rule configuration. All thresholds live here.
Modify ONLY this file to change detection sensitivity.
"""

# ──────────────────────────────────────────────
# THRESHOLD CONSTANTS (edit these to tune)
# ──────────────────────────────────────────────

HTTP_ATTACK_THRESHOLD = 400      # http_status >= this triggers ATTACK (when status=Operational)
HTTP_SERVER_ERROR_THRESHOLD = 500  # http_status >= this is ALWAYS ATTACK (no conditions)
LATENCY_HIGH_RISK_MS = 3000      # response_time_ms >= this → HIGH_RISK
LATENCY_SUSPICIOUS_MS = 1500     # response_time_ms >= this → SUSPICIOUS
SENTINEL_INT = -1                # Indicates missing int field from Step 1 pipeline

# ──────────────────────────────────────────────
# SEVERITY SCORE CONFIG
# Each alert level has a base score.
# Each triggered reason adds a bonus on top.
# ──────────────────────────────────────────────

SEVERITY_BASE = {
    "ATTACK":    80,
    "HIGH_RISK": 50,
    "SUSPICIOUS": 25,
    "CLEAN":       0,
}

SEVERITY_REASON_BONUS = {
    "status_contradiction": 10,  # Deceptive: Operational + 4xx/5xx
    "server_error":         10,  # http_status >= 500
    "invalid_hardware_id":  15,  # hw decode failed or malicious keyword
    "extreme_latency":       8,  # >= 3000ms
    "elevated_latency":      5,  # >= 1500ms
    "unknown_http_status":   8,  # http_status == -1 (missing field)
    "schema_unknown":        3,  # unrecognized schema version
}

# ──────────────────────────────────────────────
# PRIORITY ORDER (highest → lowest)
# Detection engine evaluates in this order.
# Once a level is set, it cannot be downgraded.
# ──────────────────────────────────────────────

PRIORITY_ORDER = ["ATTACK", "HIGH_RISK", "SUSPICIOUS", "CLEAN"]

# ──────────────────────────────────────────────
# RULE REGISTRY
# Each rule is a dict with:
#   id         → unique string key (used in reasons list & score bonus lookup)
#   level      → which alert level this rule belongs to
#   description → human-readable explanation for the alert reasons[] field
# The actual check logic lives in evaluator.py.
# ──────────────────────────────────────────────

RULES = [
    # ── ATTACK rules ───────────────────────────────────────────────────────
    {
        "id": "status_contradiction",
        "level": "ATTACK",
        "description": "Deceptive node: reports OPERATIONAL but HTTP status={http_status} (>= 400)",
    },
    {
        "id": "server_error",
        "level": "ATTACK",
        "description": "Server failure: HTTP status={http_status} (>= 500) is always critical",
    },
    {
        "id": "invalid_hardware_id",
        "level": "ATTACK",
        "description": "Hardware ID invalid: {hardware_id_reason}",
    },
    {
        "id": "unknown_http_status",
        "level": "ATTACK",
        "description": "HTTP status is missing (sentinel=-1) — cannot confirm node health",
    },
    # ── HIGH_RISK rules ─────────────────────────────────────────────────────
    {
        "id": "extreme_latency",
        "level": "HIGH_RISK",
        "description": "Extreme latency: {response_time_ms}ms >= {threshold}ms — possible DoS",
    },
    # ── SUSPICIOUS rules ────────────────────────────────────────────────────
    {
        "id": "elevated_latency",
        "level": "SUSPICIOUS",
        "description": "Elevated latency: {response_time_ms}ms >= {threshold}ms — early-stage anomaly",
    },
    # ── Informational (added to reasons but don't set level) ────────────────
    {
        "id": "schema_unknown",
        "level": "INFO",
        "description": "Unknown schema version={schema_version} — field mapping may be incomplete",
    },
]
