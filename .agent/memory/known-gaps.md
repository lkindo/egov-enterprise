---
schema_version: 1
memory_kind: known-gaps
status: active
authority: derived-active-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-08-18
verified_against: aa744fd48a232d6bda388094cca6dd2487ef8950
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
| GAP-GOV-003 | P1 | open | skills | 의무 ZDM 스킬과 인접 DB governance 스킬 일부가 DB 헌법의 타입·명명·read-only bridge 제약과 충돌한다. | [zero-downtime skill](../skills/zero-downtime-migration-planner/SKILL.md), [DB governance skill](../skills/db-governance/SKILL.md), [DB 헌법](../knowledge/db-standard-constitution/artifacts/constitution.md) | 헌법에 맞게 스킬을 고치고, 그 전에는 충돌 지시를 적용하지 않는 fallback을 유지한다. | 사용자/코드 소유자 | 2026-08-18 |
| GAP-AUTH-001 | P1 | open | authorization | owner-only·owner-or-admin 등 의미 정책의 중앙 registry와 semantic matrix gate가 없어 hand-written guard 완화 회귀가 census 밖에 남는다. | [OwnershipGuardBaselineLinterTest](../../api-server/src/test/java/nuri/api/harness/OwnershipGuardBaselineLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | 의미 enum/registry와 endpoint/domain policy matrix를 만들고 완화 mutation을 red로 증명한다. | 보안 소유자 | 2026-08-18 |
| GAP-QUAL-001 | P1 | open | quality gates | coverage·mutation 임계값이 build, workflow self-check, 문서에 분산돼 하향 drift를 완전히 막지 못한다. | [build.gradle](../../build.gradle), [WorkflowManifestLinterTest](../../api-server/src/test/java/nuri/api/harness/WorkflowManifestLinterTest.java), [Atlas gaps](../../frontend/public/governance_harness_atlas.html#content-gaps) | quality-gates manifest를 만들고 LINE 85/BRANCH 70/mutation 75 exact-match를 로컬·CI에서 검증한다. | 코드 소유자 | 2026-08-18 |
| GAP-FE-001 | P1 | open | frontend security | production CSP에 `unsafe-inline`이 남아 inline script/style 의존을 허용한다. | [next.config.ts](../../frontend/next.config.ts), [pending decisions](../../docs/04-operations/pending-decisions.md) | nonce/hash 기반 CSP와 inline 제거를 별도 보안 변경으로 검증한다. | 보안 소유자 | 2026-08-18 |
| GAP-OPS-001 | P2 | blocked-external | verification | NVD 기반 dependency scan, 실제 k6 부하, 인증된 admin ZAP은 외부 자격·환경이 없으면 완전 검증되지 않는다. | [verification blindspots](../../docs/04-operations/verification-blindspots.md) | 필요한 secret·대상 환경·운영 창구가 준비되면 스킵 없는 증거를 재수집한다. | 저장소/운영 관리자 | 2026-08-18 |
| GAP-AGENT-001 | P2 | deferred | coordination | 공용 메모리는 지속 지식만 공유하며 실시간 claim·lock·presence 조정은 아직 설계 상태다. | [coordination design](../../docs/02-architecture/dual-operator-coordination.md), [AGENTS memory rule](../../AGENTS.md#documentation-and-memory) | 실제 동시 편집 충돌 비용이 정당화될 때 별도 coordination protocol을 구현한다. | 사용자 | 2026-08-18 |
| GAP-SEC-001 | P1 | blocked-external | secret lifecycle | 과거 노출 가능 자격의 외부 회전·폐기 완료 여부는 저장소만으로 증명할 수 없다. | [rotation runbook](../../docs/04-operations/crypto-key-rotation.md) | provider별 회전·dangling credential 폐기 증거를 secure channel에서 확인한다. 값이나 로컬 파일은 저장소에 기록하지 않는다. | 사용자/운영 관리자 | 2026-08-18 |

## 재검증 대기

`needs-revalidation`과 `blocked-external` 항목은 외부 상태가 바뀌었다는 주장만으로 닫지 않는다. 날짜가 있는 API/UI 실측이나 운영 증거를 확보한 뒤 상태를 갱신한다.

## 해결 규칙

gap을 해결하면 정본 코드·문서·테스트를 먼저 갱신하고, 회귀 방지 실행 경로와 red 증거를 확인한 뒤 활성 표에서 제거한다. 장기 결정이 생기면 ADR 또는 [decisions.md](decisions.md)에 링크하고 상세 이력은 중복 복사하지 않는다.

