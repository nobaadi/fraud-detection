# Setup Real Dataset from IEEE-CIS Kaggle
# This script downloads the 590k transaction dataset from Kaggle and maps it to project schema.

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Green
Write-Host "Fraud IQ: Real Dataset Setup" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

$repoRoot = Get-Location
$backendDir = Join-Path $repoRoot "backend"
$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
$pythonCmd = if (Test-Path $venvPython) { $venvPython } else { "python" }

# Step 1: Check Python
Write-Host "`n[1/4] Checking Python environment..." -ForegroundColor Cyan
& $pythonCmd --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found" -ForegroundColor Red
    exit 1
}

# Step 2: Install requirements
Write-Host "`n[2/4] Installing dependencies..." -ForegroundColor Cyan
& $pythonCmd -m pip install kaggle -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Kaggle CLI" -ForegroundColor Red
    exit 1
}

# Step 3: Check Kaggle auth artifacts (OAuth or token based)
Write-Host "`n[3/4] Verifying Kaggle authentication..." -ForegroundColor Cyan
$kaggleDir = Join-Path $env:USERPROFILE ".kaggle"
$oauthCreds = Join-Path $kaggleDir "credentials.json"
$tokenFile = Join-Path $kaggleDir "access_token"
$legacyFile = Join-Path $kaggleDir "kaggle.json"

if (-not (Test-Path $oauthCreds) -and -not (Test-Path $tokenFile) -and -not (Test-Path $legacyFile)) {
    Write-Host "No Kaggle credentials found." -ForegroundColor Yellow
    Write-Host "Run this once and authorize in browser:" -ForegroundColor Yellow
    Write-Host "  $pythonCmd -m kaggle auth login" -ForegroundColor Gray
    exit 1
}
Write-Host "Kaggle auth artifacts found." -ForegroundColor Green

# Step 4: Run dataset generator
Write-Host "`n[4/4] Downloading and preprocessing IEEE-CIS dataset..." -ForegroundColor Cyan
Write-Host "This may take several minutes." -ForegroundColor Gray

$scriptPath = Join-Path $backendDir "scripts\generate_dataset.py"
if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: Script not found at $scriptPath" -ForegroundColor Red
    exit 1
}

Push-Location $backendDir
try {
    & $pythonCmd $scriptPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Dataset generation failed" -ForegroundColor Red
        exit 1
    }
}
finally {
    Pop-Location
}

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "Dataset setup complete" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Start backend: .\start-backend.ps1" -ForegroundColor Gray
Write-Host "2. Upload backend/data/transactions.csv in the web UI" -ForegroundColor Gray
Write-Host "3. Check metrics: GET /transactions/metrics/model" -ForegroundColor Gray
