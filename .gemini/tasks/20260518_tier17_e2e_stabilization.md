# 20260518_tier17_e2e_stabilization.md

## 1. 개요 (Overview)
- **목적**: `frontend/e2e/17-support-governance.spec.ts` 테스트를 실행하고, 발생 가능한 실패 요인들을 디버깅하여 100% 완벽한 성공(Pass) 상태를 확보한다.
- **수행 상태**: ✅ 완료 (Completed)

## 2. 체크리스트 (Checklist)
- [x] **Think** — Tier 17 E2E 테스트 및 매뉴얼/FAQ/Q&A 라이프사이클 비즈니스 파악
- [x] **Plan** — E2E 실행 계획 및 선택된 엘리먼트 selector의 정합성 대조 계획 수립
- [x] **Implement** — Zod 및 React Hook Form 레이스 컨디션 및 구식 selector 교정
- [x] **Test** — 8 Passed 증거 확보 및 DB CleanUp 정상 동작 확인
- [x] **Summarize** — 결과를 정리하고 최종 보고

## 3. 진행 상황 및 트러블슈팅 (Progress & Troubleshooting)

### 3.1 발견된 오류 및 근본 원인 (Root Causes)
1. **유효성 검증 실패 (Validation Errors: {pstTtl: Object})**:
   - 백엔드 DTO 및 DB 표준화 과정에서 게시판 제목 필드의 물리/논리 변수명이 레거시 `nttSj` 에서 현대화된 **`pstTtl`** (게시글제목) 로 표준 정제 완료됨.
   - 그러나 E2E Page Object인 `SupportPage.ts` 에는 여전히 구식 변수명인 `input[name="nttSj"]` 로 대기 및 입력이 하드코딩되어 있었음. 이로 인해 신규 등록 시 제목 필드에 값이 채워지지 못해 Zod 스키마의 `.min(1, '제목을 입력해주세요.')` 검증 오류가 유발되고 무한 타임아웃에 수렴함.
2. **포커싱 및 하이드레이션 타이밍 레이스 컨디션**:
   - `fill()` 이후 React Hook Form이 상태를 인지하기 전 에디터 영역으로 클릭 포커스가 급격하게 이동하면서 하이드레이션 지연 상황에서 값 입력 유실이 비정기적으로 발생하여 flaky를 일으킴.

### 3.2 해결 방안 및 구현 완료 사항 (Implemented Fixes)
1. **E2E Selector 현대화**:
   - [SupportPage.ts](file:///d:/project/egov-enterprise/frontend/e2e/pages/SupportPage.ts) 의 `createKnowledgeEntry` 함수 내 제목 input 탐색자(`input[name="nttSj"]`)를 표준화된 실존 필드명인 **`input[name="pstTtl"]`** 로 정밀 개조 완료.
2. **방어적 동기화 메커니즘 구축**:
   - `pstTtl` 입력창에 값을 채운 뒤 `toHaveValue(title)` assertion을 수행해 입력 데이터 무결성을 확실하게 보장함.
   - `press('Tab')` 이벤트를 강제로 발생시켜 React Hook Form의 `onBlur` 및 `onChange` 상태 검증을 안전하게 강제 유도함.
   - 에디터 전환 및 폼 서브밋 전후에 미세 타이밍 안전 마진(`waitForTimeout`)을 300~500ms 가량 두어 레이스 컨디션을 전방위 차단함.

### 3.3 최종 검증 결과 (Playwright Run Evidence)
- **실행 결과**: `8 passed (1.3m)` (0 flaky, 100% Pass)
```bash
Running 8 tests using 1 worker
[1/8] [setup] › e2e\auth.setup.ts:73:6 › authenticate-admin
>>> SUCCESS: Session generated for webmaster at ...
[2/8] [setup] › e2e\auth.setup.ts:77:6 › authenticate-user
>>> SUCCESS: Session generated for TEST1 at ...
...
>>> [DB Cleanup] Starting cleanup of E2E test data...
  - Deleting Post: E2E FAQ ... DONE
  - Deleting Post: E2E Q&A ... DONE
  - Deleting Manual: E2E Manual ... DONE
>>> [DB Cleanup] All test data removed successfully!
  8 passed (1.3m)
Exit code: 0
```
