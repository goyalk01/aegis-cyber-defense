# AEGIS — Quick Setup Guide

## Prerequisites

- **Python** 3.10+
- **Node.js** 18+
- **npm** 9+

---

## One-Click Run (Recommended)

### Windows
```bash
run.bat
```

### Mac/Linux
```bash
chmod +x run.sh
./run.sh
```

---

## Manual Setup

### Backend (Terminal 1)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app:app --reload
```

**Backend URL**: http://127.0.0.1:8000
**API Docs**: http://127.0.0.1:8000/docs

---

### Frontend (Terminal 2)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

**Frontend URL**: http://localhost:3000

---

## Verify Installation

1. Open http://127.0.0.1:8000/health → Should return `{"status": "success"}`
2. Open http://localhost:3000 → Should show AEGIS Dashboard
3. Click "Run Pipeline" button → Should process data and show alerts

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8000 in use | `uvicorn app:app --reload --port 8001` |
| Port 3000 in use | `npm run dev -- -p 3001` |
| Python not found | Install Python 3.10+ from python.org |
| Node not found | Install Node.js 18+ from nodejs.org |
| Module not found | Re-run `pip install -r requirements.txt` |

---

## Project Structure

```
aegis/
├── backend/
│   ├── app.py              # API entry point
│   ├── main.py             # Pipeline orchestrator
│   ├── requirements.txt    # Python dependencies
│   └── data/               # JSON data files
│
├── frontend/
│   ├── src/                # React components
│   ├── package.json        # Node dependencies
│   └── .env.example        # Environment template
│
├── run.bat                 # Windows run script
├── run.sh                  # Mac/Linux run script
├── SETUP.md                # This file
└── README.md               # Full documentation
```
