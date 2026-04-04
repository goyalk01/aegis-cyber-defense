#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# AEGIS Backend - Production Start Script
# For Render.com deployment
# ══════════════════════════════════════════════════════════════════════════════

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     AEGIS - Cyber Attribution Engine (Backend)               ║"
echo "║     ML-Powered Threat Detection & Attribution                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Use PORT from environment (Render sets this), fallback to 10000
PORT="${PORT:-10000}"

echo "[AEGIS] Starting production server on port $PORT..."
echo "[AEGIS] Health check: /health"
echo "[AEGIS] API docs: /docs"
echo ""

# Run with Gunicorn for production (with uvicorn workers)
if command -v gunicorn &> /dev/null; then
    echo "[AEGIS] Using Gunicorn with Uvicorn workers..."
    exec gunicorn app:app \
        --bind "0.0.0.0:$PORT" \
        --workers 2 \
        --worker-class uvicorn.workers.UvicornWorker \
        --timeout 120 \
        --keep-alive 5 \
        --access-logfile - \
        --error-logfile -
else
    echo "[AEGIS] Using Uvicorn directly..."
    exec uvicorn app:app \
        --host 0.0.0.0 \
        --port "$PORT" \
        --workers 1 \
        --timeout-keep-alive 120
fi
