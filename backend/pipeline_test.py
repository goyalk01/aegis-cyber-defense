"""
pipeline_test.py — AEGIS Quick Smoke Test
Run this to verify the full normalization pipeline works end-to-end.
Usage: python pipeline_test.py
"""

import json
import os
import sys

# Ensure backend directory is on path when running from root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from loader import load_all
from normalizer import normalize_all

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def run():
    print("=" * 60)
    print("  AEGIS — Data Normalization Pipeline Smoke Test")
    print("=" * 60)

    # ── Load all datasets ──────────────────────────────────────────
    logs, nodes, schemas = load_all(DATA_DIR)

    if not logs:
        print("\n[TEST] FAIL: No logs loaded. Check data/system_logs.json")
        return

    # ── Run normalization pipeline ─────────────────────────────────
    normalized = normalize_all(logs, nodes, schemas)

    print(f"\n[TEST] Total normalized records: {len(normalized)}")
    print("-" * 60)

    # ── Print each result ──────────────────────────────────────────
    for entry in normalized:
        warnings = entry.get("parse_warnings", [])
        hw_valid = entry.get("hardware_id_valid")
        hw_decoded = entry.get("hardware_id_decoded")

        print(f"\n  Log ID  : {entry['log_id']}")
        print(f"  Node    : {entry['node_id']} ({entry['node_name']}) [{entry['region']}]")
        print(f"  Schema  : v{entry['schema_version']} (known={entry['schema_known']})")
        print(f"  Status  : reported='{entry['reported_status']}' | http={entry['http_status']}")
        print(f"  Latency : {entry['response_time_ms']} ms")
        print(f"  HW ID   : valid={hw_valid} | decoded='{hw_decoded}'")
        print(f"  Time    : {entry['timestamp']}")
        if warnings:
            for w in warnings:
                print(f"  ⚠  WARN  : {w}")

    print("\n" + "=" * 60)
    print(f"  DONE — {len(normalized)} logs normalized successfully.")
    print("=" * 60)

    # ── Save output to file for inspection ─────────────────────────
    output_path = os.path.join(DATA_DIR, "normalized_logs.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(normalized, f, indent=2)
    print(f"\n[TEST] Output saved to: {output_path}")


if __name__ == "__main__":
    run()
