# 20260518_tier18_e2e_stabilization.md

## 1. 개요 (Overview)
- **목적**: `frontend/e2e/18-business-extension.spec.ts` E2E 테스트를 실행하고, 도움말(HPCM) 물리 테이블을 `TB_HLP_INFO` 표준 구조로 전격 마이그레이션 및 정화 완료하여 100% 성공(Pass) 상태를 획득한다.
- **수행 상태**: ✅ 완료 (Completed)

## 2. 체크리스트 (Checklist)
- [x] **Think** — Tier 18 특화 비즈니스 모듈(약식결재, 간부일정, 도움말)의 E2E 명세 분석
- [x] **Plan** — 도움말 관련 물리 테이블 `nhpcminfo` 의 표준 헌법 위배성 식별 및 이관 DDL 설계
- [x] **Implement** — DB 물리 레이어 이관 (`TB_HLP_INFO`) 및 `Hpcm.java` 엔티티 매핑 교정 완료
- [x] **Test** — 개발 서버 프로세스 정리 및 재부팅을 통해 JPA 매핑을 반영하고 E2E 최종 검증 통과 (`8 passed`)
- [x] **Summarize** — 결과를 정리하고 최종 보고

## 3. 진행 상황 및 검증 결과 (Progress & Migration Results)

### 3.1 도움말 물리 DB 표준 마이그레이션 완결 (`nhpcminfo` ➡️ `TB_HLP_INFO`)
- **현상**: 기존 도움말 테이블명 `nhpcminfo` 및 컬럼명(`hpcm_id`, `hpcm_se_cd` 등)은 메타 표준 사전에 없는 비표준 임의 약어 `HPCM`을 난발하여 헌법을 위반하고 있었음.
- **조치**: 
  - DB 물리 마이그레이션 DDL을 실행하여 표준 단어인 `HLP` (도움말)를 반영한 **`TB_HLP_INFO`** 테이블을 완벽하게 신규 안착시킴.
  - 기존 구식 테이블 `nhpcminfo` 은 깨끗하게 제거(`DROP TABLE ... CASCADE`) 처리.
  - 표준 컬럼 구조: `HLP_ID`, `HLP_SE_CD`, `HLP_DFN`, `HLP_EXPLN`.

### 3.2 JPA 엔티티 `Hpcm.java` 최적화 리팩토링
- **조치**: [Hpcm.java](file:///d:/project/egov-enterprise/business-suite/src/main/java/nuri/business/domain/help/Hpcm.java) 엔티티 클래스의 `@Table` 및 `@Column` 매핑을 전격 표준 구조로 변경함.
  * `@Table(name = "TB_HLP_INFO")`
  * `@Column(name = "HLP_ID")`, `@Column(name = "HLP_SE_CD")`, `@Column(name = "HLP_DFN")`, `@Column(name = "HLP_EXPLN")`
- **장점**: 엔티티 클래스의 고유 자바 멤버 변수명(`hpcmId` 등)은 그대로 유지하는 **Simplicity First / Minimum-invasive** 설계를 고수하여, 리포지토리 및 DTO 레이어의 도미노 붕괴를 완벽하게 제어하고 안전한 컴파일을 이룩함.

### 3.3 핫스와프 리부팅 및 E2E 최종 검증
- **문제**: 엔티티 매핑 수정 직후 스프링 부트 서버의 기존 런타임 캐시로 인해 `nhpcminfo does not exist` JDBC SQL 에러가 발생함.
- **해결**: 포트 8080 및 3000/3001을 점유하는 java/node 프로세스들을 강제 소거(`taskkill /f /im`)한 후, `npm run dev` 를 깨끗하게 재기동하여 Spring Context에 최신 메타데이터를 전격 주입시킴.
- **최종 E2E 통과**: 특화 비즈니스 모듈(약식결재, 간부일정, 도움말 자산 인벤토리 조회)의 모든 검증 시나리오가 **8 Passed**로 무결하게 종료됨을 입증함.

## 4. 최종 검증 결과 (Playwright Run Evidence)
- **실행 결과**: `8 passed (48.3s)` (0 flaky, 100% 무결점 통과)
```bash
Running 8 tests using 1 worker
[1/8] [setup] › e2e\auth.setup.ts:73:6 › authenticate-admin
>>> SUCCESS: Session generated for webmaster at ...
[2/8] [setup] › e2e\auth.setup.ts:77:6 › authenticate-user
>>> SUCCESS: Session generated for TEST1 at ...
[3/8] [tier-18-business-ext] › e2e\18-business-extension.spec.ts:10:9 › ISM: Informal Sanction Lifecycle
>>> [Business] Navigating to Informal Sanction Hub (ISM)
>>> [Business] No pending sanctions found to approve ... PASS
[4/8] [tier-18-business-ext] › e2e\18-business-extension.spec.ts:16:9 › LSM: Leader Schedule Management Access
>>> [Business] Navigating to Leader Schedule Management (LSM) ... PASS
[5/8] [tier-18-business-ext] › e2e\18-business-extension.spec.ts:23:9 › HPCM: Help Content Management Access
>>> [Business] Navigating to Help Content Management (HPCM)
>>> [Business] Verified Help Inventory and HHLP assets ... PASS
...
>>> [DB Cleanup] Starting cleanup of E2E test data...
>>> [DB Cleanup] All test data removed successfully!
  8 passed (48.3s)
Exit code: 0
```
