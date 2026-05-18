# 20260518_tier19_e2e_stabilization.md

## 1. 개요 (Overview)
- **목적**: `frontend/e2e/19-hierarchy-modernization.spec.ts` E2E 테스트를 실행하고, 계층구조 및 공통코드/부서 조직도 모듈 관련 백엔드 HTTP 500 오류를 디버깅하여 100% 성공(Pass) 상태를 획득한다.
- **수행 상태**: ✅ 완료 (Completed)

## 2. 체크리스트 (Checklist)
- [x] **Think** — Tier 19 계층구조(메뉴트리, 공통코드, 부서조직도) 관리 및 백엔드 API 연동 구조 분석
- [x] **Plan** — DB 물리 테이블(`tb_com_clsf_cd`, `tb_com_cd`, `tb_orgnzt_info`) 컬럼 정보 대조 분석
- [x] **Implement** — JPA 엔티티(`CommonCodeCategory.java`, `CommonCodeGroup.java`, `DeptManage.java`, `OrganizationManage.java`)의 표준화 헌법 준수 정밀 리팩토링
- [x] **Test** — 백엔드 핫 롤링 재기동 및 E2E 테스트 전원 통과 확인 (`10 passed`)
- [x] **Summarize** — 결과를 정리하고 최종 보고

## 3. 진행 상황 및 트러블슈팅 (Progress & Troubleshooting)

### 3.1 발견된 오류 및 근본 원인 (Root Causes)
1. **Common Code Explorer (공통분류코드) & Department Topology (부서조직도) HTTP 500 오류**:
   - 공통코드 Explorer 화면 및 부서 조직 관리 탭 진입 시, 서버 컴포넌트 데이터 페치 과정에서 PostgreSQL `column does not exist` SQL 구문 에러가 발생하며 렌더링에 완전히 실패하여 E2E가 붕괴됨.
2. **JPA 엔티티와 물리 데이터베이스 테이블의 총체적 매핑 불일치**:
   - **`CommonCodeCategory`**: 물리 DB 테이블명은 소문자 **`tb_com_clsf_cd`** 이었으나, 자바 JPA 엔티티에는 `@Table(name = "TB_COM_CLSF_CD")` 로 대문자 테이블명이 매핑되어 있었고, `clsf_cd` (물리) ➡️ `CL_CODE` (JPA), `clsf_cd_nm` (물리) ➡️ `CL_CODE_NM` (JPA), `clsf_cd_expln` (물리) ➡️ `CL_CODE_DC` (JPA) 등 물리 표준 컬럼과 매핑 변수 불일치.
   - **`CommonCodeGroup`**: 물리 DB 테이블명은 소문자 **`tb_com_cd`** 이었으나, 자바 JPA 엔티티에는 `@Table(name = "TB_COM_CD")` 로 대문자 매핑이었고, `cd_id` (물리) ➡️ `CODE_ID` (JPA), `cd_id_nm` (물리) ➡️ `CODE_ID_NM` (JPA), `cd_id_expln` (물리) ➡️ `CODE_ID_DC` (JPA), `clsf_cd` (물리) ➡️ `CL_CODE` (JPA) 등 불일치가 존재.
   - **`DeptManage` & `OrganizationManage`**: 물리 DB 테이블 **`tb_orgnzt_info`** 의 컬럼명인 `ognz_id` (물리) ➡️ `ORGNZT_ID` (JPA), `ognz_nm` (물리) ➡️ `ORGNZT_NM` (JPA), `ognz_expln` (물리) ➡️ `ORGNZT_DC` (JPA) 와의 총체적인 매핑 불일치로 부서 목록 쿼리 전면 실패.

### 3.2 해결 방안 및 구현 완료 사항 (Implemented Fixes)
1. **자바 JPA 엔티티의 표준화 매핑 현대화**:
   - [CommonCodeCategory.java](file:///d:/project/egov-enterprise/foundation/src/main/java/nuri/foundation/domain/code/CommonCodeCategory.java): 테이블명을 `tb_com_clsf_cd` 로, 컬럼을 `clsf_cd`, `clsf_cd_nm`, `clsf_cd_expln` 으로 물리 스키마와 100% 동기화 정밀 교정.
   - [CommonCodeGroup.java](file:///d:/project/egov-enterprise/foundation/src/main/java/nuri/foundation/domain/code/CommonCodeGroup.java): 테이블명을 `tb_com_cd` 로, 컬럼을 `cd_id`, `cd_id_nm`, `cd_id_expln`, `clsf_cd` 로 완벽 교정.
   - [DeptManage.java](file:///d:/project/egov-enterprise/foundation/src/main/java/nuri/foundation/domain/user/entity/DeptManage.java): 테이블명을 `tb_orgnzt_info` 로, 컬럼을 `ognz_id`, `ognz_nm`, `ognz_expln` 으로 물리 스펙에 100% 동기화.
   - [OrganizationManage.java](file:///d:/project/egov-enterprise/business-suite/src/main/java/nuri/business/domain/organization/OrganizationManage.java): 테이블명을 `tb_orgnzt_info` 로, 컬럼을 `ognz_id`, `ognz_nm`, `ognz_expln` 으로 완벽 교차 정렬.
2. **백엔드 리컴파일 및 인스턴스 핫 재기동**:
   - `./gradlew compileJava` 를 통한 무결성 빌드 완료 검증 (`BUILD SUCCESSFUL`).
   - 포트 8080 점유 중인 java 프로세스 ID(`7448`)를 강제 킬(`Stop-Process -Id 7448 -Force`)한 뒤, `npm run backend` 스크립트로 신규 표준 바이너리를 반영하여 핫 기동 완료.

### 3.3 최종 검증 결과 (Playwright Run Evidence)
- **실행 결과**: `10 passed (28.3s)` (0 flaky, 100% 무결점 통과)
```bash
Running 10 tests using 1 worker
[1/10] [setup] › e2e\auth.setup.ts:73:6 › authenticate-admin
>>> SUCCESS: Session generated for webmaster at ...
[2/10] [setup] › e2e\auth.setup.ts:77:6 › authenticate-user
>>> SUCCESS: Session generated for TEST1 at ...
[3/10] [tier-19-hierarchy] › e2e\19-hierarchy-modernization.spec.ts:15:9 › Menu Management Tree Interface
>>> Testing Menu Management Tree
>>> Menu Tree UI: PASS
[4/10] [tier-19-hierarchy] › e2e\19-hierarchy-modernization.spec.ts:29:9 › Common Code Explorer Interface
>>> Testing Common Code Explorer
>>> Common Code Explorer UI: PASS
[5/10] [tier-19-hierarchy] › e2e\19-hierarchy-modernization.spec.ts:43:9 › Department Topology Tree (Hub)
>>> Testing Department Topology Tree in Hub
>>> Department Topology Tree UI: PASS
[6/10] [tier-19-hierarchy] › e2e\19-hierarchy-modernization.spec.ts:62:9 › Atomic Hierarchy Save Button Visibility
>>> Testing Save Button Appearance after Drag (Simulated)
>>> Initial Save Button State: PASS
...
>>> [DB Cleanup] Starting cleanup of E2E test data...
>>> [DB Cleanup] All test data removed successfully!
  10 passed (28.3s)
Exit code: 0
```
