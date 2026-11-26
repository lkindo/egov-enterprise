---
schema_version: 1
memory_kind: known-gaps
status: active
authority: derived-active-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-11-26
verified_against: b4a98d72d6723bbf66a063c86ebb77d20238f025
canonical_sources:
  - ../../docs/02-architecture/decisions/ADR-0030-reusable-ci-selection-followup.md
  - ../../docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md
  - ../../docs/archived/operational-decisions-history.md
  - ../../docs/02-architecture/decisions/ADR-0023-e2e-impact-selection-and-cache-writer.md
  - ../../docs/02-architecture/testing-process-redesign.md
  - ../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md
  - ../../docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md
  - ../../docs/02-architecture/decisions/ADR-0009-controlled-url-search-state.md
  - ../../docs/02-architecture/legacy-migration-tool-design.md
  - ../../docs/04-operations/verification-blindspots.md
  - ../../docs/04-operations/pending-decisions.md
  - ../../docs/03-guides/design-tokens.md
refresh_triggers:
  - gap-state-change
  - production-readiness-change
  - verification-evidence-change
---

# 공용 활성 Gap 인덱스

현재 코드·외부 실측으로 재현 가능한 미해결 위험의 단일 활성 인덱스다. 완료·종료 이력은 [보관 기록](../../docs/archived/operational-decisions-history.md#종료이전-gap-기록)과 Git 이력에, 자동 게이트가 못 막는 확정 경계는 [decisions.md Do-Not-Break](decisions.md#do-not-break-체크리스트-자동-게이트-미커버-확정-규칙)에 둔다. 추측으로 새 gap을 만들지 않으며, `needs-revalidation`·`blocked-external`은 날짜 있는 실측 증거를 확보한 뒤에만 닫는다.

- 우선순위: `P0` 즉시 안전/false-green, `P1` 높은 회귀·운영 위험, `P2` 계획 필요, `P3` 개선.
- 상태: `open`, `blocked-external`, `deferred`, `accepted-risk`, `needs-revalidation`.

## 활성 Gap

| GAP-ID | 우선순위 | 상태 | 영역 | 요약 | 근거 | 다음 행동/재개 조건 | 결정권자 | 검증일 |
|---|---|---|---|---|---|---|---|---|
| GAP-DEP-001 | P1 | needs-revalidation | dependency security | PR 의존성 snapshot readiness·runtime High 차단은 구현됨; 양쪽 snapshot 0건 경고 생략·public fork probe 검증 미완. | [readiness](../../scripts/dependency-snapshot-readiness.mjs), [검증 사각지대](../../docs/04-operations/verification-blindspots.md) | 승인된 public fork probe로 신규 High 차단·부재 경계 검증. | 보안/사용자 | 2026-09-24 |
| GAP-MIG-001 | P1 | blocked-external | migration-tool | Oracle·MySQL·MariaDB·SQL Server·CUBRID 리허설만 완료, 7종 모두 UNVERIFIED·MANUAL_ONLY; Tibero는 라이선스 부재로 미기동. | [이관 실측](../../docs/04-operations/readiness-followups.md#이관-oracle-free-표준화-리허설), [복구 런북](../../docs/04-operations/migration-recovery-runbook.md) | 도입 버전·driver별 COMMIT 자격·cutover 기관 실측 확보. | 사용자/DB 운영 | 2026-10-16 |
| GAP-SEC-004 | P1 | needs-revalidation | client IP trust boundary | Next 고정 주소 `/32` 신뢰 경계는 격리 compose에서 검증됨; 부가 컨테이너는 `egov-net`에 두지 않거나 Next 직접 도달을 차단하며 LB·TLS·iptables·IPv6·내부 컨테이너 직접 요청 경로 미검증. | [ADR-0019](../../docs/02-architecture/decisions/ADR-0019-client-ip-trust-boundary.md), [edge 템플릿](../../config/edge/default.conf.template) | 운영 배포 호스트에서 위조 XFF·로그인 한도(`ADR-0035`) 실측. | 보안/운영 소유자 | 2026-09-14 |
| GAP-CONTRACT-001 | P2 | open | API/DTO | `input-contract-mirror-census.json` 표적의 제약·`@Valid` 누락을 차단함; 원장 밖 비저장 요청 본문과 공백/교차필드 의미는 미포괄. | [입력 계약 게이트](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java), [입력 계약 원장](../../config/governance/input-contract-mirror-census.json) | 새 쓰기 DTO 및 저장 경로 추가 시 원장에 등재한다. | API 소유자 | 2026-10-23 |
| GAP-DATA-002 | P2 | blocked-external | legacy input data | OCI 온라인 설문 3행 시작·종료일이 `YYYY-MM-` 형태로 잘린 채 남아 있음(추정 보정 금지). | [날짜계약](../../docs/04-operations/readiness-followups.md#날짜입력-계약) | 업무 소유자가 원래 날짜를 확인한 뒤 3행을 수정한다. | 업무/DB 소유자 | 2026-09-30 |
| GAP-LOGIN-002 | P2 | open | login lockout | 잠금 중 관리 재확인·`pswd_fail_nmtm` 분리는 PostgreSQL 통합 검증 통과; 반복 잠금 지연 및 벤더 인증 남음. | [AuthorizationAdministrationService](../../business-core/src/main/java/nuri/business/service/auth/AuthorizationAdministrationService.java), [V2_154](../../api-server/src/main/resources/db/migration/V2_154__separate_current_password_failure_count.sql) | 공유 DB 적용 시 별도 승인, 반복 잠금 시 IP+계정 창 설계. | 보안/제품 소유자 | 2026-11-19 |
| GAP-MAIL-001 | P2 | open | mail delivery | ① 차지 시각 바인딩(`claimQueued`) 해결 완료. ② 일반 사용자 `MAIL_SEND` 기본 배정 및 기간 발송 한도 미정. | [MailService](../../business-app/src/main/java/nuri/business/service/mail/MailService.java), [권한 원장](../../config/governance/permission-catalog.json) | 사용자별 기간 발송 한도 값 제품·보안 결정 후 구현. | 제품/보안 소유자 | 2026-11-21 |
| GAP-MIG-002 | P2 | open | migration protected keys | 암호화 보호 컬럼은 평문 체크포인트 키로 사용 불가·숫자형 보호 소스 축소 변환기 미지원. | [ColumnProtectionPlan](../../migration-tool/src/main/java/nuri/migration/protect/ColumnProtectionPlan.java), [ADR-0029](../../docs/02-architecture/decisions/ADR-0029-legacy-standardization-migration.md) | 해당 테이블 이관 시 keyed HMAC·내장 정규화 변환기 설계 승인. | 이관 도구 소유자 | 2026-10-17 |
| GAP-PACK-001 | P2 | open | reusable feature boundaries | `config/modules` 연쇄 제거·투영 tsc·생존 가드 정합 완료; 리다이렉트 페이지 제거는 동거 테스트를 연쇄하지 않으며(목적지 소실 은폐 방지) 모든 일반 링크·업무 흐름 런타임 의미 전수 검증은 남음. | [프로필 검증](../../scripts/verify-reusable-base.mjs), [기능 선언](../../config/modules/) | 새 링크·흐름 변경 시 실제 생성물과 기관 시나리오로 검증. | 아키텍처/제품 소유자 | 2026-10-20 |
| GAP-STD-001 | P2 | open | standard schema metadata | 기승인 `version` 예외(`DEC-OPS-378`)·1차 C 유지 승인은 정정 제외; 잠정 B 정정·퇴역 후보 및 기존 제약 2건 남음. | [TargetStandardValidator](../../migration-tool/src/main/java/nuri/migration/validate/TargetStandardValidator.java), [처분안](../../docs/04-operations/standard-metadata-disposition.md#approved-first-phase-20261110) | 읽기 실측·개별 패킷으로 B·C·제약 2건 승인 후 반영. | DB/표준 소유자 | 2026-11-14 |
| GAP-UIQ-001 | P2 | deferred | ui quality evidence | reference r12 이후 8개 화면 모두 변경됨; protocol hash·수동 접근성 48건 미완료(`measured` 선언 금지). | [런북 §8](../../docs/04-operations/ui-ux-modernization-user-action-runbook.md), [ADR-0005](../../docs/02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md) | 지정 평가자·Windows 환경에서 protocol hash 포함 combined summary 발행. | 접근성 소유자/사용자 | 2026-11-08 |
| GAP-ZDM-001 | P2 | open | zero-downtime | 구조화 waiver·동결 부채(`V2_8~V2_83`)를 린터가 검사하나 `expandRelease` 대조는 기록 검증일 뿐 실제 배포·관측 증명은 아님. | [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [waiver 원장](../../config/governance/zdm-waivers.json) | 새 Contract waiver는 7일 관측 기록 유지; 도입 시 `V2_127` 예외 비승계; 미적용 레거시 부채(`V2_8~V2_83`) 환경 확인 시 P1 복귀. | DB/사용자 | 2026-10-27 |
| GAP-AGENT-001 | P2 | accepted-risk | coordination | 공용 메모리는 실시간 claim/lock 버스가 아니며, 대기열(`heavy-run-queue`) 관측 밖 실행과 Codex `cmd`/규칙 틈은 수용 위험. | [SOP §6.6](../../docs/03-guides/orchestration-protocol.md#66-작업-트리), [SOP §6.3](../../docs/03-guides/orchestration-protocol.md#63-무거운-검증은-하나씩), [대기열](../../scripts/heavy-run-queue.mjs), [가드](../../scripts/agent-guard.mjs) | 사용 중이거나 불명확한 트리는 보존하고 승인 후 임시 트리로 분리. | 사용자 | 2026-11-11 |
| GAP-CODE-001 | P3 | accepted-risk | institution code | 기관코드 원장·수신 로그 앱 쓰기 경로 없음(`procSe` 변경만), `chgSeCd` 공급처 명세 미확정. | [InstitutionCodeService](../../business-core/src/main/java/nuri/business/service/code/InstitutionCodeService.java), [보류 결정](../../docs/04-operations/pending-decisions.md) | 공급처 명세 확정 시 쓰기 경로·권한 설계. | 코드 표준/DB 소유자 | 2026-10-18 |
| GAP-COMPOSE-001 | P3 | open | composer degraded compositions | 기능 저하 생성물의 채널 슬롯·포틀릿 정리를 반영했으나 이름 규칙 밖 경로 속성·간접 상수·문장 속 메뉴 이름 기계 대조 미완. | [연동 선언](../../scripts/project-composer-integrations.mjs), [admin-link census](../../frontend/src/__tests__/admin-link-visibility-census.test.ts) | Phase 3 이후 간접 상수 경로·메뉴 문구 대조 보완. | 아키텍처/제품 소유자 | 2026-11-10 |
| GAP-COMPOSE-002 | P3 | open | generated schema changes | 생성 프로젝트 새 Java·미배정 권한 추가 등록(`ADR-0057`) 지원; 기존 소스 수정·새 화면·마이그레이션 연계 자동 지원 미완. | [추가분 가이드](../../docs/03-guides/generated-project-additions.md), [ADR-0057](../../docs/02-architecture/decisions/ADR-0057-adopter-java-and-permission-registration.md) | 변경 범위 확대 시 별도 설계·검증 추가(원본 해시 위조 금지). | 아키텍처/제품 소유자 | 2026-11-14 |
| GAP-COPY-001 | P3 | open | visible copy norms | 화면 용어 원장의 비결함 편차(날짜 형식·확인 문구·대기 라벨·오프라인 빈 표 등) 잔존(`reviewBy` 2027-02-05). | [편차 목록](../../docs/04-operations/readiness-followups.md#화면-문구-규범-편차), [용어 원장](../../config/frontend-visible-terms.json) | 정기 검토에서 화면별 처분(일괄 치환 금지). | 콘텐츠·제품 소유자 | 2026-11-15 |
| GAP-DEPT-001 | P3 | open | department hierarchy | 저장 시 상위 소실 경로 닫힘; 기존 `up_ognz_id IS NULL` 손상 복원·undo 미지원 및 5분 캐시 만료 재조회 5xx 경계 남음. | [treeUtils](../../frontend/src/app/admin/user/departments/treeUtils.ts), [deptActions](../../frontend/src/app/actions/deptActions.ts) | 기존 손상은 업무 소유자 판정; 재조회 5xx 재현 후 QueryClient 시험 고정. | 도메인/제품 소유자 | 2026-11-23 |
| GAP-E2E-001 | P3 | needs-revalidation | E2E impact selection | PR 검토된 화면 변경만 E2E 선별, 공유·미지·main 전수; 일반 의존성 완전성·실제 절감률은 표본 부족으로 미확정. | [선별 경계](../../docs/02-architecture/testing-process-redesign.md#54-pr의-검증된-화면-변경만-spec-단위로-선별한다), [planner](../../scripts/e2e-shard-plan.mjs) | 화면 변경 PR 선별 결과와 다음 main 전수 결과 대조. | 테스트/CI 소유자 | 2026-11-10 |
| GAP-FE-001 | P3 | accepted-risk | frontend security | `script-src`는 요청별 nonce 적용, `style-src`의 `'unsafe-inline'`은 `sonner` nonce 미지원으로 수용 위험. | [proxy.ts](../../frontend/src/proxy.ts), [csp-policy.test.ts](../../frontend/src/__tests__/csp-policy.test.ts) | `sonner` nonce 지원·교체 시 `style-src-elem` nonce 전환. | 보안/제품 소유자 | 2026-11-10 |
| GAP-FILE-001 | P3 | open | attachment cleanup | 커밋 후 영속 삭제·재시도 격리 검증 완료; 운영 저장소 복구·고아 후보 처분 및 quota 미완. | [durable-work-recovery](../../docs/04-operations/durable-work-recovery.md), [ADR-0025 D14](../../docs/02-architecture/decisions/ADR-0025-enterprise-completeness-and-durable-operations.md) | 기관 `attachment-operations` 통제에서 복구·고아 처분 승인. | 파일/운영 소유자 | 2026-09-28 |
| GAP-LOGIN-001 | P3 | open | login policy | `dpcn_prm_yn` 컬럼은 존재하나 제품 단일 세션 유지(D5, `DEC-OPS-158`)로 읽지 않으며 UI 미노출. | [LoginPolicy](../../business-core/src/main/java/nuri/business/domain/login/LoginPolicy.java), [V2_24](../../api-server/src/main/resources/db/migration/V2_24__add_yn_check_and_meta_fk_index.sql) | 중복 로그인 요구 시 refresh token 폐기 설계 선행. | 제품/보안 소유자 | 2026-09-26 |
| GAP-UI-001 | P3 | open | table sorting | 주요 목록은 `ServerSortWhitelist`·`@SortableBy` 인덱스 열로 서버 정렬, 나머지 로그 열은 현재 페이지 정렬 고지. | [ServerSortWhitelist](../../business-core/src/main/java/nuri/business/domain/common/ServerSortWhitelist.java), [서버 정렬 계약](../../frontend/src/app/components/ui/__tests__/standard-data-table-server-sort.test.tsx) | 실제 요구·인덱스가 확인된 열만 허용 목록에 추가. | API/DB 소유자 | 2026-11-12 |
| GAP-UIF-001 | P3 | open | font token scope | Next/font 변수는 `:root`로 수정 완료; OS/브라우저별 글꼴 렌더링과 재생성 시각 기준선 사람 검토 남음. | [design-tokens](../../docs/03-guides/design-tokens.md), [layout.tsx](../../frontend/src/app/layout.tsx) | 시각 회귀 기준선 검토 후 종료(Linux 결과 타 OS 승격 금지). | 프런트엔드/디자인 소유자 | 2026-11-15 |
| GAP-WIN-001 | P3 | accepted-risk | windows contract coverage | `DEC-OPS-434`로 작업 브랜치 로컬 운영 계약·`verify:post-push` 폐기 → `win32` 분기 계약의 PR 병합 전 자동 실행 없음. | [DEC-OPS-434](../../docs/archived/operational-decisions-history.md#dec-ops-434), [pre-push](../../.githooks/pre-push), [run-operational-contracts](../../scripts/run-operational-contracts.mjs) | `heavy-run-queue`·`agent-guard`·`pre-push`·생성기 등 Windows 분기 변경 시 수동 검증. | 사용자 | 2026-11-25 |
| GAP-WIRING-001 | P3 | open | api surface | 미소비(unwired)·화면 고아 operation 잔존(`expected` 상한은 원장이 정본, 이름 기반 census 숫자만으로 기능 완성 판정 금지); 동일 목록 단건 조회 등 의도적 미배선·개인정보 경계 유지. | [배선 원장](../../config/governance/operation-consumer-census.json), [DEC-OPS-352](../../docs/archived/operational-decisions-history.md#dec-ops-352) | 실제 소비 목적·개인정보 경계를 대조해 개별 판단. | API/제품 소유자 | 2026-10-18 |

## 해결 규칙

gap을 해결하면 정본 코드·문서·테스트를 먼저 갱신하고, 회귀 방지 실행 경로와 red 증거를 확인한 뒤 활성 표에서 제거한다. 장기 결정이 생기면 ADR·[운영 결정 보관 원문](../../docs/archived/operational-decisions-history.md)에, 게이트가 못 잡는 불변식은 [decisions.md Do-Not-Break](decisions.md#do-not-break-체크리스트-자동-게이트-미커버-확정-규칙)에 남긴다.
