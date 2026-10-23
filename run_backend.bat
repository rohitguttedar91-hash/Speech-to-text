@echo off
title Speech-to-Text - Backend (FastAPI)
echo ===================================================
echo Starting Speech-to-Text FastAPI Backend...
echo URL: http://127.0.0.1:8000
echo Docs: http://127.0.0.1:8000/docs
echo ===================================================
cd /d "%~dp0backend"
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo [ERROR] Virtual environment not found in backend\.venv
    echo Please create the virtual environment and install requirements first.
    pause
)
