"""
loader.py — AEGIS Data Pipeline
Responsibility: Load all 3 JSON datasets from disk. Validate structure. Return raw data.
Never crashes — wraps all I/O and JSON errors in try/except.
"""

import json
import os
import sys
from typing import Any

# ──────────────────────────────────────────────
# REQUIRED KEYS per dataset (minimum validation)
# ──────────────────────────────────────────────
REQUIRED_LOG_KEYS = {"log_id", "node_id", "schema_version"}
REQUIRED_NODE_KEYS = {"node_id"}
REQUIRED_SCHEMA_KEYS = {"version", "field_map"}


def load_json_file(filepath: str, dataset_name: str) -> list[dict]:
    """
    Load a JSON file and return its contents as a list of dicts.
    Returns an empty list on any failure (file not found, invalid JSON, wrong type).
    """
    if not os.path.exists(filepath):
        print(f"[LOADER] ERROR: File not found — {filepath}", file=sys.stderr)
        return []

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"[LOADER] ERROR: Invalid JSON in {dataset_name} — {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"[LOADER] ERROR: Could not read {dataset_name} — {e}", file=sys.stderr)
        return []

    if not isinstance(data, list):
        print(
            f"[LOADER] ERROR: {dataset_name} must be a JSON array, got {type(data).__name__}",
            file=sys.stderr,
        )
        return []

    print(f"[LOADER] OK: Loaded {len(data)} records from {dataset_name}")
    return data


def validate_records(records: list[dict], required_keys: set, dataset_name: str) -> list[dict]:
    """
    Filter out records that are missing any required key.
    Logs a warning per skipped record. Returns valid records only.
    """
    valid = []
    for i, record in enumerate(records):
        if not isinstance(record, dict):
            print(
                f"[LOADER] WARN: {dataset_name}[{i}] is not a dict — skipping",
                file=sys.stderr,
            )
            continue
        missing = required_keys - record.keys()
        if missing:
            rec_id = record.get("log_id") or record.get("node_id") or f"index={i}"
            print(
                f"[LOADER] WARN: {dataset_name} record '{rec_id}' missing keys {missing} — skipping",
                file=sys.stderr,
            )
            continue
        valid.append(record)
    return valid


def load_all(data_dir: str = "data") -> tuple[list[dict], list[dict], list[dict]]:
    """
    Master loader. Loads and validates all 3 datasets.

    Returns:
        (system_logs, node_registry, schema_versions)
        Any of these may be empty lists on failure — pipeline handles it gracefully.
    """
    logs_raw = load_json_file(os.path.join(data_dir, "system_logs.json"), "system_logs")
    nodes_raw = load_json_file(os.path.join(data_dir, "node_registry.json"), "node_registry")
    schemas_raw = load_json_file(os.path.join(data_dir, "schema_versions.json"), "schema_versions")

    logs = validate_records(logs_raw, REQUIRED_LOG_KEYS, "system_logs")
    nodes = validate_records(nodes_raw, REQUIRED_NODE_KEYS, "node_registry")
    schemas = validate_records(schemas_raw, REQUIRED_SCHEMA_KEYS, "schema_versions")

    print(
        f"[LOADER] Summary → logs={len(logs)}, nodes={len(nodes)}, schemas={len(schemas)}"
    )
    return logs, nodes, schemas
