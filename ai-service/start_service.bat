@echo off
cd /d "%~dp0"

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment activation script not found!
    exit /b 1
)

echo Installing/Updating dependencies...
pip install -r requirements.txt

echo Starting AI Service...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
