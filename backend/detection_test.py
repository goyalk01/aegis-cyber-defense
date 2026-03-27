"""
detection_test.py — AEGIS Detection Engine Test Suite (FIXED)
Tests all classification cases. Input dicts are never mutated.
Usage: python detection_test.py
"""

import copy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from detector import evaluate_log, detect_all

# ──────────────────────────────────────────────
# TEST CASE DEFINITIONS — never mutated
# ──────────────────────────────────────────────

TEST_CASES = [
    # ── Case 1: CLEAN ─────────────────────────────────────────────────────
    {
        "_label":    "Case 1 — CLEAN",
        "_expected": "CLEAN",
        "log_id": "TEST-001", "node_id": "NODE-010",
        "node_name": "Kappa Backup", "region": "AP-SOUTH",
        "schema_version": 2, "schema_known": True,
        "reported_status": "OPERATIONAL",
        "http_status": 200, "response_time_ms": 290,
        "hardware_id_b64": "S0FQUEFCQUNLVVBIQVNIX0hXXzAxMA==",
        "hardware_id_valid": True, "hardware_id_decoded": "KAPPA_BACKUP_HASH_HW_010",
        "hardware_id_reason": None, "timestamp": "2024-03-01T12:00:00Z",
        "parse_warnings": [],
    },
    # ── Case 2: SUSPICIOUS (latency 1500–2999ms band) ─────────────────────
    {
        "_label":    "Case 2 — SUSPICIOUS (latency 1800ms)",
        "_expected": "SUSPICIOUS",
        "log_id": "TEST-002", "node_id": "NODE-002",
        "node_name": "Beta Gateway", "region": "EU-WEST",
        "schema_version": 2, "schema_known": True,
        "reported_status": "OPERATIONAL",
        "http_status": 200, "response_time_ms": 1800,
        "hardware_id_b64": "Tk9ERTAwMl9IV19JRA==",
        "hardware_id_valid": True, "hardware_id_decoded": "NODE002_HW_ID",
        "hardware_id_reason": None, "timestamp": "2024-03-01T12:06:00Z",
        "parse_warnings": [],
    },
    # ── Case 3: HIGH_RISK (latency >= 3000ms, http OK, hw OK) ────────────
    {
        "_label":    "Case 3 — HIGH_RISK (latency 3500ms)",
        "_expected": "HIGH_RISK",
        "log_id": "TEST-003", "node_id": "NODE-006",
        "node_name": "Zeta DNS", "region": "US-EAST",
        "schema_version": 3, "schema_known": True,
        "reported_status": "OPERATIONAL",
        "http_status": 200, "response_time_ms": 3500,
        "hardware_id_b64": "WkVUQV9ETlNfSFdfMDA2",
        "hardware_id_valid": True, "hardware_id_decoded": "ZETA_DNS_HW_006",
        "hardware_id_reason": None, "timestamp": "2024-03-01T12:10:00Z",
        "parse_warnings": [],
    },
    # ── Case 4: ATTACK (HTTP 500 + deceptive status + invalid HW ID) ──────
    {
        "_label":    "Case 4 — ATTACK (HTTP 500 + deceptive status + malicious HW ID)",
        "_expected": "ATTACK",
        "log_id": "TEST-004", "node_id": "NODE-001",
        "node_name": "Alpha Server", "region": "US-EAST",
        "schema_version": 1, "schema_known": True,
        "reported_status": "OPERATIONAL",
        "http_status": 500, "response_time_ms": 4200,
        "hardware_id_b64": "TUFMV0FSRV9QQVlMT0FEX3Yy",
        "hardware_id_valid": False, "hardware_id_decoded": "MALWARE_PAYLOAD_v2",
        "hardware_id_reason": "Malicious pattern detected: 'MALWARE'",
        "timestamp": "2024-03-01T12:05:00Z",
        "parse_warnings": [],
    },
    # ── Case 5: ATTACK (multi-condition: HTTP 4xx + bad HW) ───────────────
    {
        "_label":    "Case 5 — MULTI-CONDITION ATTACK (HTTP 502 + bad HW ID)",
        "_expected": "ATTACK",
        "log_id": "TEST-005", "node_id": "NODE-007",
        "node_name": "Eta Cache", "region": "AP-EAST",
        "schema_version": 2, "schema_known": True,
        "reported_status": "OPERATIONAL",
        "http_status": 502, "response_time_ms": 2700,
        "hardware_id_b64": "TUFMV0FSRV9DTUQ=",
        "hardware_id_valid": False, "hardware_id_decoded": "MALWARE_CMD",
        "hardware_id_reason": "Malicious pattern detected: 'MALWARE'",
        "timestamp": "2024-03-01T12:11:00Z",
        "parse_warnings": ["Schema version deprecated"],
    },
    # ── Case 6: ATTACK (missing http_status sentinel = -1) ────────────────
    {
        "_label":    "Case 6 — ATTACK (http_status missing, sentinel=-1)",
        "_expected": "ATTACK",
        "log_id": "TEST-006", "node_id": "NODE-003",
        "node_name": "Gamma LB", "region": "AP-SOUTH",
        "schema_version": 1, "schema_known": True,
        "reported_status": "MAINTENANCE",
        "http_status": -1, "response_time_ms": -1,
        "hardware_id_b64": "R0FNTUFfTEJfSFdfMDAz",
        "hardware_id_valid": True, "hardware_id_decoded": "GAMMA_LB_HW_003",
        "hardware_id_reason": None, "timestamp": "2024-03-01T12:16:00Z",
        "parse_warnings": ["http_status is missing or null — defaulted to -1"],
    },
    # ── Case 7: ATTACK (invalid Base64 in hardware ID) ────────────────────
    {
        "_label":    "Case 7 — ATTACK (invalid Base64 hardware ID)",
        "_expected": "ATTACK",
        "log_id": "TEST-007", "node_id": "NODE-010",
        "node_name": "Kappa Backup", "region": "AP-SOUTH",
        "schema_version": 1, "schema_known": True,
        "reported_status": "OPERATIONAL",
        "http_status": 200, "response_time_ms": 290,
        "hardware_id_b64": "!!!INVALID_BASE64###",
        "hardware_id_valid": False, "hardware_id_decoded": None,
        "hardware_id_reason": "Invalid Base64 format — contains illegal characters",
        "timestamp": "2024-03-01T12:14:00Z",
        "parse_warnings": ["hardware_id issue: Invalid Base64 format"],
    },
    # ── Case 8: ATTACK (unknown schema version) ───────────────────────────
    {
        "_label":    "Case 8 — ATTACK (unknown schema v99 + http_status=-1 fallback)",
        "_expected": "ATTACK",
        "log_id": "TEST-008", "node_id": "NODE-009",
        "node_name": "Iota Monitoring", "region": "US-EAST",
        "schema_version": 99, "schema_known": False,
        "reported_status": "UNKNOWN",
        "http_status": -1, "response_time_ms": -1,
        "hardware_id_b64": "SU9UQV9NT05fSFdfMDA5",
        "hardware_id_valid": True, "hardware_id_decoded": "IOTA_MON_HW_009",
        "hardware_id_reason": None, "timestamp": "2024-03-01T12:13:00Z",
        "parse_warnings": ["Unknown schema_version=99 — fields may not map correctly",
                           "http_status is missing or null — defaulted to -1"],
    },
    # ── Case 9: SUSPICIOUS elevated_latency does NOT fire when >= 3000ms ──
    {
        "_label":    "Case 9 — HIGH_RISK (latency 3000ms, elevated_latency must NOT fire)",
        "_expected": "HIGH_RISK",
        "_extra_check": "elevated_latency_not_in_rule_ids",
        "log_id": "TEST-009", "node_id": "NODE-004",
        "node_name": "Delta Router", "region": "US-WEST",
        "schema_version": 2, "schema_known": True,
        "reported_status": "OPERATIONAL",
        "http_status": 200, "response_time_ms": 3000,
        "hardware_id_b64": "REVMVEFFRGRFX0VER0VfUk9VVEVS",
        "hardware_id_valid": True, "hardware_id_decoded": "DELTA_EDGE_ROUTER",
        "hardware_id_reason": None, "timestamp": "2024-03-01T12:08:00Z",
        "parse_warnings": [],
    },
]


# ──────────────────────────────────────────────
# UNIT TEST RUNNER
# ──────────────────────────────────────────────

def run_unit_tests() -> bool:
    """Run all unit test cases. Returns True if all pass."""
    print("=" * 68)
    print("  AEGIS — Detection Engine Unit Tests")
    print("=" * 68)

    passed = 0
    failed = 0

    for tc in TEST_CASES:
        # Never mutate the original dict — use a clean copy
        test_input = {k: v for k, v in tc.items() if not k.startswith("_")}
        label    = tc["_label"]
        expected = tc["_expected"]
        extra    = tc.get("_extra_check")

        alert = evaluate_log(test_input)

        if alert is None:
            print(f"\n  ❌ FAIL  [{label}]")
            print(f"     evaluate_log() returned None — log was skipped")
            failed += 1
            continue

        actual = alert["alert_level"]
        level_ok = actual == expected

        # Extra check: verify elevated_latency NOT in rule_ids when latency >= 3000ms
        extra_ok = True
        extra_msg = ""
        if extra == "elevated_latency_not_in_rule_ids":
            if "elevated_latency" in alert["rule_ids"]:
                extra_ok = False
                extra_msg = " | EXTRA FAIL: elevated_latency fired at >= 3000ms (double-fire bug!)"

        overall_ok = level_ok and extra_ok
        status = "✅ PASS" if overall_ok else "❌ FAIL"

        print(f"\n  {status}  [{label}]")
        print(f"     Expected level   : {expected}")
        print(f"     Got level        : {actual}   (severity={alert['severity_score']}, confidence={alert['confidence_score']}%)")
        print(f"     Is anomaly       : {alert['is_anomaly']}")
        print(f"     Primary reason   : {alert['primary_reason']}")
        print(f"     Rule IDs fired   : {alert['rule_ids']}")
        if extra_msg:
            print(f"     {extra_msg}")

        if overall_ok:
            passed += 1
        else:
            failed += 1

    print("\n" + "=" * 68)
    print(f"  Results: {passed} passed, {failed} failed out of {len(TEST_CASES)} tests")
    print("=" * 68)
    return failed == 0


def run_batch_test():
    """Run detect_all() over a batch and print summary + save alerts.json."""
    print("\n" + "=" * 68)
    print("  AEGIS — Batch Detection + Metrics Test")
    print("=" * 68)

    batch = [
        {"log_id": "B-001", "node_id": "NODE-010", "node_name": "Kappa", "region": "AP-SOUTH",
         "schema_version": 2, "schema_known": True, "reported_status": "OPERATIONAL",
         "http_status": 200, "response_time_ms": 290,
         "hardware_id_b64": "S0FQUEFCQUNLVVBIQVNIX0hXXzAxMA==",
         "hardware_id_valid": True, "hardware_id_decoded": "KAPPA_HW",
         "hardware_id_reason": None, "timestamp": "2024-03-01T12:00:00Z", "parse_warnings": []},
        {"log_id": "B-002", "node_id": "NODE-001", "node_name": "Alpha", "region": "US-EAST",
         "schema_version": 1, "schema_known": True, "reported_status": "OPERATIONAL",
         "http_status": 500, "response_time_ms": 4200,
         "hardware_id_b64": "TUFMV0FSRV9QQVlMT0FEX3Yy",
         "hardware_id_valid": False, "hardware_id_decoded": "MALWARE_PAYLOAD_v2",
         "hardware_id_reason": "Malicious pattern detected: 'MALWARE'",
         "timestamp": "2024-03-01T12:05:00Z", "parse_warnings": []},
        {"log_id": "B-003", "node_id": "NODE-006", "node_name": "Zeta", "region": "US-EAST",
         "schema_version": 3, "schema_known": True, "reported_status": "OPERATIONAL",
         "http_status": 200, "response_time_ms": 3500,
         "hardware_id_b64": "WkVUQV9ETlNfSFdfMDA2",
         "hardware_id_valid": True, "hardware_id_decoded": "ZETA_HW",
         "hardware_id_reason": None, "timestamp": "2024-03-01T12:10:00Z", "parse_warnings": []},
        {"log_id": "B-004", "node_id": "NODE-002", "node_name": "Beta", "region": "EU-WEST",
         "schema_version": 2, "schema_known": True, "reported_status": "OPERATIONAL",
         "http_status": 200, "response_time_ms": 1800,
         "hardware_id_b64": "Tk9ERTAwMl9IV19JRA==",
         "hardware_id_valid": True, "hardware_id_decoded": "BETA_HW",
         "hardware_id_reason": None, "timestamp": "2024-03-01T12:06:00Z", "parse_warnings": []},
    ]

    alerts, summary = detect_all(batch)
    print("\n  Metrics Summary:")
    print(json.dumps(summary, indent=4))

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    os.makedirs(out_dir, exist_ok=True)
    alerts_path = os.path.join(out_dir, "alerts_test.json")
    with open(alerts_path, "w", encoding="utf-8") as f:
        json.dump(alerts, f, indent=2)
    print(f"\n  [TEST] Test alerts saved to: {alerts_path}")


if __name__ == "__main__":
    all_passed = run_unit_tests()
    run_batch_test()
    sys.exit(0 if all_passed else 1)
