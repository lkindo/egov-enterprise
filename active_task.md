# Task: 프론트엔드 테스트 진행 및 리팩토링

## 진행 상태 (Ralph Loop)
- [x] Think (분석): 요구사항 분석 완료 (Next.js, Vitest, Playwright 기반 확인)
- [x] Plan (계획): 단위 테스트 -> 리팩토링 -> E2E 테스트 순으로 진행
- [x] Implement (구현): 
    - 단위 테스트 성공 (146/146 통과)
    - **`process.env` 리팩토링 완료** (auth.setup.ts, next.config.ts, playwright.config.ts)
- [x] Test (검증): E2E 테스트(Playwright) 진행 중 (백엔드 8080 및 프론트엔드 3001 기동 완료)
- [/] Summarize (요약): 결과 집계 후 최종 보고

## 작업 로그
- 2026-03-29: 태스크 시작.
- 2026-03-29: `pnpm -C frontend test` (Vitest) 146개 테스트 통과.
- 2026-03-29: `process.env` 리팩토링 수행 (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`).
- 2026-03-29: 백엔드 기동 타임아웃 300초 설정 후 성공적으로 8080 포트 오픈 감지.
- 2026-03-29: `playwright test`가 정상적으로 진행 중이며, 사용자 관리 테스트 등이 수행되고 있음을 확인.
- 2026-03-29: 사용자 요청에 따라 권장 작업(Lint 리팩토링 및 E2E 테스트) 진행.
- 2026-03-29: `PolicyAdminService` 및 `PolicyAdminClient` 내 `any` 타입 제거 및 버그 수정 완료.
- 2026-03-29: 백엔드(8080) 및 프론트엔드(3001) 기동 후 `admin-domain.spec.ts` E2E 테스트 실행 중.
