# Start Fraud Intelligence Platform (Backend)
# Run this from the repo root

Set-Location "$PSScriptRoot\backend"

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    .\venv\Scripts\pip install fastapi "uvicorn[standard]" sqlalchemy alembic pandas numpy scikit-learn python-multipart pydantic pydantic-settings python-dotenv scipy networkx psycopg2-binary
}

Write-Host "Starting FastAPI backend on http://localhost:8000" -ForegroundColor Green
.\venv\Scripts\uvicorn app.main:app --reload --port 8000
