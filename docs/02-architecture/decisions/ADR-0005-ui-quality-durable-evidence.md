# ADR-0005: UI 품질 증거를 버전형 compact summary로 보존

- **Status:** Accepted
- **Date:** 2026-08-21
- **Decision owners:** repository owner / quality engineering / repository governance
- **Related:** [ADR-0003](ADR-0003-frontend-ux-modernization-principles.md), [baseline protocol](../../04-operations/ui-ux-baseline-protocol.md), [durable evidence policy](../../../config/ui-quality-evidence-policy.json), [baseline index](../../../config/ui-quality-baseline-index.json)

## Context

권위 있는 r12 자동 실행은 full JSON 282개와 mutation diagnostic JSON 8개의 privacy 검사를 통과했지만, 산출물은 ignored local 경로에만 있어 clean checkout에서 지속되지 않는다. GitHub Actions artifact는 immutable upload와 digest readback을 제공하지만 공개 저장소의 보존 상한이 90일이고, GitHub-hosted runner가 이미 생성된 로컬 ignored r12 원본을 직접 가져갈 수 없다. 로컬 파일을 r12인 것처럼 새 CI 실행에서 재생성하거나 hash만 복제하면 provenance를 허위로 만들게 된다.

대량 원본 JSON을 Git에 넣지 않으면서 현재 r12의 bounded 자동 결과와 이후 수동 결과를 장기 보존할 수 있는 저장 방식이 필요하다. 이 결정은 저장 정책만 승인하며 artifact 발행이나 `measured` 승격을 승인하지 않는다.

## Decision

[정책 설정](../../../config/ui-quality-evidence-policy.json)을 다음과 같이 채택한다.

1. `storeMode`: `versioned-compact-summary`
2. `artifactProvider`: `git-tracked-versioned-file-with-git-blob-identity-and-sha256-readback`
3. `retentionDays`: `3650`
4. `readers`: 공개 저장소 reader인 `public`
5. `publishers`: `repository-maintainer-via-main-required-ci`
6. `trackedIndexPath`: `config/ui-quality-baseline-index.json`
7. `indexSchema`: protocol/build/scenario·runner 계약 hash, source inventory, evidence scope, SHA-256 digest, Git blob identity, redaction·보존·supersedes 상태의 닫힌 필드 집합
8. `redactionReviewers`: quality engineering 또는 repository governance 역할, quorum 1; schema·source digest·privacy rule·manual evidence·allowlist 변경 시 재검토
9. `replacementPolicy`: 기존 summary를 덮어쓰지 않고 새 digest-derived summary를 append한 뒤 exact predecessor를 `supersedes`로 연결
10. `expiryAndLegalHold`: 자동 삭제 없음, 최소 3650일 보존, 만료 후에도 명시적 governance 승인과 append-only tombstone이 있어야 current-tree 제거 가능, hold 중 제거와 history rewrite 금지

Summary 경로는 `config/ui-quality-baseline/summaries/sha256-{artifactDigest}.json`이다. `artifactDigest`는 canonical summary bytes의 lowercase SHA-256이고 `immutableObjectIdentity`는 현재 저장소 object format에 맞춘 Git blob identity다. index와 summary에는 raw path, URL·endpoint, locator·DOM·text, request/response, 인증 값, 실제 사용자·조직·IP, screenshot·trace·HAR·video를 넣지 않는다.

`3650`일은 저장소 계약상의 최소 보존·검토 기간이다. Git history는 provider 수준 WORM 또는 법적 보존 잠금을 제공하지 않으므로 그런 성질을 주장하지 않는다.

## Publication boundary

UA-03에서는 [baseline index](../../../config/ui-quality-baseline-index.json)를 `currentDigest=null`, `entries=[]`로 준비한다. 이는 durable artifact가 아직 없음을 fail-closed로 나타낸다.

UA-04가 다음을 모두 수행하기 전에는 `baseline-artifact-durability`와 scenario baseline을 `unmeasured`로 유지한다.

- r12 원본을 privacy-first로 다시 검사하고 closed allowlist compact summary를 생성한다.
- canonical bytes SHA-256과 `git hash-object` identity를 독립 readback한다.
- digest-derived path에 새 summary를 append하고 index entry와 `currentDigest`를 exact 결속한다.
- clean checkout과 required CI에서 summary, index, digest, provenance, redaction 상태를 재검증한다.
- 수동 증거가 0/48인 automated-only artifact는 `measured` 승격을 허용하지 않는다.

UA-04의 r12 summary는 실행 당시 `protocolHash`가 기록되지 않은 historical automated-only evidence다. 이 누락을 현재 문서 hash로 소급 채우거나 r12 combined evidence로 승격하지 않는다. UA-05에서 `measured` 후보를 만들려면 protocol hash를 실행 시점에 기록하는 새 authoritative baseline run을 먼저 수행하고, 그 새 실행의 자동 증거와 수동 48건을 같은 provenance로 결속한 combined summary를 발행해야 한다. 새 summary는 UA-04의 r12 digest를 historical predecessor로 `supersedes`할 수 있지만 r12 자체의 승격 자격을 소급 변경하지 않는다.

## Consequences

### Positive

- ignored 원본 JSON과 민감할 수 있는 상세 artifact를 source에 복제하지 않는다.
- summary와 index가 일반 Git checkout과 required CI에서 장기 검증 가능하다.
- digest-derived append-only 경로와 predecessor 결속이 overwrite·fork·stale current를 드러낸다.

### Costs and limits

- compact summary는 원본 290개 JSON을 복원하는 archive가 아니며, 허용된 aggregate와 provenance만 보존한다.
- Git 관리자 강제 history rewrite나 저장소 삭제를 기술적으로 막는 legal hold/WORM은 아니다.
- 최초 summary 생성기, closed schema, privacy-negative fixture, index resolver와 clean-checkout gate는 UA-04에서 구현해야 한다.
- r12는 실행 시점 protocol hash가 없어 durable historical evidence로는 발행할 수 있지만 `measured` eligibility를 얻을 수 없다. 새 measured candidate에는 execution-captured protocol hash와 동일 provenance의 manual 48건이 필요하다.

## Rollback and replacement

정책 변경은 기존 summary나 이 ADR을 소급 수정하지 않는다. 후속 ADR이 새 store mode와 이행 절차를 승인하고, 새 index entry가 기존 current digest를 `supersedes`로 연결한 뒤 전환한다. active legal hold가 있으면 기존 history와 summary는 제거하지 않는다.
