# 20260518_tier16_e2e_stabilization.md

## 1. 개요 (Overview)
- **목적**: `frontend/e2e/16-system-observability.spec.ts` 테스트를 실행하고, 실패 케이스 발생 시 개별 원인을 분석하고 디버깅하여 100% 성공(Pass)을 보장한다.
- **수행 상태**: ✅ 완료 (Completed)

## 2. 체크리스트 (Checklist)
- [x] **Think** — Tier 16 E2E 테스트 코드 및 시스템 가시성(Observability) 기능 구조 파악
- [x] **Plan** — E2E 테스트 실행 및 실패 요인 대응을 위한 계획 수립
- [x] **Implement** — E2E 테스트 실패 시 프론트엔드/백엔드/DB 연동 오류 수정
- [x] **Test** — Tier 16 E2E 전체 패스 검증 및 증거 확보
- [x] **Summarize** — 결과를 정리하고 최종 보고

## 3. 진행 상황 및 트러블슈팅 (Progress & Troubleshooting)

### 3.1 발견된 오류 및 근본 원인 (Root Causes)
1. **백엔드 HTTP 500 오류 (통계 API 호출 실패)**:
   - **/api/v1/admin/system/statistics/user**: `UserLogRepository.java` 네이티브 쿼리가 DB 표준화 전의 레거시 컬럼 `OCCRRNC_DE`를 가리켜 오류 발생 (실제 물리 컬럼은 `ocrn_ymd`로 현대화됨).
   - **/api/v1/admin/system/statistics/bbs**: 데이터 이용 현황을 조회하는 `ndtausestats` 레거시 테이블이 실제 PostgreSQL 17 스택 DB에 아예 생성되어 있지 않았음.
2. **Playwright Strict Mode 위반**:
   - `getByText('Global Traffic')` 호출 시 메트릭 카드 헤더와 토폴로지 맵 내부에 동일한 텍스트가 2개 렌더링되면서 Playwright가 strict mode 위반 예외를 일으킴.

### 3.2 해결 방안 및 구현 완료 사항 (Implemented Fixes)
1. **물리 DB 교정**:
   - 표준 데이터 가버넌스 및 DB 표준화 헌법을 완벽하게 준수하는 **`tb_dta_use_stats`** 테이블을 생성함.
2. **JPA 및 Repository 표준화**:
   - `DtaUseStats.java` 의 매핑 테이블명을 `tb_dta_use_stats` 로 소문자 표준화.
   - `DtaUseStatsRepository.java` 와 `UserLogRepository.java` 의 Native Query 내 레거시 테이블/컬럼명을 표준 물리 구조(`tb_dta_use_stats`, `crt_dt`, `ocrn_ymd`, `tb_user_log`)에 맞춰 전격 현대화함.
3. **E2E 테스트 스펙 교정**:
   - `16-system-observability.spec.ts` 의 assertions에 `.first()` 및 `{ exact: false }` 옵션을 부여하여 대소문자 차이를 극복하고 strict mode violation을 방지함.
4. **검증용 샘플 데이터 적재**:
   - 테스트용 통계 수치가 차트에 올바르게 표현되도록 `tb_dta_use_stats` 와 `tb_user_log` (FK 관계를 고려해 `USRCNFRM_00000000001` 매핑)에 샘플 데이터 적재 완료.
5. **백엔드 재기동**:
   - 수정 사항 반영을 위해 `npm run backend`를 백그라운드 구동하여 완전 핫로딩 검증함.

### 3.3 최종 검증 결과 (Playwright Run Evidence)
- **실행 결과**: `10 passed (35.5s)` (0 flaky, 100% Pass)
```bash
Running 10 tests using 1 worker
[1/10] [setup] › e2e\auth.setup.ts:73:6 › authenticate-admin
>>> SUCCESS: Session generated for webmaster at ...
[2/10] [setup] › e2e\auth.setup.ts:77:6 › authenticate-user
>>> SUCCESS: Session generated for TEST1 at ...
...
>>> [DB Cleanup] All test data removed successfully!
  10 passed (35.5s)
Exit code: 0
```
