# 🛡️ AEGIS — Cyber-Infrastructure Defense

> **Detect the truth beneath the lies. Hunt threats hiding inside "Operational" systems.**

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Hackathon--Ready-orange)]()

---

## 🚀 Overview

**AEGIS** is a deterministic, rule-based cyber-infrastructure defense pipeline that detects hidden attacks in infrastructure logs — even when the logs themselves are designed to deceive.

Traditional monitoring trusts what logs *say*. AEGIS trusts what logs *reveal*.

| Aspect | Value |
|--------|-------|
| **Input** | Raw, multi-schema JSON system logs |
| **Output** | Classified alerts (ATTACK / HIGH_RISK / SUSPICIOUS / CLEAN) + metrics |
| **Approach** | Schema normalization → rule-based anomaly detection |
| **Dependencies** | Zero external libraries — 100% Python standard library |

---

## ⚠️ Problem Statement

Modern cyber attacks exploit the gap between **what a system reports** and **what it actually does**:

- A compromised node reports `"status": "Operational"` while returning HTTP `500`
- A malicious process injects Base64-encoded payloads into hardware fingerprint fields
- Response time spikes to 4000ms while logs claim the node is "healthy"
- JSON schemas change across versions — a single field has 3 different names

**Traditional monitoring fails because it reads the status field. AEGIS reads the HTTP code.**

---

## 💡 Solution Approach

AEGIS extracts ground truth from contradictions:

```
Reported State  ──→  (IGNORED as untrusted)
HTTP Status     ──→  Ground truth signal #1
Response Time   ──→  Ground truth signal #2
Hardware ID     ──→  Ground truth signal #3 (Base64 decoded + scanned)
Schema Version  ──→  Dynamic mapping → always resolves to canonical fields
```

All classification is **deterministic and rule-based** — no ML, no ambiguity, fully auditable.

---

## 🧱 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RAW DATA SOURCES                          │
│   node_registry.json │ system_logs.json │ schema_versions.json │
└──────────────────────────┬──────────────────────────────────────┘
                           │
             ┌─────────────▼─────────────┐
             │     loader.py             │  Fault-tolerant JSON loader
             │  + utils.py               │  Safe casts, Base64 pipeline
             └─────────────┬─────────────┘
                           │
             ┌─────────────▼─────────────┐
             │    normalizer.py          │  Schema-aware field extraction
             │                           │  O(1) registry + schema lookups
             │  → normalized_logs.json   │  Unified NormalizedLog structure
             └─────────────┬─────────────┘
                           │
             ┌─────────────▼─────────────┐
             │  rules.py + evaluator.py  │  Configurable rule registry
             │  + detector.py            │  Priority-ordered classification
             │                           │  Severity + confidence scoring
             │  → alerts.json            │  Classified alerts
             │  → metrics.json           │  Aggregate statistics
             └───────────────────────────┘
```

---

## ⚙️ Core Features

| Feature | Detail |
|---------|--------|
| **Schema-aware normalization** | v1/v2/v3 field names dynamically resolved via `schema_versions.json` |
| **Multi-version log handling** | All schema versions collapse into one canonical `NormalizedLog` structure |
| **5-stage Base64 pipeline** | Format check → decode → UTF-8 → malicious keyword scan → clean |
| **Rule-based anomaly detection** | 7 deterministic rules, zero model drift |
| **Multi-reason alerts** | Every triggered rule adds a human-readable reason string |
| **Priority-ordered classification** | `ATTACK > HIGH_RISK > SUSPICIOUS > CLEAN` — never downgrades |
| **Severity scoring** | 0–100 score: base per level + bonus per triggered rule, capped at 100 |
| **Confidence scoring** | `min(rules_fired × 25, 100)` — 1 rule = 25%, 4+ rules = 100% |
| **Fault tolerance** | Every stage wrapped in `try/except` — bad logs skipped, pipeline never crashes |
| **Sentinel handling** | Missing int fields default to `-1`; detection engine interprets correctly |

---

## 🧠 Detection Logic

### Rule Priority: `ATTACK > HIGH_RISK > SUSPICIOUS > CLEAN`

All rules are evaluated. The **highest-priority rule that fires** determines the final level. All reasons are accumulated regardless.

---

### 🚨 ATTACK (any one condition)

| Rule | Condition | Why |
|------|-----------|-----|
| `status_contradiction` | `reported_status == "OPERATIONAL"` AND `http_status >= 400` | Node lies about health |
| `server_error` | `http_status >= 500` | Server crash, always critical |
| `invalid_hardware_id` | `hardware_id_valid == False` | Corrupted or malicious payload |
| `unknown_http_status` | `http_status == -1` (sentinel) | Health unverifiable — hostile assumption |

### 🔥 HIGH_RISK

| Rule | Condition |
|------|-----------|
| `extreme_latency` | `response_time_ms >= 3000ms` |

### ⚠️ SUSPICIOUS

| Rule | Condition |
|------|-----------|
| `elevated_latency` | `1500ms ≤ response_time_ms < 3000ms` |

> **Note:** `elevated_latency` and `extreme_latency` are **mutually exclusive** — no double-firing.

---

### Quick Example

```json
Input log (Schema v1):
{ "status": "Operational", "http_code": 500, "latency": 4200,
  "hardware_id_b64": "TUFMV0FSRV9QQVlMT0FEX3Yy" }

Decoded hardware_id: "MALWARE_PAYLOAD_v2" → INVALID

Rules fired:
  ✅ status_contradiction  (OPERATIONAL + HTTP 500)
  ✅ server_error          (HTTP 500 ≥ 500)
  ✅ invalid_hardware_id   (decoded: MALWARE_PAYLOAD_v2)
  ✅ extreme_latency       (4200ms ≥ 3000ms)

Result:
  alert_level    → ATTACK
  severity_score → 100  (capped)
  confidence     → 100%
```

---

## 📂 Project Structure

```
aegis/
├── backend/
│   ├── main.py              # 🔗 Full pipeline entry point + FastAPI helpers
│   ├── loader.py            # 📥 Fault-tolerant JSON file loader
│   ├── utils.py             # 🛠️ safe_int, safe_str, Base64 validator, timestamp
│   ├── normalizer.py        # 🔄 Schema mapping + unified NormalizedLog builder
│   ├── rules.py             # ⚙️ All thresholds + severity config (edit here to tune)
│   ├── evaluator.py         # 🔍 Pure rule functions — one per rule, fully testable
│   ├── detector.py          # 🚨 Orchestrator: apply_rules → level → score → alert
│   ├── detection_test.py    # ✅ 9 unit tests covering all classification cases
│   └── data/
│       ├── node_registry.json      # Node metadata (name, region, hardware ID)
│       ├── system_logs.json        # Raw logs (3 schema versions + edge cases)
│       ├── schema_versions.json    # Field name mappings per version
│       ├── normalized_logs.json    # ← Generated by pipeline
│       ├── alerts.json             # ← Generated by pipeline
│       └── metrics.json            # ← Generated by pipeline
└── README.md
```

---

## ▶️ How to Run

### Prerequisites

```bash
Python 3.10+   # No pip install required — zero external dependencies
```

### Run the Full Pipeline

```bash
cd backend
python main.py
```

**What this does:**
1. Loads `node_registry.json`, `system_logs.json`, `schema_versions.json`
2. Normalizes all logs → saves `data/normalized_logs.json`
3. Runs detection engine → saves `data/alerts.json` + `data/metrics.json`
4. Prints a summary to stdout

### Run Unit Tests

```bash
cd backend
python detection_test.py
```

Expected output: **9/9 tests pass** with `✅ PASS` markers.

### Normalization Smoke Test Only

```bash
cd backend
python pipeline_test.py
```

---

## 📊 Sample Output

### Alert (from `alerts.json`)

```json
{
  "log_id":           "LOG-1001",
  "node_id":          "NODE-001",
  "node_name":        "Alpha Server",
  "region":           "US-EAST",
  "timestamp":        "2024-03-01T12:05:00Z",
  "ingestion_time":   "2024-03-01T12:05:01Z",
  "alert_level":      "ATTACK",
  "severity_score":   100,
  "confidence_score": 100,
  "is_anomaly":       true,
  "primary_reason":   "Deceptive node: reports OPERATIONAL but HTTP=500 (>= 400)",
  "reasons": [
    "Deceptive node: reports OPERATIONAL but HTTP=500 (>= 400)",
    "Server failure: HTTP=500 (>= 500)",
    "Invalid hardware ID: Malicious pattern detected: 'MALWARE'",
    "Extreme latency: 4200ms (>= 3000ms threshold)"
  ],
  "rule_ids": ["status_contradiction", "server_error", "invalid_hardware_id", "extreme_latency"],
  "source_data": {
    "reported_status":    "OPERATIONAL",
    "http_status":        500,
    "response_time_ms":   4200,
    "hardware_id_b64":    "TUFMV0FSRV9QQVlMT0FEX3Yy",
    "hardware_id_valid":  false,
    "hardware_id_decoded":"MALWARE_PAYLOAD_v2",
    "schema_version":     1,
    "schema_known":       true
  },
  "parse_warnings": []
}
```

### Metrics (from `metrics.json`)

```json
{
  "total_logs_processed": 13,
  "attack_count":          5,
  "high_risk_count":       1,
  "suspicious_count":      2,
  "clean_count":           5,
  "avg_response_time_ms":  1847.3,
  "invalid_hw_count":      3,
  "nodes_under_attack":   ["NODE-001", "NODE-005", "NODE-007"],
  "schema_versions_seen": [1, 2, 3]
}
```

---

## 🧪 Testing

**Test file:** [`detection_test.py`](backend/detection_test.py)

| # | Case | Validates |
|---|------|-----------|
| 1 | CLEAN | Healthy log → no rules fire |
| 2 | SUSPICIOUS | Latency 1800ms → `elevated_latency` fires |
| 3 | HIGH_RISK | Latency 3500ms → `extreme_latency` fires |
| 4 | ATTACK | HTTP 500 + deceptive status + malicious HW ID |
| 5 | ATTACK (multi) | HTTP 502 + bad hardware ID |
| 6 | ATTACK | `http_status = -1` sentinel → health unverifiable |
| 7 | ATTACK | Invalid Base64 format in hardware ID |
| 8 | ATTACK | Unknown schema version → `http_status` falls to -1 |
| 9 | Regression | Latency 3000ms → `elevated_latency` must NOT double-fire |

**Edge cases specifically covered:** null fields, invalid Base64, unknown schema version, sentinel `-1` handling, type coercion from strings.

---

## 🔐 Security & Reliability

### Base64 Safety
The 5-stage hardware ID validation pipeline **never executes decoded content**:
```
Format check → Decode bytes → UTF-8 decode → Keyword scan → Safe storage
```
Decoded strings are stored as data evidence only. `eval()`, `exec()`, and `os.system()` are never called.

**Malicious keyword list:** `MALWARE`, `PAYLOAD`, `EXPLOIT`, `INJECT`, `SHELL`, `CMD`, `EXEC`, `BACKDOOR`, `ROOTKIT`, `TROJAN`, `RANSOMWARE`, `KEYLOG`

### Fault Tolerance
- **Loader:** `FileNotFoundError` + `JSONDecodeError` → returns `[]`, never raises
- **Normalizer:** Unknown schema → v1 fallback; missing field → sentinel default; outer `try/except` per log
- **Detector:** Per-rule `try/except` + per-log `try/except` → never crashes on bad data

### Sentinel Contract

| Field | Sentinel | Step 2 Behaviour |
|-------|----------|-----------------|
| `http_status` | `-1` | Fires `unknown_http_status` → **ATTACK** |
| `response_time_ms` | `-1` | Skips all latency rules — no false penalty |
| `hardware_id_valid` | `False` / `None` | Fires `invalid_hardware_id` → **ATTACK** |

---

## ⚡ Performance

- **O(n) single-pass** processing — one loop over logs for normalize + detect
- **O(1) dict lookups** — `registry_map[node_id]` and `schema_map[version]` pre-built before the loop
- **Zero external dependencies** — no install, no cold-start latency from package loading
- **In-memory state** — `main.py` holds `alerts` and `metrics_summary` for zero-latency API reads

---

## 🏆 Hackathon Context

Built for the **AEGIS Cyber-Infrastructure Defense** challenge.

Design philosophy:
- **Correctness over complexity** — deterministic rules, auditable results
- **Simplicity over overengineering** — zero ML, zero external libraries
- **Truth over reported state** — HTTP codes + latency over status strings

The system handles every edge case the challenge dataset can produce: schema version mismatches, null fields, malformed Base64, missing node metadata, and sentinel fallbacks — without a single unhandled exception.

---

## 🚀 Future Enhancements

- **Step 3 — FastAPI REST API:** `GET /alerts`, `GET /metrics`, `POST /logs` (live ingestion)
- **Step 4 — Dashboard UI:** Next.js + Recharts alert table, sleeper heatmap, status summary cards
- **Real-time processing:** WebSocket push for live alert streaming
- **Schema Console:** Dynamic multi-version schema tracker in the UI
- **Exportable reports:** CSV/JSON alert export with filtering

---

## 👨‍💻 Author

**Krish Goyal**  
GitHub: [@goyalk01](https://github.com/goyalk01)  
Repository: [github.com/goyalk01/aegis-cyber-defense](https://github.com/goyalk01/aegis-cyber-defense)

---

<div align="center">

*"Trust the HTTP code. Never trust the status string."*

**AEGIS — The Shield That Sees Through Lies.**

</div>
