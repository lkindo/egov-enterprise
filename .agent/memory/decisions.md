---
schema_version: 1
memory_kind: decisions
status: active
authority: adr-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-10-18
verified_against: 5f093963656cda38cd3c118fdb0c6cad314969eb
canonical_sources:
  - ../../docs/02-architecture/decisions/ADR-0033-encrypted-mail-delivery-snapshot.md
  - ../../docs/02-architecture/decisions/ADR-0032-migration-pit-two-slots.md
  - ../../docs/02-architecture/decisions/ADR-0030-reusable-ci-selection-followup.md
  - ../../docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md
  - ../../docs/archived/operational-decisions-history.md
  - ../../docs/02-architecture/decisions/ADR-0027-ci-reusable-admission-layout-and-nightly.md
  - ../../docs/02-architecture/decisions/ADR-0026-ci-critical-path-and-reusable-impact.md
  - ../../docs/02-architecture/decisions/ADR-0025-enterprise-completeness-and-durable-operations.md
  - ../../docs/02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md
  - ../../docs/02-architecture/decisions/ADR-0023-e2e-impact-selection-and-cache-writer.md
  - ../../docs/02-architecture/decisions/ADR-0022-ci-independent-module-impact-and-cache.md
  - ../../docs/02-architecture/decisions/ADR-0021-isolated-layered-testing-process.md
  - ../../docs/02-architecture/decisions/ADR-0020-selectable-reusable-backend-layouts.md
  - ../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md
  - ../../docs/02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md
  - ../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md
  - ../../docs/02-architecture/decisions/ADR-0015-secure-coding-ci.md
  - ../../docs/02-architecture/decisions/ADR-0013-standard-text-length-alignment.md
  - ../../docs/02-architecture/decisions/ADR-0014-deferred-standard-design-alignment.md
  - ../../docs/02-architecture/decisions/ADR-0012-retire-blog-domain.md
  - ../../AGENTS.md
  - ../../docs/02-architecture/decisions/README.md
  - ../../.github/required-checks.json
  - ../../config/governance/gates.json
refresh_triggers:
  - accepted-decision
  - superseding-adr
  - project-rule-change
---

# 공용 결정 인덱스

`verified_at`·`verified_against`는 인덱스 구조·참조를 점검한 날짜와 작업 시작 커밋이다. 2026-10-17 정리는 과거 승인·DB·CI·운영 실측을 재실행한 것이 아니며, 각 행의 시행일·검증일과 증거 경계는 그대로다.

## 범위와 승격 규칙

제품·아키텍처 결정의 정본은 [ADR 디렉터리](../../docs/02-architecture/decisions/README.md)다. 이 파일은 Accepted ADR과 장기적인 운영 결정을 찾기 위한 인덱스이며 ADR 내용을 복제하거나 바꾸지 않는다. 제안·보류 항목은 결정으로 기록하지 않고 [known-gaps.md](known-gaps.md)에 둔다.

- 허용 상태: `accepted`, `superseded`, `rejected`.
- 기존 결정의 전문은 소급 편집하지 않는다. 운영 결정의 변경은 후속 DEC가 `supersedes`로 연결하고, Accepted ADR의 규범 변경은 후속 ADR로 대체한 뒤 인덱스에 연결한다. 이 규칙(2026-10-17) 전에 운영 결정이 ADR 일부를 대체한 경우는 해당 ADR 머리의 "후속 결정" 줄과 ADR 색인 상태 열로 표시한다.
- 행의 시행일·당시 수치는 결정 배경이며 현재 구현 수치가 아니다. 현행 상태는 [project-context.md](project-context.md)·[known-gaps.md](known-gaps.md)와 링크된 코드에서 확인한다. 재검증일은 인덱스·참조 점검일이며 과거 승인이나 외부 운영 증거를 새로 부여하지 않는다.
- 헌법과 `AGENTS.md`의 실질 정책 변경은 사용자 명시 요청이 먼저다.

## Accepted ADR index

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| ADR-0001 | accepted | core/app 제품 경계와 main·release-tag 배포 기준을 분리한다. | 재사용 기반과 제품 구현의 결합을 낮추기 위해서다. | [ADR-0001](../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md) | 2026-08-15 | - |
| ADR-0002 | accepted | UI는 한국어 우선이고 API의 ko/en 메시지 계약은 유지한다. | 사용자 언어 일관성과 재사용 API 호환성을 함께 지키기 위해서다. | [ADR-0002](../../docs/02-architecture/decisions/ADR-0002-korean-first-frontend.md) | 2026-08-15 | - |
| ADR-0003 | accepted | 프런트엔드 UX 현대화는 사용자 과업을 우선하고, 브랜드 중립 프로필·WCAG 2.2·측정 기반 데이터 소유권·위험 기반 복구와 mutation 원칙을 적용한다. | 특정 미학과 일시적인 API를 core 헌법에 고정하지 않고 공공·민간 프로필이 같은 접근성·상태 계약을 공유하게 하기 위해서다. | [ADR-0003](../../docs/02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md) | 2026-08-20 | - |
| ADR-0004 | accepted | 과업 중심 기본 내비게이션과 명시적 관리 센터를 결합한 하이브리드 IA를 prototype·research의 잠정 방향으로 채택하고 canonical URL과 route-level blocker는 유지한다. | live menu·role·privacy·사용자 연구를 창작하지 않으면서 최적 후보 하나에 검증을 집중하고, final IA 승인 전 consumer migration을 막기 위해서다. | [ADR-0004](../../docs/02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md) | 2026-08-21 | - |
| ADR-0005 | accepted | UI 품질 증거는 digest-derived versioned compact summary와 tracked index로 보존하고 기존 summary를 덮어쓰지 않는다. | ignored r12 원본 JSON을 source에 복제하거나 허위 CI provenance를 만들지 않으면서 clean checkout에서 bounded aggregate와 provenance를 장기 검증하기 위해서다. | [ADR-0005](../../docs/02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md) | 2026-08-21 | - |
| ADR-0006 | accepted | 반응형 표현은 단일 SSR DOM 위에서 CSS로만 전환한다. 같은 데이터를 두 벌 렌더해 `hidden`/`md:hidden`으로 한쪽만 보이거나, `matchMedia`·`useSyncExternalStore`·`next/dynamic ssr:false` 로 본문 데이터 표현을 분기하지 않는다. | nonce CSP 때문에 전 페이지가 force-dynamic 이라 SSR HTML 이 사용자가 보는 첫 화면이다. 훅 방식은 49개 화면에 새 하이드레이션 경계를 만들고, 이중 렌더는 accessor 를 2회 실행해 소비자가 만든 testid·aria-label 을 2벌로 복제한다(CI run 32555133776 strict mode violation). | [ADR-0006](../../docs/02-architecture/decisions/ADR-0006-css-only-responsive-table.md) | 2026-08-22 | - |
| ADR-0007 | accepted | 2026-08-23 G1 워크숍(참석: lkindo, 세 owner 역할)에서 하이브리드 IA를 참조-기본(reference-default) IA로 승인하고, 연구·live DB census·AT 증거 요건은 기관 채택 시점의 재검증 의무로 이전한다. route별 disposition은 일괄 승인되지 않으며 owner PR 리뷰로 개별 승인한다. PD-UX-002는 보류 유지. | 참조 구현에는 운영 DB도 실사용자도 구조적으로 존재하지 않아 원 G1 요건이 영구 미충족이었다. 사용자 연구 없는 승인임은 accepted-risk로 영구 기록하며, 파생 제품도 그 한계를 승계한다. | [ADR-0007](../../docs/02-architecture/decisions/ADR-0007-reference-default-ia-approval.md) | 2026-08-23 | - |
| ADR-0008 | accepted | `migration-tool`은 PostgreSQL·Oracle·Tibero·MySQL·MariaDB·SQL Server 소스를 inventory·plan·승인 artifact와 digest에 결속해 Flyway 소유 PostgreSQL 표준 스키마로 적재하는 독립 offline `bootJar`로 유지한다. | 소스별 객체 누락과 미검증 자동화를 fail-closed로 드러내면서 온라인 앱과 타깃 스키마 소유권을 침범하지 않는 재현 가능한 승인 경계를 만들기 위해서다. | [ADR-0008](../../docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md) | 2026-08-31 | - |
| ADR-0009 | accepted | 업무상 개인정보가 포함될 수 있는 사용자 검색어는 화면별 route·query allowlist와 로그 비복제 조건 아래 URL에 둘 수 있다. 앱은 자격증명·고위험 개인정보·응답 원문용 URL state를 설계하거나 검색창에서 입력을 유도하지 않으며, 자유 입력에 예상 밖 값이 들어올 가능성은 잔여 위험이다. | GET·SSR·공유·새로고침 복원과 streaming download를 보존하면서 무제한 query 전파와 로그 노출을 차단하기 위해서다. | [ADR-0009](../../docs/02-architecture/decisions/ADR-0009-controlled-url-search-state.md) | 2026-09-05 | ADR-0003 §5의 검색어 절대 금지 부분 |
| ADR-0010 | accepted | 프론트엔드 `accessToken`·`session_exp` 쿠키의 `Secure`는 기본·배포 필수 속성으로 유지하고, 명시적으로 opt-in한 평문 HTTP local loopback 개발·검증에만 미설정을 허용한다. `accessToken`의 `HttpOnly`와 두 쿠키의 `SameSite=Strict`는 환경과 관계없이 유지한다. | 로컬 HTTP 흐름을 보존하면서 production 여부나 내부 URL만으로 공유 개발·preview·staging까지 예외가 넓어지는 것을 막고, 로그인·재발급을 같은 실행 계약에 결속하기 위해서다. | [ADR-0010](../../docs/02-architecture/decisions/ADR-0010-frontend-session-cookie-secure-policy.md) | 2026-09-05 | - |
| ADR-0011 | accepted | 익명 만족도와 비밀번호 소유 증명을 지원하지 않고, 만족도 수정·삭제를 인증된 owner-or-admin으로 제한한다. 공개 삭제 API의 `pswd` query와 DTO·서비스·엔티티 애플리케이션 매핑의 휴면 비밀번호 경로를 제거한다. credential-like 이름은 전역 경계가 query 요청을, 정적 API 계약이 path/query 선언을, 프론트 source 계약이 명시적 query producer를 차단하며 물리 컬럼은 별도 DB 결정 전까지 보존한다. | 현재 인증 제품과 소유권 모델을 일치시키고 자격증명을 request-target에 노출하는 이중 소유 증명 체계를 없애기 위해서다. | [ADR-0011](../../docs/02-architecture/decisions/ADR-0011-retire-anonymous-satisfaction-password-proof.md) | 2026-09-05 | - |
| ADR-0012 | accepted | 블로그 생산 도메인·게시판 귀속 계약·재사용 profile·비사용 물리 스키마를 제거한다. 새 Flyway는 쓰기를 먼저 차단하고 데이터나 참조가 있으면 제거를 거부하며 과거 migration과 공유 표준 사전은 보존한다. | 사용자가 블로그 도메인 전체 제거를 명시적으로 요청했고 OCI 읽기 실측에서 블로그·멤버십·게시판 귀속이 모두 0건이었다. | [ADR-0012](../../docs/02-architecture/decisions/ADR-0012-retire-blog-domain.md) | 2026-09-08 | DEC-OPS-072의 블로그 유지 및 DEC-OPS-047의 블로그 기여자 부분 |
| ADR-0013 | accepted | 설계 보류 6개를 제외한 표준 길이 24개를 DB·백엔드·프론트에서 맞추고 SMS 수신번호를 숫자 문자열로 정규화한다. 단계별 배포와 데이터 보존 검증을 이행한다. | 사용자 명시 적용 요청과 OCI 표준·스키마·데이터 실측에 따른 정합 작업이다. | [ADR-0013](../../docs/02-architecture/decisions/ADR-0013-standard-text-length-alignment.md) | 2026-09-09 | - |
| ADR-0014 | accepted | 프로그램 키 300자와 선택적 메뉴 FK, 변경일자와 분리된 HHmmss, USER_ENRRNO/V256 암호화 표준으로 보류 6개를 정합한다. | 사용자가 OCI 실측 기반 권장안을 채택했다. 기존 경로·권한·암호문 보존과 단계적 전환을 검증한다. | [ADR-0014](../../docs/02-architecture/decisions/ADR-0014-deferred-standard-design-alignment.md) | 2026-09-09 | ADR-0013의 6개 보류 |
| ADR-0015 | accepted | CodeQL SAST의 High/Critical 차단을 CI·릴리스 필수 체크에 연결한다. | 사용자 시큐어코딩 점검 도입 요청에 따라 기존 시크릿·의존성 검사의 소스 분석 공백을 보완한다. | [ADR-0015](../../docs/02-architecture/decisions/ADR-0015-secure-coding-ci.md) | 2026-09-09 | - |
| ADR-0016 | accepted | 인가를 그룹·복수 사용자배정·유형별 기능/메뉴배정 3개와 같은 트랜잭션 감사 1개로 통합하고 구 writer 종료 후 수동 전환한다. | 최소 테이블과 동일한 권한 의미·회수·감사·동시 수정 보호를 함께 유지한다. | [ADR-0016](../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md) | 2026-09-10 | DEC-OPS-023 ②·037·042·046·064의 역할 판정과 DEC-OPS-067의 구 권한·롤 UI 부분 |
| ADR-0017 | accepted | 현재 제품을 과업 중심 4개 메뉴 영역으로 재편하고 중복 진입점을 통합하며 기존 기능 권한을 보존한다. | 사용자가 OCI·소스 실측에 따른 메뉴 이동·추가·병합안을 승인했다. | [ADR-0017](../../docs/02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md) | 2026-09-11 | - |
| ADR-0018 | accepted | 일반 검토 최신성·기술 계약·기관 승인을 분리한다. 세 프로필 실제 산출물 검증, 명시 소유권 기반 원장·메모리 투영과 무결성, 기관별 실행 artifact 결속을 적용한다. 원본 운영 사실은 upstream 이력이며 기관 승인은 pending에서 시작한다. | 사용자가 D + E와 후속 F 확대 및 정합 감사의 권장 수정 순서를 승인했다. 실제 위반·미검토·한시 예외 만료·이관 쓰기 경계는 유지한다. | [ADR-0018](../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md) | 2026-09-14 | DEC-OPS-027 ③·DEC-OPS-087 ②·UI quality 및 E2E duration의 일반 최신성 차단, DEC-OPS-077 ⑤의 축소 프로필 red 허용 기대치 |
| ADR-0019 | accepted | 운영 오버레이에 X-Forwarded-For를 접속 주소로 덮어쓰는 비루트 nginx edge를 두고 Next 공개 포트를 비운다. Next는 `TRUSTED_EDGE_PROXY=true`일 때만 인증 BFF와 서버 측 API 호출에 사용자 IP를 싣고, 요청 제한 한도는 설정 속성으로 받는다(기본값은 종전 동작). | 사용자 IP가 로그인 IP 제한·로그인 기록·요청 제한에서 Next 주소 하나로 모이거나 rewrite 경로에서 위조될 수 있었다(GAP-SEC-004). 사용자가 개선 계획의 권고 형상을 승인했다. | [ADR-0019](../../docs/02-architecture/decisions/ADR-0019-client-ip-trust-boundary.md) | 2026-09-14 | - |
| ADR-0020 | accepted | 원본 모듈 구조를 유지하며 생성 백엔드의 멀티모듈·단일모듈 출력을 선택한다. 단일 출력도 논리 소스 그룹·검증 경계와 오프라인 이관 책임을 보존한다. | 사용자가 두 내보내기 형태를 명시 요청했다. 현재 누적 프로필·PostgreSQL 범위는 유지한다. | [ADR-0020](../../docs/02-architecture/decisions/ADR-0020-selectable-reusable-backend-layouts.md) | 2026-09-19 | - (ADR-0001 출력 형태 보완) |
| ADR-0021 | accepted | 테스트를 API 계약·사용자 과업·횡단 품질로 재편하고 로컬·CI의 격리 소유권을 검증한다. 전체 E2E와 영향 shadow를 병행한다. | 중복 비용과 실행 누락을 줄이며 공유 DB를 보호한다. | [ADR-0021](../../docs/02-architecture/decisions/ADR-0021-isolated-layered-testing-process.md) | 2026-09-21 | - |
| ADR-0022 | accepted | PR·통합 push의 영향 분류를 통일하고 온라인·이관 build/PIT와 커버리지를 분리한다. Gradle 캐시 provider를 명시한다. | 독립 모듈의 불필요한 실행·중복과 직렬 대기를 줄인다. | [ADR-0022](../../docs/02-architecture/decisions/ADR-0022-ci-independent-module-impact-and-cache.md) | 2026-09-21 | ADR-0021 결정 4의 main 전수 강제·DEC-OPS-104의 PIT 부분집합 조건 |
| ADR-0023 | accepted | PR의 검토된 화면만 E2E spec 선별, main 전수·전체 discovery 대조와 Gradle 단일 writer를 유지한다. | 매핑 누락과 캐시 저장 경합을 보완한다. | [ADR-0023](../../docs/02-architecture/decisions/ADR-0023-e2e-impact-selection-and-cache-writer.md) | 2026-09-21 | ADR-0021의 E2E shadow·ADR-0022 결정 8 |
| ADR-0024 | accepted | Spring Boot 4.1로 두 단계 전환한다. 1단계는 Jackson 2 호환 모듈로 API 계약을 유지하고 2단계에서 Jackson 3으로 옮긴다. | OSS 지원이 끝난 3.5 라인의 미수정 CVE를 해소하면서 전환 위험을 나눈다. | [ADR-0024](../../docs/02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md) | 2026-09-24 | - |
| ADR-0025 | accepted | 개선 결정 D01~D15 A와 F01~F08을 채택한다. 보호계정·최소 응답·업무 규칙·MFA·내구 알림/감사/삭제를 구현·검증한다. | 2026-09-28 사용자 전체 A 선택. 운영 적용·실계정 변경·발행은 별도 승인으로 남긴다. | [ADR-0025](../../docs/02-architecture/decisions/ADR-0025-enterprise-completeness-and-durable-operations.md) | 2026-09-28 | 겹치는 이전 정책 제안의 선택 대기 상태 |
| ADR-0026 | accepted | backend와 schema 검증을 병렬화하고, 증명된 변경만 재사용 profile을 선별하며 CI 시간을 계측한다. | 검증 강도를 유지하면서 임계 경로와 불필요한 runner 사용을 줄이기 위해서다. | [ADR-0026](../../docs/02-architecture/decisions/ADR-0026-ci-critical-path-and-reusable-impact.md) | 2026-09-29 | - |
| ADR-0027 | accepted | 사용자 구성 검증을 분류 직후 시작하고 PR 은 시작 구성마다 한 레이아웃만 검증하며(main 은 두 레이아웃 전수), 생성물의 일반 테스트는 별도 T2 워크플로가 돈다. | 재사용 사용자 구성이 PR 의 꼬리였고 레이아웃 고유 회귀는 실측 0/91 이며, 생성물 일반 테스트는 산출물 검증 밖이었다. | [ADR-0027](../../docs/02-architecture/decisions/ADR-0027-ci-reusable-admission-layout-and-nightly.md) | 2026-10-12 | ADR-0026 결정 1의 PR 두 layout 부분·결정 10의 custom 입장(custom 두 layout 의 결정 2 는 유지) |
| ADR-0028 | accepted | 시작 구성은 `config/modules/presets.json` 의 이름 붙은 기능 목록이고, 같은 목록은 시작 구성으로 고르든 직접 고르든 같은 해석 결과와 소스 투영(Java·프런트·게이트·규칙 제거)을 낸다. pack·rank 는 없고, 계약이 시작 구성마다 대조하며 시작 구성 기대치(게이트·Java 연쇄·규칙)는 exact 목록이다. | core 시작 구성만 직접 선택보다 제외 기능의 비화면 파일을 덜 지웠고, 소유 선언이 manifest·pack·코드 상수로 나뉘어 두 투영 수단이 갈렸다. DEC-OPS-256 ④ 사용자 결정. | [ADR-0028](../../docs/02-architecture/decisions/ADR-0028-presets-are-named-domain-lists.md) | 2026-10-13 | ADR-0001 결정의 '세 프로필 중 하나 선택'·manifest SSOT 문장, ADR-0020 결정 5·검증과 후속 범위의 '누적 프로필' 표현 |
| ADR-0029 | accepted | 레거시 표준화 이관은 수집→식별→적합성→확정→설계→적재→대사 순서이고, 도구가 후보와 근거를 만들고 사람이 Git 검토 원장으로 확정한다. 원장 digest 는 plan 에 결속되고, 민감 컬럼은 도구의 호환 암호화로 적재하며, ADR-0008 경계는 그대로다. 구현은 L1~L4 로 나눈다. | 표준화 단계가 도구 밖의 손 작업이라 이관 비용과 오류의 대부분을 만들었고, raw JDBC 적재가 주민번호 암호화를 지나지 않았다. 2026-10-13 사용자 결정(Q1~Q4·Q8~Q10, Q5 의 제어 테이블 변경)과 위임(Q5 표현·Q6·Q7). | [ADR-0029](../../docs/02-architecture/decisions/ADR-0029-legacy-standardization-migration.md) | 2026-10-13 | - |
| ADR-0030 | accepted | ADR-0027 이후 승인된 PR 제외 선언과 시작 구성에 덮인 야간 단독 폐포 제거를 후속 ADR로 승격한다. 기존 실행·실패 경계는 유지한다. | DEC-OPS-296·301에만 남던 ADR 변경을 규범 정본에 연결한다. 승인일은 원문대로이며 2026-10-17은 문서 정리일이다. | [ADR-0030](../../docs/02-architecture/decisions/ADR-0030-reusable-ci-selection-followup.md) | 2026-10-13 | ADR-0027 결정 2·4의 해당 부분 |
| ADR-0031 | accepted | 기존 승인에 따른 원장 확정·비표준 대상·미확인 허용값·chunk 실패 처리와 L3 경계를 후속 ADR로 승격한다. 기존 안전 경계와 기관 승인은 유지한다. | DEC-OPS-310·315·316·317·319·325의 변경과 ADR-0029를 함께 읽을 수 있게 한다. 2026-10-17은 문서 정리일이다. | [ADR-0031](../../docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md) | 2026-10-15 | ADR-0029 결정 3·8·L3 실행 경계의 해당 부분; 결정 7의 좁은 구현 명시 |
| ADR-0032 | accepted | 이관 PIT 여덟 범위를 두 슬롯에서 실측 긴 순서로 돌린다. `sast-scope` 한 슬롯과 대상·판정·집계는 그대로다. | ADR-0029 이후 범위가 여덟 개로 늘어 한 슬롯의 이관 PIT가 전수 CI의 임계 경로가 됐다(DEC-OPS-337). | [ADR-0032](../../docs/02-architecture/decisions/ADR-0032-migration-pit-two-slots.md) | 2026-10-17 | ADR-0026 결정 10의 이관 PIT 한 슬롯 부분 |
| ADR-0033 | accepted | 메일 자동 복구용 접수 당시 주소를 암호화해 작업에 보관하고 완료 후 지운다. | 2026-10-18 사용자 선택. 이력의 표시명·변경된 현재 주소로 자동 복구하지 않는다. | [ADR-0033](../../docs/02-architecture/decisions/ADR-0033-encrypted-mail-delivery-snapshot.md) | 2026-10-18 | - |
| ADR-0034 | accepted | 410만 돌려주던 구 인가 쓰기 API 와 결재 API 로 대체된 비공식결재 API 의 경로를 걷고, 집행 지점이 없어진 INFORMAL_*·INST_CODE 쓰기 권한과 그 배정을 퇴역한다. | 2026-10-18 사용자 선택. 호출자 없는 표면이 계약·원장에 계속 집계됐고, 원장에 없는 배정은 권한 스냅샷을 fail-closed 로 막는다. | [ADR-0034](../../docs/02-architecture/decisions/ADR-0034-retire-ended-authorization-surfaces.md) | 2026-10-18 | ADR-0016 '영향과 검증'의 종료 API 무변경 거부(410) 부분 |
| ADR-0035 | accepted | 로그인 요청 제한의 템플릿 기본값을 IP당 분당 30으로 낮추고 E2E 만 종전 값으로 둔다. 한도는 계속 설정으로 조정한다. | 2026-10-19 품질 평가 과제의 사용자 지시. 종전 2,000은 계정을 돌아가며 대입하는 공격을 막지 못했다. | [ADR-0035](../../docs/02-architecture/decisions/ADR-0035-login-rate-limit-default.md) | 2026-10-19 | ADR-0019 결정 6의 로그인 기본값·관측 뒤 인하 순서 |
| ADR-0036 | accepted | 목록은 요청·응답·URL·화면 모두 1 기반 page·size(1~100) 하나이고 잘못된 입력·옛 이름은 400, pageIndex·pageUnit 은 한 릴리스 별칭이다. 자원을 만드는 POST 는 201 과 새 식별자 본문이다. | 2026-10-19 사용자가 API 규약 초안의 권고안을 모두 승인했다(저장소 밖 소비자 없음 확인). 기준이 섞여 조용히 다른 페이지를 받는 결함이 반복됐다. | [ADR-0036](../../docs/02-architecture/decisions/ADR-0036-api-paging-and-created-status-conventions.md) | 2026-10-19 | API 가이드 §2 의 201 비강제·§3 의 v2 규칙(이 변경 한정), 프런트 아키텍처 §3 의 0-based page 별칭 정규화 |
| ADR-0037 | accepted | 제품 PIT 는 6슬롯으로 돌고 선언 순서는 실측이 긴 범위 먼저다. 대상·75% 판정·집계는 그대로이고 효과가 없으면 4로 되돌린다. | 9분 이후 runner 가 비는데 PIT 가 4개만 돌아 full 실행의 꼬리였다(DEC-OPS-373). | [ADR-0037](../../docs/02-architecture/decisions/ADR-0037-product-pit-six-slots.md) | 2026-10-20 | ADR-0026 결정 9의 제품 PIT 4슬롯 부분 |
| ADR-0038 | accepted | API·코어 체인에서 CSRF를 켜고, 쿠키 자격을 실은 쓰기 요청에 이중 제출 토큰(XSRF-TOKEN 쿠키 = X-XSRF-TOKEN 헤더)을 요구한다. 헤더 전용 클라이언트는 제외하고 SockJS는 허용 Origin으로 막는다. | 브라우저 경로는 쿠키가 자격이라 CSRF 비활성 예외가 보완 통제에 의존했다(2026-10-20 사용자 근본 해소 지시). | [ADR-0038](../../docs/02-architecture/decisions/ADR-0038-credential-cookie-csrf-token.md) | 2026-10-21 | DEC-OPS-075 의 SAST-FP-001·002(CSRF 비활성 예외) |

## 운영 결정 index

아래 DEC 행은 당시 결정의 짧은 검색 인덱스이며 상태·시행일·대체 범위는 당시 기록 그대로다. 일반 UI 검토 일정의 현재 처리는 [ADR-0018](../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md)이 DEC-OPS-027 ③·DEC-OPS-087 ②의 달력 기반 기술 차단 부분을 대체한다. 다른 통제와 실제 예외 만료는 유지한다.

ID가 보관 원문의 앵커다: 각 행의 전문·이유·승인 근거는 [보관 기록](../../docs/archived/operational-decisions-history.md)의 `#<ID 소문자>` 절(예: `#dec-ops-001`)에 있다.

이 표는 지금의 작업을 제약하는 결정만 둔다. 퇴역·전부 대체·일회성 실행·구현 기록으로 분류한 결정은 [역사 색인](../../docs/archived/operational-decisions-index-historical.md)에 있고 전문은 같은 보관 원문 앵커다. 행이 퇴역·전부 대체·일회성 실행이 되면 그 행을 역사 색인으로 옮긴다(지우지 않는다).

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| DEC-OPS-001 | accepted | 프로젝트 공통 규칙은 `AGENTS.md` 한 곳에 두고 저장소 `GEMINI.md`·`CLAUDE.md`는 자동 탐색용 얇은 어댑터로 유지한다. | 2026-08-18 | - |
| DEC-OPS-002 | accepted | 공용 메모리 3종은 규범이 아닌, 근거 링크와 검증일을 가진 파생 인덱스로 운영한다. | 2026-08-18 | - |
| DEC-OPS-003 | accepted | 프론트 도구체인은 Node 22+와 pnpm 9를 단일 축으로 사용하고 계약 생성은 offline-first로 한다. | 2026-08-18 | - |
| DEC-OPS-004 | accepted | 로컬 훅은 범위별 빠른 피드백, required CI는 병합 권위로 구분한다. | 2026-08-18 | - |
| DEC-OPS-005 | accepted | `migration-tool`은 온라인 런타임에 포함하지 않는 독립·선택형 offline ETL이다. | 2026-08-18 | - |
| DEC-OPS-006 | accepted | 하네스의 논리 규칙 ID는 유지하되 발견·실행·품질 하한은 중앙 `gates.json`과 소수 runner/task로 통합한다. | 2026-08-19 | - |
| DEC-OPS-008 | accepted | 조건부 heavy job은 내부 `*-scope`로 두고 브랜치 보호에는 항상 완료되는 안정 aggregate context만 노출한다. | 2026-08-19 | - |
| DEC-OPS-009 | accepted | 단독 운영 기간의 main review policy는 approval 0·code-owner/last-push/thread-resolution 전부 비활성으로 확정하고, 명세·계약을 이 값에 양방향 동결한다. | 2026-08-20 | DEC-OPS-007 |
| DEC-OPS-010 | accepted | 설문 열람(목록·상세·문항)과 제출은 인증 사용자(`@Authenticated`)에게 개방하고, 설문·템플릿·문항·항목의 관리 뮤테이션은 `@AdminOrSystem`으로 유지한다. | 2026-08-20 | - |
| DEC-OPS-011 | accepted | production CSP의 `script-src`에서 `unsafe-inline`을 요청별 nonce로 대체하고, 그 전제로 PPR(cacheComponents)을 포기해 전 페이지를 동적 렌더로 전환한다. | 2026-08-20 | - |
| DEC-OPS-012 | accepted | UI quality baseline 의 새 authoritative run(r13)과 수동 접근성 48건 수집을 보류하고, r12 를 현재 자동 증거로 유지한 채 UI 개선 작업을 재개한다. | 2026-08-22 | - |
| DEC-OPS-013 | accepted | 단독 운영 기간 IA 프로그램의 세 owner 역할(Product·IA·Security/Privacy)을 저장소 소유자 lkindo 로 지명하고 승인 채널을 저장소 PR 리뷰로 기록한다. | 2026-08-23 | - |
| DEC-OPS-015 | accepted | 직교 data-density 축(comfortable·compact)을 신설한다 — 서버 env `UI_DENSITY`를 allowlist 검증해 `<html data-density>` 전역 1곳에 배선하고, ERP 밀도는 globals.css 의 compact 무레이어 오버라이드 블록 한 곳으로 전달한다. | 2026-08-23 | - |
| DEC-OPS-016 | accepted | 백엔드 응답 계약에 세 조건을 모두 충족하는 binary/stream 예외 하나를 도입한다. | 2026-08-23 | - |
| DEC-OPS-017 | accepted | 파일럿 시각 회귀 기준선을 대시보드·로그인 로그·공통코드·로그인 네 화면으로 확대하고 비결정적 결재함은 제외한다. | 2026-08-23 | - |
| DEC-OPS-019 | accepted | 파생 제품의 여섯 검증 축 기준선 재동결 절차와 diff 검토를 정한다. | 2026-08-24 | - |
| DEC-OPS-020 | accepted | IA acceptanceEvidence를 기관 재검증 의무로 연결하고 개별 승인과 등록된 소비자 아래에서만 사용한다. | 2026-08-24 | - |
| DEC-OPS-022 | accepted | 포털형→업무형 UI 전환의 판단 기준을 **업무 화면 문법 카탈로그**(공통 규칙 G1~G15 · archetype 8종 · 밀도 계약)로 명문화하고, A1 조회형 목록을 `WorkListPage` archetype 셸로 1급화한다. | 2026-08-24 | - |
| DEC-OPS-023 | accepted | W3(A1 이행 웨이브) 종료와 함께 두 가지 규칙을 확정한다. | 2026-08-25 | - |
| DEC-OPS-026 | accepted | DEC-OPS-022에 포함된 A2 소비자 수·status-color baseline·`W5 진행 중` 같은 **이행 시점 스냅샷을 현재 상태 판단에서 종료**한다. | 2026-08-31 | DEC-OPS-022의 진행 스냅샷만 종료(카탈로그·archetype 결정은 유지) |
| DEC-OPS-027 | accepted | 하네스 실행 경로 강화 다섯 축을 도입한다. | 2026-09-01 | - |
| DEC-OPS-028 | accepted | 생성 Zod 계약에서 **응답(response) 방향의 non-required 필드는 `null` 을 허용**한다(`.optional().nullable()`). 요청(request) 방향과 required 필드는 그대로 엄격하게 둔다. | 2026-09-01 | - |
| DEC-OPS-029 | accepted | URL-state 판정 네 축을 확정한다. 부분 개정과 미승인 범위는 후속 ADR·현재 원장이 소유한다. | 2026-09-04 | - |
| DEC-OPS-030 | accepted | 결재 도메인의 프로세스·UX 감사 조치를 반영한다. | 2026-09-05 | - |
| DEC-OPS-031 | accepted | 설문 열람 상태와 응답 제출의 기간 경계를 서버·화면에서 일치시킨다. | 2026-09-05 | - |
| DEC-OPS-032 | accepted | 사용자 관리 상세에서 관리자 비밀번호 초기화를 제공하고 안전한 별도 전달을 안내한다. | 2026-09-05 | - |
| DEC-OPS-034 | accepted | 게시글 작성 경로 세 곳을 하나로 통합하고 첨부 삭제 경로를 연결한다. | 2026-09-05 | - |
| DEC-OPS-035 | accepted | 메일·문자 발송의 수신자 피커를 공용화하고 주소록을 연결한다. | 2026-09-05 | - |
| DEC-OPS-038 | accepted | 도메인 감사의 미연결·데모·표시 경계 네 축을 정리한다. | 2026-09-06 | - |
| DEC-OPS-042 | accepted | 관리자 알림 발송에 수신자 검증과 실제 저장·전달 경로를 연결한다. | 2026-09-06 | - |
| DEC-OPS-043 | accepted | 커뮤니티 가입 승인·반려 전이를 연결한다. | 2026-09-06 | - |
| DEC-OPS-044 | accepted | 게시글 쓰기 API를 /api/v1/boards 네임스페이스로 통합한다. | 2026-09-06 | - |
| DEC-OPS-046 | accepted | 도메인 UX 최적화의 투표 결과 노출·검증·병합 경계를 바로잡는다. | 2026-09-07 | - |
| DEC-OPS-047 | accepted | 템플릿 삭제 참조 차단 | 2026-09-06 | DEC-OPS-036 의 "템플릿 삭제 참조 차단을 두지 않는다" 부분만 종료 |
| DEC-OPS-048 | accepted | 고아 도메인 ISG(인터넷 서비스 안내)를 배선하고, 같은 사각을 닫는 게이트를 신설한다. | 2026-09-07 | - |
| DEC-OPS-049 | accepted | 부재(자리비움) 관리를 배선한다 | 2026-09-07 | - |
| DEC-OPS-050 | accepted | `operation-consumer-census` 가 증명하는 범위를 정확히 한정한다. | 2026-09-07 | DEC-OPS-048 의 census 보증 범위 서술만 한정(게이트 자체는 유지) |
| DEC-OPS-051 | accepted | `operation-consumer-census` 에 축 2(서비스 메서드 → 화면 도달성)를 신설한다. | 2026-09-07 | DEC-OPS-050 의 "축 2 는 별도 게이트가 필요하다" 를 종료 |
| DEC-OPS-053 | accepted | 죽은 `IsmAdminService` 를 걷고, 그로 인해 드러난 표면을 `superseded-surface` 카테고리로 기록한다 | 2026-09-07 | - |
| DEC-OPS-058 | accepted | 설문 수정 3본(`updateSurvey`·`updateQuestion`·`updateItem`)을 배선한다 | 2026-09-07 | - |
| DEC-OPS-060 | accepted | 내 프로필 수정을 배선한다 | 2026-09-08 | - |
| DEC-OPS-061 | accepted | 행정 구역 코드에 정정 경로를 연다 | 2026-09-08 | - |
| DEC-OPS-062 | accepted | 축 2(화면 도달성) 래칫의 운영 방침을 확정한다 — 0 을 목표로 하지 않는다. | 2026-09-08 | DEC-OPS-051 의 래칫 목적을 재확인하고 잔여 소진 목표를 명시적으로 배제 |
| DEC-OPS-065 | accepted | 알림 단건 삭제를 배선한다 | 2026-09-08 | - |
| DEC-OPS-069 | accepted | 사용자 결정 4건을 "현 상태 유지" 로 확정한다 | 2026-09-08 | PD-AUTH-003·PD-ADBK-001·PD-CODE-001·PD-OPS-003 종료 |
| DEC-OPS-071 | accepted | 메모보고 수정·삭제를 화면에 열고, 응답에 서버 판정 `editable` 을 싣는다 | 2026-09-08 | - |
| DEC-OPS-072 | accepted | 커뮤니티 회원 자격이 회원 전용 게시판을 연다 | 2026-09-08 | - |
| DEC-OPS-075 | accepted | CodeQL 오탐 7건을 소스·방어 해시, 정확한 탐지 위치, 만료일에 묶어 한정 예외로 등록한다. | 2026-09-09 | — |
| DEC-OPS-076 | accepted | 재사용 base 투영에서 거버넌스 게이트가 조용히 사라지는 경로를 닫는다 | 2026-09-12 | - |
| DEC-OPS-077 | accepted | 재사용 base 산출물의 하네스 검증을 실측 기준으로 세운다. | 2026-09-12 | - |
| DEC-OPS-078 | accepted | 업무 화면 문법 §A3-1(폼 그릇 규칙)에 집행 게이트를 신설한다. | 2026-09-12 | - |
| DEC-OPS-081 | accepted | "생산 코드는 page-redirect 라우트를 가리키지 않는다" 를 route census 파생 일반 게이트로 승격한다. | 2026-09-12 | DEC-OPS-079 의 4라우트 전용 가드를 대체 |
| DEC-OPS-082 | accepted | 온라인 투표 수정에서 자동폐기 여부(`pollAtmcDsuseYn`)는 요청에 없으면 기존 값을 유지한다. | 2026-09-12 | GAP-POLL-001 이 적었던 선택지 ⓐ 서술을 정정 |
| DEC-OPS-086 | accepted | 런타임 의존성 두 축의 동작을 계약으로 고정하고, 그 계약으로 dependabot major 2건을 판정한다. | 2026-09-13 | - |
| DEC-OPS-087 | accepted | 조용히 실패하던 세 경로를 계약으로 닫는다 | 2026-09-13 | - |
| DEC-OPS-088 | accepted | 모든 프로필에 남는 화면이 빠진 pack 을 부르거나 가리키지 않게 한다 | 2026-09-13 | - |
| DEC-OPS-089 | accepted | 개인정보 접근 census 의 판정 원장을 소스 밖으로 옮기고 항목마다 소유 pack 을 적는다 | 2026-09-13 | - |
| DEC-OPS-090 | accepted | 남은 횡단 게이트 둘을 원장 방식으로 되살리고, 생성기의 Java 의존 판정을 코드 기준으로 고친다 | 2026-09-14 | - |
| DEC-OPS-091 | accepted | 인증 세션 경계 3건을 닫는다. | 2026-09-14 | - |
| DEC-OPS-092 | accepted | 데이터 무결성 경계 3건을 닫는다. | 2026-09-14 | - |
| DEC-OPS-093 | accepted | 부하 테스트는 정확성과 지연을 따로 판정한다. | 2026-09-14 | - |
| DEC-OPS-094 | accepted | 비밀번호가 바뀌기 전에 발급된 access token을 거부한다. | 2026-09-14 | DEC-OPS-091의 "access token은 만료까지 유효" 잔여 위험 서술만 종료 |
| DEC-OPS-095 | accepted | 결재자 지정과 응답이 있는 설문·투표 항목 삭제에 도메인 규칙을 둔다. | 2026-09-14 | - |
| DEC-OPS-096 | accepted | 관측성 기본값을 템플릿에 둔다. | 2026-09-14 | - |
| DEC-OPS-097 | accepted | 거버넌스 총량 관리 규칙을 AGENTS.md 에 둔다. | 2026-09-14 | - |
| DEC-OPS-098 | accepted | 운영 신뢰 프록시를 Next 고정 주소 하나로 좁힌다. | 2026-09-14 | ADR-0019의 운영 신뢰 대역(172.28.0.0/24)과 직접 요청 전제 부분 |
| DEC-OPS-099 | accepted | 화면 용어 파일럿 재검토의 결정과 수리를 확정한다. | 2026-09-15 | - |
| DEC-OPS-100 | accepted | 화면 용어 원장의 계약 수준 규범(상태 12·action 4·형식·용어·규범 원천·승인 경계)을 작성 기준과 필수 정보 규범으로 정한다. | 2026-09-15 | - |
| DEC-OPS-101 | accepted | Contract 마이그레이션은 선행 Expand의 배포·관측 기록을 요구한다. | 2026-09-16 | - |
| DEC-OPS-102 | accepted | 리프레시 토큰 회전을 원자적으로 한다. | 2026-09-16 | - |
| DEC-OPS-103 | accepted | 릴리스 이미지를 GHCR 로 발행한다. | 2026-09-16 | W0-11 의 `packages:write` 제거 |
| DEC-OPS-104 | accepted | 이관 도구 뮤테이션을 전용 잡으로 분리한다. | 2026-09-16 | - |
| DEC-OPS-105 | accepted | 부모 존재를 검증하지 않던 참조 두 축에 가드를 둔다. | 2026-09-17 | - |
| DEC-OPS-106 | accepted | 참조 4축에 물리 FK를 두고 "부모 없음" 의 저장 표현을 NULL 하나로 모은다. | 2026-09-17 | V2_26 의 "up_ognz_id 에 FK 를 걸지 않는다" 방침 |
| DEC-OPS-107 | accepted | 원본에서 만들 수 없는 증거 의무를 기관 채택 수명으로 이전한다. | 2026-09-21 | GAP-OPS-002·GAP-SEC-001·GAP-DATA-001·GAP-AUTH-003 의 활성 gap 지위 |
| DEC-OPS-108 | accepted | 브랜치 보호 명세에 `requireExtraApprovalForUnattributedChanges` 를 넣고, 명세가 모르는 pull request 파라미터를 red 로 잡는다. | 2026-09-21 | - |
| DEC-OPS-110 | accepted | ADR-0008의 소스 adapter 열거(6종)를 CUBRID를 포함한 7종으로 보완한다. | 2026-09-22 | ADR-0008 §1·§6의 6종 열거 부분 |
| DEC-OPS-111 | accepted | 운영 환경 없이 만들 수 없는 증거 3건을 기관 채택 수명으로 이전한다. | 2026-09-23 | GAP-SEC-003·GAP-STORAGE-001·GAP-OPS-001 의 활성 gap 지위 |
| DEC-OPS-113 | accepted | ZAP 주간 스캔 경고 11건을 전수 분류하고 수리 3건을 적용한다. | 2026-09-23 | - |
| DEC-OPS-114 | accepted | URL 쿼리 copy-all 캐리어 15곳을 라우트 소유 allowlist 재조립으로 바꾸고, census 탐지기가 그 형태를 이름으로 읽게 한다. | 2026-09-23 | - |
| DEC-OPS-115 | accepted | route capability 동결과 커밋된 원장을 양방향으로 대조하고, 그 대조가 드러낸 낡은 판정 2건을 고친다. | 2026-09-23 | - |
| DEC-OPS-117 | accepted | 밀도 대상 컨트롤의 고정 높이 덮어쓰기를 걷고 파일별로 동결한다. | 2026-09-23 | - |
| DEC-OPS-122 | accepted | 컨트롤러 요청 DTO 13개를 입력 계약 원장에 편입하고, 편입이 드러낸 결함 5건을 닫는다. | 2026-09-24 | - |
| DEC-OPS-124 | accepted | ADR-0024 2단계를 적용하고 범위를 온라인 앱으로 한정한다. | 2026-09-24 | ADR-0024 결정 3의 "본체·테스트의 Jackson 2 사용을 걷는다" 범위(migration-tool 제외) |
| DEC-OPS-125 | accepted | Boot 4 전환 후속을 정리한다. | 2026-09-24 | GAP-DEP-002 종료 |
| DEC-OPS-126 | accepted | 주간 ZAP 이 OpenAPI 로 API 전체를 로그인한 상태로 스캔한다. | 2026-09-24 | - |
| DEC-OPS-127 | accepted | ZAP API 스캔이 드러낸 입력 오류 500 을 400·413 으로 고친다. | 2026-09-25 | - |
| DEC-OPS-128 | accepted | 결정 대기 3건을 닫는다. | 2026-09-24 | PD-AUTH-001·PD-NOTE-003·PD-STORAGE-001 종료 |
| DEC-OPS-131 | accepted | 에이전트 브랜치 통합 검토가 드러낸 결함을 근본에서 고친다. | 2026-09-25 | DEC-OPS-071 의 단일 `editable` 힌트 부분, DEC-OPS-043 ①의 탈퇴·강제 탈퇴 부재 부분 |
| DEC-OPS-134 | accepted | 메일·반출·첨부·댓글의 노출 경계를 좁힌다(DIP B1a). | 2026-09-25 | GAP-DOMAIN-001 ①② |
| DEC-OPS-135 | accepted | 로그인·세션 경계를 좁힌다(DIP B1a). | 2026-09-25 | GAP-SEC-005 ①②③⑤ |
| DEC-OPS-136 | accepted | 리프레시 토큰을 해시로 저장하고 비밀번호 규칙을 하나로 맞춘다(DIP B1a). | 2026-09-25 | GAP-SEC-005 ④ |
| DEC-OPS-137 | accepted | 게시판 쓰기의 데이터 보존 경로를 고친다(DIP B1b). | 2026-09-25 | - |
| DEC-OPS-138 | accepted | 등록·열람·지시의 서버 소유 경계를 바로잡는다(DIP B1b). | 2026-09-26 | - |
| DEC-OPS-139 | accepted | 게시글 추천과 만족도를 한 사람당 한 번으로 묶는다(DIP B1b). | 2026-09-26 | - |
| DEC-OPS-140 | accepted | 화면은 서버가 싣는 값만 읽는다(DIP B2). | 2026-09-26 | - |
| DEC-OPS-141 | accepted | 쪽지와 메일 이력이 사람을 이름으로 보인다(DIP B2). | 2026-09-26 | - |
| DEC-OPS-142 | accepted | 게시판 화면이 일반 사용자에게 제목·템플릿·본문·행사 일정을 보인다(DIP B2). | 2026-09-26 | - |
| DEC-OPS-143 | accepted | 투표·설문 화면이 참여 여부와 실제 응답을 보인다(DIP B2). | 2026-09-26 | - |
| DEC-OPS-145 | accepted | 서버가 판정하거나 기록한 값을 화면이 그대로 말한다(DIP V9 서버 항목). | 2026-09-26 | - |
| DEC-OPS-146 | accepted | 생성 응답을 손으로 쓴 타입으로 다룰 때 서버가 보내지 않는 필드를 선언하지 못하게 한다(DIP V10). | 2026-09-26 | - |
| DEC-OPS-147 | accepted | 목록 화면의 공통 상태를 서버 응답과 맞춘다(DIP B3 C1~C4). | 2026-09-26 | - |
| DEC-OPS-148 | accepted | 조회 조건과 목록 순서를 서버가 확정한다(DIP B3 C6·C7). | 2026-09-26 | - |
| DEC-OPS-149 | accepted | 저장하지 않은 계층 변경을 지키고, 순서는 형제 안에서 매긴다(DIP B3 C5). | 2026-09-26 | - |
| DEC-OPS-150 | accepted | 업무 흐름이 사용자가 있던 자리를 지킨다(DIP B3 C8). | 2026-09-26 | - |
| DEC-OPS-151 | accepted | 목록 조회 조건은 `조회`/Enter 로 적용한다(DIP B3 C9, 카탈로그 G2). | 2026-09-26 | - |
| DEC-OPS-152 | accepted | 관리 화면으로 가는 링크·버튼은 라우트 게이트와 같은 판정으로 보인다(DIP B4 P1). | 2026-09-26 | - |
| DEC-OPS-153 | accepted | 알림 센터를 서버 페이지로 보이고, 실시간 구독은 헤더 한 곳만 둔다(DIP B4 P2). | 2026-09-26 | - |
| DEC-OPS-154 | accepted | 메모보고를 일반 사용자에게 열고, 받은 보고와 지시를 알리며, 지시가 달린 본문은 고치지 않는다(DIP B4 P3·P9, D9). | 2026-09-26 | - |
| DEC-OPS-155 | accepted | 사용자 피커는 사용 중인 계정만 보이고 부재를 표시하며, 결재자 거부 사유에 이름을 싣는다(DIP B4 P4). | 2026-09-26 | DEC-OPS-095 ①의 비활성 결재자 동일 문구 부분 |
| DEC-OPS-156 | accepted | 부서 업무·공유 일정은 서버 힌트로 수정·삭제 버튼을 가리고, 전체 열람 권한자는 커뮤니티 게시판 목록을 본다(DIP B4 P5). | 2026-09-26 | - |
| DEC-OPS-157 | accepted | 설문은 모든 문항에 답해야 제출되고, 응답이 모인 문항의 뜻은 바꾸지 않으며, 문항 순번은 서버가 매긴다(DIP B4 P6, D4). | 2026-09-26 | - |
| DEC-OPS-158 | accepted | 계정 잠금을 관리자가 보고 풀 수 있게 하고, 재발급 실패를 사실대로 말한다(DIP B4 P7, D5). | 2026-09-26 | - |
| DEC-OPS-159 | accepted | 로그인 정책의 접속 허용 시간을 짝으로만 받고, 소비처 없는 값과 분류 그룹의 성격을 화면이 사실대로 말한다(DIP B4 P8, D10). | 2026-09-26 | - |
| DEC-OPS-160 | accepted | 업무 사건을 당사자에게 알린다(DIP B5 F1). | 2026-09-26 | - |
| DEC-OPS-162 | accepted | 로그아웃한 뒤 다음 로그인까지는 인증 경로 밖의 API 요청을 보내지 않는다(DIP B4 회귀 수정). | 2026-09-26 | - |
| DEC-OPS-163 | accepted | 메뉴 즐겨찾기와 최근 방문을 둔다(DIP B5 F2). | 2026-09-26 | - |
| DEC-OPS-164 | accepted | 로그 화면이 마지막으로 고른 기간 프리셋과 페이지당 건수를 기억한다(DIP B5 F3). | 2026-09-26 | - |
| DEC-OPS-165 | accepted | 결재함 세 목록을 제목·요청일 기간·문서 상태로 좁히고 대기 건수를 탭에 보인다(DIP B5 F4). | 2026-09-26 | - |
| DEC-OPS-166 | accepted | 사용자 목록을 계정 상태·소속 부서·로그인 잠금으로 좁히고, 부서 상세가 소속 인원을 보인다(DIP B5 F4). | 2026-09-26 | - |
| DEC-OPS-167 | accepted | 쪽지를 전달할 수 있고, 수신자 피커의 주소록 탭이 모든 주소록을 보인다(DIP B5 F4). | 2026-09-26 | - |
| DEC-OPS-168 | accepted | 메일을 다시 보낼 수 있고, 보내기 전에 SMTP 미설정을 알린다(DIP B5 F7). | 2026-09-27 | - |
| DEC-OPS-169 | accepted | 주소록 구성원은 번호로 가리고, 상세 화면에서 추가·수정·삭제한다(DIP B5 F8). | 2026-09-27 | - |
| DEC-OPS-170 | accepted | 설문을 복제하고 결과 통계를 xlsx 로 내려받는다(DIP B5 F6). | 2026-09-27 | - |
| DEC-OPS-171 | accepted | 통계 화면에서 집계 기간을 고른다(DIP B5 F6). | 2026-09-27 | - |
| DEC-OPS-172 | accepted | 수신자 피커에서 부서 단위로 한꺼번에 고른다(DIP B5 F5). | 2026-09-27 | - |
| DEC-OPS-173 | accepted | 게시판 설정(댓글·만족도·첨부)을 서버와 화면이 집행한다(DIP B5 F9). | 2026-09-27 | - |
| DEC-OPS-174 | accepted | 게시판·로그 화면의 남은 편의·정직성 문제를 닫는다(DIP B5 F9 2차). | 2026-09-27 | - |
| DEC-OPS-175 | accepted | 오류 화면에 참조 번호를 보이고, 하네스 아틀라스 샘플 탭을 demo pack 으로 옮긴다(DIP B5 F11). | 2026-09-27 | - |
| DEC-OPS-176 | accepted | 공통코드 변경을 이력으로 남기고 화면에서 보인다(DIP B5 F11). | 2026-09-27 | - |
| DEC-OPS-177 | accepted | 연속 배치 작업의 반복 비용을 규칙으로 줄인다. | 2026-09-27 | - |
| DEC-OPS-178 | accepted | 승인된 후속 3건을 적용한다(2026-09-27 사용자 승인). | 2026-09-27 | GAP-BOARD-001·GAP-CI-001 종료 |
| DEC-OPS-179 | accepted | 로그인 입력은 로그인 ID 로만 해석한다. | 2026-09-27 | - |
| DEC-OPS-182 | accepted | 재배포가 제한된 Anthropic 스킬 4개(`docx`·`pdf`·`pptx`·`xlsx`, 186파일)를 원본 저장소에서 걷는다(2026-09-30 사용자 승인). | 2026-09-30 | - |
| DEC-OPS-183 | accepted | main push 의 변경 범위는 직전 main SHA 가 자기 main CI 실행을 가졌을 때만 diff 로 좁힌다. | 2026-09-30 | - |
| DEC-OPS-184 | accepted | 실패 한 번에 알림은 하나다. | 2026-10-01 | - |
| DEC-OPS-185 | accepted | 쓰기 버튼은 그 동작의 기능 권한으로 보인다. | 2026-10-01 | - |
| DEC-OPS-186 | accepted | 메뉴는 라우트 게이트와 같은 판정으로 보인다. | 2026-10-01 | DEC-OPS-152 의 메뉴 제외 범위 |
| DEC-OPS-187 | accepted | 결재가 충돌과 권한을 말한다. | 2026-10-01 | DEC-OPS-155 ③의 결재자 판정(권한 요건 추가) |
| DEC-OPS-188 | accepted | 폼 모달은 저장하지 않은 입력을 사고로 버리지 않는다. | 2026-10-01 | - |
| DEC-OPS-189 | accepted | 발송 결과를 보낸 사람이 알고 찾는다. | 2026-10-01 | DEC-OPS-035 의 첫 누락자 단독 거부 |
| DEC-OPS-190 | accepted | 상세 화면의 '목록으로' 는 목록에서 왔으면 뒤로 가고, 아니면 목록 경로로 간다. | 2026-10-01 | - |
| DEC-OPS-191 | accepted | 2MB 한글 글꼴을 미리 불러오지 않고, 라우트별 preload 글꼴 바이트를 예산으로 막는다. | 2026-10-01 | - |
| DEC-OPS-192 | accepted | 메뉴·부서 트리에 끌지 않고 옮기는 키보드 대안과 한국어 드래그 안내를 둔다. | 2026-10-01 | - |
| DEC-OPS-193 | accepted | 쪽지 작성 창과 알림 드로어가 사실과 평이한 말을 쓴다. | 2026-10-01 | DEC-OPS-153 ②의 '보안 알림' 탭 제거 범위(드로어로 확장) |
| DEC-OPS-194 | accepted | 공용 표와 보조 글자의 접근성 결함을 고친다. | 2026-10-01 | - |
| DEC-OPS-195 | accepted | 목록의 조회 시점·갱신 중 표시·조회 조건 밀도를 카탈로그 규칙에 맞춘다. | 2026-10-01 | - |
| DEC-OPS-196 | accepted | 지시가 달린 메모 보고를 지키고 화면이 서버 판정을 쓴다. | 2026-10-01 | - |
| DEC-OPS-197 | accepted | 이미 한 참여를 목록과 버튼에 보인다. | 2026-10-01 | - |
| DEC-OPS-198 | accepted | 권한 그룹 구성원을 그룹 쪽에서 보이고, 사용자 한 명을 다루는 화면끼리 대상을 넘긴다. | 2026-10-01 | - |
| DEC-OPS-199 | accepted | 길 찾기 보조 장치를 실제 구조와 맞춘다. | 2026-10-01 | - |
| DEC-OPS-200 | accepted | 다시 로그인하면 보던 자리로 돌아가고, 탭이 같은 세션을 따른다(결정 17). | 2026-10-01 | - |
| DEC-OPS-201 | accepted | 관리자가 초기화한 비밀번호는 본인이 바꾸기 전까지 다른 기능을 막는다(결정 18). | 2026-10-01 | - |
| DEC-OPS-202 | accepted | 민감 작업 감사 원장과 후속 작업을 화면에서 본다(결정 19). | 2026-10-01 | - |
| DEC-OPS-203 | accepted | 지식 허브가 커뮤니티 가입으로 이어지고 Q&A 상태 어휘를 하나로 쓴다(결정 20). | 2026-10-01 | - |
| DEC-OPS-204 | accepted | 설문은 작성 중으로 시작하고, 여론조사와 투표 목록을 나누며, 응답이 모이면 문항을 더하지 않는다(결정 21). | 2026-10-01 | - |
| DEC-OPS-205 | accepted | 부서 업무 등록자는 맡긴 업무를 보고 담당자만 바꾼다(결정 22). | 2026-10-01 | DEC-OPS-138 ②의 상세 열람 범위(등록자 추가) |
| DEC-OPS-206 | accepted | 게시 종료일을 집행한다(결정 23). | 2026-10-01 | DEC-OPS-034 ①의 게시 기간 비집행 서술 |
| DEC-OPS-208 | accepted | 권한 그룹 버전에서 구성원 변경을 빼고, 메뉴 구조와 그 메뉴의 그룹 표시를 한 초안으로 저장한다(D1·D2·D6). | 2026-10-02 | - |
| DEC-OPS-209 | accepted | 메뉴·화면·권한 관리 화면을 과업 단위로 다시 짠다(D1·D3·D4·D6). | 2026-10-02 | - |
| DEC-OPS-210 | accepted | 권한 묶음 11개를 원장에 두고 권한 작업대에서 그룹 초안에 더하며, 두 그룹을 읽기 전용으로 비교한다(D5). | 2026-10-02 | - |
| DEC-OPS-213 | accepted | 로그인 정책 쓰기에 보호 계정 가드와 마지막 관리자 보호를 둔다(GAP-SEC-006 종료). | 2026-10-03 | DEC-OPS-210 ③(로그인 정책 쓰기 묶음 제외) |
| DEC-OPS-214 | accepted | 권한 묶음은 카탈로그 전부를 분류하고, 누구나 들어가는 관련 화면의 메뉴도 더한다(DEC-OPS-210 보완). | 2026-10-03 | - |
| DEC-OPS-216 | accepted | 프런트 의존성 감사는 운영 여부를 `pnpm audit --prod` 보고서로 판정한다. | 2026-10-03 | - |
| DEC-OPS-218 | accepted | 결재 동선을 A·B안 혼합으로 고친다(2026-10-03 사용자 선택). | 2026-10-03 | - |
| DEC-OPS-219 | accepted | 결재 기안을 서버에 임시저장한다(D3, 2026-10-03 사용자 "권장대로 진행"). | 2026-10-04 | DEC-OPS-218 의 서버 임시저장 보류 부분 |
| DEC-OPS-222 | accepted | 결재 참조자를 둔다(D4, 2026-10-04 사용자 결정). | 2026-10-04 | DEC-OPS-218 의 참조자 보류 부분 |
| DEC-OPS-225 | accepted | 메뉴·화면·권한 관리를 한 화면 업무면으로 압축하고 시안 기능을 되살린다(사용자 승인). | 2026-10-04 | DEC-OPS-209 ③의 묶음 칸 동작 중 영역·섹션 줄 메뉴 표시(아래 메뉴 전체 일괄로), 권한 설계 §4.5 부모 선택 규칙의 그 칸 |
| DEC-OPS-228 | accepted | 넓은 화면의 사이드바 접기 단추를 경계선의 원형 아이콘 하나로 줄인다. | 2026-10-05 | DEC-OPS-227 ①의 글자 단추, ②의 3rem 접힘 막대(펼치기 단추·막대 폭 여백), ③의 포커스 넘기기와 머리글 단추 유지, DEC-OPS-225 ⑤가 둔 머리글 접기 아이콘 |
| DEC-OPS-232 | accepted | 화면 기능 동결 목록을 원장 쪽으로도 대조하고, 걷은 마이페이지 화면의 낡은 항목을 지운다. | 2026-10-05 | DEC-OPS-115 의 대조 범위 서술 |
| DEC-OPS-233 | accepted | V2_127 한 건만 무중단 관측 기간 없이 선행 Expand 와 같은 릴리스에 싣는다(2026-10-05 사용자 승인 — "이번만 내 승인하에 규칙을 무시하고 내가 명령한 작업을 진행해"). | 2026-10-05 | DEC-OPS-101 의 관측 기간 요구 중 이 한 건 |
| DEC-OPS-235 | accepted | 소스 간결화 재점검(PR #846 뒤)이 걷은 표면과 바뀐 동작을 기록한다. | 2026-10-07 | DEC-OPS-095 ②의 투표 항목 삭제 409(죽은 경로) |
| DEC-OPS-237 | accepted | 2026-10-07 Dependabot 배치를 한 PR 로 적용한다. | 2026-10-07 | ADR-0022 결정 7의 v6.3.0 commit 지정 부분, dependabot.yml 의 붉은 wrapper PR 유지 방침 |
| DEC-OPS-238 | accepted | 프로젝트 생성기의 모듈 선택 결함을 닫는다(Phase 0). | 2026-10-07 | - |
| DEC-OPS-239 | accepted | 재사용 base 생성의 진입 경로를 하나로 합친다(Phase 0b). | 2026-10-08 | ADR-0020 결정 5의 "레이아웃만 다르면 같은 DB 번들 재사용" 절차 부분 |
| DEC-OPS-240 | accepted | 통계를 Core로 옮기고 프로젝트 생성기의 선택 기능에서 뺀다(Phase 0c). | 2026-10-08 | DEC-OPS-085 의 통계 표면 demo 귀속과 `ReportStatsService` 대역 경계 부분(pack 분리 원칙은 유지) |
| DEC-OPS-242 | accepted | 선택 연동 선언과 기능 저하·미배정 권한 안내를 계획에 싣는다(Phase 1-2, B4·B8). | 2026-10-08 | - |
| DEC-OPS-243 | accepted | 자동 포함 사유를 사용자 말과 경로로 보인다(Phase 1-3, E2). | 2026-10-08 | - |
| DEC-OPS-244 | accepted | 생성기 기능 카드를 업무 영역으로 묶어 찾게 하고, 화면 문구를 카탈로그 해시 밖으로 옮긴다(Phase 1-4, E3·E9). | 2026-10-09 | - |
| DEC-OPS-245 | accepted | 구성 차이를 계획 단계에서 미리 보인다(Phase 1-5a, 설계서 10장·E3). | 2026-10-09 | - |
| DEC-OPS-246 | accepted | 생성하기 전에 이 컴퓨터의 생성 환경을 점검하고 최종 확인을 거친다(Phase 1-5b, 설계서 14·19장, E5). | 2026-10-09 | - |
| DEC-OPS-247 | accepted | 생성 전에 소스 투영을 정밀 점검한다(Phase 1-5c, 설계서 10장 plan/deep, C3). | 2026-10-09 | - |
| DEC-OPS-248 | accepted | 계획·점검 요청의 실패를 코드로 나눠 다음 행동을 보인다(Phase 1 E4a, 설계서 14.2). | 2026-10-09 | - |
| DEC-OPS-249 | accepted | 생성 작업 실패를 생긴 지점에서 코드로 나눠 다음 행동을 보인다(Phase 1 E4b, 설계서 14.2). | 2026-10-09 | 생성기 가이드의 '화면에 자식 출력 원문을 보내지 않는다'(DEC-OPS-238 ⑤와 함께 정함) 가운데 검증 단계 로그 끝부분 |
| DEC-OPS-250 | accepted | 생성 작업의 진행을 단계 타임라인으로 보이고, 남은 시간은 실제 작업 이력으로만 말한다(Phase 1 E6a, 설계서 14.3·20장). | 2026-10-09 | - |
| DEC-OPS-251 | accepted | 진행 중인 생성을 취소하고, 남은 임시 자원은 다음 기동에 정리한다(Phase 1 E6b, 설계서 14.3). | 2026-10-10 | - |
| DEC-OPS-252 | accepted | 자동 포함 카드를 키보드로 닿게 하고 바뀐 자동 포함을 한 번 알린다(Phase 1 E7, 설계서 14.1). | 2026-10-10 | - |
| DEC-OPS-253 | accepted | 계획의 메뉴를 원본 계층의 트리로 보이고 공통 기반 대비 추가를 표시한다(Phase 1 E8, 설계서 시안 S2). | 2026-10-10 | - |
| DEC-OPS-254 | accepted | 저장한 구성을 불러오고, 넓은 화면에서 요약과 버튼을 고정한다(Phase 1 E9, 설계서 시안 S1·21장). | 2026-10-10 | - |
| DEC-OPS-256 | accepted | 모듈 선택 고도화 Phase 2 의 결정 여섯 가지를 권고안대로 정한다(설계서 16.1). | 2026-10-10 | - |
| DEC-OPS-257 | accepted | 생성물에서 처음부터 붉은 백엔드 검사를 기능 소유로 나누고, 모집단 하한은 core 에서도 성립하는 값으로 둔다(Phase 2 D6 1차). | 2026-10-10 | - |
| DEC-OPS-258 | accepted | 생성기가 투영으로 지운 파일을 원장에 남기고, 프런트 계약은 그 원장으로 기능 파일을 거른다(Phase 2 D6 2차). | 2026-10-10 | - |
| DEC-OPS-259 | accepted | 생성물의 프런트 총계·허용 목록·예시를 투영 원장으로 거른다(Phase 2 D6 3·4차). | 2026-10-10 | - |
| DEC-OPS-261 | accepted | 메뉴·별칭·화면 코드·백엔드 문자열이 `?tab=` 으로 여는 값을 그 허브의 탭 해석과 대조한다(Phase 2, 슬롯 도입 전 census 범위 확장). | 2026-10-10 | - |
| DEC-OPS-262 | accepted | 생성물 DB 번들에 선택한 기능 몫의 참조 데이터를 싣는다(Phase 2, 설계서 B5). | 2026-10-10 | - |
| DEC-OPS-263 | accepted | 생성물의 이관 카탈로그를 구성 스키마로 다시 쓴다(Phase 2 B12). | 2026-10-10 | - |
| DEC-OPS-264 | accepted | 연쇄 제거를 기록하고 프런트 두 판정의 동치를 잰다(Phase 2, 설계서 C4·C5). | 2026-10-11 | - |
| DEC-OPS-265 | accepted | 연쇄 뒤 남는 화면을 구성의 기대값과 양방향으로 대조한다(슬롯 단계 PR-1, 설계서 11장). | 2026-10-11 | - |
| DEC-OPS-266 | accepted | 프런트 마커 투영과 import 연쇄를 한 판정으로 모은다(슬롯 단계 PR-2, 설계서 C5). | 2026-10-11 | DEC-OPS-088 ④의 주석 인용 금지와 ⑤의 원문 가드, DEC-OPS-264 ②, DEC-OPS-265 ③의 동치 시험 근거 |
| DEC-OPS-267 | accepted | 기능이 화면에 끼우는 조각을 슬롯으로 두고, 첫 기여로 수신자 피커의 주소록 출처를 옮긴다(슬롯 단계 PR-4, 설계서 11장). | 2026-10-11 | - |
| DEC-OPS-268 | accepted | 수신자 피커의 주소록 출처를 주소록 조회 권한(ADBK_READ)이 있는 사람에게만 보인다(슬롯 단계 PR-5, H3). | 2026-10-11 | - |
| DEC-OPS-269 | accepted | 게시글 상세의 스크랩 버튼을 스크랩 기능의 `post-actions` 슬롯 기여로 옮기고, 쓰기 권한 census 가 슬롯 기여의 쓰기를 그 기여를 여는 화면에 귀속하게 넓힌다(Phase 2 스크랩 슬롯 S2). | 2026-10-12 | - |
| DEC-OPS-270 | accepted | 게시글 상세의 스크랩 버튼을 스크랩 등록 권한(SCRAP_CREATE)이 있는 사람에게만 보인다(Phase 2 스크랩 슬롯 S3, H3). | 2026-10-12 | - |
| DEC-OPS-271 | accepted | 수동 도메인 삭제의 동반 삭제를 카탈로그 간선의 역방향 폐포로 정한다(Phase 2 간선 제거 E1). | 2026-10-12 | delete-domain.ps1 의 manifest clusters 동반 삭제 규칙 |
| DEC-OPS-273 | accepted | 시스템·운영 묶음을 기능 다섯으로 나눈다(DEC-OPS-256 ① 이행). | 2026-10-12 | DEC-OPS-244 ①의 업무 영역 4개 |
| DEC-OPS-274 | accepted | 협업 허브를 core 셸과 쪽지·스크랩 탭 기여로 나눈다(Phase 2 허브 분해 H1·H3). | 2026-10-12 | DEC-OPS-272 의 명령 센터 바로가기 소유 부분, DEC-OPS-088 ③의 협업 허브 주소록 마커 부분 |
| DEC-OPS-275 | accepted | 지식 허브를 게시판 셸과 커뮤니티 탭 기여로 나눈다(Phase 2 허브 분해 H2). | 2026-10-12 | - |
| DEC-OPS-276 | accepted | 통계 셸의 게시판·설문 탭과 요약 칸을 `stats-panels` 기여로 옮긴다(Phase 2 허브 분해 H4). | 2026-10-12 | - |
| DEC-OPS-277 | accepted | 협업 허브의 쪽지·스크랩 탭과 통계의 설문조사 분석 탭을 그 탭이 부르는 목록 API 권한 보유자에게만 보인다(Phase 2 허브 분해 H5, H3 판정). | 2026-10-12 | - |
| DEC-OPS-278 | accepted | 감시 허브의 댓글 탭을 걷고 `/admin/system/comments` 를 댓글 기능의 독립 화면으로 둔다(Phase 2 허브 분해 H6, 안 B). | 2026-10-12 | 설계서 11장 슬롯 표의 '댓글(hub.tabs.monitoring)' 귀속 |
| DEC-OPS-279 | accepted | 나의 업무 허브를 core 셸과 링크 기여로 나눈다(Phase 2 업무 허브 분해 W1). | 2026-10-12 | - |
| DEC-OPS-280 | accepted | 커뮤니티 후속: api-server 기능 참조를 간선으로 세고, 게시글 모아보기를 게시판 소유로, 커뮤니티→템플릿을 선택 포트로 바꾼다(Phase 2 C). | 2026-10-12 | DEC-OPS-271 의 '템플릿을 지우면 커뮤니티도 지운다' |
| DEC-OPS-281 | accepted | 업무 홈을 core 셸과 기능의 홈 조각으로 나눈다(Phase 2 9단계). | 2026-10-12 | DEC-OPS-272 의 '대시보드 묶음은 그대로다' 부분, DEC-OPS-088 ②의 업무 홈 마커 배치 부분 |
| DEC-OPS-282 | accepted | 재사용 생성 검증의 입장 순서와 PR 레이아웃을 바꾼다(ADR-0027, CI 비용 축소 1차). | 2026-10-12 | ADR-0026 결정 1의 PR 두 레이아웃 부분·결정 10의 custom 입장(결정 2 는 유지), DEC-OPS-180·CTX-021 의 'custom 2개는 backend 뒤' |
| DEC-OPS-283 | accepted | 재사용 생성물의 일반 테스트를 별도 워크플로로 돌린다(ADR-0027, T2). | 2026-10-12 | - |
| DEC-OPS-284 | accepted | 슬롯 노출 술어를 화면 목록의 표시 권한으로 귀속한다(Phase 2 10단계 10a). | 2026-10-12 | GAP-COMPOSE-001 의 술어 귀속 문장, DEC-OPS-268 ③·DEC-OPS-277 ③ 의 화면 목록 미귀속 서술 |
| DEC-OPS-285 | accepted | 시작 구성은 이름 붙은 기능 목록이고 같은 목록은 같은 결과를 낸다(ADR-0028, Phase 2 10단계 13a). | 2026-10-13 | DEC-OPS-265 의 'core 에 남는 비화면 파일은 preset 통합 몫' |
| DEC-OPS-286 | accepted | 생성물의 API 계약 사슬을 구성으로 다시 만든다(Phase 2 10c-2, U5-A). | 2026-10-13 | - |
| DEC-OPS-287 | accepted | 생성물의 권한 정의·바인딩·묶음·화면 목록을 구성으로 함께 투영한다(Phase 2 10단계 10b-2, 설계서 12.3). | 2026-10-13 | - |
| DEC-OPS-288 | accepted | 기능 선언을 매니페스트 v2(`config/modules`)로 옮기고, 카탈로그가 그것을 읽으며 시작 구성을 직접 선택과 같은 해석기로 푼다(Phase 2 11단계 C1·C2). | 2026-10-13 | - |
| DEC-OPS-289 | accepted | 생성기 투영을 매니페스트 v2 의 기능 소유로 옮기고 pack·순위를 걷는다(Phase 2 11단계 C3). | 2026-10-13 | DEC-OPS-288 ④의 'C3·B5 전까지 pack 투영' |
| DEC-OPS-290 | accepted | 횡단 게이트 원장 셋의 pack 태그를 걷고, 남고 빠지는 기대를 기능 소유에서 계산해 시작 구성마다 생성기 계획과 대조한다(Phase 2 11단계 C4). | 2026-10-13 | DEC-OPS-089·090 의 pack 태그 판정, DEC-OPS-289 ⑤ 의 C4 몫 |
| DEC-OPS-291 | accepted | 관찰자도 기능 소유와 시작 구성으로 판정하고 카탈로그·구성·lock 의 pack 축을 걷는다(Phase 2 11단계 C5). | 2026-10-13 | DEC-OPS-282 ②의 레이아웃 표 위치(분류기 상수), DEC-OPS-289 ⑤ 의 C5 몫(관찰자·검토 범위·lock 의 pack 축) |
| DEC-OPS-292 | accepted | 프런트 마커 토큰을 기능 id 로 바꾸고 마커 선언을 기능 파일로 옮긴다(Phase 2 11단계 C6). | 2026-10-13 | DEC-OPS-266 ①의 소유 표(`FRONTEND_MARKER_FILES`), DEC-OPS-088 ④의 순위 하향 의존 규칙 |
| DEC-OPS-293 | accepted | 스크립트가 시작 구성 이름을 열거하지 않고 presets.json 에서 읽는다(Phase 2 11단계 C8). | 2026-10-13 | - |
| DEC-OPS-294 | accepted | 매니페스트 v2 전환을 마친다 — 기능 소유의 원천은 `config/modules` 하나다(Phase 2 11단계 C7). | 2026-10-13 | DEC-OPS-288 ①의 C7 전까지 v1 에서 생성, DEC-OPS-243 ①·244 ①·264 ① 의 정본 위치(사유 표·표시 문구 모듈·`profiles.<name>.acknowledgedJavaCascade` → 기능 파일의 `requires[].userReason`·`presentation`·presets.json 의 `expected.javaCascade`) |
| DEC-OPS-295 | accepted | '공통 기반 + 설문'·'공통 기반 + 결재' 를 인증 시작 구성으로 둔다(DEC-OPS-256 ③, Phase 2 13b-1). | 2026-10-13 | DEC-OPS-290 ②의 합성 구성 |
| DEC-OPS-296 | accepted | 새 인증 시작 구성은 PR CI 에서 빼고 main 두 레이아웃과 T2 에서만 돈다(U15, Phase 2 CI 2차-a). | 2026-10-13 | ADR-0027 결정 2 의 'PR 은 시작 구성마다 한 레이아웃' 중 `ci.pr` 이 null 인 시작 구성 |
| DEC-OPS-297 | accepted | 생성기·도구 전용 경로만 바꾼 변경은 이관·PIT·frontend 를 돌리지 않고, 남길 축은 그 경로를 읽는 시험에서 계산한다(Phase 2 CI 2차-b, C11). | 2026-10-13 | - |
| DEC-OPS-298 | accepted | T2 야간 검증을 매일 06:17 KST 에 예약 실행하고 계약 재생성 대조를 기본으로 켠다(Phase 2 B8, U20). | 2026-10-13 | - |
| DEC-OPS-300 | accepted | 워크플로우 예시 화면(정적 목업)은 시연 기능이 소유하고, 라우트 원장의 확인된 소유는 투영과 대조한다(Phase 2 마무리 검토). | 2026-10-13 | DEC-OPS-273 의 '프런트 전용 기능은 권한 도메인을 갖지 않는다', 11단계 C5 의 워크플로우 예시 화면 결재 소유 |
| DEC-OPS-301 | accepted | T2 계획은 시작 구성과 기능 목록이 같은 단독 폐포를 돌지 않는다(Phase 2 마무리 검토). | 2026-10-13 | ADR-0027 결정 4·DEC-OPS-283 ① 의 '서로 다른 단독 폐포' 가운데 시작 구성과 같은 목록, DEC-OPS-295 의 '31잡', DEC-OPS-297 의 '생성기 화면만 바꾸면 재사용·E2E 만 돈다' |
| DEC-OPS-302 | accepted | 결재 기안 화면(`/approvals/draft`)과 결재 허브(`/approvals`)의 원장·처분을 실제 동작에 맞춘다. | 2026-10-13 | DEC-OPS-030 ④ 뒤 문장의 '/approvals/draft 목업(demo-isolated approved)은 그대로 둔다' 부분, 그 화면의 2026-08-23 웨이브 1 처분 승인 |
| DEC-OPS-305 | accepted | 레거시 표준화 이관 설계를 ADR-0029 로 채택하고 결정 대기 Q1~Q10 을 닫는다. | 2026-10-13 | - |
| DEC-OPS-306 | accepted | 이관 도구의 표준 ID 를 온라인 형식과 맞추고, 원본 키를 쓴 시퀀스를 적재 계약 안에서 맞춘다(레거시 표준화 L1 D5). | 2026-10-13 | - |
| DEC-OPS-307 | accepted | 이관 도구가 live 대상 계약과 표준 사전으로 매핑을 검증한다(ADR-0029 L1, D1). | 2026-10-13 | - |
| DEC-OPS-308 | accepted | 온라인 앱이 암호화하는 컬럼은 이관 도구가 같은 암호문으로 쓰고, 평문·키 부재는 쓰기 전에 막는다(레거시 표준화 L1 A1). | 2026-10-13 | - |
| DEC-OPS-309 | accepted | 이관 행 변환 실패를 chunk 단위 fail-closed 로 바꾸고 codemap·date 의미를 엄격히 한다(레거시 표준화 L1 PR-D, Q6 위임 중 행 변환 실패). | 2026-10-13 | - |
| DEC-OPS-310 | accepted | 이관 쓰기 단계 실패도 chunk 단위 fail-closed 로 바꾼다(GAP-ETL-001 종료, 2026-10-14 사용자 승인). | 2026-10-14 | ADR-0029 결정 8의 '쓰기 단계 fail-closed 는 L3 의 예외 행 격리와 함께 한다' 부분 |
| DEC-OPS-311 | accepted | 수집 명령 `profile`·`app-scan` 을 둔다(ADR-0029 L2a). | 2026-10-14 | - |
| DEC-OPS-312 | accepted | 용어 매핑 원장과 표준 메타 확장을 둔다(ADR-0029 L2b-1). | 2026-10-14 | ADR-0029 결정 3 의 "아니면 validate 가 실패한다" 의 시행 시점(L3 전에는 원장을 선언한 mapping 에만) |
| DEC-OPS-313 | accepted | 규칙 기반 용어 후보 `term-suggest` 를 둔다(ADR-0029 L2b-2). | 2026-10-14 | DEC-OPS-305 ① 의 Q3 가드 시행 시점(L2 → LLM 경로를 두는 단계) |
| DEC-OPS-315 | accepted | 표준 도메인 변환기와 규칙 정제 `nullify` 를 둔다(ADR-0029 L3a-1). | 2026-10-15 | DEC-OPS-307 의 DATE→TIMESTAMP 허용과 timestamptz→timestamp·timetz→time 그대로 옮기기 허용 |
| DEC-OPS-316 | accepted | 용어 매핑 원장을 형식 2로 올리고 원장에서 mapping 을 만든다(ADR-0029 L3a-2). | 2026-10-15 | DEC-OPS-313 의 `custom:*` 힌트 어휘, DEC-OPS-312 ③ 의 "확정은 적합률 100 또는 승인 예외", ADR-0029 결정 3 의 같은 확정 조건(적합률은 참고값, unmeasured 와 사유로 확정) |
| DEC-OPS-317 | accepted | plan·load 는 원장을 선언한 mapping 만 받는다(ADR-0029 L3a-2). | 2026-10-15 | DEC-OPS-312 의 원장 없는 mapping 의 plan·load(필수화 유보)와 ③ 의 "대상 컬럼 = 표준 영문약어" 가운데 비표준 대상, ADR-0029 결정 3 의 비표준 대상 부분과 U3 의 허용값 미확인 확정, DEC-OPS-315 ④ 의 프로젝트 변환기 경로, DEC-OPS-307 의 "줄이는 변환은 내장이 아닌 변환기로 선언" |
| DEC-OPS-318 | accepted | 원장이 승인한 위반으로만 실패한 행을 격리하고 값 한계 가드를 둔다(ADR-0029 L3b). | 2026-10-15 | DEC-OPS-309 의 "모든 행 변환 실패는 fail-closed" 가운데 원장 승인 행, DEC-OPS-307 의 문자 소스→decimal·numeric 정적 정밀도 오류(행 가드로 옮김) |
| DEC-OPS-319 | accepted | 한 소스 표를 여러 대상으로 나누고 checkpoint 를 매핑 단위로 기록한다(ADR-0029 L3c). | 2026-10-15 | DEC-OPS-316 ④ 의 "기본이 아닌 mapping 거부", DEC-OPS-315 ⑥ 의 "PR 6개" |
| DEC-OPS-320 | accepted | 매핑이 다른 소스 표를 단일 키로 조회해 그 컬럼을 옮긴다(ADR-0029 L3d). | 2026-10-15 | DEC-OPS-316 ④ 의 "via 거부", DEC-OPS-318 ⑥ 의 "형식 2"·DEC-OPS-321 ④ 의 "형식 3", DEC-OPS-321 ① 의 조회만 하는 표의 EXPORT_ONLY |
| DEC-OPS-321 | accepted | 보관 덤프를 COMMIT load 와 같은 원천 읽기 세션에서 쓰고 격리 행의 키를 반출한다(ADR-0029 L3e). | 2026-10-15 | - |
| DEC-OPS-322 | accepted | isolate 가 `LENGTH_EXCEEDED`·`PRECISION_EXCEEDED` 를 승인한 컬럼은 선언 길이·자릿수 정적 판정을 행 가드로 옮긴다(ADR-0029 L3e, 위임 결정). | 2026-10-15 | DEC-OPS-307 의 선언 길이·자릿수 정적 판정 가운데 그 코드를 승인한 isolate 컬럼, DEC-OPS-318 ④ 의 '선언 길이·자릿수의 정적 판정은 isolate 컬럼에도 그대로다(…미결)' 가운데 그 코드를 승인한 컬럼 |
| DEC-OPS-323 | accepted | Oracle Free 원천으로 표준화 이관을 리허설하고 드러난 결함 셋을 고친다(ADR-0029 L4-B). | 2026-10-15 | ADR-0029 실행 규칙 "각 단계는 앞 단계가 병합된 뒤 시작한다" 가운데 L4 착수 시점, DEC-OPS-311 이유의 "REMARKS 를 주지 않으면 INVENTORY_ONLY" 가운데 Oracle |
| DEC-OPS-324 | accepted | load 는 적재 뒤 대사를 지나야 PASS 다(ADR-0029 L4 D2). | 2026-10-15 | - |
| DEC-OPS-325 | accepted | 공통코드를 쓰기 전과 적재 뒤에 대조한다(ADR-0029 L4 D7). | 2026-10-15 | DEC-OPS-317 ③ 의 '허용값 대사는 L4 가 맡는다' 가운데 대조 원천이 없는 컬럼(사람 확인·서명으로 바뀐다)과, ②·③ 가운데 VALIDATE 바인딩 컬럼의 codemap 없는 확정 |
| DEC-OPS-326 | accepted | 원천 사용자 이름이 원천 schema 이름과 같으면 credential 검사에서 사용자 이름으로 보지 않는다(GAP-MIG-001 의 결정 필요 항목). | 2026-10-16 | - |
| DEC-OPS-327 | accepted | 알림 기능 없이 만든 생성물의 결재·메모 보고 화면은 알린다고 말하지 않는다(GAP-COMPOSE-001). | 2026-10-16 | GAP-COMPOSE-001 의 결재·메모 보고 알림 문구 부분 |
| DEC-OPS-328 | accepted | 나의 결재선과 알림 카드 바로 승인을 둔다(2026-10-16 사용자 승인 "4번의 db 새테이블 추가 승인"). | 2026-10-16 | - |
| DEC-OPS-330 | accepted | 권한이 빠진 투영 묶음은 원본 이름·설명을 들고 가지 않는다(GAP-COMPOSE-001). | 2026-10-16 | GAP-COMPOSE-001 의 투영 묶음 이름·설명 부분 |
| DEC-OPS-331 | accepted | 메모 보고 지시는 보고를 받은 사람만 남긴다(GAP-MEMO-001 종료, 2026-10-16 사용자 선택). | 2026-10-16 | DEC-OPS-138 ⑤·DEC-OPS-196 ④의 지시 판정 중 전체 수정 권한 부분, DEC-OPS-214 의 MEMO_RPT_UPDATE_ALL 제외 사유 |
| DEC-OPS-332 | accepted | 게시판 유형 이름의 정본을 화면 상수 하나로 두고 공통코드 COM004 조인을 걷는다(GAP-BOARD-002, 2026-10-16 사용자 선택). | 2026-10-16 | DEC-OPS-262 의 COM004 게시판 소유 부분, DEC-OPS-325 의 바인딩 6행 중 `bbs_type_cd` 행 |
| DEC-OPS-333 | accepted | rewrite 프록시는 백엔드 연결을 유휴 재사용하지 않고, 격리 E2E 의 Next 서버는 클라이언트보다 오래 유휴를 유지한다(GAP-FE-002 종료). | 2026-10-16 | - |
| DEC-OPS-334 | accepted | 허브 탭 슬롯을 허브마다 나눈다(GAP-SLOT-001 종료). | 2026-10-16 | DEC-OPS-274·275·277·284 의 '`hub-tabs` 슬롯 하나·항목의 `hub` 값으로 허브 구분' 부분 |
| DEC-OPS-335 | accepted | 계약·하네스의 반복 실행 비용과 중복 판정을 줄이고 검사 모집단·단언은 유지한다(코덱스 작업분과 보완). | 2026-10-17 | DEC-OPS-264 ①·DEC-OPS-290 ④ 의 시작 구성 승인 exact 대조 소유(pack-tagged-registry → 정밀 점검 동치 계약), DEC-OPS-090 ⑤ 의 pack-tagged-registry.test.mjs Java 승인 exact 소유(투영본 분기는 남는다) |
| DEC-OPS-336 | accepted | Atlas 도구와 operation 소비 원장을 생성기·도구 전용 경로 표에 넣는다(DEC-OPS-297 확장). | 2026-10-17 | 범위 분류 회귀 시험이 Atlas 도구 셋을 미분류 전수로 고정하던 부분(Atlas 도입 2026-09-10) |
| DEC-OPS-337 | accepted | 이관 PIT 여덟 범위를 두 슬롯에서 실측 긴 순서로 돌린다(ADR-0032). | 2026-10-17 | ADR-0026 결정 10 의 `mutation-scope-migration` `max-parallel: 1` 부분 |
| DEC-OPS-338 | accepted | 로컬 검증은 정적 검사를 운영 계약보다 먼저 돌리고 명시한 TZ 를 따르며, verify binding 은 범위 분기에서 닿는 줄이어야 한다. | 2026-10-17 | - |
| DEC-OPS-339 | accepted | 메뉴 스냅숏 해시는 메뉴 inventory 에 닿을 수 있는 SQL 입력만 담는다(형식 v2). | 2026-10-17 | 메뉴 스냅숏 해시가 모든 migration·seed·인가 Contract SQL 을 입력으로 삼던 부분 |
| DEC-OPS-340 | accepted | 공용 메모리 행은 원장이 세는 수를 다시 적지 않고 원장에 링크한다(GAP-WIRING-001·GAP-ARCH-001). | 2026-10-17 | DEC-OPS-090 ⑥ 의 공용 메모리 결합 수 대조, GAP-WIRING-001 수치 결속(2026-09-15 커밋 2c55b9924, DEC 없음) |
| DEC-OPS-341 | accepted | 메일·문자 발송을 접수 트랜잭션의 영속 작업으로 처리하고, 영속 작업 실행기를 전용 스케줄러·작업 스레드·유형별 상한·임대 갱신으로 운영한다(ADR-0033 이행). | 2026-10-18 | 메일·SMS 의 커밋 후 `runAfterCommit` 비동기 제출(DEC 없음) |
| DEC-OPS-342 | accepted | 부서 계층·지정 ID 등록·첨부 묶음·메모 삭제·투표 항목 수정의 경합 경계를 잠금과 식별자로 닫는다. | 2026-10-18 | 온라인 투표 항목 수정의 위치 기준 매칭(DEC 없음) |
| DEC-OPS-343 | accepted | 주소록 쓰기 단추를 동작별 권한으로 보이고, 저장한 레이아웃 테마를 전역에서 복원하되 다크 모드와 기본색은 덮지 않는다. | 2026-10-18 | - |
| DEC-OPS-344 | accepted | CI 의 cross-stack 계약은 frontend 축이 켜지면 커버리지 전체 스위트가 소유하고, 커버리지 분모에 queries·extensions 를 넣으며, 화면 목록 생성기는 레이아웃 셸 제거를 원장 근거로만 받는다. | 2026-10-18 | ci.yml 주석의 "몇십 초 중복이 증거를 잃는 것보다 싸다" 판단 |
| DEC-OPS-345 | accepted | 차트 범주 색을 브랜드 프로필의 --chart-1..5 토큰으로 두고 코드의 하드코딩 Hex 를 동결한다. | 2026-10-18 | - |
| DEC-OPS-353 | accepted | 슬롯 기여의 연동 분류를 소비자 종류 선언과 import 그래프로 대조하고, 잘못 적은 registrationOnly 기여를 연동으로 옮긴다(GAP-COMPOSE-001). | 2026-10-18 | DEC-OPS-327 의 알림 전달 채널 기여 registrationOnly 분류 |
| DEC-OPS-354 | accepted | 로그인 실패 횟수를 행 잠금 안에서 올리고, 로그인 요청 제한 기본값을 IP당 분당 30으로 낮춘다(ADR-0035). | 2026-10-19 | ADR-0019 결정 6의 로그인 기본값과 관측 뒤 인하 순서(ADR-0035) |
| DEC-OPS-355 | accepted | 주소록 구 사용자 검색을 걷고, 사용자 목록의 휴대전화·이메일을 가리며, 개인정보 조회 기록에 정보주체를 남긴다(V2_131). | 2026-10-19 | 구 search-users 계약을 외부 소비자 확인 전까지 유지하던 판단(evidence-first-policy-decisions-2026-09-27.md) |
| DEC-OPS-356 | accepted | 로그아웃하면 그 사용자의 액세스 토큰을 끊는다(V2_131 last_lgt_dt). | 2026-10-19 | - |
| DEC-OPS-357 | accepted | 감사 원장 세 표의 수정과 임의 삭제를 DB 트리거로 막는다(V2_132). | 2026-10-19 | - |
| DEC-OPS-358 | accepted | 기록이 로그인 ID 로 소유를 판정하는 표에 남은 ID 는 새 계정에 다시 주지 않는다. | 2026-10-19 | - |
| DEC-OPS-359 | accepted | 업무보고·일정·부서 업무·포상·배너·팝업·설문·공통코드 3종의 동시 수정을 버전으로 막고, 비관적 잠금 대기를 5초로 제한한다(V2_133). | 2026-10-19 | - |
| DEC-OPS-360 | accepted | 화면에서만 하던 입력 검사와 조용한 성공을 서버가 맡는다(팝업 기간·포상·공통코드·배너·일정). | 2026-10-19 | - |
| DEC-OPS-361 | accepted | 탭은 접근 가능한 공용 원천 하나로 그리고, 초점 표시를 지키며, 대형 화면 넷을 동작 변경 없이 나누고, 후속 작업 시각을 한국 시각으로 보인다. | 2026-10-19 | - |
| DEC-OPS-364 | accepted | 운영 계약 비용을 실측하고, 문서 전용 푸시의 계약 범위를 줄이지 않는다(투영 시험이 문서 트리를 입력으로 쓴다). | 2026-10-19 | - |
| DEC-OPS-366 | accepted | PIT 범위를 제품 13개로 넓힌다 — 설문·참여(커뮤니티·메모 보고·일정)·사용자/조직을 더하고 설문 결과를 설문 범위로 옮긴다. | 2026-10-19 | - |
| DEC-OPS-369 | accepted | 프런트 커버리지 하한을 CI 실측의 정수 내림에서 1포인트 여유를 둔 85/79/82/87로 올린다(종전 71/63/64/73). | 2026-10-19 | - |
| DEC-OPS-371 | accepted | 규칙·기록·계약의 중복과 반복 재생성을 걷는다 — 결정 인덱스 반복 열·역사 행 분리, DEC 기록 기준, 공유 OCI 적용 로그, 고정값의 원장 계산, npm run regen, Atlas·URL 승인·IA 처분 결속 축소, 헌법 정정, 범용 스킬 정리, 하네스 기준선 단일 구현(2026-10-19 사용자 승인). | 2026-10-19 | DEC-OPS-335 의 Atlas 소스 다이제스트 결속, 구현 기록·공유 OCI 적용을 DEC 로 쓰던 관행, 백엔드 헌법 §10.3 의 외부 발송 runAfterCommit 표준, 하네스 기준선의 Java·node 이중 구현과 거울 대조 |
| DEC-OPS-372 | accepted | 완성도 개선 배치: 작은 도메인 결함 6건, 인터넷서비스안내 퇴역(V2_135), 도움말 열람, 스크랩 1인 1주소(V2_136), 공용 JS 예산, 백업·복구 시작값(2026-10-19 사용자 승인). | 2026-10-19 | DEC-OPS-048 의 인터넷서비스안내 배선, 백업·복구 런북의 시작값 미기재 방침, 메모 첨부 판정의 보고자 축 미채택 |
| DEC-OPS-373 | accepted | 1단계 배치: 검증 신호 앞당김(Atlas 버전·액션 핀 사본 제거, 시험의 원장 수 재진술 검출, CodeQL 근사, 통합 점검 명령, PIT 6슬롯·범위 둘 추가, 스키마 검증 플레이크), 얇은 도메인 보강(팝업 대화상자, 포상 수상자 검사, 업무 홈 조각·관리자 운영 신호, 통계 시계열 일원화, 공통코드 사용처, 감사 원장 사유 내보내기)(2026-10-20 사용자 지시). | 2026-10-20 | ADR-0026 결정 9 의 제품 PIT `max-parallel: 4`(ADR-0037), DEC-OPS-281 ⑤ 의 "대시보드→알림은 화면 의존", DEC-OPS-276 ③ 의 미수집 축 요약 칸 `summary`, 공통코드 조회의 인스턴스 로컬 캐시(DEC 없음) |
| DEC-OPS-374 | accepted | 직접 맡은 작업 브랜치는 추가 승인 없이 PR·required CI·main 병합·원격/로컬 브랜치 삭제까지 마무리한다. 현재 사용자의 범위 제한과 다른 작업 보호를 우선한다. | 2026-10-20 | - |

DEC-OPS-104의 전용 이관 PIT 잡·실패 집계 결정은 유지한다. 당시 `mutationMigrationTool`이 `mutation`의 부분집합이어야 한다는 조건만 [ADR-0022](../../docs/02-architecture/decisions/ADR-0022-ci-independent-module-impact-and-cache.md)가 독립 선택으로 대체한다.

## 기록 템플릿

DEC를 쓰는 기준은 [AGENTS.md](../../AGENTS.md#documentation-and-memory)를 따른다. 새 운영 결정은 이 표에 `ID | 상태 | 결정 | 시행일 | supersedes` 행을 두고, [보관 기록](../../docs/archived/operational-decisions-history.md)에 같은 ID의 `## DEC-OPS-NNN` 절과 `ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes` 전문 행을 둔다. 두 곳의 상태·시행일·supersedes는 같아야 한다. 아키텍처·제품 경계를 바꾸면 먼저 ADR을 만들고 ADR 표에 같은 7열로 한 줄 링크만 추가한다.
