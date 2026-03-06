@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo       DeepGuard AI - Automatic Project Starter
echo ======================================================

:: --- Virtual Environment Setup ---
echo.
echo [1/3] Setting up Virtual Environment...

if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Activating virtual environment...
call .venv\Scripts\activate


:: --- Frontend Setup ---
echo.
echo [2/3] Setting up Frontend...
cd frontend

if not exist node_modules (
    echo Installing npm dependencies, this may take a minute...
    call npm install
)

:: Start Frontend in a new window
echo Starting Frontend dev server...
start "DeepGuard Frontend" cmd /k "npm run dev"

cd ..

:: --- Backend Setup ---
echo.
echo [3/3] Starting Backend...
cd backend

:: Start Backend in a new window
echo Starting Backend server...
start "DeepGuard Backend" cmd /k "call ..\.venv\Scripts\activate && python app.py"

cd ..

:: --- Finalize ---
echo.
echo ======================================================
echo       DeepGuard AI - All Services Running!
echo ======================================================
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000
echo.
echo   (Close this window or press any key to stop)
echo ======================================================
pause >nul
