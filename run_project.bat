@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo       DeepGuard AI - Automatic Project Starter
echo ======================================================

:: --- Backend Setup ---
echo [1/3] Setting up Backend...
cd backend

if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Activating virtual environment and installing requirements...
call .venv\Scripts\activate
pip install -r requirements.txt

echo Regenerating metrics...
python generate_metrics.py

:: Start Backend in a new minimized window
echo Starting Backend server...
start /min "DeepGuard Backend" cmd /c "call .venv\Scripts\activate && python app.py"

cd ..

:: --- Frontend Setup ---
echo.
echo [2/3] Setting up Frontend...
cd frontend

if not exist node_modules (
    echo Installing npm dependencies (this may take a minute)...
    call npm install
)

:: --- Finalize ---
echo.
echo [3/3] Launching Project...
echo Backend is running at http://localhost:5000
echo Frontend is starting...

:: Run frontend in the current window
npm run dev

pause
