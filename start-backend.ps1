# Start Fraud Intelligence Platform (Backend)
# Run this from the repo root

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "backend")

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python is not installed or not on PATH." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
}

Write-Host "Installing backend dependencies from requirements.txt..." -ForegroundColor Cyan
$reqExit = 0
try {
    & .\venv\Scripts\python.exe -m pip install -r requirements.txt
    $reqExit = $LASTEXITCODE
} catch {
    $reqExit = 1
}

if ($reqExit -ne 0) {
    Write-Host "requirements.txt install failed (likely Python version compatibility). Falling back to runtime package set..." -ForegroundColor Yellow
    & .\venv\Scripts\python.exe -m pip install fastapi "uvicorn[standard]" sqlalchemy alembic pandas numpy scikit-learn python-multipart pydantic pydantic-settings python-dotenv scipy networkx psycopg2-binary
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install backend dependencies." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting FastAPI backend on http://localhost:8000" -ForegroundColor Green
& .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
