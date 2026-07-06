# 20260523-e2e-console-guard-fix.md - E2E 콘솔 가드 및 Hydration Mismatch 검출 강화

- **작업명**: E2E 브라우저 콘솔 무결성 가드 보완 및 Hydration Mismatch/Silent API 에러 정밀 차단
- **목적**:
  - E2E 테스트가 성공함에도 브라우저 상에서 조용히 발생하는 Hydration Mismatch 및 Silent 4xx/5xx API 에러를 Playwright ConsoleErrorGuard 단에서 정교하게 감지하여 강제 실패 처리한다.
  - 관련 테스트 지침 및 전략을 테스트 문서(`e2e-test-guide.md`, `testing-guide.md`)에 반영한다.
- **진행 상황**:
  - [x] Phase 1: `error-detector.ts` 소스 코드 수정 (Hydration Mismatch 정밀 파서 및 Silent HTTP API 에러 차단 강화)
  - [x] Phase 2: `e2e-test-guide.md` 및 `testing-guide.md` 문서 보완 (Console Guard Architecture 신설 및 설명 보강)
  - [x] Phase 3: 로컬 테스트 빌드 검증 및 린트 검사
