# 20260518_tier21_e2e_stabilization.md

## 1. 개요 (Overview)
- **목적**: `frontend/e2e/21-advanced-resilience.spec.ts` E2E 테스트를 실행하고, 시스템의 장애 회복탄력성(API 500 장애 시 Graceful Degradation, 초고속 클릭 스트레스 하에서의 UI 일관성, 대형 페이로드 바운더리 입력 밸리데이션)을 검증하여 100% 성공(Pass) 상태를 획득한다.
- **수행 상태**: ✅ 완료 (Completed)

## 2. 체크리스트 (Checklist)
- [x] **Think** — Tier 21 장애 회복탄력성 검증 스펙 및 React 프론트엔드 입력 요소의 바인딩 분석
- [x] **Plan** — 대형 페이로드 입력 테스트(`Data Integrity`) 도중 hang 현상이 발생하는 원인 규명
- [x] **Implement** — E2E 테스트 셀렉터를 `nttSj`에서 실제 React 컴포넌트 변수명인 `pstTtl` 및 `data-testid` 로 일치시키고 다중 폴백 처리 교정
- [x] **Test** — E2E 테스트를 재구동하여 hang 없이 초고속 녹색 통과 검증 (`8 passed, 29.5s`)
- [x] **Summarize** — 결과를 정리하고 최종 보고

## 3. 진행 상황 및 트러블슈팅 (Progress & Troubleshooting)

### 3.1 5번 테스트 (Data Integrity: Boundary Input) Hang 현상 원인 규명
- **현상**: `>>> Step 1: Filling form with large payload` 로그 출력 이후 Playwright 테스트가 무한 대기에 빠지며 타임아웃 붕괴가 일어남.
- **근본 원인 (Root Cause)**:
  - 테스트 코드에서는 제목 입력창을 `input[name="nttSj"]` 로 선택하려고 함.
  - 그러나 실제 프론트엔드 컴포넌트인 [BoardRegistClient.tsx](file:///d:/project/egov-enterprise/frontend/src/app/admin/community/boards/insertBoardArticle/BoardRegistClient.tsx) 에서는 입력 네임으로 **`pstTtl`** 을 사용하고 있었으며, `data-testid="article-title-input"` 이 명시되어 있었음.
  - 이로 인해 존재하지 않는 `input[name="nttSj"]` 요소가 렌더링되기를 하염없이 기다리며 Hang 현상이 일어난 것임.

### 3.2 고신뢰성 다중 폴백(Fallback) 셀렉터 도입 해결책
- **수정본**: [21-advanced-resilience.spec.ts](file:///d:/project/egov-enterprise/frontend/e2e/21-advanced-resilience.spec.ts) 의 86~91라인을 다음과 같이 전격 교정함.
  - 제목 입력창: `input[name="pstTtl"]`, `input[name="nttSj"]`, `[data-testid="article-title-input"]` 중 첫 번째로 매칭되는 요소를 강인하게 선택하도록 `.first()` 구조 적용.
  - 내용 에디터: `.ProseMirror` 외에 구식 폼 요소인 `textarea[name="pstCn"]`, `textarea[name="nttCn"]` 에도 강인하게 대응하도록 `.first()` 다중 폴백 적용.

## 4. 최종 검증 결과 (Playwright Run Evidence)
- **실행 결과**: `8 passed (29.5s)` (0 flaky, 100% 무결점 통과)
```bash
Running 8 tests using 1 worker
[1/8] [setup] › e2e\auth.setup.ts:73:6 › authenticate-admin
>>> SUCCESS: Session generated for webmaster at ...
[2/8] [setup] › e2e\auth.setup.ts:77:6 › authenticate-user
>>> SUCCESS: Session generated for TEST1 at ...
[3/8] [tier-21-resilience] › e2e\21-advanced-resilience.spec.ts:13:9 › Network Resilience: API 500 Error Interception
>>> Step 1: Navigating to User Management
>>> Step 2: Intercepting User List API to return 500
>>> Step 3: Triggering Refresh/Search to cause failure
>>> Blocking request to: http://localhost:3001/api/v1/admin/system/users?pageNo=1&searchKeyword=ForceFail
>>> Step 4: Verifying Error Toast/UI
>>> Detected Toast Text: Internal Server Error (Simulated)
>>> Error Toast successfully detected and verified.
[4/8] [tier-21-resilience] › e2e\21-advanced-resilience.spec.ts:54:9 › UI Stability: Rapid Interaction Stress Test
>>> Step 1: Rapidly clicking pagination/tabs
>>> Rapid Click 1 ... 5
>>> Step 2: Verifying UI state consistency
>>> System remained stable after rapid interaction.
[5/8] [tier-21-resilience] › e2e\21-advanced-resilience.spec.ts:76:9 › Data Integrity: Boundary Input (Huge Payload)
>>> Step 1: Filling form with large payload
>>> Step 2: Attempting to submit
>>> Validation correctly caught the boundary condition.
...
>>> [DB Cleanup] Starting cleanup of E2E test data...
>>> [DB Cleanup] All test data removed successfully!
  8 passed (29.5s)
Exit code: 0
```
