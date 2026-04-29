# 20260429_e2e_coverage_expansion.md

## 1. 개요
현재 E2E 테스트가 커버하지 못하는 모듈을 식별하고, 테스트를 추가하여 시스템 안정성을 강화한다. 
작업 중 발견되는 한글 깨짐 현상과 콘솔 오류를 해결하며, 테스트 완료 후 데이터 클린징을 보장한다.

## 2. 체크리스트
- [ ] **Think** — 현재 E2E 테스트 분석 및 사각지대 식별
- [ ] **Plan** — 추가 테스트 우선순위 및 구현 계획 수립
- [ ] **Implement** — 신규 E2E 테스트 코드 작성 (Tier 9+ 확장)
- [ ] **Fix** — 한글 깨짐 현상 및 콘솔 오류/경고 수정
- [ ] **Test** — `npm run test:e2e:full` 실행 및 검증
- [ ] **Summarize** — 작업 결과 요약 및 클린징 확인

## 3. 진행 상태
### 2026-04-29
- [x] 현재 `frontend/e2e` 디렉토리의 Tier 1~8 테스트 파일 분석 완료.
- [x] `frontend/src/app` 구조와 매핑하여 미커버 영역 식별 중.
- [ ] 미커버 영역: `admin/observability`, `admin/notifications`, `admin/workspace`, `search` 등.
- [ ] 한글 깨짐 및 콘솔 오류 조사를 위한 테스트 런 준비 중.
