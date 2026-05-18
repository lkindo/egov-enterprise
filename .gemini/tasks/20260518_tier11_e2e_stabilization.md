# 20260518_tier11_e2e_stabilization.md

## 1. 개요 (Overview)
- **목적**: `frontend/e2e/11-enterprise-workflow.spec.ts` 테스트를 실행하고, 실패 케이스를 발굴하여 각각의 원인을 추적, 수정함으로써 100% 성공률을 보장한다.
- **수행 상태**: ✅ 완료 (100% Pass)

## 2. 체크리스트 (Checklist)
- [x] **Think** — Tier 11 E2E 테스트 코드 및 대상 페이지 구조 파악 (완료)
- [x] **Plan** — 테스트 실행 및 실패 대응을 위한 점진적 해결 방안 설계 (완료)
- [x] **Implement** — E2E 테스트 실행 후 드러난 프론트엔드/백엔드/DB 오류 수정 (완료)
  - `InformalSanction` JPA Entity의 물리 DB 컬럼 표준 매핑 어긋남 수정 (`tb_ifml_atrz_info` 컬럼과 매핑 불일치 해결)
- [x] **Test** — Tier 11 E2E 전체 패스 검증 및 증거 확보 (완료)
  - 8 passed (24.9s), Exit code: 0
- [x] **Summarize** — 결과를 정리하고 최종 보고 (완료)

## 3. 진행 상황 및 트러블슈팅 (Progress & Troubleshooting)
### 3.1 E2E 테스트 실행 및 문제점 발견
- **오류 증상**: 전자결재 lifecycle 테스트(`/approvals` 진입 후 상신 및 목록 조회)에서 `HTTP 500` 발생.
  - `❌ [HTTP 500]: http://localhost:3001/api/v1/approvals/pending`
- **Root Cause 분석 (백엔드 로그)**:
  - `Caused by: org.postgresql.util.PSQLException: ERROR: column is1_0.infrml_sanctn_id does not exist`
  - 데이터베이스 표준화 작업에 의해 물리 스키마 테이블 `tb_ifml_atrz_info` 의 컬럼들은 표준 용어로 개편되었으나, JPA Entity `InformalSanction.java` 의 `@Column` 매핑이 구형(Legacy) 사양으로 남아 있었음.

### 3.2 해결 방안 및 구현
- **Entity 컬럼 매핑 표준화 개편 (`InformalSanction.java`)**:
  - `INFRML_SANCTN_ID` ➡️ `IFML_ATRZ_ID`
  - `JOB_SE_CODE` ➡️ `TASK_SE_CD`
  - `APPLCNT_ID` ➡️ `APLCNT_ID`
  - `REQST_YMD` ➡️ `REQ_YMD`
  - `SANCTNER_ID` ➡️ `APRVR_ID`
  - `CONFM_AT` ➡️ `APRV_YN`
  - `SANCTN_DT` ➡️ `ATRZ_DT`

### 3.3 검증 결과 (Verification Evidence)
- **Playwright E2E 재실행 결과**:
```bash
Running 8 tests using 1 worker
...
  8 passed (24.9s)
Exit code: 0
```
- 백엔드 JPA 쿼리 오류 완전히 해결 및 전자결재 수명주기 100% 정상 작동 완료!
