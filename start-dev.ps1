# ==============================================================================
# start-dev.ps1 - 로컬 개발 통합 기동 및 DB 자동 점검 스크립트 (Windows)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting eGov Enterprise Local Dev Environment..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. 로컬 데이터베이스 구동 상태 점검
Write-Host "[*] Checking Local Database Container (egov-postgres)..." -ForegroundColor Gray
$containerRunning = docker inspect -f '{{.State.Running}}' egov-postgres 2>$null

if ($containerRunning -ne "true") {
    Write-Host "[!] Database container is not running. Starting Docker DB..." -ForegroundColor Yellow
    docker compose up -d db
    Write-Host "[*] Waiting 3 seconds for DB readiness..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
} else {
    Write-Host "[*] Database container (egov-postgres) is already active." -ForegroundColor Green
}

# 2. 통합 개발 서버 구동 (Concurrently를 통한 API + Web 동시 구동)
Write-Host "`n[*] Starting API server and Web client..." -ForegroundColor Gray
npm run dev
