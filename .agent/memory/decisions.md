---
schema_version: 1
memory_kind: decisions
status: active
authority: adr-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-10-24
verified_against: 73f2123a7b31171027c8741cdc542eeeea1e563d
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

제품·아키텍처 결정의 정본은 [ADR 디렉터리](../../docs/02-architecture/decisions/README.md)다. 이 파일은 세션마다 자동으로 읽히는 짧은 결정 인덱스로, Accepted ADR 전부와 어느 경로를 고치든 걸리는 운영 결정만 둔다. 특정 경로에만 걸리는 운영 결정은 아래 「영역 결정 색인」 표의 색인에, 지금의 작업을 제약하지 않는 결정은 [역사 색인](../../docs/archived/operational-decisions-index-historical.md)에 있다. ADR 내용을 복제하거나 바꾸지 않는다. 제안·보류 항목은 결정으로 기록하지 않고 [known-gaps.md](known-gaps.md)에 둔다.

- 허용 상태: `accepted`, `superseded`, `rejected`.
- 기존 결정의 전문은 소급 편집하지 않는다. 운영 결정의 변경은 후속 DEC가 `supersedes`로 연결하고, Accepted ADR의 규범 변경은 후속 ADR로 대체한 뒤 인덱스에 연결한다. 이 규칙(2026-10-17) 전에 운영 결정이 ADR 일부를 대체한 경우는 해당 ADR 머리의 "후속 결정" 줄과 ADR 색인 상태 열로 표시한다.
- 행의 시행일·당시 수치는 결정 배경이며 현재 구현 수치가 아니다. 현행 상태는 [project-context.md](project-context.md)·[known-gaps.md](known-gaps.md)와 링크된 코드에서 확인한다. 재검증일은 인덱스·참조 점검일이며 과거 승인이나 외부 운영 증거를 새로 부여하지 않는다.
- 헌법과 `AGENTS.md`의 실질 정책 변경은 사용자 명시 요청이 먼저다.
- 이 파일은 에이전트 진입점이 매 세션 읽는다. 행 길이와 파일 전체 크기의 상한은 [공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs)이 검사한다.

## Accepted ADR index

ADR ID 가 ADR 색인의 키다: 각 ADR 의 링크·이유·전문은 [ADR 색인](../../docs/02-architecture/decisions/README.md)의 같은 ID 행에서 연다. 이 표는 결정 요지·시행일·대체 범위만 둔다.

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| ADR-0001 | accepted | core/app 제품 경계와 main·release-tag 배포 기준을 분리한다. | 2026-08-15 | - |
| ADR-0002 | accepted | UI는 한국어 우선이고 API의 ko/en 메시지 계약은 유지한다. | 2026-08-15 | - |
| ADR-0003 | accepted | 프런트엔드 UX 현대화는 사용자 과업을 우선하고, 브랜드 중립 프로필·WCAG 2.2·측정 기반 데이터 소유권·위험 기반 복구와 mutation 원칙을 적용한다. | 2026-08-20 | - |
| ADR-0004 | accepted | 과업 중심 기본 내비게이션과 명시적 관리 센터를 결합한 하이브리드 IA를 prototype·research의 잠정 방향으로 채택하고 canonical URL과 route-level blocker는 유지한다. | 2026-08-21 | - |
| ADR-0005 | accepted | UI 품질 증거는 digest-derived versioned compact summary와 tracked index로 보존하고 기존 summary를 덮어쓰지 않는다. | 2026-08-21 | - |
| ADR-0006 | accepted | 반응형 표현은 단일 SSR DOM 위에서 CSS로만 전환한다. 같은 데이터를 두 벌 렌더해 `hidden`/`md:hidden`으로 한쪽만 보이거나, `matchMedia`·`useSyncExternalStore`·`next/dynamic ssr:false` 로 본문 데이터 표현을 분기하지 않는다. | 2026-08-22 | - |
| ADR-0007 | accepted | 2026-08-23 G1 워크숍(참석: lkindo, 세 owner 역할)에서 하이브리드 IA를 참조-기본(reference-default) IA로 승인하고, 연구·live DB census·AT 증거 요건은 기관 채택 시점의 재검증 의무로 이전한다. route별 disposition은 일괄 승인되지 않으며 owner PR 리뷰로 개별 승인한다. PD-UX-002는 보류 유지. | 2026-08-23 | - |
| ADR-0008 | accepted | `migration-tool`은 PostgreSQL·Oracle·Tibero·MySQL·MariaDB·SQL Server 소스를 inventory·plan·승인 artifact와 digest에 결속해 Flyway 소유 PostgreSQL 표준 스키마로 적재하는 독립 offline `bootJar`로 유지한다. | 2026-08-31 | - |
| ADR-0009 | accepted | 업무상 개인정보가 포함될 수 있는 사용자 검색어는 화면별 route·query allowlist와 로그 비복제 조건 아래 URL에 둘 수 있다. 앱은 자격증명·고위험 개인정보·응답 원문용 URL state를 설계하거나 검색창에서 입력을 유도하지 않으며, 자유 입력에 예상 밖 값이 들어올 가능성은 잔여 위험이다. | 2026-09-05 | ADR-0003 §5의 검색어 절대 금지 부분 |
| ADR-0010 | accepted | 프론트엔드 `accessToken`·`session_exp` 쿠키의 `Secure`는 기본·배포 필수 속성으로 유지하고, 명시적으로 opt-in한 평문 HTTP local loopback 개발·검증에만 미설정을 허용한다. `accessToken`의 `HttpOnly`와 두 쿠키의 `SameSite=Strict`는 환경과 관계없이 유지한다. | 2026-09-05 | - |
| ADR-0011 | accepted | 익명 만족도와 비밀번호 소유 증명을 지원하지 않고, 만족도 수정·삭제를 인증된 owner-or-admin으로 제한한다. 공개 삭제 API의 `pswd` query와 DTO·서비스·엔티티 애플리케이션 매핑의 휴면 비밀번호 경로를 제거한다. credential-like 이름은 전역 경계가 query 요청을, 정적 API 계약이 path/query 선언을, 프론트 source 계약이 명시적 query producer를 차단하며 물리 컬럼은 별도 DB 결정 전까지 보존한다. | 2026-09-05 | - |
| ADR-0012 | accepted | 블로그 생산 도메인·게시판 귀속 계약·재사용 profile·비사용 물리 스키마를 제거한다. 새 Flyway는 쓰기를 먼저 차단하고 데이터나 참조가 있으면 제거를 거부하며 과거 migration과 공유 표준 사전은 보존한다. | 2026-09-08 | DEC-OPS-072의 블로그 유지 및 DEC-OPS-047의 블로그 기여자 부분 |
| ADR-0013 | accepted | 설계 보류 6개를 제외한 표준 길이 24개를 DB·백엔드·프론트에서 맞추고 SMS 수신번호를 숫자 문자열로 정규화한다. 단계별 배포와 데이터 보존 검증을 이행한다. | 2026-09-09 | - |
| ADR-0014 | accepted | 프로그램 키 300자와 선택적 메뉴 FK, 변경일자와 분리된 HHmmss, USER_ENRRNO/V256 암호화 표준으로 보류 6개를 정합한다. | 2026-09-09 | ADR-0013의 6개 보류 |
| ADR-0015 | accepted | CodeQL SAST의 High/Critical 차단을 CI·릴리스 필수 체크에 연결한다. | 2026-09-09 | - |
| ADR-0016 | accepted | 인가를 그룹·복수 사용자배정·유형별 기능/메뉴배정 3개와 같은 트랜잭션 감사 1개로 통합하고 구 writer 종료 후 수동 전환한다. | 2026-09-10 | DEC-OPS-023 ②·037·042·046·064의 역할 판정과 DEC-OPS-067의 구 권한·롤 UI 부분 |
| ADR-0017 | accepted | 현재 제품을 과업 중심 4개 메뉴 영역으로 재편하고 중복 진입점을 통합하며 기존 기능 권한을 보존한다. | 2026-09-11 | - |
| ADR-0018 | accepted | 일반 검토 최신성·기술 계약·기관 승인을 분리한다. 세 프로필 실제 산출물 검증, 명시 소유권 기반 원장·메모리 투영과 무결성, 기관별 실행 artifact 결속을 적용한다. 원본 운영 사실은 upstream 이력이며 기관 승인은 pending에서 시작한다. | 2026-09-14 | DEC-OPS-027 ③·DEC-OPS-087 ②·UI quality 및 E2E duration의 일반 최신성 차단, DEC-OPS-077 ⑤의 축소 프로필 red 허용 기대치 |
| ADR-0019 | accepted | 운영 오버레이에 X-Forwarded-For를 접속 주소로 덮어쓰는 비루트 nginx edge를 두고 Next 공개 포트를 비운다. Next는 `TRUSTED_EDGE_PROXY=true`일 때만 인증 BFF와 서버 측 API 호출에 사용자 IP를 싣고, 요청 제한 한도는 설정 속성으로 받는다(기본값은 종전 동작). | 2026-09-14 | - |
| ADR-0020 | accepted | 원본 모듈 구조를 유지하며 생성 백엔드의 멀티모듈·단일모듈 출력을 선택한다. 단일 출력도 논리 소스 그룹·검증 경계와 오프라인 이관 책임을 보존한다. | 2026-09-19 | - (ADR-0001 출력 형태 보완) |
| ADR-0021 | accepted | 테스트를 API 계약·사용자 과업·횡단 품질로 재편하고 로컬·CI의 격리 소유권을 검증한다. 전체 E2E와 영향 shadow를 병행한다. | 2026-09-21 | - |
| ADR-0022 | accepted | PR·통합 push의 영향 분류를 통일하고 온라인·이관 build/PIT와 커버리지를 분리한다. Gradle 캐시 provider를 명시한다. | 2026-09-21 | ADR-0021 결정 4의 main 전수 강제·DEC-OPS-104의 PIT 부분집합 조건 |
| ADR-0023 | accepted | PR의 검토된 화면만 E2E spec 선별, main 전수·전체 discovery 대조와 Gradle 단일 writer를 유지한다. | 2026-09-21 | ADR-0021의 E2E shadow·ADR-0022 결정 8 |
| ADR-0024 | accepted | Spring Boot 4.1로 두 단계 전환한다. 1단계는 Jackson 2 호환 모듈로 API 계약을 유지하고 2단계에서 Jackson 3으로 옮긴다. | 2026-09-24 | - |
| ADR-0025 | accepted | 개선 결정 D01~D15 A와 F01~F08을 채택한다. 보호계정·최소 응답·업무 규칙·MFA·내구 알림/감사/삭제를 구현·검증한다. | 2026-09-28 | 겹치는 이전 정책 제안의 선택 대기 상태 |
| ADR-0026 | accepted | backend와 schema 검증을 병렬화하고, 증명된 변경만 재사용 profile을 선별하며 CI 시간을 계측한다. | 2026-09-29 | - |
| ADR-0027 | accepted | 사용자 구성 검증을 분류 직후 시작하고 PR 은 시작 구성마다 한 레이아웃만 검증하며(main 은 두 레이아웃 전수), 생성물의 일반 테스트는 별도 T2 워크플로가 돈다. | 2026-10-12 | ADR-0026 결정 1의 PR 두 layout 부분·결정 10의 custom 입장(custom 두 layout 의 결정 2 는 유지) |
| ADR-0028 | accepted | 시작 구성은 `config/modules/presets.json` 의 이름 붙은 기능 목록이고, 같은 목록은 시작 구성으로 고르든 직접 고르든 같은 해석 결과와 소스 투영(Java·프런트·게이트·규칙 제거)을 낸다. pack·rank 는 없고, 계약이 시작 구성마다 대조하며 시작 구성 기대치(게이트·Java 연쇄·규칙)는 exact 목록이다. | 2026-10-13 | ADR-0001 결정의 '세 프로필 중 하나 선택'·manifest SSOT 문장, ADR-0020 결정 5·검증과 후속 범위의 '누적 프로필' 표현 |
| ADR-0029 | accepted | 레거시 표준화 이관은 수집→식별→적합성→확정→설계→적재→대사 순서이고, 도구가 후보와 근거를 만들고 사람이 Git 검토 원장으로 확정한다. 원장 digest 는 plan 에 결속되고, 민감 컬럼은 도구의 호환 암호화로 적재하며, ADR-0008 경계는 그대로다. 구현은 L1~L4 로 나눈다. | 2026-10-13 | - |
| ADR-0030 | accepted | ADR-0027 이후 승인된 PR 제외 선언과 시작 구성에 덮인 야간 단독 폐포 제거를 후속 ADR로 승격한다. 기존 실행·실패 경계는 유지한다. | 2026-10-13 | ADR-0027 결정 2·4의 해당 부분 |
| ADR-0031 | accepted | 기존 승인에 따른 원장 확정·비표준 대상·미확인 허용값·chunk 실패 처리와 L3 경계를 후속 ADR로 승격한다. 기존 안전 경계와 기관 승인은 유지한다. | 2026-10-15 | ADR-0029 결정 3·8·L3 실행 경계의 해당 부분; 결정 7의 좁은 구현 명시 |
| ADR-0032 | accepted | 이관 PIT 여덟 범위를 두 슬롯에서 실측 긴 순서로 돌린다. `sast-scope` 한 슬롯과 대상·판정·집계는 그대로다. | 2026-10-17 | ADR-0026 결정 10의 이관 PIT 한 슬롯 부분 |
| ADR-0033 | accepted | 메일 자동 복구용 접수 당시 주소를 암호화해 작업에 보관하고 완료 후 지운다. | 2026-10-18 | - |
| ADR-0034 | accepted | 410만 돌려주던 구 인가 쓰기 API 와 결재 API 로 대체된 비공식결재 API 의 경로를 걷고, 집행 지점이 없어진 INFORMAL_*·INST_CODE 쓰기 권한과 그 배정을 퇴역한다. | 2026-10-18 | ADR-0016 '영향과 검증'의 종료 API 무변경 거부(410) 부분 |
| ADR-0035 | accepted | 로그인 요청 제한의 템플릿 기본값을 IP당 분당 30으로 낮추고 E2E 만 종전 값으로 둔다. 한도는 계속 설정으로 조정한다. | 2026-10-19 | ADR-0019 결정 6의 로그인 기본값·관측 뒤 인하 순서 |
| ADR-0036 | accepted | 목록은 요청·응답·URL·화면 모두 1 기반 page·size(1~100) 하나이고 잘못된 입력·옛 이름은 400, pageIndex·pageUnit 은 한 릴리스 별칭이다. 자원을 만드는 POST 는 201 과 새 식별자 본문이다. | 2026-10-19 | API 가이드 §2 의 201 비강제·§3 의 v2 규칙(이 변경 한정), 프런트 아키텍처 §3 의 0-based page 별칭 정규화 |
| ADR-0037 | accepted | 제품 PIT 는 6슬롯으로 돌고 선언 순서는 실측이 긴 범위 먼저다. 대상·75% 판정·집계는 그대로이고 효과가 없으면 4로 되돌린다. | 2026-10-20 | ADR-0026 결정 9의 제품 PIT 4슬롯 부분 |
| ADR-0038 | accepted | API·코어 체인에서 CSRF를 켜고, 쿠키 자격을 실은 쓰기 요청에 이중 제출 토큰(XSRF-TOKEN 쿠키 = X-XSRF-TOKEN 헤더)을 요구한다. 헤더 전용 클라이언트는 제외하고 SockJS는 허용 Origin으로 막는다. | 2026-10-21 | DEC-OPS-075 의 SAST-FP-001·002(CSRF 비활성 예외) |
| ADR-0039 | accepted | 콘텐츠 페이지는 선택 기능 `cms` 다. 1차는 로그인 사용자 전체 열람, 업무 홈은 대체하지 않고 맨 위 조각으로 보이며, 서버 한 곳이 검증한 jsonb 문서를 HTML 문자열 없이 그린다. 링크는 https·내부·mailto·tel, 첨부는 기존 참조원 구조를 쓴다. | 2026-10-22 | - |
| ADR-0040 | accepted | 게시판 운영 화면을 두고, 사용 안 함 게시판의 읽기·쓰기를 이용자에게 닫으며, 예약 게시를 날짜 기준으로 집행하고 상단 고정을 표준 컬럼과 BOARD_PIN으로 둔다. | 2026-10-22 | DEC-OPS-206의 시작일 기록 전용 부분 |

## 운영 결정 index

아래 DEC 행은 당시 결정의 짧은 검색 인덱스이며 상태·시행일·대체 범위는 당시 기록 그대로다.

ID가 보관 원문의 앵커다: 각 행의 전문·이유·승인 근거는 [보관 기록](../../docs/archived/operational-decisions-history.md)의 `#<ID 소문자>` 절(예: `#dec-ops-001`)에 있다.

이 표는 어느 경로를 고치든 걸리는 결정만 둔다(기준은 [AGENTS.md 기록 기준](../../AGENTS.md#documentation-and-memory)). 특정 경로에만 걸리는 결정은 아래 「영역 결정 색인」 표의 색인에, 퇴역·전부 대체·일회성 실행·구현 기록으로 분류한 결정은 [역사 색인](../../docs/archived/operational-decisions-index-historical.md)에 있고 전문은 같은 보관 원문 앵커다. 행이 퇴역·전부 대체·일회성 실행이 되면 역사 색인으로, 걸리는 범위가 넓어지거나 좁아지면 공용·영역 색인 사이로 옮긴다(지우지 않는다).

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| DEC-OPS-001 | accepted | 프로젝트 공통 규칙은 `AGENTS.md` 한 곳에 두고 저장소 `GEMINI.md`·`CLAUDE.md`는 자동 탐색용 얇은 어댑터로 유지한다. | 2026-08-18 | - |
| DEC-OPS-002 | accepted | 공용 메모리 3종은 규범이 아닌, 근거 링크와 검증일을 가진 파생 인덱스로 운영한다. | 2026-08-18 | - |
| DEC-OPS-004 | accepted | 로컬 훅은 범위별 빠른 피드백, required CI는 병합 권위로 구분한다. | 2026-08-18 | - |
| DEC-OPS-013 | accepted | 단독 운영 기간 IA 프로그램의 세 owner 역할(Product·IA·Security/Privacy)을 저장소 소유자 lkindo 로 지명하고 승인 채널을 저장소 PR 리뷰로 기록한다. | 2026-08-23 | - |
| DEC-OPS-062 | accepted | 축 2(화면 도달성) 래칫의 운영 방침을 확정한다 — 0 을 목표로 하지 않는다. | 2026-09-08 | DEC-OPS-051 의 래칫 목적을 재확인하고 잔여 소진 목표를 명시적으로 배제 |
| DEC-OPS-097 | accepted | 거버넌스 총량 관리 규칙을 AGENTS.md 에 둔다. | 2026-09-14 | - |
| DEC-OPS-177 | accepted | 연속 배치 작업의 반복 비용을 규칙으로 줄인다. | 2026-09-27 | - |
| DEC-OPS-340 | accepted | 공용 메모리 행은 원장이 세는 수를 다시 적지 않고 원장에 링크한다(GAP-WIRING-001·GAP-ARCH-001). | 2026-10-17 | DEC-OPS-090 ⑥ 의 공용 메모리 결합 수 대조, GAP-WIRING-001 수치 결속(2026-09-15 커밋 2c55b9924, DEC 없음) |
| DEC-OPS-358 | accepted | 기록이 로그인 ID 로 소유를 판정하는 표에 남은 ID 는 새 계정에 다시 주지 않는다. | 2026-10-19 | - |
| DEC-OPS-371 | accepted | 규칙·기록·계약의 중복과 반복 재생성을 걷는다 — 결정 인덱스 반복 열·역사 행 분리, DEC 기록 기준, 공유 OCI 적용 로그, 고정값의 원장 계산, npm run regen, Atlas·URL 승인·IA 처분 결속 축소, 헌법 정정, 범용 스킬 정리, 하네스 기준선 단일 구현(2026-10-19 사용자 승인). | 2026-10-19 | DEC-OPS-335 의 Atlas 소스 다이제스트 결속, 구현 기록·공유 OCI 적용을 DEC 로 쓰던 관행, 백엔드 헌법 §10.3 의 외부 발송 runAfterCommit 표준, 하네스 기준선의 Java·node 이중 구현과 거울 대조 |
| DEC-OPS-374 | accepted | 직접 맡은 작업 브랜치는 추가 승인 없이 PR·required CI·main 병합·원격/로컬 브랜치 삭제까지 마무리한다. 현재 사용자의 범위 제한과 다른 작업 보호를 우선한다. | 2026-10-20 | - |
| DEC-OPS-375 | accepted | 부서 미배정 사용자의 '부서 공유' 일정을 기본조직으로 묶어 미배정자끼리 공유하는 현재 동작과, 일반 사용자 관리자(USER_UPDATE·USER_DEPT)가 보호 관리자 계정의 이름·연락처·부서를 바꿀 수 있는 현재 권한 의미를 유지한다(2026-10-21 사용자 결정). | 2026-10-21 | - |
| DEC-OPS-379 | accepted | ADR-0040 의 스키마 변경을 저장소 Flyway 로 일괄 승인하고, 공유 OCI 적용은 PR 병합마다 하며, 예약 집행 전 진단에서 나온 미래 시작일·형식 오류 행은 보정하지 않는다(2026-10-23 사용자 결정). | 2026-10-23 | - |
| DEC-OPS-381 | accepted | 자동 로드되는 공용 결정 인덱스에는 Accepted ADR(5열)과 어느 경로를 고치든 걸리는 운영 결정만 두고, 특정 경로에만 걸리는 운영 결정은 자동 로드하지 않는 영역 결정 색인 넷에 둔다. 변경 작업은 대상 경로가 걸리는 영역 색인을 읽고, 새 결정은 기본으로 영역 색인에 쓰며, 자동 로드되는 공용 메모리 파일마다 전체 크기 상한을 둔다(2026-10-24 사용자 결정). | 2026-10-24 | DEC-OPS-371 ① 의 'Atlas 가 두 색인이 보관 원문의 DEC 를 정확히 한 번씩 나눠 갖는지 검사한다' 가운데 두 색인(현재·역사 → 공용·영역·역사 색인), Accepted ADR index 의 이유·정본 열(기록 템플릿, DEC 없음) |
| DEC-OPS-382 | accepted | 방법론 보완 배치를 한 결정으로 묶는다(2026-10-24 사용자 승인). ① 설계 검토 예산·결정 카드·결정 유형 분리를 SOP §7 에 두고, 시안 확인을 스키마·데이터·인가·IA 처분·운영 적용 승인과 분리한다. ② 산출물 내보내기는 비규범 파생물이다 — 커밋하지 않는 build/deliverables 에만 쓰고 수동·dispatch·릴리스 태그에서만 만들며, frontend/public·regen·required CI 에 넣지 않고 .agent/memory·docs/archived·ADR 색인·공유 OCI·생성물 메뉴 스냅숏을 읽지 않는다(기관 RTM CSV 는 실행 인자 예외). ③ 스캐폴더는 최소 정합화와 등록 점검기로 두고 실사용 전에는 Node 로 옮기지 않는다. ④ 시연 라우트를 메뉴 연결 선택지·화면 목록·권한 묶음 화면에서 뺀다. ⑤ 공개 저장소 CI 는 시험 결과 XML·SARIF 만 올리고 산출물 패키지는 다이제스트만 남긴다. ⑥ 출력은 Markdown·CSV 다. ⑦ OpenAPI 의 PUBLIC 연산은 security: [] 로 전역 bearer 를 지운다. | 2026-10-24 | - |

## 영역 결정 색인

이 표의 색인은 자동으로 읽히지 않는다. 읽는 의무는 [AGENTS.md 작업 시작 시 필수 읽기](../../AGENTS.md#작업-시작-시-필수-읽기)가 정하고, 이 표는 경로를 색인에 잇는다. 경로가 여러 행에 걸리면 걸린 색인을 모두 읽고, 어느 행에도 걸리지 않으면 넷을 모두 읽는다.

| 영역 색인 | 이 경로를 고치면 읽는다 |
|---|---|
| [CI·검증·거버넌스](../../docs/04-operations/operational-decisions-index-ci-governance.md) | `.github/`, `.githooks/`, `.zap/`, `.agent/scripts/`, `.agent/skills/`, `config/governance/`, `config/security/`, `scripts/`(아래 두 행의 도구는 그 행도 읽는다), `api-server/src/test/`, `frontend/e2e/`, `frontend/scripts/`, `frontend/*.config.*`, `test/load-tests/`, `package.json`·lockfile, `gradle/`, `*.gradle`, `api-server/src/main/resources/db/migration/`(무중단 waiver) |
| [프로젝트 생성기·재사용 투영](../../docs/04-operations/operational-decisions-index-composer.md) | `config/modules/`, `tools/project-composer/`, `frontend/src/extensions/`, `scripts/project-composer*`, `scripts/composer-*`, `scripts/reusable-*`, `scripts/generate-reusable-base-*`, `scripts/verify-reusable-*`, `scripts/slot-registry*`, `scripts/domain-deletion-*`, `scripts/frontend-reachability-census*`, 기능 마커(`config/modules/*.json` 의 `markerBlocks`)가 가리키는 화면, 한 기능이 다른 기능의 코드를 새로 import 하는 변경 |
| [레거시 이관 도구](../../docs/04-operations/operational-decisions-index-migration.md) | `migration-tool/`, `scripts/*migration*`, `docs/02-architecture/legacy-migration-tool-design.md`, `docs/04-operations/migration-recovery-runbook.md` |
| [제품 동작·화면·도메인](../../docs/04-operations/operational-decisions-index-product.md) | `foundation/`, `business-core/`, `business-app/`, `api-server/src/main/`(Flyway 새 표·컬럼 포함), `api-server/src/test/`, `frontend/src/`, `frontend/next.config.*`, `config/governance/` 의 권한·인가 원장, `config/frontend-visible-terms.json`, `config/ui-*.json`, `docker-compose*.yml`, `config/edge/`, `config/observability/` |
| 넷 모두 | 위 어느 행에도 걸리지 않는 경로, 또는 걸리는지 판단이 서지 않을 때 |

## 기록 템플릿

DEC를 쓰는 기준과 쓸 색인은 [AGENTS.md](../../AGENTS.md#documentation-and-memory)를 따른다. 새 운영 결정은 기본으로 그 결정이 걸리는 경로의 영역 색인(위 「영역 결정 색인」 표)에 `ID | 상태 | 결정 | 시행일 | supersedes` 행을 두고, 어느 경로를 고치든 걸리는 결정일 때만 이 파일의 운영 결정 표에 둔다. [보관 기록](../../docs/archived/operational-decisions-history.md)에는 같은 ID의 `## DEC-OPS-NNN` 절과 `ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes` 전문 행을 둔다. 색인 행과 보관 원문의 상태·시행일·supersedes는 같아야 한다. 아키텍처·제품 경계를 바꾸면 먼저 ADR을 만들어 [ADR 색인](../../docs/02-architecture/decisions/README.md)에 링크하고, 이 파일의 ADR 표에 같은 5열로 한 줄만 추가한다.
