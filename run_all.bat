@echo off
title Indian Language Speech-to-Text Launcher
echo ===================================================
echo   Indian Language Speech-to-Text & Translation AI
echo ===================================================
echo.
echo [1/2] Launching Backend Server in a new window...
start "Backend (FastAPI)" cmd /k "%~dp0run_backend.bat"

echo [2/2] Launching Frontend Server in a new window...
start "Frontend (Vite + React)" cmd /k "%~dp0run_frontend.bat"

echo.
echo Both servers are starting up!
echo - Frontend: http://localhost:5173
echo - Backend:  http://127.0.0.1:8000
echo - Swagger:  http://127.0.0.1:8000/docs
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
