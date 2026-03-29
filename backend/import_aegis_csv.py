"""
Import Aegis CSV dataset from backend/data into pipeline JSON files.

Inputs:
  - data/system_logs.csv
  - data/node_registry.csv
  - data/schema_config.csv

Outputs:
  - data/system_logs.json
  - data/node_registry.json
  - data/schema_versions.json
"""

from __future__ import annotations

import base64
import csv
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

SYSTEM_LOGS_CSV = DATA_DIR / "system_logs.csv"
NODE_REGISTRY_CSV = DATA_DIR / "node_registry.csv"
SCHEMA_CONFIG_CSV = DATA_DIR / "schema_config.csv"

SYSTEM_LOGS_JSON = DATA_DIR / "system_logs.json"
NODE_REGISTRY_JSON = DATA_DIR / "node_registry.json"
SCHEMA_VERSIONS_JSON = DATA_DIR / "schema_versions.json"

REGIONS = [
    "US-EAST",
    "US-WEST",
    "EU-WEST",
    "EU-NORTH",
    "AP-SOUTH",
    "AP-EAST",
]


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(str(value).strip()))
    except Exception:
        return default


def read_csv(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


def backup_if_exists(path: Path) -> None:
    if path.exists():
        backup = path.with_suffix(path.suffix + ".bak")
        backup.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")


def parse_schema_config(rows: list[dict[str, Any]]) -> list[dict[str, int]]:
    schema_starts: list[dict[str, int]] = []
    for row in rows:
        version = safe_int(row.get("version"), 1)
        time_start = safe_int(row.get("time_start"), 0)
        schema_starts.append({"version": version, "time_start": time_start})
    schema_starts.sort(key=lambda x: x["time_start"])
    return schema_starts


def infer_schema_version(log_id: int, starts: list[dict[str, int]]) -> int:
    chosen = starts[0]["version"] if starts else 1
    for item in starts:
        if log_id >= item["time_start"]:
            chosen = item["version"]
    return chosen


def normalize_node_registry(rows: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    node_map: dict[int, dict[str, Any]] = {}
    base_time = datetime(2026, 3, 1, tzinfo=timezone.utc)

    for idx, row in enumerate(rows):
        values: list[str] = []
        for k, v in row.items():
            if k is None:
                if isinstance(v, list):
                    values.extend([str(x).strip() for x in v if x is not None and str(x).strip()])
            elif v is not None and str(v).strip():
                values.append(str(v).strip())

        node_num = idx
        user_agent = "AEGIS-Node/2.0"
        node_uuid = ""
        infected = "False"

        # Common case from this dataset: id,user_agent,node_uuid,is_infected
        if len(values) >= 4 and values[0].isdigit():
            node_num = safe_int(values[0], idx)
            user_agent = values[1]
            node_uuid = values[2]
            infected = values[3]
        # Fallback if id column is absent: node_uuid,user_agent,is_infected
        elif len(values) >= 3:
            if values[0].startswith("U04"):
                node_num = idx
                node_uuid = values[0]
                user_agent = values[1]
                infected = values[2]
            else:
                node_num = idx
                user_agent = values[0]
                node_uuid = values[1]
                infected = values[2]

        # Some rows pack user-agent and Base64 token into one field.
        # Example: "AEGIS-Node/2.0 (Linux) U04tOTI4MA=="
        if (not node_uuid or "AEGIS-Node" in node_uuid) and user_agent:
            combined = f"{user_agent} {node_uuid}".strip()
            match = re.search(r"([A-Za-z0-9+/]{8,}={0,2})$", combined)
            if match:
                node_uuid = match.group(1)
                user_agent = combined[: match.start()].strip() or "AEGIS-Node/2.0"

        if not node_uuid:
            node_uuid = base64.b64encode(f"SN-{node_num}".encode("utf-8")).decode("utf-8")

        region = REGIONS[node_num % len(REGIONS)]
        node_id = f"NODE-{node_num:03d}"

        node_map[node_num] = {
            "node_id": node_id,
            "node_name": f"Aegis Node {node_num:03d}",
            "ip_address": f"10.42.{node_num // 256}.{node_num % 256}",
            "hardware_id_b64": node_uuid,
            "region": region,
            "registered_at": (base_time + timedelta(minutes=node_num)).isoformat().replace("+00:00", "Z"),
            "is_infected": infected.lower() == "true",
            "user_agent": user_agent,
        }

    return node_map


def normalize_system_logs(
    rows: list[dict[str, Any]],
    schema_starts: list[dict[str, int]],
    node_map: dict[int, dict[str, Any]],
) -> list[dict[str, Any]]:
    base_time = datetime(2026, 3, 1, tzinfo=timezone.utc)
    logs: list[dict[str, Any]] = []

    for i, row in enumerate(rows):
        raw_log_id = row.get("log_id")
        log_num = safe_int(raw_log_id, i)

        raw_node_id = str(row.get("node_id", "")).strip()
        node_num = safe_int(raw_node_id, 0)
        node_id = f"NODE-{node_num:03d}"

        schema_version = infer_schema_version(log_num, schema_starts)
        status = str(row.get("json_status") or "UNKNOWN").strip()
        http_code = safe_int(row.get("http_response_code"), -1)
        latency = safe_int(row.get("response_time_ms"), -1)

        node_info = node_map.get(node_num)
        hardware_id = node_info.get("hardware_id_b64") if node_info else None

        common = {
            "log_id": f"LOG-{log_num:06d}",
            "node_id": node_id,
            "schema_version": schema_version,
            "hardware_id_b64": hardware_id,
            "timestamp": (base_time + timedelta(seconds=log_num)).isoformat().replace("+00:00", "Z"),
        }

        if schema_version == 1:
            common.update(
                {
                    "status": status,
                    "http_code": http_code,
                    "latency": latency,
                }
            )
        else:
            common.update(
                {
                    "node_status": status,
                    "response_code": http_code,
                    "response_ms": latency,
                }
            )

        logs.append(common)

    return logs


def build_schema_versions(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    versions: list[dict[str, Any]] = []
    for row in rows:
        version = safe_int(row.get("version"), 1)
        field_map = (
            {
                "reported_status": "status",
                "http_status": "http_code",
                "response_time_ms": "latency",
            }
            if version == 1
            else {
                "reported_status": "node_status",
                "http_status": "response_code",
                "response_time_ms": "response_ms",
            }
        )

        versions.append(
            {
                "version": version,
                "field_map": field_map,
                "active_since": f"t={safe_int(row.get('time_start'), 0)}",
                "deprecated": version == 1,
            }
        )

    versions.sort(key=lambda x: x["version"])
    return versions


def main() -> None:
    if not SYSTEM_LOGS_CSV.exists() or not NODE_REGISTRY_CSV.exists() or not SCHEMA_CONFIG_CSV.exists():
        raise FileNotFoundError("Missing one or more CSV inputs in backend/data")

    schema_rows = read_csv(SCHEMA_CONFIG_CSV)
    node_rows = read_csv(NODE_REGISTRY_CSV)
    log_rows = read_csv(SYSTEM_LOGS_CSV)

    schema_starts = parse_schema_config(schema_rows)
    node_map = normalize_node_registry(node_rows)
    logs = normalize_system_logs(log_rows, schema_starts, node_map)

    # Ensure all log nodes exist in node_registry
    for log in logs:
        node_num = safe_int(str(log["node_id"]).replace("NODE-", ""), -1)
        if node_num >= 0 and node_num not in node_map:
            node_map[node_num] = {
                "node_id": f"NODE-{node_num:03d}",
                "node_name": f"Aegis Node {node_num:03d}",
                "ip_address": f"10.42.{node_num // 256}.{node_num % 256}",
                "hardware_id_b64": base64.b64encode(f"SN-{node_num}".encode("utf-8")).decode("utf-8"),
                "region": REGIONS[node_num % len(REGIONS)],
                "registered_at": datetime(2026, 3, 1, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
                "is_infected": False,
                "user_agent": "AEGIS-Node/2.0",
            }

    node_registry = list(sorted(node_map.values(), key=lambda n: n["node_id"]))
    schema_versions = build_schema_versions(schema_rows)

    for out in (SYSTEM_LOGS_JSON, NODE_REGISTRY_JSON, SCHEMA_VERSIONS_JSON):
        backup_if_exists(out)

    SYSTEM_LOGS_JSON.write_text(json.dumps(logs, indent=2), encoding="utf-8")
    NODE_REGISTRY_JSON.write_text(json.dumps(node_registry, indent=2), encoding="utf-8")
    SCHEMA_VERSIONS_JSON.write_text(json.dumps(schema_versions, indent=2), encoding="utf-8")

    print(f"Imported logs: {len(logs)}")
    print(f"Imported nodes: {len(node_registry)}")
    print(f"Imported schema versions: {len(schema_versions)}")
    print("Updated backend/data/system_logs.json")
    print("Updated backend/data/node_registry.json")
    print("Updated backend/data/schema_versions.json")


if __name__ == "__main__":
    main()
