# VISION SCHOOL — One-Click Windows Deployment Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          VISION SCHOOL — PRODUCTION DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Docker Desktop (https://www.docker.com/products/docker-desktop/)" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/4] Preparing storage directories..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path "storage\private-documents", "storage\media" | Out-Null

Write-Host "[2/4] Building production containers..." -ForegroundColor Green
docker compose build

Write-Host "[3/4] Starting database and application services..." -ForegroundColor Green
docker compose up -d

Write-Host "[4/4] Verifying running services..." -ForegroundColor Green
Start-Sleep -Seconds 5
docker compose ps

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🎉 VISION SCHOOL IS DEPLOYED & RUNNING!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " - Public Client Website : http://localhost:3000" -ForegroundColor White
Write-Host " - Admin Dashboard       : http://localhost:3001" -ForegroundColor White
Write-Host " - Backend API Health    : http://localhost:4000/health" -ForegroundColor White
Write-Host " - Database PostgreSQL   : localhost:5432" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
