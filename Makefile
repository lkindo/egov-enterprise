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
# - warning-mode fail: Gradle 10에서 제거될 API의 재유입을 즉시 차단
TEST_OPTS = -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Seoul
GRADLE_CLI_ARGS = --warning-mode fail --console=plain

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
	@echo " make verify       : full 프로파일 전 스택 게이트 (실 PostgreSQL 스키마 검증 포함 — Docker 필요)"
	@echo " make clean        : Clean Gradle build outputs"
	@echo "=========================================================="

# Build without testing
build:
	$(GRADLEW) assemble $(GRADLE_CLI_ARGS)

# Standard local testing setup
test:
	$(GRADLEW) test $(TEST_OPTS) $(GRADLE_CLI_ARGS)

# CI/CD test setup (will not stop on first failure)
test-ci:
	$(GRADLEW) test --continue $(TEST_OPTS) $(GRADLE_CLI_ARGS)

# Generate Code Coverage specific setup
coverage:
	$(GRADLEW) test jacocoRootReport --continue $(TEST_OPTS) $(GRADLE_CLI_ARGS)

# ── 전 스택 검증 게이트 ────────────────────────────────────────────────────
# scripts/verify.mjs 가 단일 소스이며 프로파일은 비용 순으로 중첩된다: docs < fast < push < full.
# full 은 실 PostgreSQL 스키마 검증을 포함하므로 Docker 가 필요하다.
# 브라우저 E2E(verify:e2e)와 원격 ruleset 실측(verify:ops)은 서비스·자격이 필요해 별도로 둔다.
# 로컬 게이트는 빠른 피드백이고 병합 권위는 .github/required-checks.json 에 결속된 required CI 다.
verify:
	node scripts/verify.mjs full

verify-be:
	node scripts/verify.mjs be

verify-fe:
	node scripts/verify.mjs fe

# Clean workspace
clean:
	$(GRADLEW) clean $(GRADLE_CLI_ARGS)

# Docker commands
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down
