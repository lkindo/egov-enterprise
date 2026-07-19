# ==============================================================================
# start-dev.ps1 - 로컬 개발 통합 기동 및 DB 자동 점검 스크립트 (Windows)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting eGov Enterprise Dev Environment..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. .env 환경 변수 로드
if (Test-Path ".env") {
    Write-Host "[*] Loading environment variables from .env..." -ForegroundColor Gray
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $key, $value = $line.Split("=", 2)
            [System.Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), [System.EnvironmentVariableTarget]::Process)
        }
    }
}

# 1. 데이터베이스 구동 상태 점검 (DB_URL이 localhost/127.0.0.1인 경우만 Docker 실행)
$isLocalDb = $true
if ($env:DB_URL) {
    if (-not ($env:DB_URL -like "*localhost*" -or $env:DB_URL -like "*127.0.0.1*")) {
        $isLocalDb = $false
    }
}

if ($isLocalDb) {
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
} else {
    Write-Host "[*] External DB detected ($env:DB_URL). Skipping local Docker DB check." -ForegroundColor Green
}

# 2. 통합 개발 서버 구동 (Concurrently를 통한 API + Web 동시 구동)
Write-Host "`n[*] Starting API server and Web client..." -ForegroundColor Gray
npm run dev

