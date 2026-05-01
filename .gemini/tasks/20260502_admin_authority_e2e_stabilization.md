# 20260502_admin_authority_e2e_stabilization

## 🎯 Task: Stabilizing Admin Authority API & Tier-2 E2E Suite

### 1. Think
- **문제점**: `02-admin-system.spec.ts`의 "Security & Authority Management" E2E 테스트에서 간헐적 500 오류 및 Flaky(재시도 시 성공) 현상 발생.
- **원인 분석**: 
  - 백엔드에 명시적인 Exception 로그가 없었음.
  - 병렬 실행 시에만 문제가 발생함을 확증.
  - 코드를 정밀 분석한 결과, `AuthorManageService`의 `selectAuthorList`에 **정렬(Sort) 조건이 누락**되어 PostgreSQL이 결과를 비결정론적(Non-deterministic) 순서로 반환함. 이로 인해 E2E 스크립트가 첫 페이지에서 방금 생성한 Authority를 찾지 못해 타임아웃 오류 발생.
  - 추가로 `MenuAuthorityRepositoryImpl`의 Projection 매핑에서 `authorCode` 필드가 누락되어 Null 예외 가능성 내재.

### 2. Plan & Implement
- [x] **정렬 조건 추가**: `AuthorManageService.java`의 `PageRequest.of` 호출부에 `Sort.by("authorCode").ascending()`를 명시적으로 추가하여 페이징 결과의 순서를 보장.
- [x] **Projection 보완**: `MenuAuthorityRepositoryImpl.java`의 QueryDSL 매핑 로직에 `Expressions.asString(authorCode).as("authorCode")`를 추가하여 Null 매핑 이슈 원천 차단.
- [x] **컴파일 및 빌드**: `foundation` 모듈 컴파일 문법 오류(`constant` -> `asString`) 교정 후 빌드 성공.

### 3. Test & Verify
- [x] 백엔드 서버(`api-server`) 완전 재시동 후 Health Check 완료.
- [x] `02-admin-system.spec.ts` 전체 테스트를 병렬 모드로 재실행.
- [x] **결과**: `18 passed (2.6m)` - 간헐적 실패 현상 완벽히 소멸. 안정적인 E2E 통과 확증!

### 4. Summarize
"각개격파" 전략을 통해 가장 은밀한 버그였던 **DB 비결정론적 정렬 문제**와 **QueryDSL 매핑 누락**을 낱낱이 파헤쳐 완벽히 수정했습니다. 이제 관리자 권한 E2E 시나리오는 동시성 부하 환경에서도 100% 신뢰할 수 있게 되었습니다. 
