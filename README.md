<p align="center">
  <img src="https://img.shields.io/badge/AEGIS-Cyber%20Defense-6366f1?style=for-the-badge&logo=shield&logoColor=white" alt="AEGIS Badge" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🛡️ AEGIS</h1>
<h3 align="center">Cyber-Infrastructure Defense System</h3>
<p align="center">
  <strong>Real-Time Threat Detection · Deterministic Security · Zero-Dependency Backend</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-system-architecture">Architecture</a> ·
  <a href="#-api-documentation">API Docs</a> ·
  <a href="#-dashboard">Dashboard</a> ·
  <a href="#-detection-logic">Detection Logic</a>
</p>

---

## 🧠 Overview

**AEGIS** (Advanced Enforcement & Guardian Infrastructure System) is a full-stack cybersecurity platform that ingests raw infrastructure telemetry, normalizes heterogeneous log schemas, runs a deterministic multi-rule detection engine, and surfaces threats through a real-time dashboard — all without a single ML dependency.

Most detection systems rely on opaque machine learning models. AEGIS takes a fundamentally different approach: **every alert is explainable, every rule is auditable, and every classification is reproducible**. If the same log enters the pipeline twice, it will always produce the same alert with the same severity score.

### Why It Matters--

Modern infrastructure generates telemetry across dozens of schema versions, regions, and node types. AEGIS solves three critical problems:

1. **Schema Drift** — Logs from different versions use different field names (`http_code` vs `response_code`). AEGIS normalizes them into a single canonical format before detection.
2. **Deceptive Nodes** — Compromised nodes often report `OPERATIONAL` status while returning HTTP 500 errors. AEGIS catches these contradictions.
3. **Hidden Payloads** — Base64-encoded hardware IDs can conceal malware signatures. AEGIS decodes and scans them safely — without ever executing the content.

---

## ⚡ Core Features

| Category | Feature | Description |
|----------|---------|-------------|
| 🔄 **Ingestion** | Multi-format loader | Loads CSV and JSON datasets with full validation |
| 📐 **Normalization** | Schema-aware mapping | Translates v1/v2/v3+ field names into a unified canonical structure |
| 🔍 **Detection** | 7-rule engine | Status contradiction, server errors, sentinel detection, latency tiers, Base64 malware scan, schema warnings |
| 📊 **Scoring** | Severity + Confidence | Composite 0–100 scores with per-rule bonus stacking |
| 🌐 **API** | RESTful + Swagger | 6 endpoints with filtering, pagination, standard response envelope |
| 🖥️ **Dashboard** | Real-time UI | Metrics cards, alert log, forensic topology map, response-time heatmap, threat distribution |
| 🎨 **Theming** | Dark + Light mode | CSS variable-based theme system with `localStorage` persistence |
| ♻️ **Auto-refresh** | 15-second polling | Dashboard silently re-fetches alerts, metrics, and summary every 15 seconds |
| 🛡️ **Safety** | Zero eval/exec | Decoded payloads are treated as data only — never executed |

---

## 🧩 System Architecture

AEGIS follows a strict 4-step pipeline. Each step is a separate module with a single responsibility. Data flows forward — never backward.

```
┌────────────────────────────────────────────────────────────────────┐
│                        AEGIS PIPELINE                              │
│                                                                    │
│  ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌─────────────┐  │
│  │  STEP 1  │──▶│    STEP 2   │──▶│  STEP 3 │──▶│   STEP 4    │  │
│  │  Loader  │   │  Normalizer  │   │ Detector │   │     API     │  │
│  │  + CSV   │   │  + Schema    │   │ + Rules  │   │  + FastAPI  │  │
│  │  Import  │   │    Mapper    │   │ + Scorer │   │  + Service  │  │
│  └──────────┘   └──────────────┘   └──────────┘   └──────┬──────┘  │
│                                                           │        │
│                                                    ┌──────▼──────┐ │
│                                                    │   STEP 5    │ │
│                                                    │  Dashboard  │ │
│                                                    │  (Next.js)  │ │
│                                                    └─────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### Step 1 — Data Engineering (`loader.py` + `import_aegis_csv.py`)

- Loads 3 JSON datasets: `system_logs.json`, `node_registry.json`, `schema_versions.json`
- Validates required keys per dataset (`log_id`, `node_id`, `schema_version` for logs)
- CSV importer (`import_aegis_csv.py`) converts raw CSV telemetry into pipeline-ready JSON
- Handles schema versioning: v1 logs use `http_code`/`latency`, v2+ use `response_code`/`response_ms`
- Never crashes — returns empty lists on failure with stderr logging

### Step 2 — Normalization Engine (`normalizer.py` + `utils.py`)

- Builds O(1) lookup maps from `node_registry` and `schema_versions`
- Maps each raw log through its schema version's `field_map` to extract canonical fields
- Performs safe Base64 decode → UTF-8 → malicious keyword scan on hardware IDs
- Tags every log with `parse_warnings[]` for soft errors (missing fields, unknown schemas)
- Sentinels: `-1` for missing `http_status` and `response_time_ms`

### Step 3 — Detection Engine (`evaluator.py` + `detector.py` + `rules.py`)

- 7 registered rule evaluators, each a pure function: `(log) → (triggered: bool, reason: str)`
- Priority cascade: `ATTACK > HIGH_RISK > SUSPICIOUS > CLEAN`
- Multi-reason accumulation — a single log can trigger multiple rules simultaneously
- Severity score: base (0–80) + per-rule bonus stacking, capped at 100
- Confidence score: `min(triggered_rules × 25, 100)`

### Step 4 — API Layer (`app.py` + `routes.py` + `service.py`)

- FastAPI application with CORS, Swagger UI (`/docs`), and ReDoc (`/redoc`)
- Service layer reads from persisted JSON files — API is stateless and restartable
- Standard response envelope: `{ status, data, timestamp, version, request_id, processing_time_ms }`
- Pipeline can be triggered via `POST /run-pipeline` from the dashboard

### Step 5 — Frontend Dashboard (`Next.js` + `Tailwind CSS`)

- Server-connected React SPA that consumes the API
- 8 components: Navbar, MetricsCards, AlertsTable, CityMap, Heatmap, SummaryPanel, RunPipelineButton, ThemeToggle
- All API data passes through sanitizer functions before rendering — no raw access to backend fields
- Defensive null coalescing on every numeric value

---

## 🔗 Data Flow

```
CSV Files                    JSON Datasets               Normalized Logs
────────────                 ──────────────              ─────────────────
system_logs.csv    ──┐
node_registry.csv  ──┼──▶  import_aegis_csv.py  ──▶  system_logs.json
schema_config.csv  ──┘                               node_registry.json
                                                      schema_versions.json
                                                            │
                                                            ▼
                                                      loader.py (load + validate)
                                                            │
                                                            ▼
                                                      normalizer.py
                                                      (schema mapping + Base64 scan)
                                                            │
                                                            ▼
                                                      detector.py (7 rules)
                                                       ┌────┴────┐
                                                       │         │
                                                  alerts.json  metrics.json
                                                       │         │
                                                       └────┬────┘
                                                            ▼
                                                      FastAPI (/alerts /metrics /summary)
                                                            │
                                                            ▼
                                                      Next.js Dashboard
                                                      (auto-refresh 15s)
```

---

## 🔐 Detection Logic

### Rules

AEGIS evaluates 7 rules against every normalized log. Each rule is a pure function in `evaluator.py` with its threshold defined in `rules.py`.

| # | Rule ID | Level | Trigger Condition | Description |
|---|---------|-------|-------------------|-------------|
| 1 | `status_contradiction` | ATTACK | `reported_status == "OPERATIONAL"` AND `http_status >= 400` | Deceptive node — lies about being healthy |
| 2 | `server_error` | ATTACK | `http_status >= 500` | Server-side failure, always critical |
| 3 | `invalid_hardware_id` | ATTACK | `hardware_id_valid == False` | Base64 decode failed or malicious keyword detected |
| 4 | `unknown_http_status` | ATTACK | `http_status == -1` (sentinel) | Missing HTTP status — node health unverifiable |
| 5 | `extreme_latency` | HIGH_RISK | `response_time_ms >= 3000` | Potential DoS or resource exhaustion |
| 6 | `elevated_latency` | SUSPICIOUS | `1500 <= response_time_ms < 3000` | Early-stage anomaly (mutually exclusive with #5) |
| 7 | `schema_unknown` | INFO | `schema_known == False` | Unknown schema version — adds reason only, no level change |

### Severity Scoring

```
severity_score = min(base_score + Σ(rule_bonuses), 100)
```

| Alert Level | Base Score | Example Rule Bonuses |
|-------------|-----------|---------------------|
| ATTACK | 80 | `status_contradiction` +10, `server_error` +10, `invalid_hardware_id` +15 |
| HIGH_RISK | 50 | `extreme_latency` +8 |
| SUSPICIOUS | 25 | `elevated_latency` +5 |
| CLEAN | 0 | — |

### Confidence Scoring

```
confidence_score = min(triggered_rules_count × 25, 100)
```

| Rules Triggered | Confidence |
|----------------|------------|
| 1 | 25% |
| 2 | 50% |
| 3 | 75% |
| 4+ | 100% |

### Priority Logic

The engine walks the priority order `ATTACK → HIGH_RISK → SUSPICIOUS → CLEAN` and returns the **first level** with at least one triggered rule. Once ATTACK is found, evaluation short-circuits.

### Base64 Malware Detection Pipeline

```
1. Existence check    → Is the field present and non-empty?
2. Format validation  → Does it match [A-Za-z0-9+/]+=* ?
3. Decode attempt     → base64.b64decode() with padding correction
4. UTF-8 conversion   → Can we read it as text?
5. Keyword scan       → Check against 12 known malicious patterns:
                         MALWARE, PAYLOAD, EXPLOIT, INJECT, SHELL, CMD,
                         EXEC, BACKDOOR, ROOTKIT, TROJAN, RANSOMWARE, KEYLOG
```

> ⚠️ **Safety guarantee**: Decoded payloads are stored as evidence strings. They are **never** passed to `eval()`, `exec()`, or `os.system()`.

---

## 🌐 API Documentation

**Base URL**: `http://127.0.0.1:8000` &nbsp; | &nbsp; **Swagger**: `http://127.0.0.1:8000/docs`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API status + available endpoints |
| `GET` | `/health` | Health check — returns `{ service: "healthy" }` |
| `GET` | `/alerts` | Detection alerts with filtering + pagination |
| `GET` | `/metrics` | Pipeline metrics summary with enriched percentages |
| `GET` | `/summary` | Combined overview — metrics + top 5 critical alerts + nodes under attack |
| `POST` | `/run-pipeline` | Trigger full pipeline re-execution |

### GET `/alerts`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | string | Filter: `ATTACK`, `HIGH_RISK`, `SUSPICIOUS`, `CLEAN` |
| `region` | string | Filter by region (case-insensitive) |
| `node_id` | string | Filter by exact node ID |
| `limit` | int | Max results (1–100, default 50) |

**Response:**
```json
{
  "status": "success",
  "data": {
    "total": 42,
    "limit": 50,
    "alerts": [
      {
        "log_id": "LOG-000001",
        "node_id": "NODE-001",
        "node_name": "Aegis Node 001",
        "region": "US-EAST",
        "timestamp": "2026-03-01T00:00:01Z",
        "ingestion_time": "2026-03-28T12:00:00Z",
        "alert_level": "ATTACK",
        "severity_score": 100,
        "confidence_score": 75,
        "is_anomaly": true,
        "primary_reason": "Server failure: HTTP=500 (>= 500)",
        "reasons": ["..."],
        "rule_ids": ["server_error", "status_contradiction", "invalid_hardware_id"],
        "source_data": { "..." },
        "parse_warnings": []
      }
    ]
  },
  "timestamp": "2026-03-28T12:00:00Z",
  "version": "1.0",
  "request_id": "a1b2c3d4",
  "processing_time_ms": 12.5
}
```

### GET `/metrics`

**Response `data` fields:**
```
total_logs, total_alerts, attack_count, high_risk_count,
suspicious_count, clean_count, attack_percentage,
high_risk_percentage, threat_percentage, total_nodes,
invalid_hw_count, avg_response_time_ms, nodes_under_attack[],
schema_versions_seen[]
```

### GET `/summary`

Returns a combined view with:
- `metrics` — key counts and percentages
- `critical_alerts` — top 5 ATTACK + HIGH_RISK alerts sorted by severity
- `nodes_under_attack` — list of node IDs currently classified as ATTACK

### POST `/run-pipeline`

Triggers the full pipeline: Load → Normalize → Detect → Save. Returns execution summary.

---

## 🖥️ Dashboard

The AEGIS frontend is a Next.js 14 application with 8 purpose-built components:

### Component Architecture

| Component | Purpose |
|-----------|---------|
| `Navbar` | Sticky top bar with AEGIS branding, system status indicator, last-updated timestamp, theme toggle |
| `MetricsCards` | 6-card grid — Total Logs, Attacks, High Risk, Suspicious, Clean, Threat Rate |
| `AlertsTable` | Filterable, paginated alert log with severity progress bars and color-coded badges |
| `CityMap` | Interactive forensic topology map — nodes positioned via deterministic hashing, filtered by HTTP status class (2xx/4xx/5xx), with zoom/pan and tooltip overlays |
| `Heatmap` | Recharts horizontal bar chart — response time per node with threshold-based color coding |
| `SummaryPanel` | Critical alerts feed, nodes-under-attack chips, threat distribution bar, quick stats |
| `RunPipelineButton` | Stateful button with idle/running/success/error transitions and loading spinner |
| `ThemeToggle` | Dark/Light mode toggle with `localStorage` persistence |

### UI Features

- **Dark mode** (default) — deep charcoal palette optimized for low-light monitoring
- **Light mode** — clean white theme for daytime use
- **Auto-refresh** — all data silently re-fetches every 15 seconds
- **Skeleton loading** — animated placeholders while data loads
- **Tooltips** — hover any node on the topology map for forensic detail
- **Responsive layout** — adapts from mobile to wide desktop

---

## ⚙️ Tech Stack

### Backend

| Technology | Role |
|------------|------|
| **Python 3.10+** | Core language — Standard Library only for pipeline logic |
| **FastAPI** | HTTP framework with automatic OpenAPI/Swagger docs |
| **Uvicorn** | ASGI server for production deployment |

> 💡 The pipeline modules (`loader`, `normalizer`, `utils`, `evaluator`, `detector`, `rules`) use **zero external dependencies** — only Python's Standard Library (`json`, `os`, `base64`, `re`, `datetime`).

### Frontend

| Technology | Role |
|------------|------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Strict typing across all components and API contracts |
| **Tailwind CSS 3.4** | Utility-first styling with CSS variable theme system |
| **Recharts** | Response-time heatmap visualization |
| **Lucide React** | Icon library for UI elements |
| **clsx + tailwind-merge** | Conditional class composition |

---

## 📂 Project Structure

```
aegis/
├── backend/
│   ├── app.py                    # FastAPI entry point (CORS, Swagger, lifespan)
│   ├── main.py                   # Pipeline orchestrator (load → normalize → detect → save)
│   ├── loader.py                 # JSON loader with required-key validation
│   ├── normalizer.py             # Schema-aware field mapping + Base64 pipeline
│   ├── utils.py                  # Safe type casting, Base64 decoder, malware scanner
│   ├── rules.py                  # Centralized thresholds + severity config
│   ├── evaluator.py              # 7 pure-function rule evaluators + RULE_EVALUATORS table
│   ├── detector.py               # Alert builder + severity/confidence scoring + batch runner
│   ├── import_aegis_csv.py       # CSV → JSON importer for raw telemetry datasets
│   ├── pipeline_test.py          # End-to-end normalization smoke test
│   ├── detection_test.py         # 9-case unit test suite for classification correctness
│   ├── requirements.txt          # fastapi, uvicorn
│   ├── start.sh                  # Production start script (Render)
│   ├── api/
│   │   ├── routes.py             # Endpoint definitions (GET/POST handlers)
│   │   └── service.py            # Business logic, file I/O, response builders
│   └── data/
│       ├── system_logs.csv       # Raw telemetry (CSV source)
│       ├── node_registry.csv     # Node metadata (CSV source)
│       ├── schema_config.csv     # Schema version boundaries
│       ├── system_logs.json      # Pipeline-ready log records
│       ├── node_registry.json    # Node metadata (JSON)
│       ├── schema_versions.json  # Field maps per schema version
│       ├── normalized_logs.json  # Output of Step 2
│       ├── alerts.json           # Output of Step 3
│       └── metrics.json          # Aggregate metrics
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Dashboard page — data fetching + component composition
│   │   │   ├── layout.tsx        # Root layout (dark mode default)
│   │   │   └── globals.css       # CSS variable theme system (light + dark)
│   │   ├── components/
│   │   │   ├── Navbar.tsx        # Sticky navigation bar
│   │   │   ├── MetricsCards.tsx   # 6-card metric grid with skeleton loading
│   │   │   ├── AlertsTable.tsx   # Filterable alert log with severity bars
│   │   │   ├── CityMap.tsx       # Interactive forensic topology map
│   │   │   ├── Heatmap.tsx       # Recharts response-time bar chart
│   │   │   ├── SummaryPanel.tsx  # Critical alerts + threat distribution + stats
│   │   │   ├── RunPipelineButton.tsx  # Stateful pipeline trigger
│   │   │   ├── ThemeToggle.tsx   # Dark/Light mode switcher
│   │   │   └── index.ts         # Barrel export
│   │   ├── lib/
│   │   │   ├── api.ts           # API client + data sanitizers
│   │   │   └── utils.ts         # Alert level validation, formatting, color mapping
│   │   └── types/
│   │       ├── alert.ts         # Alert + AlertsResponse interfaces
│   │       ├── metrics.ts       # Metrics interface
│   │       ├── summary.ts       # Summary + CriticalAlerts interfaces
│   │       └── index.ts         # Barrel export
│   ├── .env.example             # NEXT_PUBLIC_API_URL template
│   ├── package.json             # Dependencies
│   ├── tailwind.config.ts       # Theme token mapping
│   ├── tsconfig.json            # TypeScript configuration
│   └── next.config.js           # Next.js settings
│
├── run.bat                      # One-click Windows launcher
├── run.sh                       # One-click Mac/Linux launcher
├── SETUP.md                     # Quick setup guide
└── README.md                    # This file
```

---

## ▶️ Quick Start

### Prerequisites

- **Python** 3.10+
- **Node.js** 18+
- **npm** 9+

### One-Click Launch

```bash
# Windows
run.bat

# Mac/Linux
chmod +x run.sh && ./run.sh
```

### Manual Setup

**Terminal 1 — Backend:**

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload
```

> Backend: http://127.0.0.1:8000 &nbsp; | &nbsp; Swagger: http://127.0.0.1:8000/docs

**Terminal 2 — Frontend:**

```bash
cd frontend
cp .env.example .env.local          # Or set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm install
npm run dev
```

> Frontend: http://localhost:3000

### Verify

1. `http://127.0.0.1:8000/health` → `{ "status": "success", "data": { "service": "healthy" } }`
2. `http://localhost:3000` → AEGIS Dashboard loads
3. Click **Run Pipeline** → data processes and populates all panels

---

## 🌍 Deployment

### Backend → Render

| Setting | Value |
|---------|-------|
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app:app --host 0.0.0.0 --port 10000` |
| Python Version | 3.10+ |

### Frontend → Vercel

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `.next` |

### Environment Variables

| Variable | Where | Value |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | Frontend (`.env.local` / Vercel) | `https://your-backend.onrender.com` |

---

## 🧪 Testing

### Detection Test Suite (`detection_test.py`)

9 test cases covering all classification paths:

| Case | Expected Level | Scenario |
|------|---------------|----------|
| 1 | CLEAN | All fields healthy |
| 2 | SUSPICIOUS | Latency 1800ms (in 1500–2999ms band) |
| 3 | HIGH_RISK | Latency 3500ms (≥ 3000ms) |
| 4 | ATTACK | HTTP 500 + deceptive status + malicious hardware ID |
| 5 | ATTACK | HTTP 502 + malicious hardware ID |
| 6 | ATTACK | Missing HTTP status (sentinel -1) |
| 7 | ATTACK | Invalid Base64 hardware ID |
| 8 | ATTACK | Unknown schema v99 + missing HTTP |
| 9 | HIGH_RISK | Latency exactly 3000ms — verifies `elevated_latency` does NOT double-fire |

```bash
cd backend
python detection_test.py    # Unit + batch tests
python pipeline_test.py     # End-to-end normalization smoke test
```

### Pipeline Test (`pipeline_test.py`)

Runs the full normalization pipeline against live data and prints each normalized record with warnings.

---

## 🛡️ Security & Reliability

| Measure | Implementation |
|---------|--------------|
| **No `eval()` / `exec()`** | Decoded Base64 payloads are stored as strings only — never executed |
| **Safe Base64 decode** | 5-stage pipeline: existence → format → decode → UTF-8 → malware scan |
| **Sentinel handling** | `-1` = missing field — triggers `unknown_http_status` ATTACK rule |
| **Catch-all exception guards** | Every log is wrapped in `try/except` — one bad record never crashes the pipeline |
| **Pure function evaluators** | Each rule is stateless and side-effect free — testable in isolation |
| **Input validation** | Required-key checks on all 3 datasets before processing |
| **Deterministic output** | Same input → same alerts, scores, and reasons — always |

---

## 📊 Performance

| Metric | Complexity | Details |
|--------|-----------|---------|
| Node registry lookup | **O(1)** | Pre-built hash map from `node_registry` |
| Schema version lookup | **O(1)** | Pre-built hash map from `schema_versions` |
| Log normalization | **O(n)** | Single-pass iteration over all logs |
| Detection engine | **O(n × r)** | n logs × 7 rules (r is constant) |
| Alert sorting | **O(n log n)** | Sorted by `severity_score` descending |
| Backend pipeline deps | **0** | `loader`, `normalizer`, `utils`, `evaluator`, `detector`, `rules` — all Python Standard Library |

---

## 🏆 Why AEGIS Stands Out

| Factor | Detail |
|--------|--------|
| **No Black Box** | Every alert comes with human-readable `reasons[]` and `rule_ids[]` — auditability over opacity |
| **Schema Evolution** | Handles field name drift across versions via the `field_map` system — not hardcoded field access |
| **Multi-Reason Alerts** | A single node can trigger 4+ rules simultaneously — all captured in one alert, not fragmented |
| **Zero-Trust Base64** | Doesn't just decode — performs a 5-stage validation including malware keyword scanning |
| **Full Stack, One Person Week** | Backend + API + Frontend + Tests + CSV Importer + Deployment — built as a cohesive system |
| **Real-World Topology** | Forensic topology map with deterministic hashing, zoom/pan, and HTTP-status-class filtering |

---

## 🔮 Future Scope

- **ML Anomaly Layer** — Supervised model on top of the deterministic engine for baseline learning
- **Real-Time Streaming** — WebSocket push for instant alert delivery (replace polling)
- **Database Backend** — PostgreSQL / TimescaleDB for historical analysis and time-series queries
- **RBAC** — Role-based access control for multi-team SOC environments
- **Alert Correlation** — Cross-node pattern detection (e.g., coordinated latency spikes across regions)
- **SIEM Export** — Syslog / CEF / STIX format output for integration with Splunk, Sentinel, etc.
- **Prometheus Metrics** — `/metrics` endpoint in OpenMetrics format for Grafana dashboards

---

## 👨‍💻 Authors

- **Krish Goyal**
- **Abhinav Atul**
- **Akshat Singh**
- **Sejal Mishra**

---

## ⭐ Support

If AEGIS helped you or impressed you — consider giving it a **star** ⭐

```
Every star tells us someone cares about transparent, explainable security.
```

Pull requests, feature ideas, and feedback are welcome.
Open an issue or reach out — we'd love to hear from you.

---

<p align="center">
  <strong>AEGIS</strong> — Because security should be deterministic, not probabilistic.
</p>
