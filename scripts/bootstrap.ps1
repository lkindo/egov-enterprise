# ==============================================================================
# scripts/bootstrap.ps1 - 로컬 개발자 환경 원클릭 부트스트랩 스크립트 (Windows)
# ==============================================================================
# 하는 일: (1) 환경변수 템플릿 복제  (2) 로컬 Docker DB 기동
#          (3) 패키지 매니저(pnpm) 확인 + 의존성 설치  (4) 백엔드 컴파일 무결성 확인
#
# 참고:
#  - 백엔드 로컬 실행(npm run dev = base 프로파일)의 DB 접속 기본값은 application.yml 이
#    docker-compose 와 동일하게(egov/egov123/egovdb:5432) 정의하므로, 루트 .env 없이도 접속된다.
#    루트 .env 는 docker-compose 변수치환(예: JWT_SECRET)과 편의를 위한 것이다.
#  - 암복호화 마스터키는 application.yml 의 algorithmKey 기본값(egovframe, 로컬 전용)으로 동작하며
#    별도 egov-crypto-config.properties 파일은 필요하지 않다(운영은 ALGORITHM_KEY 환경변수 주입).
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting eGov Enterprise Local Bootstrap Workflow..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$rootDir = (Get-Item -Path $PSScriptRoot).Parent.FullName

# 1. 환경변수 파일 복제 (원본이 존재할 때만 — fresh clone 안전)
Write-Host "`n[*] Checking Environment Files..." -ForegroundColor Gray

function Copy-IfMissing($target, $source, $label) {
    if (Test-Path $target) {
        Write-Host "[*] $label already exists." -ForegroundColor DarkGray
    } elseif (Test-Path $source) {
        Write-Host "[+] Creating $label from template" -ForegroundColor Green
        Copy-Item $source $target
    } else {
        Write-Host "[!] Template not found ($source) — skipping $label." -ForegroundColor Yellow
    }
}

Copy-IfMissing (Join-Path $rootDir ".env") (Join-Path $rootDir ".env.example") ".env"
Copy-IfMissing (Join-Path $rootDir "frontend/.env.local") (Join-Path $rootDir "frontend/.env.example") "frontend/.env.local"

# 2. Docker DB 컨테이너 실행
Write-Host "`n[*] Starting Local Database Container (PostgreSQL)..." -ForegroundColor Gray
# ⚠ $ErrorActionPreference='Stop' 하에서 존재하지 않는 명령을 `&` 로 호출하면
#    CommandNotFoundException 이 "터지며"(*> $null 로도 억제 안 됨) 스크립트가 폴백 전에 중단된다.
#    → Get-Command 로 존재를 먼저 확인한다(bootstrap.sh 의 `command -v` 와 파리티).
#    docker 실행 실패(데몬 다운)는 예외가 아닌 $LASTEXITCODE 로 판정한다.
$composeOk = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
    & docker compose version *> $null
    if ($LASTEXITCODE -eq 0) {
        & docker compose up -d db
        $composeOk = $true
    }
}
if (-not $composeOk -and (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "[*] Using legacy 'docker-compose'." -ForegroundColor DarkGray
    & docker-compose up -d db
    $composeOk = $true
}
if (-not $composeOk) {
    Write-Host "[!] docker compose not available. Make sure Docker is running." -ForegroundColor Red
    exit 1
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Failed to run docker compose. Make sure Docker Desktop is running." -ForegroundColor Red
    exit 1
}
Write-Host "[+] Local database (egov-postgres) start requested." -ForegroundColor Green

# 3. pnpm 확인 및 의존성 설치 (존재 확인은 Get-Command — 없으면 예외 없이 $null)
Write-Host "`n[*] Resolving Package Manager Dependencies..." -ForegroundColor Gray
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    Write-Host "[*] pnpm is available." -ForegroundColor Green
} else {
    Write-Host "[!] pnpm is not installed. Installing pnpm globally..." -ForegroundColor Yellow
    npm install -g pnpm
}

Write-Host "`n[*] Installing root dependencies (concurrently 등)..." -ForegroundColor Gray
npm install

Write-Host "`n[*] Installing frontend dependencies..." -ForegroundColor Gray
Set-Location -Path (Join-Path $rootDir "frontend")
pnpm install
Set-Location -Path $rootDir

# 4. 백엔드 컴파일 무결성 확인 (이 스크립트는 Windows 전용 → gradlew.bat 고정)
Write-Host "`n[*] Verifying Backend Build (compileJava compileTestJava)..." -ForegroundColor Gray
& .\gradlew.bat compileJava compileTestJava

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Bootstrap Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "You can start the local development environment using:"
Write-Host "  .\start-dev.ps1" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
