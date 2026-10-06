# 전체 소스 간결화·최적화 조사 — 2026-10-06

기준 커밋: `e0066946cb55c2135d9df3a66baa739f6ba8211b` (`main`). 조사 시작 시와 보고서 작성 전 작업 트리는 clean이었다. 이 문서는 해당 커밋의 **정적 감사 결과**이며 규범·삭제 승인·실시간 원장이 아니다. 제품 코드는 수정하지 않았다.

이후 사용자의 권장 순서 진행 지시에 따른 구현·검증은 [정비 결과](source-simplification-results-2026-10-06.md)에 별도로 기록한다. 삭제된 소스 링크는 조사 기준 커밋을 가리킨다. 아래 수치는 당시의 조사 분류이며, 새로운 측정 정의와 혼합해 증감률을 계산하지 않는다.

정비 효과가 큰 부분은 **운영에서 쓰이지 않는 이전 구현 제거, 조회 중복 감소, 같은 의미의 변환 함수 통합, 큰 화면·서비스의 책임 분리**다. 전체 재작성이나 범용 CRUD 프레임워크 도입은 필요하지 않다. 백엔드 10개, 프론트엔드 10개, 이관·도구 9개로 **29개 정비 항목**을 정리했다. 항목 하나에 여러 파일·메서드가 포함되므로 결함 29개 또는 삭제 파일 29개라는 뜻은 아니다.

## 1. 조사 범위와 증거의 한계

Git 추적 파일 **3,547개**를 목록화했다. Java·TS/TSX·JS/MJS/MTS·CSS·SQL·Gradle·PowerShell·Python·Shell·BAT 등 코드 확장자 파일 **3,219개**의 규모를 집계하고, 영역별 패턴 검색·참조 검색·중복 블록 탐색을 수행했다. YAML·JSON·문서에서는 관련 설정·실행 소비자·기존 승인과 계약을 대조했다. 생성물·테스트·기존 Flyway 이력을 운영 수작성 코드와 구별했다.

**전수 조사는 전체 모집단에 대한 정적 탐색을 뜻한다.** 모든 행을 사람이 수동 검토했거나 모든 실행 경로를 검증했다는 뜻이 아니다. 후보를 추린 뒤 실제 구현·호출부·관련 테스트를 정밀 검토했고, 통합자는 주요 발견을 현재 디스크에서 재확인했다. 반사 호출·외부 라이브러리 소비·저장소 밖 수동 도구 사용까지 미사용을 증명하지는 못한다.

| 주요 운영 영역 | 파일 수 | 물리 행 수 |
|---|---:|---:|
| foundation Java main | 76 | 4,826 |
| business-core Java main | 268 | 21,409 |
| business-app Java main | 310 | 22,031 |
| api-server Java main | 133 | 10,728 |
| migration-tool Java main | 136 | 16,941 |
| **Java main 합계** | **923** | **75,935** |
| frontend/src 수작성 운영 후보 TS/TSX/CSS | 631 | 94,470 |
| frontend/src `generated-*` | 7 | 64,603 |
| scripts·tools·.agent/scripts 실행 코드 | 116 | 37,236 |

행 수는 빈 줄·주석을 포함한 `splitlines()` 기준이다. Java main에는 생성된 `PermissionCodes.java`도 들어 있으므로 923개 전부가 수작성 구현은 아니다. 프론트는 `__tests__`, `*.test.*`, `*.spec.*`, 테스트 경로와 `generated-*`를 분리한 경로 기반 분류다. 테스트 지원 유틸리티의 의미 분류는 도달성 분석으로 보완했다. 파일 수·행 수 자체를 성능·품질 점수로 사용하지 않는다.

검토한 표준은 [프로젝트 규칙](../../AGENTS.md), [백엔드 헌법](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md), [프론트엔드 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md), 관련 ADR·생성 계약·기존 게이트다. DB schema/DDL을 바꾸지 않았으며 **live DB, EXPLAIN, 응답시간, 번들 크기, 실제 UI는 측정하지 않았다.** 라이브러리 지원 종료나 최신 버전의 우열도 이번 판정에 사용하지 않았다.

우선순위는 보안 취약점 등급이 아니라 **정비 착수 순서**다. P1은 동작·불필요 요청·오해를 먼저 해소할 항목, P2는 작게 상환할 코드 부채, P3는 구조 개선·낮은 비용 대비 효과를 검토할 항목이다. 아래의 검증 항목은 별도 표시가 없으면 **구현 시 실행할 계획**이지 이번 실행 성공 기록이 아니다.

## 2. 먼저 볼 항목

| 항목 | 현재 근거 | 기대 효과 | 변경 위험 |
|---|---|---|---|
| BE-01 권한 목록 SQL | 부서원 N명에 2+3N, 그룹 G개에 1+3G SELECT 호출 구조 | 일괄 조회로 왕복 횟수 감소 | 높음: 버전·ABA·권한·격리 수준 보존 |
| FE-07 부서 트리 상한 | 전량 조회가 `size=1000` 고정; 전량 API는 이미 존재 | 1,001개 이상 누락 조건 해소와 분기 단순화 | 중간: 응답 형태·편집 상태 보존 |
| FE-08 정책 탭 prefetch | 사용하지 않는 사용자·부서 데이터를 SSR에서 요청 | 불필요 요청과 로딩 의존 제거 | 중간: 탭 이동·SSR 실패 의미 보존 |
| FE-03 미작동 설정 | route gating으로 설명한 설정의 운영 소비자 없음 | 잘못된 설정 변경과 안내 방지 | 낮음~중간: 프로필·문서 확인 |
| TL-01 무검사 점검 도구 | JPA 점검 대상 0개인데 정상 종료 | 잘못된 정상 신호 제거 | 낮음: 현행 게이트의 검사 범위 확인 |
| BE-02 중복 사용자 조회 | 존재 검사 후 같은 대상을 다시 조회 | 작은 변경으로 조회 호출 감소 | 낮음~중간: 식별자 우선순위 유지 |
| FE-04 이전 API 기반 클래스 | 구형 CRUD는 테스트만 호출 | 미사용 경로·변환·상속 부담 감소 | 중간: 생성 transport 보존 |

## 3. 백엔드 — 10개 항목

### BE-01 · P1 · 권한 관리 목록의 반복 SQL — 정적 확증

[AuthorizationAdministrationService.java](../../business-core/src/main/java/nuri/business/service/auth/AuthorizationAdministrationService.java) 108~119행은 부서원마다 `readMemberships()`를 실행한다. 67~72행과 158~160행을 합치면 부서원 N명에 SELECT **2+3N회**다. 292~296행의 `grantMatrix()`도 `readGroup()`을 반복하여 그룹 G개에 **1+3G회**다. N=100이면 앞 경로는 코드상 302회다. DB 지연시간·실행 계획은 미측정이다.

- 정비: 사용자/그룹 목록·배정·최종 이력 번호를 일괄 조회하고 메모리에서 조립한다. 단건 API의 조회 경로는 필요하면 유지한다.
- 보존: `REPEATABLE_READ`, 결과 정렬, 버전 digest, ABA 방지용 마지막 이력 번호, 전체 목록의 complete 의미. [known-gaps](../../.agent/memory/known-gaps.md)의 GAP-AUTH-004 인덱스 문제와 구별하며, 코드 조사만으로 인덱스 DDL을 결정하지 않는다.
- 검증: `AuthorizationAdministrationServiceTest`, `AuthorizationAdministrationIntegrationTest`, 인원·그룹 수 증가에 따른 SELECT 수·스냅샷 동일성·충돌 거부 검사.

### BE-02 · P2 · 사용자 삭제의 중복 조회 — 정적 확증

[UserService.java](../../business-core/src/main/java/nuri/business/service/user/UserService.java) 446~452행은 `findByUserId`/`existsById` 확인 후 `findByUserId().or(findById())`로 다시 읽는다. 후자의 `orElseThrow`가 이미 부재를 처리한다.

- 정비: 사전 존재 확인을 걷고 조회 결과를 재사용한다. loginId 경로는 repository 호출 2→1, esntlId fallback은 최대 4→2다. 실제 SQL 수는 영속성 컨텍스트에 따라 다를 수 있다.
- 보존·검증: loginId 우선순위, fallback, 기존 오류 코드, 종속 삭제·이벤트 순서를 유지한다. `UserServiceTest`/`UserServiceCrudTest`의 존재·부재·두 식별자 경로와 호출 수를 확인한다.

### BE-03 · P2 · 현행 정책과 다른 미사용 검증기 — 참조 부재 확증, 퇴역 후보

[UserValidator.java (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/business-core/src/main/java/nuri/business/service/user/UserValidator.java) 12~33행의 운영 참조는 선언 외에 없고 테스트만 남았다. 자체 비밀번호 정규식은 특수문자 7종·최소 길이만 검사하여 현행 `PasswordPolicy` 및 요청 DTO의 8~64자 계약과 다르다.

- 정비: 외부 소비가 없으면 퇴역한다. 보존 요구가 있으면 현행 정책으로 위임한다. 미사용 코드를 “공통 검증기”로 다시 쓰는 일을 막는 효과가 크다.
- 검증: 현재 DTO Bean Validation·비밀번호 정책 검사를 유지한다. 미사용 구현의 테스트만 제거할 수 있으며 현행 정책 테스트까지 없애서는 안 된다.

### BE-04 · P2 · 미참조 projection·검색 조건·predicate — 퇴역 후보

[RoleInfoProjection.java (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/business-core/src/main/java/nuri/business/domain/auth/RoleInfoProjection.java) 10행, [LoginPolicySearchCondition.java (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/business-core/src/main/java/nuri/business/domain/login/LoginPolicySearchCondition.java) 6행, [CommentPredicate.java (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/business-app/src/main/java/nuri/business/domain/comment/CommentPredicate.java) 5행은 운영 소비자가 없다. 첫 파일은 테스트 참조도 없고, 나머지는 테스트만 사용한다. CommentPredicate의 두 검색 함수도 동일 구현이다.

- 정비·검증: 외부 소비·반사·설정 참조를 마지막으로 확인한 뒤 작은 삭제 묶음으로 정리한다. 영향 테스트와 컴파일을 수행한다. 과거 architecture inventory 기록은 현재 사용 증거가 아니며 역사 기록까지 자동 삭제하지 않는다.

### BE-05 · P2 · 쪽지 repository의 호환 별칭과 무효 인자 — 정적 확증

[NoteRecptnDomainRepository.java](../../business-app/src/main/java/nuri/business/domain/note/NoteRecptnDomainRepository.java) 52·61·68행과 [NoteTrnsmitDomainRepository.java](../../business-app/src/main/java/nuri/business/domain/note/NoteTrnsmitDomainRepository.java) 35·44·49행의 호환 메서드 6개는 운영·테스트 호출이 없다. 실제 검색 메서드의 `searchCondition`도 JPQL에서 쓰지 않으며 서비스는 null만 넘긴다.

- 정비: 외부 호환 요구가 없는 별칭과 무효 인자를 제거한다. 실제 사용 중인 canonical 메서드는 유지한다.
- 검증: 쪽지 서비스 테스트와 reflection signature 검사, 검색·삭제 필터·정렬·fetch join 보존 확인.

### BE-06 · P2 · 미사용 서비스 메서드·빈 구현 — 퇴역 후보

[ScheduleService.java](../../business-app/src/main/java/nuri/business/service/schedule/ScheduleService.java) 170행 `selectEmpLyrPopup()`는 항상 빈 목록을 반환하며 직접 소비자도 없다. [NotificationService.java](../../business-app/src/main/java/nuri/business/service/notification/NotificationService.java) 139·145행의 두 목록 메서드와 [PopupService.java](../../business-app/src/main/java/nuri/business/service/system/content/popup/PopupService.java) 126행 `getPopupWhiteList()`는 테스트만 호출한다.

- 정비: 필요한 기능이 아니라면 메서드와 전용 의존을 걷는다. 미사용 메서드의 `findAll()`을 현재 사용자 요청의 성능 장애라고 주장하지 않는다.
- 검증: 영향 서비스 테스트. Popup 메서드는 `AttachmentSourceRegistryLinterTest`의 exact census에도 있으므로 실제 삭제와 관련 목록 정합을 함께 처리한다.

### BE-07 · P2 · 미사용 사용자 목록 경로와 권한 JOIN — 정적 확증

[UserService.java](../../business-core/src/main/java/nuri/business/service/user/UserService.java) 114·210·217행의 `getUserList/getUserPage/searchUserPage`는 운영 호출이 없다. 첫 메서드는 [UserRepository.java](../../business-core/src/main/java/nuri/business/domain/user/repository/UserRepository.java)의 `findAllWithAuthorities`가 준 `Object[]`에서 사용자만 사용하고 중복을 합친 뒤 권한 snapshot을 다시 읽는다. 현행 컨트롤러는 `getPagedUserList`를 호출한다.

- 정비: 필요 없는 이전 목록 서비스 메서드와 전용 JOIN을 제거한다. 유지해야 한다면 사용자 직접 조회와 현행 snapshot 조합으로 줄인다.
- 검증: 사용자 목록 테스트·컴파일, `LoadTest`의 낡은 stub 정리. 이 테스트에는 현행 페이지 경로 stub도 있으므로 테스트 전체가 무효라고 판정하지 않는다.

### BE-08 · P2 · 날짜 정규화·검증 중복 — 정적 확증, 계약 확인 필요

[InformalSanction.java](../../business-app/src/main/java/nuri/business/domain/informalsanction/InformalSanction.java) 176행과 [MemoReport.java](../../business-app/src/main/java/nuri/business/domain/memoreport/MemoReport.java) 87행은 모든 하이픈을 지운 뒤 날짜를 검사하는 같은 코드를 가진다. 원문 `2026--10-06`도 정상 날짜와 구별하지 못한다. 공통 `Ymd` 검증 및 서비스 정규화와 허용 형식이 다르다.

- 정비: null·빈 값·yyyyMMdd·ISO 형식·기존 읽기값의 허용 표를 먼저 맞춘 뒤 공통 날짜 검증으로 정렬한다. 업무 도메인끼리 의존하지 않는다. 파싱 예외도 가능한 범위로 좁힌다.
- 검증: 윤년·존재하지 않는 날짜·중복 구분자·기존 값·DTO 검증. DTO가 차단하는 입력을 API에서 실제 수용하는 결함으로 과장하지 않는다. 저장 스키마 변경은 이번 제안에 포함하지 않는다.

### BE-09 · P3 · 보안 encoder 생성 복제·미사용 주입 — 정적 확증

[SecurityConfig.java](../../business-core/src/main/java/nuri/business/security/config/SecurityConfig.java) 37행과 [ApiSecurityConfig.java](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java) 85행은 같은 encoder 구성을 생성한다. core 생성자의 `Environment` 인자는 쓰지 않는다. 다만 core 설정은 `ApiSecurityConfig` 클래스가 classpath에 없을 때 활성화되는 fallback이다.

- 정비: 우선 미사용 주입을 걷고, 필요한 경우 작은 encoder 생성 함수만 공유한다. 두 설정 전체나 filter chain을 합치지 않는다.
- 검증: 두 설정 테스트, 기존 암호 검증·재해싱 호환성, false-positive-review에 연결된 검사. 보안 설정의 조건과 인가 의미를 보존한다.

### BE-10 · P3 · 큰 서비스의 책임 분리 — 설계 후보

`@Service` 중 500행 초과는 6개다: InformalSanctionService 1,158, BoardService 1,007, AuthorizationAdministrationService 828, UserService 729, MenuService 615, CommonCodeService 524행.

- 시작점: [InformalSanctionService.java](../../business-app/src/main/java/nuri/business/service/informalsanction/InformalSanctionService.java) 933행 이후 목록·프로필·사용자명·부재·업무명 조회와 DTO 조립을 데이터 수집/순수 조립으로 나눈다. 서비스마다 책임을 확인하며 파일 길이만으로 동일 분할을 적용하지 않는다.
- 검증: 조회 결과·쿼리 수·workflow·참조자·권한·버전 회귀. 처음에는 쓰기 트랜잭션과 인가 흐름을 그대로 둔다. 긴 파일이라는 이유만으로 복잡도 결함을 확정하지 않는다.

## 4. 프론트엔드 — 10개 항목

도달성 census 실측은 JS/TS 모듈 **1,087개**, 의존 간선 **3,755개**, 분석 오류 **0개**다. `runtime-reachable=616`, `test-only=466`, `ambiguous=2`, `safe-candidate=3`으로 분류됐다. **466개에는 테스트 자체가 포함된다.** 이를 미사용 운영 파일 466개로 해석하면 안 된다. 이 도구의 safe-candidate도 삭제 사전 점검 분류이지 삭제의 최종 승인이나 동적 도달성 증명이 아니다.

### FE-01 · P2 · 미도달 UI 3개 — 삭제 우선 후보

[TableSkeleton.tsx (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/components/common/TableSkeleton.tsx) 9행, [command.tsx (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/components/ui/command.tsx) 169행, [HubChartCard.tsx (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/components/ui/hub/HubChartCard.tsx) 19행은 운영 import가 없다. HubChartCard에는 handler가 없는 기본 도구 버튼도 남아 있다.

- 정비·검증: 제품·프로필 소비를 확인한 뒤 제거 후보로 묶는다. command 경로는 `dialog-footer-reachability.test.ts` 제외 목록에 남아 있어 함께 정리한다. TableSkeleton의 역사 주석은 호출이 아니다. 도달성 census·관련 계약·타입·lint로 재확인한다.

### FE-02 · P2 · 자기 테스트만 소비하는 유틸리티 — 용도 판정 후보

[logger.ts (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/lib/logger.ts), [exportUtils.ts (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/lib/utils/exportUtils.ts), [serialization.ts (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/lib/utils/serialization.ts), [common.ts (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/lib/validations/common.ts)는 운영 도달성이 없고 테스트만 소비한다. logger는 frontend/src의 유일한 winston import다.

- 정비: 유지할 제품 계약인지 판정한다. 필요 없으면 전용 테스트·의존성까지 정리하되 winston의 저장소 내 다른 도구 소비와 lockfile을 확인한다. 실제 사용하는 `password-policy.ts`는 별개다.
- 추가 판정 대상 7개: `scroll-to-top.tsx`, `standard-editor.tsx`, `standard-search-filter.tsx`, `HubInsightBadge.tsx`, `HubListCard.tsx`, `HubSummaryCard.tsx`, `administrative-role.ts`. 앞의 4개와 합해 test-only 운영 후보는 11개다. mocks/test-utils는 여기서 제외했다.
- 검증: 관련 테스트가 보호하는 제품 요구·외부 소비 확인, 의존성 검색·census·타입·lint. 단순 테스트 참조만으로 “반드시 유지” 또는 “즉시 삭제”를 결정하지 않는다.

### FE-03 · P1 · 작동하지 않는 모듈 설정과 안내 — 정적 확증

[project-modules.ts (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/config/project-modules.ts) 2~4행은 라우트·메뉴 노출의 SSOT라고 설명하지만 13행 `projectModules`와 37행 `isRouteEnabled`의 운영 소비자가 없다. [시작 가이드](../03-guides/getting-started.md) 122행도 이 파일 정리를 안내한다. census는 문서 참조 때문에 ambiguous로 분류한다.

- 정비: 실제 composer/profile·권한 원장을 기준으로 미사용 설정과 안내를 함께 정리한다. 이 함수를 새로 연결하여 화면 접근 정책을 바꾸는 것은 별도 기능 결정이다.
- 검증: composer/profile 계약, route gate의 기존 동작, 문서 링크와 도달성 census. 이 설정만 바꾸면 기능이 꺼진다고 안내하지 않는다.

### FE-04 · P2 · 생성 API 전환 후 남은 구형 CRUD 기반 클래스 — 정적 확증

[ApiService.ts](../../frontend/src/services/core/ApiService.ts) 22~75행의 `basePath/client` 및 protected `get/post/put/patch/delete` 경로는 운영 하위 클래스에서 사용하지 않는다. 구형 CRUD 호출은 테스트 어댑터에 남고, 실제 서비스는 `executeGenerated`/`executeGeneratedMultipart`를 사용한다. 후자는 basePath를 쓰지 않는다고 구현에도 명시돼 있다.

- 정비: 미사용 CRUD와 `page 번호` 등의 이전 파라미터 변환을 먼저 걷는다. 이후 불필요한 basePath 생성자·상속 껍데기를 작은 배치로 정리한다. 모든 서비스를 한꺼번에 재작성하지 않는다.
- 검증: generated-operation·multipart·서비스 계약, 타입·lint. 생성 transport의 method/path/query/응답 검증은 유지한다. 관련 문서의 이전 ApiService 설명은 현재 생성 실행 경로와 대조하며 규범을 임의 수정하지 않는다.

### FE-05 · P2 · 커뮤니티 query·응답 검증의 동일 복제 — 정적 확증

[communityService.ts](../../frontend/src/services/business/community/communityService.ts) 10·37행과 [CommunityUserService.ts](../../frontend/src/services/business/user/community/CommunityUserService.ts) 33·60행은 같은 `getCommunities_1Operation`의 query 변환과 필수 페이지 필드 검사를 복제한다. 두 서비스 모두 실제 소비자가 있다.

- 정비: 커뮤니티 내부의 작은 mapper/validator를 공유한다. 사용자 서비스의 가입·탈퇴·멤버십 기능은 별도로 유지한다.
- 검증: `communityService`/`DemoUserServices` 테스트, 여러 페이지·크기·검색 별칭의 우선순위, 불완전 응답 거부. 페이지 검사를 단순 중복이라고 삭제하지 않는다.

### FE-06 · P2 · 페이지 파라미터 변환 중복 — 정적 확증

[BannerAdminService.ts](../../frontend/src/services/foundation/system/BannerAdminService.ts) 18행, [DeptAdminService.ts](../../frontend/src/services/foundation/system/DeptAdminService.ts) 28행, [CommunityAdminService.ts](../../frontend/src/services/foundation/system/CommunityAdminService.ts) 92행에 같은 페이지·크기 별칭 변환이 있다.

- 정비: `pageIndex→page→pageNo`, `size→pageUnit→pageSize→recordCountPerPage`의 동일 부분만 순수 함수로 추출한다. 검색 필드와 기본값은 서비스별로 둔다. FE-05의 page 우선순위는 이 셋과 다르므로 기계적으로 같은 helper를 적용하지 않는다.
- 검증: 세 서비스 계약, 여러 별칭 동시 입력, 0·undefined·하한과 정렬 보존. API 생성 파일을 손으로 수정하지 않는다.

### FE-07 · P1 · 부서 트리의 1,000개 고정 조회 — 조건부 동작 결함

[useDeptTree.ts](../../frontend/src/app/admin/user/useDeptTree.ts) 27·63행은 전량 트리를 `size=1000`으로 읽는다. 잘린 SSR seed를 배제해도 재조회 상한은 같다. 부서가 1,001개 이상이면 전체를 얻지 못하는 구조다. 실제 운영 부서 수는 확인하지 않았다.

- 정비: 이미 있는 [DeptAdminService.getDeptTree](../../frontend/src/services/foundation/system/DeptAdminService.ts) 88행과 [DeptApiController](../../api-server/src/main/java/nuri/api/controller/system/DeptApiController.java) 55행의 unpaged `/tree` 경로를 이용하는 방안을 검증한다. 검색된 일부 목록과 전체 트리의 목적을 구분하고 응답 형태를 맞춘다.
- 검증: 1,001개 이상의 fixture, `useDeptTree.dirty-preserve`·`useDeptTree.unloaded-parent`·서비스 테스트와 조직도 E2E. dirty 편집·검색·미조회 부모 보존 장치를 무조건 제거하지 않는다. GAP-DEPT-001의 과거 데이터 복구 여부는 별도다.

### FE-08 · P1 · 탭별 SSR prefetch 복제와 불필요 요청 — 정적 확증

[개인정보 정책 page.tsx](../../frontend/src/app/admin/user/indvdl-info-policy/page.tsx) 14~31행은 사용자·부서 API를 둘 다 요청한다. [UserOrgHubClient.tsx](../../frontend/src/app/admin/user/UserOrgHubClient.tsx) 200행은 두 Promise를 읽지만 404·517행의 해당 query들은 POLICIES 탭에서 비활성이다. manage/departments/absences의 서버 페이지에도 같은 prefetch가 복제돼 있다.

- 정비: 탭에 필요한 데이터만 만드는 서버 loader로 중복과 불필요 요청을 줄인다. 클라이언트 탭 전환 시 후속 데이터 조회를 보장한다. login-policy 페이지는 redirect에 가려져 있으므로 현재 요청 절감량에 포함하지 않는다.
- 검증: 탭별 API 호출 수, SSR 실패의 null 의미, Suspense fallback, 탭 전환과 RSC build. 토큰 취급은 서버 경계 안에 둔다. 실제 지연 절감률은 측정 후 판단한다.

### FE-09 · P2 · 미사용 bound 함수 export 10개 — 정적 확증

[DeptJobUserService.ts](../../frontend/src/services/business/user/deptJob/DeptJobUserService.ts) 202~213행은 인스턴스 메서드를 bind한 별칭 10개를 export하지만 소비자는 `deptJobUserService` 인스턴스만 사용한다.

- 정비·검증: 해당 별칭만 걷고 import/re-export, CoreUserServices·generated-contract·업무 화면 테스트와 타입 검사를 수행한다. 일정·투표 서비스의 같은 형태 export는 실제 소비되므로 일괄 제거하지 않는다.

### FE-10 · P3 · 화면별 책임과 상태 범위 분리 — 설계 후보

[UserOrgHubClient.tsx](../../frontend/src/app/admin/user/UserOrgHubClient.tsx)는 1,675행이며 4탭·CRUD·비밀번호·잠금해제·일괄작업·드래그 저장을 관리한다. ApprovalHubClient 1,442, MenuAdminClient 1,322, CommonCodeClient 1,201, BannerAdminClient 1,164, MonitoringHubClient 1,126, SurveyQuestionsPanel 1,100행도 후속 검토 대상이다.

- 정비: 이미 분리한 `useDeptTree/UserOrgHubParts`처럼 사용자 작업·부재 패널·일괄 작업 등 실제 책임 경계로 순차 추출한다. 범용 CRUD 프레임워크나 모든 상태를 숨기는 거대 hook을 만들지 않는다.
- 검증: 기존 CRUD·부재·필터·폼·E2E, 중복 제출 lock·서버 필드 오류·query invalidation·권한별 액션 보존. 파일 분할만으로 번들/렌더 성능이 좋아졌다고 주장하지 않는다.

## 5. 이관·운영 도구 — 9개 항목

### TL-01 · P1 · 대상 0개로 성공하는 구형 JPA 점검 — 실행 재현

[check-jpa-fetch.js (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/.agent/scripts/check-jpa-fetch.js) 5행은 없어진 `business-suite`와 api-server만 대상으로 삼고, 15행은 없는 경로를 무시한다. 실제 실행은 `Total files with JPA relations scanned: 0`, `Violations found: 0`으로 정상 종료했다. 현행 Java main에는 `@Entity` 포함 파일이 89개 있다. **현재 required CI가 검사를 안 한다는 의미는 아니며, 별도의 낡은 수동 도구 문제다.**

- 정비: 기존 `JpaArchitectureTest`와 범위를 비교해 중복 도구를 퇴역하거나 현재 모듈을 탐색하도록 고친다. 유지하면 0개 모집단은 실패시킨다.
- 검증: [gate registry](../../config/governance/gates.json)의 현행 실행 경로와 대조하고, 게이트를 변경한다면 EAGER 위반·소스 루트 누락의 red 증명까지 수행한다.

### TL-02 · P2 · 간결화 지표의 운영·테스트·생성물 혼합 — 실행·정적 확증

[code-census.mjs](../../scripts/code-census.mjs) 28행은 생성물 3종만 제외한다. 88~94행의 FE 모집단은 테스트까지 포함하며 113~115행의 대형 파일 수·client 비율 분모에도 사용한다. `use client`는 실제 directive가 아니라 단순 문자열 포함으로 판정한다.

- 실제 출력: FE 1,084개/179,336 LOC, 600행 초과 36개, client 비율 34.1%. 대형 목록에는 `generated-screen-registry.ts`와 테스트가 들어 있다. 별도 수작성 운영 경로 집계의 600행 초과는 **22개**다. BE main은 10개, 도구 실행 코드는 18개다.
- 정비: 기존 도구에서 production/test/generated 모집단과 directive 판정을 분리하고 측정 정의를 출력한다. 이전 baseline과 분모가 달라진 비교는 별도로 표시한다. `.gemini/tasks`의 과거 baseline을 현재 상태 원장으로 사용하지 않는다.
- 검증: 테스트/생성물/주석/서로 다른 따옴표 directive fixture. 새 품질 게이트를 늘리거나 새 수치에 맞춰 허용 상한을 올리는 것이 목적이 아니다.

### TL-03 · P2 · 일회성 치환 스크립트 6개 — 퇴역 후보

[fix_builders.ps1 (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/.agent/scripts/fix_builders.ps1), [fix_dtos.ps1 (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/.agent/scripts/fix_dtos.ps1), [replace_all_legacy.ps1 (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/.agent/scripts/replace_all_legacy.ps1), [replace_legacy.ps1 (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/.agent/scripts/replace_legacy.ps1), [fix_frontend.js (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/.agent/scripts/fix_frontend.js), [fix_frontend_2.js (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/.agent/scripts/fix_frontend_2.js)는 없어진 모듈·고정된 개발자 경로·특정 시점 치환을 담고 있다. 파일명 기준 추적 텍스트의 외부 실행 참조는 없고 frontend 두 파일의 탐색·쓰기 루틴도 복제돼 있다.

- 정비: 재사용 요구가 없으면 보관/삭제를 판단한다. 필요하다면 대상 경로 인수·dry-run·한정된 변환부터 갖춘다. 이번 조사에서는 치환 스크립트를 실행하지 않았다.
- 검증: 저장소 밖 수동 사용 확인, 실행 진입점·문서 참조 확인. 여러 파일 삭제는 실제 정비 시 정확한 범위와 프로젝트 승인 경계를 적용한다.

### TL-04 · P2 · 개인 환경에 고정된 보조 스크립트 2개 — 퇴역/최소 개선 후보

[parse_jacoco.py (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/scripts/parse_jacoco.py) 45행의 HTML 경로와 [run_k6.ps1 (정비 전)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/scripts/run_k6.ps1) 1행의 k6 경로가 고정돼 있다. 등록된 외부 소비자는 없고 JaCoCo parser는 실패도 출력만 하고 정상 종료한다.

- 정비: 현행 [run-load-test.ps1](../../scripts/run-load-test.ps1)와 용도를 비교한다. 남길 도구에는 경로 인수와 실패 exit code를 추가하고 불필요한 도구는 정리한다.
- 검증: 정상/없는 입력 파일과 종료 코드. 부하 테스트 자체는 운영 영향이 있으므로 이번에 실행하지 않았다. TL-01·03·04를 합한 구형/개인 보조 도구 후보는 9개다.

### TL-05 · P2 · 이관 discovery의 system-schema 판정 복제 — 정적 확증

[JdbcMetadataSourceAdapter.java](../../migration-tool/src/main/java/nuri/migration/adapter/JdbcMetadataSourceAdapter.java) 899행과 [VendorCatalogDiscoveryExecutor.java](../../migration-tool/src/main/java/nuri/migration/adapter/VendorCatalogDiscoveryExecutor.java) 286행의 14줄 판정이 동일하다. 둘 다 `includeSystemObjects` 경로에 쓰인다.

- 정비·검증: adapter 내부 공통 판정으로 옮기고 null·대소문자·시스템 접두사·include 옵션을 검증한다. JDBC/vendor discovery 테스트를 사용하며 vendor SQL·가시성 증명은 합치지 않는다.

### TL-06 · P2 · 두 census의 lexer 기초 구현 중복 — 제한적 공통화 후보

[frontend-reachability-census.mjs](../../scripts/frontend-reachability-census.mjs) 203~326행과 [ui-url-state-census.mjs](../../scripts/ui-url-state-census.mjs) 122~221행에 주석·template·regex literal 탐색이 반복된다. 프론트 의존성 설치 전 실행을 위해 Node built-ins만 쓰는 목적은 타당하다.

- 정비: 의미가 같은 저수준 범위 탐색만 공유한다. 문자열 escape·import/URL 판정 차이 때문에 두 파서 전체를 통합하지 않는다.
- 검증: 두 기존 census 테스트의 decoy·dynamic import·중첩 template·regex 사례, 같은 커밋에서 census 결과 동일성. 외부 AST 라이브러리 도입을 선행 조건으로 두지 않는다.

### TL-07 · P3 · source/target tuple 생성 중복 — 정적 확증

[EtlExecutor.java](../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java) 1092·1104행은 입력 변수명 외에 같은 순서·codec·대소문자 무시 조회를 수행한다.

- 정비·검증: 하나의 private tuple 생성 함수로 줄이고 source/target 의미는 호출부에 남긴다. typed identity·component 순서·resume/safety 테스트로 보존을 확인한다.

### TL-08 · P3 · 진단 key digest 중복 — 정적 확증

[EtlExecutor.java](../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java) 1380행과 [MigrationVerifier.java](../../migration-tool/src/main/java/nuri/migration/verify/MigrationVerifier.java) 474행은 null·UTF-8 SHA-256·hex 변환이 같다. 원시 key를 로그로 출력하지 않는 보호 의미가 있다.

- 정비·검증: 작은 진단 함수로 공유하고 null·Unicode·기존 결과를 확인한다. 승인 artifact용 `CanonicalSha256`의 canonicalization/framing까지 합치지 않는다.

### TL-09 · P3 · ETL 실행기와 대형 도구의 책임 집중 — 설계 후보

[EtlExecutor.java](../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java)는 1,484행으로 session·paging·변환·identity·batch fallback·checkpoint를 담당한다. `processChunk`의 10개 인자와 위치 기반 `long[]` 카운터도 검토 비용을 높인다. `governance-gates-contract.mjs` 2,048행, `ui-quality-evidence-durability.mjs` 2,993행 역시 후순위 내부 모듈 분리 후보다.

- 정비: 이름 있는 카운터, 순수 계산/변환부터 분리하고 기존 진입점을 유지한다. 파일 수 증가가 책임 분리 효과보다 커지지 않도록 한다.
- 검증: 영향 테스트와 partial-load·generated identity·실제 프로세스 종료 후 재개 검증. commit/rollback·keymap/checkpoint의 원자성은 같은 경계에 남긴다. 게이트의 동일 의미를 증명하지 않았으므로 큰 도구라는 이유로 게이트를 삭제하지 않는다.

## 6. 짧아 보이더라도 자동 적용하면 안 되는 변경

| 발견한 형태 | 일괄 정비하지 않는 이유 |
|---|---|
| `Collectors.toList()` 49회/26파일(온라인 BE) | `Stream.toList()`의 수정 불가능 목록과 계약이 다르다. 반환값 소비를 보고 개별 판단한다. |
| `catch (Exception)` 57회/37파일(온라인 BE) | 감사·비동기·보안의 실패 격리 또는 거부 의미가 있을 수 있다. 좁힐 수 있는 파싱 catch부터 확인한다. |
| wildcard import 237개/188파일(온라인 BE) | 현행 규범 위반으로 확정하지 않았다. 대량 포맷 diff보다 실제 의미 정비가 우선이다. |
| 비슷한 인가 helper·감사 listener | owner-only/owner-or-admin 및 민감 응답 차단/로그 실패 격리 의미가 다르다. |
| InstitutionCode DTO/수신 로그의 많은 동일 필드 | 서로 다른 API·저장 책임이다. 중복 창 감소만을 위해 상속·공통 entity를 만들지 않는다. |
| MySQL/MariaDB adapter 유사 선언 | vendor별 discovery·visibility·snapshot 계약을 유지해야 한다. |
| migration-tool Jackson 2 / 온라인 Jackson 3 | 독립 CLI와 온라인 제품의 승인된 경계다. 혼용이라는 이유만으로 변경하지 않는다. |
| JWT 경계의 `java.util.Date` | 라이브러리 인터페이스를 따르는 사용이므로 자체로 레거시 결함이 아니다. |
| 생성 API·Zod·권한·screen registry | 생성기/원장을 정비할 수 있지만 산출물을 손으로 단순화하지 않는다. |
| Flyway의 과거 SQL·퇴역 API tombstone | 배포 이력·호환 계약이다. 미참조 함수와 같은 기준으로 삭제하지 않는다. |
| Spring Data 구현체·listener·scheduler | 프레임워크가 이름·annotation으로 실행한다. 텍스트 호출이 없다는 이유만으로 dead code로 분류하지 않는다. |

현재 프론트 lint는 **0 errors / 20 warnings**다. 설정은 refs 11건, effect 상태 변경 6건, 의도된 전체 페이지 이동 3건의 배경을 기록하고 있다. warning을 없애려고 microtask 지연을 넣거나 전체 재적재를 SPA 이동으로 바꾸는 것은 권하지 않는다. effect 기반 조회는 실제 데이터 흐름을 개선하는 변경에서 재검토한다.

추가 `noUnusedParameters` 진단은 15건이다. 13건은 서버 action의 `prevState`, 나머지는 BoardListClient의 `pstSn`과 chart callback의 `entry`다. framework callback의 인자 위치를 제거하면 계약이 바뀔 수 있어 `_prevState` 등 의도 표시부터 검토한다. 이것을 일반 프로젝트 타입 검사의 실패 15건으로 해석하지 않는다.

## 7. 정비 실행 순서와 완료 기준

| 배치 | 범위 | 상대 규모 | 완료 기준 |
|---|---|---|---|
| 1. 미사용·잘못된 안내 정리 | BE-03~07, FE-01~03·09, TL-01·03·04 중 외부 소비 검토를 마친 대상 | 작음~중간 | 삭제 대상의 소비자·관련 exact census 정리, 나머지 운영 경로·권한 보존 |
| 2. 같은 의미의 작은 중복·이전 API 경로 정리 | BE-02, FE-04~06, TL-05·07·08; BE-09는 별도 보안 범위 | 작음~중간 | 기존 입력·오류·순서 계약 동일, 감소한 코드/호출 수 확인 |
| 3. 데이터 조회 개선 | BE-01, FE-07·08 | 중간 | SQL/HTTP 호출 수 비교, 1,001개 부서 fixture, 버전·권한·편집 상태 보존 |
| 4. 입력 계약과 관측 지표 정리 | BE-08, TL-02·06 | 중간 | 허용/거부 입력 표, 기존 census 의미 보존 또는 측정 정의 변경 명시, 부정 검사 |
| 5. 큰 책임의 점진 분리 | BE-10, FE-10, TL-09 | 큼 | 작은 책임 경계별 결과 동일, 영향 테스트·필요 통합/E2E, 무의미한 추상화 증가 없음 |

규모는 일정 약속이 아닌 상대 비교다. 절감 시간·응답 지연·번들 감소율·ROI는 측정하지 않았으므로 수치를 만들지 않았다. 기능 변경과 기계적 정리를 한꺼번에 섞지 않고 응집된 배치로 검토한다.

- 백엔드 변경: 영향 테스트와 `./gradlew compileJava compileTestJava`; 권한·쿼리 변경은 실제 DB 통합과 동시성/버전 검증까지 확대한다.
- 프론트 변경: 영향 테스트·`pnpm -C frontend exec tsc --noEmit`·관련 lint/build, RSC·조직도·큰 화면 동작 변경은 관련 E2E.
- API/DB 계약 변경: 양단 생성 계약과 물리 schema 증거. 단순 코드 정리를 이유로 schema 변경을 끼워 넣지 않는다.
- 게이트/검사 수정: 기존 실행 경로와 required CI 연결을 보존하고 의도적 위반이 red가 되는지 확인한다. baseline 비우기·예외 확대는 정비 성과가 아니다.

성공 지표는 **확인된 미사용 표면 감소, 의미가 같은 구현의 단일화, 요청당 SQL/HTTP 수 감소, 책임별 검토 범위 축소, 기존 동작·인가·복구 테스트 유지**다. 전체 LOC 감소나 파일 수 감소 하나로 성공을 결정하지 않는다.

## 8. 이번 실행 기록

| 실행 | 결과와 해석 |
|---|---|
| `git status --short`, `git rev-parse HEAD`, `git ls-files` | clean 기준 상태와 기준 커밋·3,547개 모집단 확인 |
| 추적 코드 파일 집계·정규화 블록·심볼/호출 검색 | 주요 규모와 후보 위치 확인. 12개 유효 행 중복 창 등은 후보 탐색용이며 중복 LOC 비율이 아님 |
| `node scripts/code-census.mjs --json` | BE main 923, BE test/testFixtures 707, FE 1,084. 8행 중복 창 FE 667/123파일, BE main 187/31파일, BE test 919/131파일. 겹치는 창이며 독립 중복 건수·삭제 가능량으로 합산 불가 |
| `buildFrontendReachabilityCensus()` 읽기 전용 호출 | 1,087개 모집단, 3,755간선, issue 0; 위 FE 분류 확인 |
| `pnpm -C frontend run lint` | 0 errors, 20 warnings. 기존 상한 20 이내 |
| `pnpm -C frontend exec tsc --noEmit --incremental false --noUnusedLocals --noUnusedParameters` | 강화 진단은 종료 1, TS6133 15건. compiler는 실제 실행됐으며 pnpm의 후속 `Command tsc not found` 문구를 도구 미설치로 해석하지 않음. 별도 일반 옵션 tsc는 실행하지 않음 |
| `node .agent/scripts/check-jpa-fetch.js` | 검사 0개·위반 0개·정상 종료를 재현. 건강성 통과 증거가 아니라 TL-01의 결함 증거 |
| `node --test scripts/docs-link-integrity.test.mjs scripts/shared-memory-contract.test.mjs` | 27 tests 통과, 실패 0. 보고서 내부 링크 64개는 별도 존재 검사도 통과했으며 항목 ID 29개는 중복 없음 |

전체 Gradle/Vitest, 제품 build, 브라우저 E2E, live DB, 운영 부하 검사는 실행하지 않았다. 이번 산출물은 조사 보고서와 문서 인덱스뿐이다. 구현 후의 안정성·성능 개선을 이미 검증했다고 주장하지 않는다.
