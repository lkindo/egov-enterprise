---
schema_version: 1
memory_kind: known-gaps
status: active
authority: derived-active-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-08-19
verified_against: 36e034171dfe9946e144f20aa98d459463cec570
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
| GAP-GOV-002 | P1 | open | branch protection | required context는 2026-08-19 원격 적용을 마쳤다 — ruleset이 목표 5개(`backend-build`, `frontend-build`, `secret-scan`, `e2e-test`, `mutation-test`)와 exact-match한다. 종전 shard 3개(`e2e-tests (N/3)`)가 required였을 때는 E2E가 정당하게 skip되는 변경(문서·백엔드 전용)이 영원히 pending으로 잠겼고 PR #425가 실제로 그렇게 막혔다. 남은 불일치는 review policy 4건뿐이다: approval 0(목표 1), code-owner·last-push·thread-resolution 전부 false(목표 true). | [required checks](../../.github/required-checks.json), [branch verifier](../../scripts/verify-branch-protection.mjs), [CODEOWNERS](../../.github/CODEOWNERS) | 작성자 외 reviewer를 확보한 뒤 review policy 4건을 적용한다. **확보 전에 적용하면 자기 PR을 자기가 승인할 수 없어 모든 병합이 막힌다** — 단독 운영 중에는 의도적으로 유예한 상태다. 적용 후 `npm run verify:ops`가 green이면 이 gap을 닫는다. | 저장소 관리자 | 2026-08-19 |
| GAP-AUTH-001 | P1 | open | authorization | 의미 registry와 semantic matrix는 구현됐지만 survey response route가 실제 ADMIN/SYSTEM 경계에 묶여 있고 `@AdminOnly`는 role hierarchy상 SYSTEM도 허용해 이름·제품 의도·실행 의미가 완전히 정렬되지 않았다. | [authorization policies](../../config/governance/authorization-policies.json), [SecurityAuthAnnotationLinterTest](../../api-server/src/test/java/nuri/api/harness/SecurityAuthAnnotationLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | survey 제출 권한의 제품 의도를 결정하고 route/seed를 정렬한다. role hierarchy를 포함한 실제 의미로 helper·annotation·백엔드 헌법 제8조를 승인 현행화한다. | 보안/사용자 | 2026-08-19 |
| GAP-ARCH-001 | P2 | open | module boundaries | `business-app` 서비스 계층의 교차 도메인 결합은 app→app 6건·app→core 8건이다. 2026-08-20 census 동결 게이트를 걸어 더 늘지 못하게 했다. `DomainIsolationTest`는 엔티티 패키지만 보고 서비스 계층을 javadoc으로 명시 배제하므로 이 축을 원리적으로 탐지하지 못했고, 그 사각을 새 린터가 덮는다. app→core는 코어가 삭제 대상이 아니라 허용 가능하며 `허용`과 `미탐지`를 구분하려고 함께 동결했다. | [CrossDomainCouplingLinterTest](../../api-server/src/test/java/nuri/api/harness/CrossDomainCouplingLinterTest.java), [ReportStatsService](../../business-app/src/main/java/nuri/business/service/stats/ReportStatsService.java), [SanctionEventListener](../../business-app/src/main/java/nuri/business/service/informalsanction/event/SanctionEventListener.java) | app→app 6건을 port/event로 역전하고 상수를 낮춘다. `BoardUserDeletionCleanupListener`는 이미 `UserDeletionEvent` 리스너라 comment 측 리스너 분리만으로 해소되며(addressbook·blog·notification이 이미 그 패턴) 가장 낮은 위험이다. | 아키텍처 소유자 | 2026-08-20 |
| GAP-API-001 | P2 | open | API contracts | 핸들러 325건 중 비정형 payload(`ApiResponse<Map<...>>`) 5건과 wrapper 밖 `ResponseEntity<Resource>` 1건이 남아 있다. 2026-08-20 census 동결 게이트를 걸어 더 늘지 못하게 했으므로 즉시 위험은 아니다. `DashboardApiController`는 foundation `DashboardItemProvider` SPI가 페이로드를 `Map`으로 규정해 typed 이행이 SPI 계약 변경을 동반하고, file download는 정당한 binary 예외이나 헌법 제6조에 예외 조항이 없다. | [ResponseContractLinterTest](../../api-server/src/test/java/nuri/api/harness/ResponseContractLinterTest.java), [DashboardApiController](../../api-server/src/main/java/nuri/api/controller/business/main/DashboardApiController.java), [FileApiController](../../api-server/src/main/java/nuri/api/controller/business/file/FileApiController.java) | 저위험 3건(health·satisfaction·menu)을 전용 DTO로 이행하고 상수를 낮춘다. Dashboard는 SPI를 typed 위젯 목록으로 뒤집는 설계 결정이 선행된다. binary/stream 예외는 사용자 승인 뒤 헌법 제6조에 제한적으로 명문화한다. | API/사용자 | 2026-08-20 |
| GAP-CONTRACT-001 | P1 | open | input contracts | Entity→요청 DTO→OpenAPI 의미 계약은 위험 기반 표적만 검사하며 전체 쓰기 DTO를 포괄하지 않는다. | [InputContractMirrorLinterTest](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 실제 저장 경로 census에서 다음 고위험 DTO 묶음을 선정하고 length·enum·nullability 대응을 단계적으로 확장한다. | API/도메인 소유자 | 2026-08-19 |
| GAP-DEP-001 | P1 | needs-revalidation | dependency security | PR 코드는 read-only token으로 Gradle graph artifact만 생성하고, 신뢰된 `workflow_run`은 checkout/run 없이 이를 제출하며, required `secret-scan`은 base/head snapshot 완전성을 최대 600초 fail-closed 대기한 뒤 신규 runtime High 이상을 차단하도록 구현됐다. 다만 신규 publisher workflow는 기본 브랜치 선반영 후에만 동작하므로 public fork 고위험 probe가 아직 없고, 백엔드 헌법의 CVSS 7 build fail 서술과 주간 `continue-on-error` full scan의 outcome/SLA 차이도 남아 있다. | [PR graph producer](../../.github/workflows/dependency-submission.yml), [trusted publisher](../../.github/workflows/dependency-submission-publish.yml), [snapshot readiness](../../scripts/dependency-snapshot-readiness.mjs), [CI workflow](../../.github/workflows/ci.yml), [dependency workflow](../../.github/workflows/dependency-check.yml), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | producer/publisher를 기본 브랜치에 반영한 뒤 public fork에서 신규 runtime High 의존성을 넣은 probe PR로 artifact 제출·600초 readiness·dependency review 차단을 순서대로 확인한다. 별도로 주간 full scan의 triage·issue·해결 SLA와 헌법 outcome을 사용자 승인으로 정렬한다. | 보안/사용자 | 2026-08-19 |
| GAP-ZDM-001 | P1 | open | zero-downtime | Expand와 Contract 사이의 선행 release·관측 기간·backfill 증거를 linter와 DB 헌법이 강제하지 않는다. | [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | contract migration에 선행 release ID·호환 기간·backfill 증거를 요구하고 동일 release 축소를 차단한다. | DB/사용자 | 2026-08-19 |
| GAP-DATA-001 | P1 | blocked-external | legacy crypto data | 레거시 password hash와 이전 ARIA key 암호문이 운영 데이터에서 0건인지 저장소 테스트만으로 증명할 수 없다. | [EgovPasswordEncoder](../../business-core/src/main/java/nuri/business/security/service/EgovPasswordEncoder.java), [RrnoEncryptionConverter](../../business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java), [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 권한 있는 read-only census와 전환 증거를 확보한 뒤 호환 adapter 제거 여부를 결정한다. | 보안/DB 운영 | 2026-08-19 |
| GAP-OPS-002 | P1 | blocked-external | backup and DR | 운영 백업의 존재·복원 가능성·RTO/RPO는 repository CI나 로컬 compose로 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 승인된 격리 환경에서 restore drill을 수행하고 무결성·시간·소유자 증거를 secure channel에 남긴다. | 운영 관리자 | 2026-08-19 |
| GAP-FE-001 | P1 | open | frontend security | production CSP에 `unsafe-inline`이 남아 inline script/style 의존을 허용한다. | [next.config.ts](../../frontend/next.config.ts), [pending decisions](../../docs/04-operations/pending-decisions.md) | nonce/hash 기반 CSP와 inline 제거를 별도 보안 변경으로 검증한다. | 보안 소유자 | 2026-08-18 |
| GAP-OPS-001 | P2 | blocked-external | verification | NVD 기반 dependency scan, 실제 k6 부하, 인증된 admin ZAP은 외부 자격·환경이 없으면 완전 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 필요한 secret·대상 환경·운영 창구가 준비되면 스킵 없는 증거를 재수집한다. | 저장소/운영 관리자 | 2026-08-18 |
| GAP-AGENT-001 | P2 | deferred | coordination | 공용 메모리는 지속 지식만 공유하며 실시간 claim·lock·presence 조정은 아직 설계 상태다. | [coordination design](../../docs/02-architecture/dual-operator-coordination.md), [AGENTS memory rule](../../AGENTS.md#documentation-and-memory) | 실제 동시 편집 충돌 비용이 정당화될 때 별도 coordination protocol을 구현한다. | 사용자 | 2026-08-18 |
| GAP-SEC-001 | P1 | blocked-external | secret lifecycle | 과거 노출 가능 자격의 외부 회전·폐기 완료 여부는 저장소만으로 증명할 수 없다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | provider별 회전·dangling credential 폐기 증거를 secure channel에서 확인한다. 값이나 로컬 파일은 저장소에 기록하지 않는다. | 사용자/운영 관리자 | 2026-08-19 |

## 재검증 대기

`needs-revalidation`과 `blocked-external` 항목은 외부 상태가 바뀌었다는 주장만으로 닫지 않는다. 날짜가 있는 API/UI 실측이나 운영 증거를 확보한 뒤 상태를 갱신한다.

## 해결 규칙

gap을 해결하면 정본 코드·문서·테스트를 먼저 갱신하고, 회귀 방지 실행 경로와 red 증거를 확인한 뒤 활성 표에서 제거한다. 장기 결정이 생기면 ADR 또는 [decisions.md](decisions.md)에 링크하고 상세 이력은 중복 복사하지 않는다.
