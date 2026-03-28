#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AEGIS - Run Full Stack (Mac/Linux)
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        AEGIS Cyber-Infrastructure Defense System             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Start Backend
echo -e "${BLUE}[1/2] Starting Backend (FastAPI)...${NC}"
cd backend
python3 -m venv venv 2>/dev/null
source venv/bin/activate
pip install -r requirements.txt -q
uvicorn app:app --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start Frontend
echo -e "${BLUE}[2/2] Starting Frontend (Next.js)...${NC}"
cd frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "  Backend:  ${GREEN}http://127.0.0.1:8000${NC}"
echo -e "  API Docs: ${GREEN}http://127.0.0.1:8000/docs${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
