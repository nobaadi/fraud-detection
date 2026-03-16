# Start Fraud Intelligence Platform (Frontend)
# Run this from the repo root

Set-Location "$PSScriptRoot\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "Starting React frontend on http://localhost:3000" -ForegroundColor Green
npm run dev
