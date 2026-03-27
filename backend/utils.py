"""
utils.py — AEGIS Data Pipeline
Responsibility: Shared helper functions used across the pipeline.
  - Safe type casting
  - Base64 validation pipeline
  - String sanitization
  - Timestamp normalization
  - Safe dict key access
"""

import base64
import binascii
import re
import sys
from typing import Any

# ──────────────────────────────────────────────
# KNOWN MALICIOUS PATTERNS IN DECODED PAYLOADS
# ──────────────────────────────────────────────
MALICIOUS_KEYWORDS = [
    "MALWARE", "PAYLOAD", "EXPLOIT", "INJECT",
    "SHELL", "CMD", "EXEC", "BACKDOOR", "ROOTKIT",
    "TROJAN", "RANSOMWARE", "KEYLOG",
]


# ──────────────────────────────────────────────
# SAFE KEY EXTRACTION
# ──────────────────────────────────────────────

def safe_get(d: dict, key: str, default: Any = None) -> Any:
    """
    Get a key from a dict safely.
    Returns default if key is missing OR if the value is None/empty string.

    Example:
        safe_get(log, "http_code", default=-1) → 500 or -1
    """
    value = d.get(key, default)
    if value is None or value == "":
        return default
    return value


# ──────────────────────────────────────────────
# SAFE TYPE CASTING
# ──────────────────────────────────────────────

def safe_int(value: Any, default: int = -1) -> int:
    """
    Convert a value to int safely.
    Returns default on failure (None, non-numeric string, float string).

    Examples:
        safe_int(500)      → 500
        safe_int("503")    → 503
        safe_int(None)     → -1
        safe_int("N/A")    → -1
        safe_int(4200.5)   → 4200
    """
    if value is None:
        return default
    try:
        return int(float(str(value).strip()))
    except (ValueError, TypeError):
        return default


def safe_str(value: Any, default: str = "") -> str:
    """
    Convert a value to a stripped string safely.
    Returns default if None or blank.

    Examples:
        safe_str("  Operational  ") → "Operational"
        safe_str(None)              → ""
        safe_str(123)               → "123"
    """
    if value is None:
        return default
    result = str(value).strip()
    return result if result else default


def safe_str_upper(value: Any, default: str = "") -> str:
    """Same as safe_str but uppercased. Useful for status comparisons."""
    return safe_str(value, default).upper()


# ──────────────────────────────────────────────
# TIMESTAMP HANDLING
# ──────────────────────────────────────────────

def normalize_timestamp(ts: Any) -> str:
    """
    Normalize a timestamp value to an ISO 8601 string.
    Accepts strings like "2024-03-01T12:05:00Z".
    Returns "UNKNOWN" if None or not a valid-looking string.

    NOTE: We do NOT parse into datetime objects to stay lightweight.
          For hackathon purposes, string storage is sufficient.

    Examples:
        normalize_timestamp("2024-03-01T12:05:00Z") → "2024-03-01T12:05:00Z"
        normalize_timestamp(None)                   → "UNKNOWN"
        normalize_timestamp(12345)                  → "UNKNOWN"
    """
    if not isinstance(ts, str) or len(ts) < 10:
        return "UNKNOWN"
    # Basic sanity: must contain digits and a dash
    return ts.strip() if re.search(r"\d{4}-\d{2}-\d{2}", ts) else "UNKNOWN"


# ──────────────────────────────────────────────
# BASE64 VALIDATION PIPELINE
# ──────────────────────────────────────────────

def validate_base64_hardware_id(b64_value: Any) -> dict:
    """
    SAFE Base64 decode + malicious pattern scan pipeline.

    Stages:
        1. Existence check  — is the value present and non-empty?
        2. Format check     — does it look like valid Base64?
        3. Decode attempt   — can we decode it without error?
        4. UTF-8 decode     — can we read it as text?
        5. Malicious scan   — does it contain known threat keywords?

    Returns:
        {
            "valid": bool,          # True = clean, False = problematic
            "decoded": str | None,  # Decoded text, or None on failure
            "reason": str | None    # Human-readable reason if invalid
        }

    STRICT RULES:
        ❌ NEVER pass decoded string to eval(), exec(), os.system()
        ❌ NEVER trust decoded content — treat it as data only
    """

    # ── Stage 1: Existence ──────────────────────────────────────────────
    if b64_value is None or safe_str(b64_value) == "":
        return {"valid": False, "decoded": None, "reason": "hardware_id_b64 is missing or null"}

    raw_str = safe_str(b64_value)

    # ── Stage 2: Format check ────────────────────────────────────────────
    # Valid Base64 chars: A-Z a-z 0-9 + / = (with optional newlines)
    # We strip whitespace before checking
    cleaned = raw_str.replace("\n", "").replace("\r", "").replace(" ", "")
    if not re.fullmatch(r"[A-Za-z0-9+/]+=*", cleaned):
        return {
            "valid": False,
            "decoded": None,
            "reason": f"Invalid Base64 format — contains illegal characters: {raw_str[:30]}",
        }

    # ── Stage 3: Decode attempt ──────────────────────────────────────────
    try:
        # Add padding if needed (Base64 length must be multiple of 4)
        padded = cleaned + "=" * ((4 - len(cleaned) % 4) % 4)
        decoded_bytes = base64.b64decode(padded, validate=True)
    except (binascii.Error, ValueError) as e:
        return {
            "valid": False,
            "decoded": None,
            "reason": f"Base64 decode error: {str(e)}",
        }

    # ── Stage 4: UTF-8 text extraction ───────────────────────────────────
    try:
        decoded_str = decoded_bytes.decode("utf-8")
    except UnicodeDecodeError:
        # Not UTF-8 text — could be binary payload, treat as suspicious
        return {
            "valid": False,
            "decoded": None,
            "reason": "Decoded bytes are not valid UTF-8 — possible binary payload",
        }

    # ── Stage 5: Malicious keyword scan ─────────────────────────────────
    decoded_upper = decoded_str.upper()
    for keyword in MALICIOUS_KEYWORDS:
        if keyword in decoded_upper:
            return {
                "valid": False,
                "decoded": decoded_str,  # Store for evidence, never execute
                "reason": f"Malicious pattern detected: '{keyword}' found in decoded hardware ID",
            }

    # ── All stages passed ────────────────────────────────────────────────
    return {"valid": True, "decoded": decoded_str, "reason": None}
