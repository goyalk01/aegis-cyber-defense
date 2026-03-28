# AEGIS — Cyber-Infrastructure Defense System

> **Detect the truth beneath the lies. A full-stack security platform that exposes hidden threats in deceptive infrastructure logs.**

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Overview

**AEGIS** is a complete cyber-infrastructure defense system that detects hidden attacks in infrastructure logs — even when the logs themselves are designed to deceive.

- **Problem**: Compromised nodes report `"status": "Operational"` while returning HTTP 500 errors
- **Solution**: Ignore reported status, analyze ground-truth signals (HTTP codes, latency, hardware fingerprints)
- **Result**: Deterministic, rule-based threat detection with zero false trust

Traditional monitoring trusts what logs *say*. AEGIS trusts what logs *reveal*.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAW DATA SOURCES                                  │
│         system_logs.json  │  node_registry.json  │  schema_versions.json   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │   STEP 1: DATA ENGINEERING        │
                    │   loader.py → normalizer.py       │
                    │   • Schema-aware normalization    │
                    │   • Multi-version field mapping   │
                    │   • Base64 validation pipeline    │
                    │   → normalized_logs.json          │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │   STEP 2: DETECTION ENGINE        │
                    │   rules.py → evaluator.py         │
                    │   → detector.py                   │
                    │   • 7 deterministic rules         │
                    │   • Priority-based classification │
                    │   • Severity + confidence scoring │
                    │   → alerts.json + metrics.json    │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │   STEP 3: API LAYER               │
                    │   FastAPI + Uvicorn               │
                    │   • RESTful endpoints             │
                    │   • Standardized responses        │
                    │   • Pipeline orchestration        │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │   STEP 4: FRONTEND DASHBOARD      │
                    │   Next.js + TypeScript + Tailwind │
                    │   • Real-time threat visualization│
                    │   • Interactive node status map   │
                    │   • Auto-refresh + dark/light mode│
                    └─────────────────────────────────────┘
```

---

## Core Features

| Layer | Feature | Description |
|-------|---------|-------------|
| **Data** | Schema Normalization | v1/v2/v3 field mapping via `schema_versions.json` |
| **Data** | Base64 Pipeline | 5-stage validation: format → decode → UTF-8 → keyword scan → safe storage |
| **Data** | Sentinel Handling | Missing fields default to `-1`, correctly interpreted downstream |
| **Detection** | Rule Engine | 7 deterministic rules, priority-ordered (ATTACK > HIGH_RISK > SUSPICIOUS > CLEAN) |
| **Detection** | Severity Scoring | 0-100 score: base + rule bonuses, capped at max |
| **Detection** | Confidence Scoring | `min(rules_fired × 25, 100)` — more rules = higher confidence |
| **API** | Standardized Responses | `{ status, data, timestamp, version, request_id, processing_time_ms }` |
| **API** | Filtering & Pagination | Query alerts by level, region, node_id with limits |
| **Frontend** | Interactive Dashboard | Metrics cards, node map, heatmap, alerts table, summary panel |
| **Frontend** | Auto-Refresh | 15-second polling with duplicate prevention |
| **Safety** | Type Guards | Strict enum validation, numeric safety guards, data sanitization |

---

## Detection Logic

### Rule Priority: `ATTACK > HIGH_RISK > SUSPICIOUS > CLEAN`

| Level | Rule | Trigger Condition |
|-------|------|-------------------|
| **ATTACK** | `status_contradiction` | Reports "OPERATIONAL" but HTTP ≥ 400 |
| **ATTACK** | `server_error` | HTTP status ≥ 500 |
| **ATTACK** | `invalid_hardware_id` | Base64 decode fails or contains malware keywords |
| **ATTACK** | `unknown_http_status` | HTTP status missing (sentinel -1) |
| **HIGH_RISK** | `extreme_latency` | Response time ≥ 3000ms |
| **SUSPICIOUS** | `elevated_latency` | Response time 1500-2999ms |

### Example Detection

```
INPUT:
  { "status": "Operational", "http_code": 500, "latency": 4200,
    "hardware_id_b64": "TUFMV0FSRV9QQVlMT0FE" }

DECODED HARDWARE ID: "MALWARE_PAYLOAD" → INVALID

RULES FIRED:
  ✅ status_contradiction (OPERATIONAL + HTTP 500)
  ✅ server_error (HTTP ≥ 500)
  ✅ invalid_hardware_id (malware keyword detected)
  ✅ extreme_latency (4200ms ≥ 3000ms)

OUTPUT:
  alert_level: ATTACK
  severity_score: 100
  confidence_score: 100%
```

---

## API Documentation

**Base URL**: `http://127.0.0.1:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API status |
| `GET` | `/health` | Health check |
| `GET` | `/alerts` | Get alerts (supports `?level=`, `?region=`, `?node_id=`, `?limit=`) |
| `GET` | `/metrics` | Pipeline metrics and statistics |
| `GET` | `/summary` | Combined metrics + top critical alerts |
| `POST` | `/run-pipeline` | Execute detection pipeline |

### Response Format

```json
{
  "status": "success",
  "data": {
    "total": 13,
    "alerts": [...]
  },
  "timestamp": "2026-03-28T12:00:00Z",
  "version": "1.0",
  "request_id": "a1b2c3d4",
  "processing_time_ms": 12.5
}
```

---

## Frontend Dashboard

| Component | Description |
|-----------|-------------|
| **Metrics Cards** | Total logs, attacks, high risk, suspicious, clean, threat rate |
| **Node Status Map** | Grid view of nodes with latest alert status + hover tooltips |
| **Response Time Chart** | Bar chart of latency per node (Recharts) |
| **Alerts Table** | Sortable, filterable table with severity bars |
| **Summary Panel** | Critical alerts, nodes under attack, threat distribution |
| **Run Pipeline** | One-click pipeline execution with loading states |

**Features**:
- Dark mode (default) + Light mode
- Auto-refresh every 15 seconds
- Local filtering (no API re-calls)
- Responsive design (mobile → desktop)

---

## Safety & Reliability

### Type Safety Guards

```typescript
// Strict enum validation - prevents silent UI bugs
validateAlertLevel(level) → "ATTACK" | "HIGH_RISK" | "SUSPICIOUS" | "CLEAN"

// Numeric guards - prevents NaN/chart crashes
safeNumber(value, fallback)      → validated number
safePercentage(value, fallback)  → 0-100 clamped
safePositiveInt(value, fallback) → >= 0 integer
```

### Security Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| **No code execution** | Base64 content is scanned, never `eval()`ed |
| **Malware detection** | Keyword scan: MALWARE, PAYLOAD, EXPLOIT, INJECT, BACKDOOR, etc. |
| **Fault tolerance** | Every stage wrapped in try/catch, bad data skipped |
| **Data sanitization** | All API responses sanitized before frontend use |
| **Pipeline idempotency** | Same input always produces same output |

---

## Project Structure

```
aegis/
├── backend/
│   ├── app.py                  # FastAPI entry point
│   ├── main.py                 # Pipeline orchestrator
│   ├── loader.py               # JSON data loader
│   ├── normalizer.py           # Schema normalization
│   ├── rules.py                # Detection thresholds
│   ├── evaluator.py            # Rule evaluation functions
│   ├── detector.py             # Detection engine
│   ├── api/
│   │   ├── routes.py           # HTTP endpoints
│   │   └── service.py          # Business logic
│   └── data/
│       ├── system_logs.json
│       ├── node_registry.json
│       ├── schema_versions.json
│       └── [generated outputs]
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── page.tsx        # Dashboard page
│   │   ├── components/         # UI components
│   │   ├── lib/
│   │   │   ├── api.ts          # API client + sanitizers
│   │   │   └── utils.ts        # Type guards + helpers
│   │   └── types/              # TypeScript interfaces
│   └── package.json
│
└── README.md
```

---

## How to Run

### Prerequisites

```bash
Python 3.10+
Node.js 18+
```

### Backend

```bash
cd backend
pip install fastapi uvicorn
uvicorn app:app --reload
```

Open: **http://127.0.0.1:8000/docs** (Swagger UI)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## Testing & Validation

| Test | Command | Coverage |
|------|---------|----------|
| Detection Tests | `python detection_test.py` | 9 test cases covering all alert levels |
| Pipeline Test | `python pipeline_test.py` | End-to-end normalization smoke test |
| Build Validation | `npm run build` | TypeScript + production build |

### Test Cases

- CLEAN: Healthy log, no rules fire
- SUSPICIOUS: Latency 1500-2999ms
- HIGH_RISK: Latency ≥ 3000ms
- ATTACK: HTTP 500 + deceptive status + malicious hardware ID
- Edge cases: Invalid Base64, unknown schema, missing fields

---

## Performance

| Metric | Implementation |
|--------|----------------|
| **O(n) processing** | Single-pass normalization + detection |
| **O(1) lookups** | Pre-built registry and schema maps |
| **Lightweight API** | File-based reads, no database overhead |
| **Request tracking** | Unique request_id + processing_time_ms |
| **Auto-refresh safety** | Duplicate call prevention with useRef |

---

## Hackathon Context

### Problem

Modern cyber attacks exploit the gap between **reported state** and **actual behavior**. A node can claim "Operational" while returning HTTP 500 errors and injecting malware through Base64-encoded hardware IDs.

### Approach

- **Zero Trust**: Never trust status strings, only ground-truth signals
- **Deterministic**: Rule-based detection, no ML black boxes
- **Full Stack**: Complete system from data ingestion to visualization
- **Production-Grade**: Type safety, error handling, data sanitization

### Why AEGIS Wins

1. **Engineering Depth**: 4-step pipeline with clear separation of concerns
2. **Real-World Logic**: Detection rules based on actual attack patterns
3. **Complete System**: Not just a demo — fully integrated backend + frontend
4. **Safety First**: Type guards, validation, sanitization at every layer

---

## Future Scope

- **Real-Time Streaming**: WebSocket push for live alerts
- **ML Enhancement**: Anomaly detection models trained on alert patterns
- **Cloud Deployment**: Kubernetes-ready containerization
- **Multi-Tenant**: Organization-scoped data isolation

---

## Author

**Krish Goyal**
GitHub: [github.com/goyalk01](https://github.com/goyalk01)

---

<div align="center">

*"Trust the HTTP code. Never trust the status string."*

**AEGIS — The Shield That Sees Through Lies.**

</div>
