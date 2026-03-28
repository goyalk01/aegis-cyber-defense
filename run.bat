@echo off
REM ══════════════════════════════════════════════════════════════════════════════
REM AEGIS - Run Full Stack (Windows)
REM ══════════════════════════════════════════════════════════════════════════════

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║        AEGIS Cyber-Infrastructure Defense System             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Start Backend
echo [1/2] Starting Backend (FastAPI)...
cd backend
start cmd /k "title AEGIS Backend && python -m venv venv 2>nul && call venv\Scripts\activate && pip install -r requirements.txt -q && uvicorn app:app --reload"
cd ..

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [2/2] Starting Frontend (Next.js)...
cd frontend
start cmd /k "title AEGIS Frontend && npm install && npm run dev"
cd ..

echo.
echo ══════════════════════════════════════════════════════════════════
echo   Backend:  http://127.0.0.1:8000
echo   API Docs: http://127.0.0.1:8000/docs
echo   Frontend: http://localhost:3000
echo ══════════════════════════════════════════════════════════════════
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul
