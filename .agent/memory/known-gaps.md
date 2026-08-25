---
schema_version: 1
memory_kind: known-gaps
status: active
authority: derived-active-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-08-22
verified_against: c72bb7285811549bf2577593ff4eb69c56a60cf3
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
| GAP-ARCH-001 | P2 | open | module boundaries | `business-app` 서비스 계층의 교차 도메인 결합은 app→app 5건·app→core 8건이다. 2026-08-20 census 동결 게이트를 걸어 더 늘지 못하게 했고, 2026-08-23 `BoardUserDeletionCleanupListener`의 comment 정리를 `CommentUserDeletionCleanupListener`(comment 자체 `UserDeletionEvent` 구독)로 역전해 app→app 6→5로 낮췄다. 잔여 5건: board→comment(`BoardEventListener`), dashboard→notification, stats→board, informalsanction→sms, informalsanction→mail. `DomainIsolationTest`는 엔티티 패키지만 보고 서비스 계층을 javadoc으로 명시 배제하므로 이 축을 원리적으로 탐지하지 못했고, 그 사각을 새 린터가 덮는다. app→core는 코어가 삭제 대상이 아니라 허용 가능하며 `허용`과 `미탐지`를 구분하려고 함께 동결했다. | [CrossDomainCouplingLinterTest](../../api-server/src/test/java/nuri/api/harness/CrossDomainCouplingLinterTest.java), [CommentUserDeletionCleanupListener](../../business-app/src/main/java/nuri/business/service/comment/listener/CommentUserDeletionCleanupListener.java), [ReportStatsService](../../business-app/src/main/java/nuri/business/service/stats/ReportStatsService.java), [SanctionEventListener](../../business-app/src/main/java/nuri/business/service/informalsanction/event/SanctionEventListener.java) | 잔여 app→app 5건을 port/event로 역전하고 상수를 낮춘다. `BoardEventListener`의 댓글 수 동기화는 board 소유 통계이므로 comment 측 이벤트 발행(port) 설계가 필요하고, informalsanction→sms/mail은 발송 port 추상화가 선행된다. | 아키텍처 소유자 | 2026-08-23 |
| GAP-API-001 | P2 | open | API contracts | 비정형 payload(`ApiResponse<Map<...>>`) 5건이 census 동결 상태로 남아 있다(즉시 위험 아님). `DashboardApiController`는 foundation `DashboardItemProvider` SPI가 페이로드를 `Map`으로 규정해 typed 이행이 SPI 계약 변경을 동반한다. wrapper 밖 binary/stream 축은 2026-08-23 헌법 제6조 3항(사용자 위임 D4)으로 제한 명문화가 완료됐고, 익명 개수 동결 대신 파일명·핸들러 단위 양방향 exact census(`FileApiController#downloadFile`, `LoginLogApiController#exportLoginLogs` 2건)로 강화됐다 — 목록 밖 신설 red 실측 완료. | [ResponseContractLinterTest](../../api-server/src/test/java/nuri/api/harness/ResponseContractLinterTest.java), [백엔드 헌법 제6조](../knowledge/backend-api-constitution/artifacts/constitution.md), [DashboardApiController](../../api-server/src/main/java/nuri/api/controller/business/main/DashboardApiController.java) | 저위험 3건(health·satisfaction·menu)을 전용 DTO로 이행하고 상수를 낮춘다. Dashboard는 SPI를 typed 위젯 목록으로 뒤집는 설계 결정이 선행된다. | API/사용자 | 2026-08-23 |
| GAP-CONTRACT-001 | P1 | open | input contracts | Entity→요청 DTO→OpenAPI 의미 계약은 위험 기반 표적만 검사하며 전체 쓰기 DTO를 포괄하지 않는다. | [InputContractMirrorLinterTest](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 실제 저장 경로 census에서 다음 고위험 DTO 묶음을 선정하고 length·enum·nullability 대응을 단계적으로 확장한다. | API/도메인 소유자 | 2026-08-19 |
| GAP-DEP-001 | P1 | needs-revalidation | dependency security | PR 코드는 read-only token으로 Gradle graph artifact만 생성하고, 신뢰된 `workflow_run`은 checkout/run 없이 이를 제출하며, required `secret-scan`은 base/head snapshot 완전성을 최대 600초 fail-closed 대기한 뒤 신규 runtime High 이상을 차단하도록 구현됐다. 다만 신규 publisher workflow는 기본 브랜치 선반영 후에만 동작하므로 public fork 고위험 probe가 아직 없고, 백엔드 헌법의 CVSS 7 build fail 서술과 주간 `continue-on-error` full scan의 outcome/SLA 차이도 남아 있다. | [PR graph producer](../../.github/workflows/dependency-submission.yml), [trusted publisher](../../.github/workflows/dependency-submission-publish.yml), [snapshot readiness](../../scripts/dependency-snapshot-readiness.mjs), [CI workflow](../../.github/workflows/ci.yml), [dependency workflow](../../.github/workflows/dependency-check.yml), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | producer/publisher를 기본 브랜치에 반영한 뒤 public fork에서 신규 runtime High 의존성을 넣은 probe PR로 artifact 제출·600초 readiness·dependency review 차단을 순서대로 확인한다. 별도로 주간 full scan의 triage·issue·해결 SLA와 헌법 outcome을 사용자 승인으로 정렬한다. | 보안/사용자 | 2026-08-19 |
| GAP-ZDM-001 | P1 | open | zero-downtime | Expand와 Contract 사이의 선행 release·관측 기간·backfill 증거를 linter와 DB 헌법이 강제하지 않는다. | [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | contract migration에 선행 release ID·호환 기간·backfill 증거를 요구하고 동일 release 축소를 차단한다. | DB/사용자 | 2026-08-19 |
| GAP-DATA-001 | P1 | blocked-external | legacy crypto data | 레거시 password hash와 이전 ARIA key 암호문이 운영 데이터에서 0건인지 저장소 테스트만으로 증명할 수 없다. | [EgovPasswordEncoder](../../business-core/src/main/java/nuri/business/security/service/EgovPasswordEncoder.java), [RrnoEncryptionConverter](../../business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java), [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 권한 있는 read-only census와 전환 증거를 확보한 뒤 호환 adapter 제거 여부를 결정한다. | 보안/DB 운영 | 2026-08-19 |
| GAP-OPS-002 | P1 | blocked-external | backup and DR | 운영 백업의 존재·복원 가능성·RTO/RPO는 repository CI나 로컬 compose로 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 승인된 격리 환경에서 restore drill을 수행하고 무결성·시간·소유자 증거를 secure channel에 남긴다. | 운영 관리자 | 2026-08-19 |
| GAP-FE-001 | P3 | open | frontend security | `script-src`의 `unsafe-inline`은 2026-08-20 요청별 nonce로 제거 완료다(DEC-OPS-011: PPR 포기 확정, proxy.ts 단일 소스, cacheComponents off + 루트 force-dynamic, next-themes에는 x-nonce로 전파, CI e2e green). `strict-dynamic`은 Next lazy chunk 비호환으로 채택 불가가 실측됐다(CI run 32310837353). 남은 것은 `style-src`의 `unsafe-inline`(Phase 3)뿐인데, React style prop과 sonner·framer-motion 런타임 `<style>` 주입 검증이 선행돼야 하며 script축 대비 위험이 낮아 P3로 하향한다. CSP 위반 리포트 수집 채널 결정(PD-CSP-002)도 별도 대기다. | [proxy.ts](../../frontend/src/proxy.ts), [csp-policy contract](../../frontend/src/__tests__/csp-policy.test.ts), [pending decisions](../../docs/04-operations/pending-decisions.md) | production build에서 sonner·framer-motion의 런타임 style 주입을 측정한 뒤 style-src-elem/attr 세분화를 검토한다. 불가로 판정되면 style 잔존을 accepted-risk로 전환하고 사유를 기록한다. | 보안/제품 소유자 | 2026-08-20 |
| GAP-UIQ-001 | P2 | deferred | ui quality evidence | UI quality baseline 의 8개 시나리오는 모두 `partial-automated-evidence`이고 manifest `currentBaseline.status`는 `unmeasured`다. 자동 축은 r12 가 exact 96/96 state·48/48 performance·assertion 156/156·axe 위반 0 으로 닫혔지만, r12 에는 실행 시점 protocol hash 가 없어 ADR-0005 상 영구히 `measured` 자격이 없다. 수동 접근성 48건 중 40건은 전문가 검토 대기, NVDA/Chrome 8건은 외부 차단이다. 2026-08-22 DEC-OPS-012 로 새 authoritative run(r13)과 수동 수집을 보류하고 UI 개선을 우선했다. 구현물(launch 실행기·combined summary v2 계약)은 보존돼 있어 재개에 추가 구현이 필요 없다. | [사용자 런북 §8](../../docs/04-operations/ui-ux-modernization-user-action-runbook.md), [baseline protocol §13](../../docs/04-operations/ui-ux-baseline-protocol.md), [ADR-0005](../../docs/02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md) | 지정 접근성 평가자와 승인된 Windows 기록 환경을 확보하면 protocol hash 를 기록한 새 run 과 수동 48건을 같은 combined summary 로 발행한다. 그전까지 `measured` 선언·protocol hash 소급 대입·수동 항목 자동 충족은 금지다. | 접근성 소유자/사용자 | 2026-08-22 |
| GAP-OPS-001 | P2 | blocked-external | verification | NVD 기반 dependency scan, 실제 k6 부하, 인증된 admin ZAP은 외부 자격·환경이 없으면 완전 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 필요한 secret·대상 환경·운영 창구가 준비되면 스킵 없는 증거를 재수집한다. | 저장소/운영 관리자 | 2026-08-18 |
| GAP-AGENT-001 | P2 | deferred | coordination | 공용 메모리는 지속 지식만 공유하며 실시간 claim·lock·presence 조정은 아직 설계 상태다. | [coordination design](../../docs/02-architecture/dual-operator-coordination.md), [AGENTS memory rule](../../AGENTS.md#documentation-and-memory) | 실제 동시 편집 충돌 비용이 정당화될 때 별도 coordination protocol을 구현한다. | 사용자 | 2026-08-18 |
| GAP-SEC-001 | P1 | blocked-external | secret lifecycle | 과거 노출 가능 자격의 외부 회전·폐기 완료 여부는 저장소만으로 증명할 수 없다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | provider별 회전·dangling credential 폐기 증거를 secure channel에서 확인한다. 값이나 로컬 파일은 저장소에 기록하지 않는다. | 사용자/운영 관리자 | 2026-08-19 |
| GAP-UI-001 | P3 | open | table sorting | 표의 열 정렬이 **서버가 내려준 현재 페이지 행만** 재배열하는 클라이언트 정렬이다(`createSortedRowModel` 이 `data` prop 위에서 동작). 여러 페이지 결과에서는 사용자가 전체 정렬로 오해할 수 있어 2026-08-25 페이저 요약에 범위 고지를 넣고 계약으로 고정했지만, **"전체에서 가장 최근 N건"을 정렬로 얻는 경로는 여전히 없다**. 로그 조사 화면 5개(privacy·system·user·web·login)와 주소록이 해당한다. | [정렬 구현](../../frontend/src/app/components/ui/standard-data-table.tsx), [범위 고지 계약](../../frontend/src/app/components/ui/__tests__/sort-scope-disclosure.test.tsx), [카탈로그 G5](../../docs/02-architecture/work-screen-grammar-catalog.md) | 로그·주소록 API 에 정렬 파라미터(정렬 키 allowlist + 방향)를 추가하고, 표가 서버 정렬 상태를 반영하도록 계약을 바꾼다. 허용 정렬 키는 인덱스가 있는 컬럼으로 제한해야 하므로 물리 스키마 실측이 선행된다(H1). | API/DB 소유자 | 2026-08-25 |

## 재검증 대기

`needs-revalidation`과 `blocked-external` 항목은 외부 상태가 바뀌었다는 주장만으로 닫지 않는다. 날짜가 있는 API/UI 실측이나 운영 증거를 확보한 뒤 상태를 갱신한다.

## 해결 규칙

gap을 해결하면 정본 코드·문서·테스트를 먼저 갱신하고, 회귀 방지 실행 경로와 red 증거를 확인한 뒤 활성 표에서 제거한다. 장기 결정이 생기면 ADR 또는 [decisions.md](decisions.md)에 링크하고 상세 이력은 중복 복사하지 않는다.
