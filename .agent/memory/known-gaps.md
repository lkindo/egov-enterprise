---
schema_version: 1
memory_kind: known-gaps
status: active
authority: derived-active-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-08-19
verified_against: 189c24024980bf795438ed3bc293059dd0331ceb
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
| GAP-MIG-001 | P1 | open | migration-tool | data와 해당 chunk/row의 신규 keymap은 같은 target connection/transaction에 기록되고, batch 실패는 rollback 후 행 단위 원자 재시도하며 실패 행 mapping을 제거한다. commit/rollback 결과 불확정도 fatal로 중단한다. 그러나 keymap에 source-system/run namespace가 없고 테이블이 Flyway·감사 소유 밖에서 런타임 생성되며 upsert·durable checkpoint가 없다. 뒤 chunk 실패 시 앞선 commit은 유지되고, commit ambiguity의 실제 반영 여부를 판별·조정하는 reconciliation과 실 PostgreSQL·Oracle·Tibero 증거도 없다. | [EtlExecutor](../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java), [KeyMapRegistry](../../migration-tool/src/main/java/nuri/migration/keymap/KeyMapRegistry.java), [atomic integration test](../../migration-tool/src/test/java/nuri/migration/EtlAtomicKeyMapIntegrationTest.java), [Atlas migration](../../frontend/public/governance_harness_atlas.html#content-migration) | source-system·run identity와 감사 metadata를 포함한 Flyway 관리 keymap/run 테이블을 설계하고 upsert·durable checkpoint·resume·commit reconciliation을 구현한다. 앞선 chunk가 유지되는 부분 성공 정책과 rollback 절차를 명문화하고, 권한 수준 source read-only 및 PostgreSQL·Oracle·Tibero crash/retry/cutover를 실증한다. | 사용자/DB 운영 | 2026-08-19 |
| GAP-GOV-002 | P0 | needs-revalidation | branch protection | 저장소 목표 manifest는 안정 E2E aggregate를 포함한 required context 5개와 approval 1·code-owner·last-push·thread-resolution을 exact-match한다. 2026-08-19 원격 실측은 여전히 과거 E2E shard 3개를 포함한 context 7개이고 `e2e-test`는 없으며 review policy도 0/false다. | [CODEOWNERS](../../.github/CODEOWNERS), [required checks](../../.github/required-checks.json), [branch verifier](../../scripts/verify-branch-protection.mjs), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 작성자 외 reviewer 1인 이상을 확보한 뒤 관리자가 목표 context와 policy를 원격 ruleset에 적용하고 `verify:ops` red를 해소한다. | 저장소 관리자 | 2026-08-19 |
| GAP-AUTH-001 | P1 | open | authorization | 의미 registry와 semantic matrix는 구현됐지만 survey response route가 실제 ADMIN/SYSTEM 경계에 묶여 있고 `@AdminOnly`는 role hierarchy상 SYSTEM도 허용해 이름·제품 의도·실행 의미가 완전히 정렬되지 않았다. | [authorization policies](../../config/governance/authorization-policies.json), [SecurityAuthAnnotationLinterTest](../../api-server/src/test/java/nuri/api/harness/SecurityAuthAnnotationLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | survey 제출 권한의 제품 의도를 결정하고 route/seed를 정렬한다. role hierarchy를 포함한 실제 의미로 helper·annotation·백엔드 헌법 제8조를 승인 현행화한다. | 보안/사용자 | 2026-08-19 |
| GAP-ARCH-001 | P1 | open | module boundaries | `business-app`에 구체 타 도메인 service 주입과 repository 참조가 남아 있어 모든 교차 도메인 결합이 port/interface라는 설명은 성립하지 않는다. | [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [ReportStatsService](../../business-app/src/main/java/nuri/business/service/stats/ReportStatsService.java), [backend architecture](../../docs/02-architecture/backend-architecture.md) | 실제 결합 census를 만들고 필요한 경계만 port/event로 역전한 뒤 ArchUnit의 금지 범위를 확장한다. | 아키텍처 소유자 | 2026-08-19 |
| GAP-API-001 | P1 | open | API contracts | 일부 Controller가 `ApiResponse<Map<...>>`를 반환하고 file download는 wrapper 밖 `Resource`를 반환해 “전용 DTO·모든 성공 wrapper” 규범과 현행 코드가 다르다. | [DashboardApiController](../../api-server/src/main/java/nuri/api/controller/business/main/DashboardApiController.java), [FileApiController](../../api-server/src/main/java/nuri/api/controller/business/file/FileApiController.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | Map/Object 응답 census와 source gate를 만들고 typed DTO로 이행한다. binary/stream 예외는 사용자 승인 뒤 헌법에 제한적으로 명문화한다. | API/사용자 | 2026-08-19 |
| GAP-CONTRACT-001 | P1 | open | input contracts | Entity→요청 DTO→OpenAPI 의미 계약은 위험 기반 표적만 검사하며 전체 쓰기 DTO를 포괄하지 않는다. | [InputContractMirrorLinterTest](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 실제 저장 경로 census에서 다음 고위험 DTO 묶음을 선정하고 length·enum·nullability 대응을 단계적으로 확장한다. | API/도메인 소유자 | 2026-08-19 |
| GAP-DEP-001 | P1 | needs-revalidation | dependency security | PR 코드는 read-only token으로 Gradle graph artifact만 생성하고, 신뢰된 `workflow_run`은 checkout/run 없이 이를 제출하며, required `secret-scan`은 base/head snapshot 완전성을 최대 600초 fail-closed 대기한 뒤 신규 runtime High 이상을 차단하도록 구현됐다. 다만 신규 publisher workflow는 기본 브랜치 선반영 후에만 동작하므로 public fork 고위험 probe가 아직 없고, 백엔드 헌법의 CVSS 7 build fail 서술과 주간 `continue-on-error` full scan의 outcome/SLA 차이도 남아 있다. | [PR graph producer](../../.github/workflows/dependency-submission.yml), [trusted publisher](../../.github/workflows/dependency-submission-publish.yml), [snapshot readiness](../../scripts/dependency-snapshot-readiness.mjs), [CI workflow](../../.github/workflows/ci.yml), [dependency workflow](../../.github/workflows/dependency-check.yml), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | producer/publisher를 기본 브랜치에 반영한 뒤 public fork에서 신규 runtime High 의존성을 넣은 probe PR로 artifact 제출·600초 readiness·dependency review 차단을 순서대로 확인한다. 별도로 주간 full scan의 triage·issue·해결 SLA와 헌법 outcome을 사용자 승인으로 정렬한다. | 보안/사용자 | 2026-08-19 |
| GAP-ZDM-001 | P1 | open | zero-downtime | Expand와 Contract 사이의 선행 release·관측 기간·backfill 증거를 linter와 DB 헌법이 강제하지 않는다. | [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | contract migration에 선행 release ID·호환 기간·backfill 증거를 요구하고 동일 release 축소를 차단한다. | DB/사용자 | 2026-08-19 |
| GAP-TEST-001 | P1 | open | security verification | 공용 `@IntegrationTest`가 `TestSecurityConfig`의 `anyRequest().permitAll()` 체인을 로드하므로 이를 사용하는 MockMvc 테스트는 production 인증·인가 체인을 검증하지 않는다. | [IntegrationTest](../../business-core/src/testFixtures/java/nuri/business/support/IntegrationTest.java), [TestSecurityConfig](../../business-core/src/testFixtures/java/nuri/business/security/config/TestSecurityConfig.java), [override linter](../../api-server/src/test/java/nuri/api/harness/TestSecurityChainOverrideLinterTest.java) | 서비스 통합용 stereotype과 production 보안 체인을 검증하는 HTTP stereotype을 분리하고, 인증·인가 단언이 mock 체인을 사용하면 실패하도록 게이트를 좁힌다. | 보안/테스트 소유자 | 2026-08-19 |
| GAP-FILE-001 | P1 | open | authenticated download | 브라우저 `downloadFile`만 `NEXT_PUBLIC_API_URL`로 URL을 직접 만들기 때문에 절대 URL 설정에서는 same-origin `proxy.ts`의 쿠키→Bearer 주입을 우회해 인증 다운로드가 401이 될 수 있다. | [FileService](../../frontend/src/services/foundation/file/FileService.ts), [browser API client](../../frontend/src/lib/api/client.ts), [auth proxy](../../frontend/src/proxy.ts), [active caller](../../frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx) | 브라우저 다운로드를 항상 same-origin으로 보내거나 인증 axios로 Blob을 받아 object URL로 열고, 상대·절대 API 설정 양쪽의 인증 다운로드 테스트를 추가한다. | 프런트/보안 소유자 | 2026-08-19 |
| GAP-DATA-001 | P1 | blocked-external | legacy crypto data | 레거시 password hash와 이전 ARIA key 암호문이 운영 데이터에서 0건인지 저장소 테스트만으로 증명할 수 없다. | [EgovPasswordEncoder](../../business-core/src/main/java/nuri/business/security/service/EgovPasswordEncoder.java), [RrnoEncryptionConverter](../../business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java), [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 권한 있는 read-only census와 전환 증거를 확보한 뒤 호환 adapter 제거 여부를 결정한다. | 보안/DB 운영 | 2026-08-19 |
| GAP-OPS-002 | P1 | blocked-external | backup and DR | 운영 백업의 존재·복원 가능성·RTO/RPO는 repository CI나 로컬 compose로 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 승인된 격리 환경에서 restore drill을 수행하고 무결성·시간·소유자 증거를 secure channel에 남긴다. | 운영 관리자 | 2026-08-19 |
| GAP-FE-001 | P1 | open | frontend security | production CSP에 `unsafe-inline`이 남아 inline script/style 의존을 허용한다. | [next.config.ts](../../frontend/next.config.ts), [pending decisions](../../docs/04-operations/pending-decisions.md) | nonce/hash 기반 CSP와 inline 제거를 별도 보안 변경으로 검증한다. | 보안 소유자 | 2026-08-18 |
| GAP-OPS-001 | P2 | blocked-external | verification | NVD 기반 dependency scan, 실제 k6 부하, 인증된 admin ZAP은 외부 자격·환경이 없으면 완전 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 필요한 secret·대상 환경·운영 창구가 준비되면 스킵 없는 증거를 재수집한다. | 저장소/운영 관리자 | 2026-08-18 |
| GAP-AGENT-001 | P2 | deferred | coordination | 공용 메모리는 지속 지식만 공유하며 실시간 claim·lock·presence 조정은 아직 설계 상태다. | [coordination design](../../docs/02-architecture/dual-operator-coordination.md), [AGENTS memory rule](../../AGENTS.md#documentation-and-memory) | 실제 동시 편집 충돌 비용이 정당화될 때 별도 coordination protocol을 구현한다. | 사용자 | 2026-08-18 |
| GAP-AUTH-002 | P1 | open | authorization | 재작성된 `SecurityAuthAnnotationLinterTest`는 쓰기 메서드(POST/PUT/PATCH/DELETE)만 순회한다. 종전 린터가 HTTP 메서드 구분 없이 강제하던 "모든 핸들러는 인가 애노테이션·PUBLIC whitelist·secure-paths 중 하나에 결속" 축이 읽기 엔드포인트에서 사라졌고, 이 능력을 넘겨받은 다른 게이트가 없다. | [SecurityAuthAnnotationLinterTest](../../api-server/src/test/java/nuri/api/harness/SecurityAuthAnnotationLinterTest.java), [authorization policies](../../config/governance/authorization-policies.json) | endpoint policy registry를 읽기 엔드포인트까지 확장하거나, 최소한 "비-whitelist GET은 선언된 인가 기제를 가진다"는 축소 단언을 별도 테스트로 복원한다. 즉시 복원이 불가하면 registry의 알려진 한계와 gates.json에 범위 밖임을 명시해 커버리지 축소가 문서상 은폐되지 않게 한다. | 보안/API 소유자 | 2026-08-19 |
| GAP-GOV-003 | P1 | open | harness integrity | 동결 census가 Java 상수에서 `config/governance/*.json` registry로 이관됐는데, `HarnessBaselineIntegrityTest`는 Java 상수와 훅 파일만 해시한다. 그 결과 인가 census·gate registry·ZDM waiver의 변경이 baseline manifest diff에 남지 않아, 목록 편집이 "두 파일이 함께 바뀐다"는 은폐 방지 결속을 벗어난다. | [HarnessBaselineIntegrityTest](../../api-server/src/test/java/nuri/api/harness/HarnessBaselineIntegrityTest.java), [authorization policies](../../config/governance/authorization-policies.json), [gate registry](../../config/governance/gates.json), [zdm waivers](../../config/governance/zdm-waivers.json) | `GATE_HOOKS`가 훅을 해시하는 방식과 동일하게 registry JSON을 `__registry.<path>` 축으로 매니페스트에 동결하고, 의도적 변경 주입으로 red를 증명한다. | 아키텍처/보안 소유자 | 2026-08-19 |
| GAP-SEC-001 | P1 | blocked-external | secret lifecycle | 과거 노출 가능 자격의 외부 회전·폐기 완료 여부는 저장소만으로 증명할 수 없다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | provider별 회전·dangling credential 폐기 증거를 secure channel에서 확인한다. 값이나 로컬 파일은 저장소에 기록하지 않는다. | 사용자/운영 관리자 | 2026-08-19 |

## 재검증 대기

`needs-revalidation`과 `blocked-external` 항목은 외부 상태가 바뀌었다는 주장만으로 닫지 않는다. 날짜가 있는 API/UI 실측이나 운영 증거를 확보한 뒤 상태를 갱신한다.

## 해결 규칙

gap을 해결하면 정본 코드·문서·테스트를 먼저 갱신하고, 회귀 방지 실행 경로와 red 증거를 확인한 뒤 활성 표에서 제거한다. 장기 결정이 생기면 ADR 또는 [decisions.md](decisions.md)에 링크하고 상세 이력은 중복 복사하지 않는다.
