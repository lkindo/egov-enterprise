#!/usr/bin/env bash
# ==============================================================================
# scripts/bootstrap.sh - 로컬 개발자 환경 원클릭 부트스트랩 (Linux / macOS)
# bootstrap.ps1(Windows) 과 동등한 동작을 제공한다(파리티).
#   (1) 환경변수 템플릿 복제  (2) 로컬 Docker DB 기동
#   (3) pnpm 확인 + 의존성 설치  (4) 백엔드 컴파일 무결성 확인
#
# 참고: 백엔드 로컬 실행(npm run dev = base 프로파일)의 DB 접속 기본값은 application.yml 이
#       docker-compose 와 동일(egov/egov123/egovdb:5432)하므로 루트 .env 없이도 접속된다.
#       암복호화 키는 algorithmKey 기본값으로 동작(별도 crypto 파일 불필요).
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=========================================================="
echo " Starting eGov Enterprise Local Bootstrap Workflow..."
echo "=========================================================="

copy_if_missing() { # target source label
  if [ -f "$1" ]; then
    echo "[*] $3 already exists."
  elif [ -f "$2" ]; then
    echo "[+] Creating $3 from template"
    cp "$2" "$1"
  else
    echo "[!] Template not found ($2) — skipping $3."
  fi
}

echo ""
echo "[*] Checking Environment Files..."
copy_if_missing ".env" ".env.example" ".env"
copy_if_missing "frontend/.env.local" "frontend/.env.example" "frontend/.env.local"

echo ""
echo "[*] Starting Local Database Container (PostgreSQL)..."
if docker compose version >/dev/null 2>&1; then
  docker compose up -d db
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d db
else
  echo "[!] docker compose not available. Make sure Docker is running." >&2
  exit 1
fi
echo "[+] Local database (egov-postgres) start requested."

echo ""
echo "[*] Resolving Package Manager Dependencies..."
if ! command -v pnpm >/dev/null 2>&1; then
  echo "[!] pnpm is not installed. Installing pnpm globally..."
  npm install -g pnpm
else
  echo "[*] pnpm is available."
fi

echo ""
echo "[*] Installing root dependencies (concurrently 등)..."
npm install

echo ""
echo "[*] Installing frontend dependencies..."
( cd frontend && pnpm install )

echo ""
echo "[*] Verifying Backend Build (compileJava compileTestJava)..."
./gradlew compileJava compileTestJava

echo ""
echo "=========================================================="
echo " Bootstrap Completed Successfully!"
echo "=========================================================="
echo "Start dev with: npm run dev"
echo "=========================================================="
