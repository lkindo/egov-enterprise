.PHONY: help build test test-ci coverage clean bootstrap verify verify-be verify-fe

# 1. Cross-platform OS detection
ifeq ($(OS),Windows_NT)
    GRADLEW = .\gradlew.bat
    BOOTSTRAP_CMD = powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
else
    GRADLEW = ./gradlew
    BOOTSTRAP_CMD = bash ./scripts/bootstrap.sh
endif

# 2. Common Gradle options to resolve OS dependency problems
# - file.encoding=UTF-8: Preemptively solve character encoding breakage on Windows
# - user.timezone=Asia/Seoul: Ensure consistent timezone testing matching KST
# - warning-mode all: Detailed warnings on deprecations
TEST_OPTS = -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Seoul

bootstrap:
	$(BOOTSTRAP_CMD)

help:
	@echo "=========================================================="
	@echo " eGov Enterprise Standard Build & Test Commands"
	@echo "=========================================================="
	@echo " make bootstrap    : Initialize environment (env, docker db, install)"
	@echo " make build        : Build backend project skipping tests"
	@echo " make test         : Run tests (fast-fail locally)"
	@echo " make test-ci      : Run tests for CI (continue on fail)"
	@echo " make coverage     : Run tests & generate Jacoco coverage"
	@echo " make verify       : UNIFIED full-stack gate (BE compile+test + FE tsc/build/vitest) — §2.H"
	@echo " make clean        : Clean Gradle build outputs"
	@echo "=========================================================="

# Build without testing
build:
	$(GRADLEW) build -x test

# Standard local testing setup
test:
	$(GRADLEW) test $(TEST_OPTS)

# CI/CD test setup (will not stop on first failure)
test-ci:
	$(GRADLEW) test --continue $(TEST_OPTS)

# Generate Code Coverage specific setup
coverage:
	$(GRADLEW) test jacocoRootReport --continue $(TEST_OPTS)

# ── UNIFIED full-stack verification gate (§2.H 검증 파편화 해소) ──────────────
# "실제로 안 깨진다"를 단일 명령으로 증명: 백엔드 전 모듈 컴파일+테스트 + 프론트 tsc/next build/vitest.
# (e2e 는 서버 기동 필요 → 별도. CI 빌링 복구 시 ci.yml 이 이 게이트를 상시 실행.)
# scripts/verify.mjs 를 단일 소스로 위임(OS 감지·Makefile/npm 정합). e2e 는 서버 기동 필요라 별도.
verify:
	node scripts/verify.mjs all

verify-be:
	node scripts/verify.mjs be

verify-fe:
	node scripts/verify.mjs fe

# Clean workspace
clean:
	$(GRADLEW) clean

# Docker commands
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down
