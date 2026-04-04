@echo off
REM ══════════════════════════════════════════════════════════════════════════════
REM AEGIS - Cyber Attribution Engine - Run Full Stack (Windows)
REM ══════════════════════════════════════════════════════════════════════════════
REM Usage: run.bat [--backend-only | --frontend-only]

setlocal EnableDelayedExpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║     AEGIS - Cyber-Infrastructure Attribution Engine          ║
echo ║     ML-Powered Threat Detection ^& Attribution                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Parse arguments
set BACKEND_ONLY=false
set FRONTEND_ONLY=false
if "%1"=="--backend-only" set BACKEND_ONLY=true
if "%1"=="--frontend-only" set FRONTEND_ONLY=true

REM Check if Python exists
if "%FRONTEND_ONLY%"=="false" (
    where python >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Python not found. Please install Python 3.10+
        pause
        exit /b 1
    )
)

REM Check if Node exists
if "%BACKEND_ONLY%"=="false" (
    where npm >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Node.js not found. Please install Node.js 18+
        pause
        exit /b 1
    )
)

REM Start Backend
if "%FRONTEND_ONLY%"=="false" (
    echo [1/2] Starting Backend (FastAPI on port 8000^)...
    cd backend
    start cmd /k "title AEGIS Backend && python -m venv venv 2>nul && call venv\Scripts\activate && pip install -r requirements.txt -q && echo. && echo [BACKEND] Running ML pipeline... && python main.py 2>nul && echo. && echo [BACKEND] Server starting... && uvicorn app:app --reload --host 127.0.0.1 --port 8000"
    cd ..

    REM Wait for backend to start
    echo      Waiting for backend to initialize...
    timeout /t 5 /nobreak >nul
)

REM Start Frontend
if "%BACKEND_ONLY%"=="false" (
    echo [2/2] Starting Frontend (Next.js on port 3000^)...
    cd frontend
    start cmd /k "title AEGIS Frontend && npm install --silent && echo. && echo [FRONTEND] Server starting... && npm run dev"
    cd ..
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  AEGIS is starting up...                                     ║
echo ╠══════════════════════════════════════════════════════════════╣
if "%FRONTEND_ONLY%"=="false" (
    echo ║  Backend:   http://127.0.0.1:8000                            ║
    echo ║  API Docs:  http://127.0.0.1:8000/docs                       ║
)
if "%BACKEND_ONLY%"=="false" (
    echo ║  Frontend:  http://localhost:3000                            ║
)
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Pages:                                                      ║
echo ║    /           - Dashboard Overview                          ║
echo ║    /graph      - Network Graph Visualization                 ║
echo ║    /attribution - Command Node Analysis                      ║
echo ║    /fingerprints - Behavioral Patterns                       ║
echo ║    /analytics  - ML Analytics ^& Statistics                   ║
echo ║    /alerts     - Alert Log Table                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul

endlocal
