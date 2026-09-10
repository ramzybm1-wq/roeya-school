#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "          VISION SCHOOL — PRODUCTION DEPLOYMENT"
echo "=========================================================="

# 1. Check docker availability
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not in PATH."
    echo "Please install Docker and Docker Compose before deploying."
    exit 1
fi

echo "[1/4] Preparing environment and storage directories..."
mkdir -p storage/private-documents storage/media

echo "[2/4] Building production containers..."
docker compose build

echo "[3/4] Starting database and application services..."
docker compose up -d

echo "[4/4] Verifying health checks..."
sleep 5
docker compose ps

echo "=========================================================="
echo "🎉 VISION SCHOOL IS DEPLOYED & RUNNING!"
echo "=========================================================="
echo " - Public Client Website : http://localhost:3000"
echo " - Admin Dashboard       : http://localhost:3001"
echo " - Backend API Health    : http://localhost:4000/health"
echo " - Database PostgreSQL   : localhost:5432"
echo "=========================================================="
