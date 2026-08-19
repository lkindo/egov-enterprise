---
schema_version: 1
memory_kind: known-gaps
status: active
authority: derived-active-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-08-19
verified_against: e7f3c0e4603a28cb37beeb4f9444f094b66c1e4f
canonical_sources:
  - ../../frontend/public/governance_harness_atlas.html
  - ../../docs/04-operations/verification-blindspots.md
  - ../../docs/04-operations/pending-decisions.md
refresh_triggers:
  - gap-state-change
  - production-readiness-change
  - verification-evidence-change
---

# 공용 활성 Gap 인덱스

## 범위·상태 정의

이 파일은 현재 코드나 외부 실측으로 재현 가능한 미해결 위험의 얇은 인덱스다. 상세 원장은 링크된 문서·코드이며, 완료 이력은 Git에 남긴다.

- 우선순위: `P0` 즉시 안전/false-green, `P1` 높은 회귀·운영 위험, `P2` 계획 필요, `P3` 개선.
- 상태: `open`, `blocked-external`, `deferred`, `accepted-risk`, `needs-revalidation`.
- 추측이나 과거 task의 unchecked 항목만으로 새 gap을 만들지 않는다.

## 활성 Gap registry

| GAP-ID | 우선순위 | 상태 | 영역 | 요약 | 근거 | 다음 행동/재개 조건 | 결정권자 | 검증일 |
|---|---|---|---|---|---|---|---|---|
| GAP-MIG-001 | P0 | open | migration-tool | validation/report가 FAIL이어도 CLI가 non-zero 종료를 보장하지 않고, target schema 검증·source read-only·실 DB cutover 증거가 부족하다. | [MigrationRunner](../../migration-tool/src/main/java/nuri/migration/MigrationRunner.java), [MappingValidator](../../migration-tool/src/main/java/nuri/migration/validate/MappingValidator.java), [Atlas migration](../../frontend/public/governance_harness_atlas.html#content-migration) | strict exit code, fail-closed schema source, read-only 계정/transaction, real-DB E2E와 report artifact를 먼저 구현한다. | 사용자/DB 운영 | 2026-08-18 |
| GAP-GOV-001 | P0 | open | harness | baseline discovery가 헌법 지정 architecture gate와 schema-validation 전수를 포괄하지 않아 삭제·약화가 false-green일 수 있다. | [HarnessBaselineIntegrityTest](../../api-server/src/test/java/nuri/api/harness/HarnessBaselineIntegrityTest.java), [baseline manifest](../../api-server/src/test/resources/harness/baseline-manifest.properties), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 이름 regex 대신 명시 registry/tag census로 전환하고 삭제 mutation을 red로 증명한다. | 코드 소유자 | 2026-08-18 |
| GAP-GOV-002 | P0 | needs-revalidation | branch protection | 2026-08-18 snapshot에서 required checks는 맞지만 approval·code-owner·last-push·thread-resolution 통제가 미집행이었다. 외부 상태라 매번 재확인이 필요하다. | [CODEOWNERS](../../.github/CODEOWNERS), [required checks](../../.github/required-checks.json), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 작성자 외 reviewer 1인 이상을 확보한 뒤 정책 manifest와 live ruleset exact-match 검증을 도입한다. | 저장소 관리자 | 2026-08-18 |
| GAP-DB-001 | P0 | open | migration waivers | Zero-downtime linter의 자유형 `linter:ignore`가 owner·승인·만료·증거를 구조적으로 검증하지 않는다. | [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | waiver ID·reason·owner·approvedAt·expiresAt·evidence schema를 만들고 미등록·만료 예외를 실패 처리한다. | DB/코드 소유자 | 2026-08-19 |
| GAP-AUTH-001 | P1 | open | authorization | owner-only·owner-or-admin 등 의미 정책의 중앙 registry와 semantic matrix gate가 없어 hand-written guard 완화 회귀가 census 밖에 남는다. | [OwnershipGuardBaselineLinterTest](../../api-server/src/test/java/nuri/api/harness/OwnershipGuardBaselineLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 의미 enum/registry와 endpoint/domain policy matrix를 만들고 완화 mutation을 red로 증명한다. | 보안 소유자 | 2026-08-18 |
| GAP-ARCH-001 | P1 | open | module boundaries | `business-app`에 구체 타 도메인 service 주입과 repository 참조가 남아 있어 모든 교차 도메인 결합이 port/interface라는 설명은 성립하지 않는다. | [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [ReportStatsService](../../business-app/src/main/java/nuri/business/service/stats/ReportStatsService.java), [backend architecture](../../docs/02-architecture/backend-architecture.md) | 실제 결합 census를 만들고 필요한 경계만 port/event로 역전한 뒤 ArchUnit의 금지 범위를 확장한다. | 아키텍처 소유자 | 2026-08-19 |
| GAP-API-001 | P1 | open | API contracts | 일부 Controller가 `ApiResponse<Map<...>>`를 반환하고 file download는 wrapper 밖 `Resource`를 반환해 “전용 DTO·모든 성공 wrapper” 규범과 현행 코드가 다르다. | [DashboardApiController](../../api-server/src/main/java/nuri/api/controller/business/main/DashboardApiController.java), [FileApiController](../../api-server/src/main/java/nuri/api/controller/business/file/FileApiController.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | Map/Object 응답 census와 source gate를 만들고 typed DTO로 이행한다. binary/stream 예외는 사용자 승인 뒤 헌법에 제한적으로 명문화한다. | API/사용자 | 2026-08-19 |
| GAP-CONTRACT-001 | P1 | open | input contracts | Entity→요청 DTO→OpenAPI 의미 계약은 위험 기반 표적만 검사하며 전체 쓰기 DTO를 포괄하지 않는다. | [InputContractMirrorLinterTest](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 실제 저장 경로 census에서 다음 고위험 DTO 묶음을 선정하고 length·enum·nullability 대응을 단계적으로 확장한다. | API/도메인 소유자 | 2026-08-19 |
| GAP-DEP-001 | P1 | open | dependency security | 백엔드 헌법의 CVSS 7 build fail 서술과 주간 `continue-on-error` dependency scan의 실제 강제력이 다르다. | [dependency workflow](../../.github/workflows/dependency-check.yml), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 신규 production dependency high 이상 PR gate와 주간 full scan SLA를 분리하고 헌법은 outcome 중심으로 승인 개정한다. | 보안/사용자 | 2026-08-19 |
| GAP-ZDM-001 | P1 | open | zero-downtime | Expand와 Contract 사이의 선행 release·관측 기간·backfill 증거를 linter와 DB 헌법이 강제하지 않는다. | [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | contract migration에 선행 release ID·호환 기간·backfill 증거를 요구하고 동일 release 축소를 차단한다. | DB/사용자 | 2026-08-19 |
| GAP-E2E-001 | P1 | open | browser verification | E2E error detector가 넓은 401/403·`ERR_ABORTED` 범주를 전역 허용해 미등록 회귀를 숨길 수 있다. | [error-detector.ts](../../frontend/e2e/fixtures/error-detector.ts), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | spec·URL·status·횟수·만료가 있는 expected-error ledger로 전환하고 미등록 오류를 실패 처리한다. | 프런트/테스트 소유자 | 2026-08-19 |
| GAP-TEST-001 | P1 | open | security verification | 공용 `@IntegrationTest`가 `TestSecurityConfig`의 `anyRequest().permitAll()` 체인을 로드하므로 이를 사용하는 MockMvc 테스트는 production 인증·인가 체인을 검증하지 않는다. | [IntegrationTest](../../business-core/src/testFixtures/java/nuri/business/support/IntegrationTest.java), [TestSecurityConfig](../../business-core/src/testFixtures/java/nuri/business/security/config/TestSecurityConfig.java), [override linter](../../api-server/src/test/java/nuri/api/harness/TestSecurityChainOverrideLinterTest.java) | 서비스 통합용 stereotype과 production 보안 체인을 검증하는 HTTP stereotype을 분리하고, 인증·인가 단언이 mock 체인을 사용하면 실패하도록 게이트를 좁힌다. | 보안/테스트 소유자 | 2026-08-19 |
| GAP-FILE-001 | P1 | open | authenticated download | 브라우저 `downloadFile`만 `NEXT_PUBLIC_API_URL`로 URL을 직접 만들기 때문에 절대 URL 설정에서는 same-origin `proxy.ts`의 쿠키→Bearer 주입을 우회해 인증 다운로드가 401이 될 수 있다. | [FileService](../../frontend/src/services/foundation/file/FileService.ts), [browser API client](../../frontend/src/lib/api/client.ts), [auth proxy](../../frontend/src/proxy.ts), [active caller](../../frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx) | 브라우저 다운로드를 항상 same-origin으로 보내거나 인증 axios로 Blob을 받아 object URL로 열고, 상대·절대 API 설정 양쪽의 인증 다운로드 테스트를 추가한다. | 프런트/보안 소유자 | 2026-08-19 |
| GAP-DATA-001 | P1 | blocked-external | legacy crypto data | 레거시 password hash와 이전 ARIA key 암호문이 운영 데이터에서 0건인지 저장소 테스트만으로 증명할 수 없다. | [EgovPasswordEncoder](../../business-core/src/main/java/nuri/business/security/service/EgovPasswordEncoder.java), [RrnoEncryptionConverter](../../business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java), [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 권한 있는 read-only census와 전환 증거를 확보한 뒤 호환 adapter 제거 여부를 결정한다. | 보안/DB 운영 | 2026-08-19 |
| GAP-OPS-002 | P1 | blocked-external | backup and DR | 운영 백업의 존재·복원 가능성·RTO/RPO는 repository CI나 로컬 compose로 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 승인된 격리 환경에서 restore drill을 수행하고 무결성·시간·소유자 증거를 secure channel에 남긴다. | 운영 관리자 | 2026-08-19 |
| GAP-QUAL-001 | P1 | open | quality gates | coverage·mutation 임계값이 build, workflow self-check, 문서에 분산돼 하향 drift를 완전히 막지 못한다. | [build.gradle](../../build.gradle), [WorkflowManifestLinterTest](../../api-server/src/test/java/nuri/api/harness/WorkflowManifestLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | quality-gates manifest를 만들고 LINE 85/BRANCH 70/mutation 75 exact-match를 로컬·CI에서 검증한다. | 코드 소유자 | 2026-08-18 |
| GAP-FE-001 | P1 | open | frontend security | production CSP에 `unsafe-inline`이 남아 inline script/style 의존을 허용한다. | [next.config.ts](../../frontend/next.config.ts), [pending decisions](../../docs/04-operations/pending-decisions.md) | nonce/hash 기반 CSP와 inline 제거를 별도 보안 변경으로 검증한다. | 보안 소유자 | 2026-08-18 |
| GAP-OPS-001 | P2 | blocked-external | verification | NVD 기반 dependency scan, 실제 k6 부하, 인증된 admin ZAP은 외부 자격·환경이 없으면 완전 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 필요한 secret·대상 환경·운영 창구가 준비되면 스킵 없는 증거를 재수집한다. | 저장소/운영 관리자 | 2026-08-18 |
| GAP-AGENT-001 | P2 | deferred | coordination | 공용 메모리는 지속 지식만 공유하며 실시간 claim·lock·presence 조정은 아직 설계 상태다. | [coordination design](../../docs/02-architecture/dual-operator-coordination.md), [AGENTS memory rule](../../AGENTS.md#documentation-and-memory) | 실제 동시 편집 충돌 비용이 정당화될 때 별도 coordination protocol을 구현한다. | 사용자 | 2026-08-18 |
| GAP-SEC-001 | P1 | blocked-external | secret lifecycle | 과거 노출 가능 자격의 외부 회전·폐기 완료 여부는 저장소만으로 증명할 수 없다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | provider별 회전·dangling credential 폐기 증거를 secure channel에서 확인한다. 값이나 로컬 파일은 저장소에 기록하지 않는다. | 사용자/운영 관리자 | 2026-08-19 |
| GAP-LOAD-001 | P1 | open | load-test tooling | PowerShell 실행 안내가 지원되지 않는 `k6 --scenario` 옵션을 사용해 정본 스크립트의 `K6_SCENARIO` 계약과 어긋난다. | [run-load-test.ps1](../../scripts/run-load-test.ps1), [install-k6.ps1](../../scripts/install-k6.ps1), [load-levels.js](../../test/load-tests/scenarios/load-levels.js) | wrapper를 `-e K6_SCENARIO=...` 계약에 맞추고 명령 smoke test를 추가한다. | 코드 소유자 | 2026-08-19 |

## 재검증 대기

`needs-revalidation`과 `blocked-external` 항목은 외부 상태가 바뀌었다는 주장만으로 닫지 않는다. 날짜가 있는 API/UI 실측이나 운영 증거를 확보한 뒤 상태를 갱신한다.

## 해결 규칙

gap을 해결하면 정본 코드·문서·테스트를 먼저 갱신하고, 회귀 방지 실행 경로와 red 증거를 확인한 뒤 활성 표에서 제거한다. 장기 결정이 생기면 ADR 또는 [decisions.md](decisions.md)에 링크하고 상세 이력은 중복 복사하지 않는다.
