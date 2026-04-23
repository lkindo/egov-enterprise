# Task: CI/CD Pipeline Integration (DevOps)
Date: 2026-04-24

## Status
- [x] Analyze existing workflows (`ci.yml`, `load-test.yml`)
- [x] Verify Dockerfiles (`api-server`, `frontend`)
- [ ] Create `release.yml` for Docker Hub deployment
- [ ] Update `ci.yml` with security scans
- [ ] Document required GitHub Secrets

## Details
- `ci.yml` is already very comprehensive, including sharded E2E tests.
- `load-test.yml` uses k6 for performance testing.
- Missing: Docker image push to a registry (Docker Hub) and Tag-based releases.
