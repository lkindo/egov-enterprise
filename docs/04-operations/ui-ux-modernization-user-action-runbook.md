# UI/UX 현대화 사용자 마감 런북

## 1. 목적과 현재 상태

이 문서는 자동화 가능한 UI/UX 현대화 작업이 끝난 뒤, **사용자·제품 책임자·운영 책임자만 수행하거나 승인할 수 있는 잔여 작업**을 한 단계씩 처리하기 위한 운영 체크리스트다.

2026-08-21 기준 권위 있는 r12 실행은 다음 자동 증거를 확보했다.

- 8개 시나리오, 96/96 상태 case, 48/48 성능 case, assertion 156/156
- synthetic mutation evidence 36/36 실행, authoritative readback·rollback·cleanup 완료, 활성 잔류 0
- axe violation·수평 overflow·실패 assertion·invalid run 0
- full JSON 282개와 mutation diagnostic JSON 8개의 privacy 검사 통과
- frontend 1,453 tests, backend 표적 90 tests, production build·bundle·컴파일 통과

그러나 [scenario manifest](../../config/ui-quality-scenarios.json)는 계속 `unmeasured`이고 8개 시나리오는 `partial-automated-evidence`다. durable 정책 승인과 r12 automated-only summary의 사람 검토·tracked commit·clean-checkout readback·원격 병합·required CI는 마쳤지만 수동 접근성 증거 48건이 남았고, r12에는 execution-captured protocol hash도 없다. G0/G1 승인과 release 환경 입력 역시 열려 있다. 자동 결과의 상세 provenance는 [baseline protocol §13](ui-ux-baseline-protocol.md#13-현재-상태와-bounded-blockers)에 둔다.

이 런북은 새 완료 증거가 아니다. 각 단계의 실제 결과가 기대값과 일치하고 정본에 반영될 때만 다음 단계로 간다.

## 2. 진행 규칙

1. 아래 순서를 건너뛰지 않는다. `READY`인 단계 하나만 시작하고, 시작한 단계는 `IN_PROGRESS`로 표시해 완료 또는 중단까지 이어간다.
2. 명령 출력에는 토큰·쿠키·비밀번호·개인키·인증 상태 파일 내용·원시 응답을 포함하지 않는다.
3. 기대 결과와 다르면 같은 명령을 반복하거나 예외를 넓히지 말고 `STOP` 결과를 전달한다.
4. 체크박스는 실행자와 검토자가 증거를 확인한 뒤에만 표시한다.
5. Git commit·push, 외부 변수 설정, 자격 회전, Docker image/cache 삭제는 해당 단계의 명시 승인 전에는 실행하지 않는다.
6. 각 단계가 끝나면 이 문서의 `사용자가 돌려줄 결과` 형식만 전달한다. 다음 단계의 상세 실행 패킷은 그 결과를 확인한 뒤 확정한다.

## 3. 순서와 잠금 상태

| 순서 | ID | 작업 | 현재 상태 | 해제 조건 |
|---:|---|---|---|---|
| 1 | UA-01 | ignored 인증·리포트·임시 감사 산출물 정리 | `DONE` | 2026-08-21 사후 검증 완료 |
| 2 | UA-02 | 과거 개인키·Docker cache/image 노출 가능성 판정 및 자격 수명주기 조치 | `DONE — RETAIN_ACTIVE_TEST_KEY` | 2026-08-21 사용자 accepted-risk 판정 |
| 3 | UA-03 | `PD-UIQ-001` durable evidence 정책 10개 입력 승인 | `DONE` | 2026-08-21 ADR-0005와 closed policy 계약 반영 |
| 4 | UA-04 | r12 자동 artifact의 compact summary 후보를 검증하고 tracked index로 결속 | `DONE` | 2026-08-22 원격 병합·required CI·post-merge CI 완료 |
| 5 | UA-05 | execution-captured protocol hash를 가진 새 authoritative run과 수동 접근성 48건을 combined summary로 발행 | `IN_PROGRESS` | protocol-hash capture와 combined-v2 계약 구현·검증 후 새 run 및 사람 평가 |
| 6 | UA-06 | G0 제품·사용자 연구·브랜드/KRDS 입력 승인 | `LOCKED` | 지정 product/UX owner 확보 |
| 7 | UA-07 | G1 live menu·역할 노출·119+2 route disposition 최종 승인 | `LOCKED` | UA-06 및 live read-only evidence 확보 |
| 8 | UA-08 | release build/runtime 변수와 배포 owner handoff 검증 | `LOCKED` | 배포 환경의 실제 URL 확정 |
| 9 | UA-09 | 변경 inventory 검토, commit·PR, 현재 required CI 5종 실행 | `LOCKED` | 앞 단계 정본 변경 완료 및 commit/push 승인 |
| 10 | UA-10 | 최종 Genuine completion 감사와 r12/과거 Docker 자원 처분 | `LOCKED` | UA-01~09 및 새 authoritative run의 current indexed combined summary 검증 완료 |

## 4. UA-01 — ignored 생성 산출물 정리

### 4.1 목적과 영향

현재 남아 있는 인증 state 2개, Playwright report/result 2개와 저장소 밖 임시 감사 metadata 1개를 정확한 경로로 삭제한다. 제품 소스·r12 컨테이너·DB·권위 JSON baseline은 건드리지 않는다.

인증 state와 Playwright report/result는 테스트 setup으로 다시 생성할 수 있다. 임시 감사 파일은 경로·SHA metadata만 담은 일회성 파일이다. 파일 내용은 확인하거나 출력하지 않는다.

### 4.2 사전 확인

PowerShell에서 저장소 루트 `D:\project\egov-enterprise`로 이동한 뒤 실행한다.

```powershell
$workspaceRoot = (Resolve-Path -LiteralPath (git rev-parse --show-toplevel)).Path
if ((Split-Path -Leaf $workspaceRoot) -ne 'egov-enterprise') {
  throw 'STOP: 예상 저장소 루트가 아닙니다.'
}

$localAppDataRoot = [Environment]::GetFolderPath('LocalApplicationData')
if ([string]::IsNullOrWhiteSpace($localAppDataRoot)) {
  throw 'STOP: LocalApplicationData 경로를 확인할 수 없습니다.'
}

$auditTempRoot = [IO.Path]::GetFullPath((Join-Path $localAppDataRoot 'Temp'))
$auditTempTarget = [IO.Path]::GetFullPath((Join-Path $auditTempRoot 'egov-uiux-audit-before.json'))
if ((Split-Path -Parent $auditTempTarget) -ne $auditTempRoot) {
  throw 'STOP: 임시 감사 파일의 최종 경로가 예상 범위를 벗어났습니다.'
}

$artifactTargets = @(
  (Join-Path $workspaceRoot 'frontend\playwright\.auth\admin.json'),
  (Join-Path $workspaceRoot 'frontend\playwright\.auth\user.json'),
  (Join-Path $workspaceRoot 'frontend\playwright-report\index.html'),
  (Join-Path $workspaceRoot 'frontend\test-results\.last-run.json'),
  $auditTempTarget
)

$missing = $artifactTargets | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) }
if ($missing.Count -gt 0) {
  $missing | ForEach-Object { Write-Host "MISSING: $_" }
  throw 'STOP: 예상 파일 집합이 현재 디스크와 다릅니다.'
}

$artifactTargets | ForEach-Object {
  $item = Get-Item -LiteralPath $_ -Force
  [pscustomobject]@{
    Path       = $item.FullName
    IsFile     = -not $item.PSIsContainer
    IsReparse  = [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
  }
}
```

기대 결과는 5개 모두 `IsFile=True`, `IsReparse=False`다. 하나라도 다르면 삭제하지 않고 결과만 전달한다.

저장소 안 네 파일이 Git ignore 대상인지 확인한다.

```powershell
git check-ignore -v -- `
  'frontend/playwright/.auth/admin.json' `
  'frontend/playwright/.auth/user.json' `
  'frontend/playwright-report/index.html' `
  'frontend/test-results/.last-run.json'
```

기대 결과는 네 경로가 모두 ignore rule과 함께 출력되는 것이다.

### 4.3 삭제

사전 확인이 정확히 일치할 때만 다음 exact-path 삭제를 실행한다.

```powershell
Remove-Item -LiteralPath $artifactTargets -Force -ErrorAction Stop
```

`$artifactTargets`를 만든 사전 확인과 **같은 PowerShell session**에서만 실행한다. 재귀 삭제, glob, `build/`, `frontend/test-results/` 디렉터리 전체 삭제는 금지한다.

### 4.4 사후 검증

```powershell
$artifactTargets | ForEach-Object {
  [pscustomobject]@{
    Path   = $_
    Exists = Test-Path -LiteralPath $_
  }
}

git status --short -- `
  'frontend/playwright/.auth/admin.json' `
  'frontend/playwright/.auth/user.json' `
  'frontend/playwright-report/index.html' `
  'frontend/test-results/.last-run.json'
```

기대 결과:

- 5개 `Exists=False`
- `git status --short` 출력 없음
- r12 API·frontend·DB 컨테이너에는 변경 없음

### 4.5 사용자가 돌려줄 결과

파일 내용이나 인증 값을 붙이지 말고 아래 형식만 전달한다.

```text
UA-01 RESULT
precheck: 5 files / regular=true / reparse=false
ignored: 4/4
deleted: 5/5
postcheck: exists=0
git-status-for-targets: empty
result: PASS | STOP
```

`PASS`를 확인한 뒤 UA-02를 `READY`로 전환한다.

완료 기록(2026-08-21): 사용자가 exact-path 삭제를 실행했고, 사후 read-only 검증에서 5개 잔존 0, 대상 Git status 0, r12 컨테이너 2/2 healthy를 확인했다. 파일 내용은 읽거나 출력하지 않았다.

## 5. UA-02 — 과거 자격·Docker 노출 가능성 판정

이 단계에서는 ignored root 개인키 파일의 내용이나 fingerprint를 출력하지 않는다. 현재 `.dockerignore`와 계약은 향후 build context 노출을 차단하지만, 보강 이전에 만든 image/cache가 해당 파일을 포함했는지는 저장소만으로 확정할 수 없다.

현재 read-only 확인 결과 해당 파일은 `present=true`, `regular=true`, `reparse=false`, `ignored=true`다. 내용·fingerprint·public key는 확인하지 않았다.

2026-08-21 사용자 판정으로 이 파일은 테스트 OCI Compute 접속에 사용하는 활성 SSH 자격이다. 현재 키를 그대로 보존·사용하며, 재발급·회전·삭제는 이번 실행 범위에서 제외한다. 로컬 OpenSSH 호환성과 파일 ACL을 통과했고, 현재 키로 exact host/user 접속과 원격 Docker의 프로젝트 PostgreSQL 존재를 read-only로 확인했다. endpoint·키 값·public key·fingerprint·DB credential은 tracked 증거에 기록하지 않는다.

사용자는 보강 이전 Docker image/cache에 키가 포함됐을 가능성을 저장소만으로 부정할 수 없다는 잔여 위험을 인지한 상태에서, 격리된 테스트 OCI 자격을 계속 사용하는 `RETAIN_ACTIVE_TEST_KEY`를 선택했다. 이 판정은 운영 자격 재사용이나 새 배포 대상 확장을 승인하지 않으며, 현재 `.dockerignore`/Docker 계약과 ignored 로컬 보관 경계를 계속 적용한다.

사용자가 준비할 입력:

- 해당 키의 시스템·provider·소유 팀
- 현재 활성 여부와 교체 가능 시간
- 기존 키 폐기/회전 증거를 보관할 secure channel
- 삭제를 승인할 정확한 과거 Docker image/cache ID 목록

판정 결과는 다음 중 하나여야 한다.

- `ROTATE`: 아직 유효하거나 노출 여부를 부정할 수 없어 provider에서 먼저 회전·폐기한다.
- `REVOKED`: provider에서 기존 자격 폐기가 이미 확인됐다.
- `NOT-A-CREDENTIAL`: 책임자가 비밀 자격이 아님을 확인했다.
- `RETAIN_ACTIVE_TEST_KEY`: 테스트 환경 owner가 잔여 위험을 수용하고 exact test target에서만 현재 자격을 유지한다.
- `STOP`: owner/provider를 식별하지 못했다.

먼저 아래 식별 결과만 전달한다. 키 값, passphrase, public key, fingerprint, 계정 ID와 endpoint는 붙이지 않는다.

```text
UA-02 IDENTIFICATION
classification: ACTIVE_CREDENTIAL | REVOKED_CREDENTIAL | NOT-A-CREDENTIAL | UNKNOWN
provider-or-system: <name only | UNKNOWN>
owner-role: <role only | UNKNOWN>
rotation-window: <ISO-8601 range | UNKNOWN>
secure-evidence-channel: AVAILABLE | UNAVAILABLE
secrets-or-key-material-pasted: false
```

`UNKNOWN`이면 이 단계는 `STOP`으로 유지한다. 회전·폐기를 선택하면서 secure evidence channel이 `UNAVAILABLE`인 경우에도 완료할 수 없다. `RETAIN_ACTIVE_TEST_KEY`는 사용자 본인이 test environment owner로서 잔여 위험을 명시적으로 수용하고, ignored 파일·제한 ACL·Docker context 차단·exact test target 경계를 모두 확인한 경우에만 허용한다. 자격 종류와 owner가 확인되기 전에는 파일 삭제, provider 회전이나 Docker cache/image 처분을 시작하지 않는다.

Docker 전체 prune, volume 삭제, shared DB 삭제는 이 단계에서 금지한다. exact image/cache 처분은 provider 판정과 별도 승인을 받은 뒤 UA-10에서 수행한다.

## 6. UA-03 — durable evidence 정책 결정

[ADR-0005](../02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md)와 [closed policy](../../config/ui-quality-evidence-policy.json)로 `PD-UIQ-001`의 10개 입력을 2026-08-21 승인했다. GitHub-hosted Actions가 로컬 ignored r12 원본을 직접 취득할 수 없고 공개 저장소 artifact 보존 상한이 90일이므로, 대량 JSON을 Git에 복제하지 않는 `versioned-compact-summary`를 선택했다.

승인값은 다음과 같다.

```yaml
PD-UIQ-001:
  storeMode: versioned-compact-summary
  artifactProvider: git-tracked-versioned-file-with-git-blob-identity-and-sha256-readback
  retentionDays: 3650
  readers: [public]
  publishers: [repository-maintainer-via-main-required-ci]
  trackedIndexPath: config/ui-quality-baseline-index.json
  indexSchema:
    summaryPathTemplate: config/ui-quality-baseline/summaries/sha256-{artifactDigest}.json
    requiredFields: <closed fields in config/ui-quality-evidence-policy.json>
  redactionReviewers:
    roles: [quality-engineering, repository-governance]
    quorum: 1
    reReviewWhen: [summary-schema-change, source-evidence-digest-change, privacy-rule-change, manual-evidence-addition, allowlist-expansion]
  replacementPolicy: append-new-digest-and-supersedes; never overwrite; exact predecessor required
  expiryAndLegalHold: no automatic deletion; 3650-day minimum; explicit approval plus tombstone after expiry; hold blocks removal/history rewrite; no provider WORM claim
```

[tracked index](../../config/ui-quality-baseline-index.json)는 승인된 r12 automated-only summary digest `e7822b6a31dcf9ff5e129238e42cce7be29d5f126554e8ea400cf249c69af8e4`를 첫 entry로 가리킨다. 로컬 commit `65f8b5ea34be332aaf4714e9a56774e7fa2721f4`, 별도 clean-checkout committed readback, PR #434 required CI와 merge commit `f39ba9930df973710318088ccb00a2800643d9a3`의 post-merge CI가 모두 통과해 UA-04는 `DONE`이다. 다만 r12는 수동 증거와 execution-captured protocol hash가 없어 계속 `unmeasured`다.

## 7. UA-04 — r12 자동 artifact 초기 발행

UA-03 승인 뒤 로컬 발행·clean-checkout 검증·원격 병합·required CI readback까지 완료했다. 사용자가 원본 JSON을 source tree에 복사하지 않는다.

이 단계의 artifact는 r12 자동 증거만 담은 **초기 versioned compact summary**다. 수동 48건이 아직 없고 r12 실행 시점 `protocolHash`도 기록되지 않았으므로 baseline은 계속 `unmeasured`이며, tracked index에도 `automated-only` historical evidence임을 bounded 상태로 기록한다. UA-05의 measured 후보는 protocol hash를 실행 중 기록한 새 authoritative run을 사용해 새 digest로 대체한다.

로컬 candidate의 사람 검토는 `repository-governance` 역할로 승인됐고, 승인형 canonical summary와 index entry가 digest-derived 경로에 생성됐다. 같은 tracked commit의 clean checkout에서 canonical SHA-256·committed Git blob identity·index 결속을 다시 읽어 통과했으며, 원격 required CI와 post-merge readback도 통과했다.

2026-08-21 로컬 후보 생성·기계 검증 결과:

- ignored staging 파일 `build/reports/ui-quality-baseline-publication/r12-summary-candidate.json` 생성
- canonical SHA-256 `f70f45b6e5549f292a4ef3b0bf8316acae5a96255500de3910fdb9860f3e2793`, Draft 2020-12 JSON Schema와 executable closed validator readback 통과
- 원본 JSON 290개, state case 96개, performance case 48개, assertion 156개, mutation evidence 36개를 교차 재계산했고 수동 증거는 0개
- r12 원본 inventory digest와 execution-captured provenance를 exact 고정하고, 승인된 privacy rule canonical hash `efd981ddde3b84363c15893d333810821e1be79cc239c23af852c359c8e2ed86` 및 r12 이후 scenario contract 강화 사실을 `current-tooling-drifted-after-r12` limitation으로 보존
- 사람 redaction review는 8/8, 승인 역할은 `repository-governance`, 승격 자격은 `false`
- 승인형 canonical SHA-256은 `e7822b6a31dcf9ff5e129238e42cce7be29d5f126554e8ea400cf249c69af8e4`, Git blob identity는 `git-blob-sha1:109466308336cf4d235ab48c61631ffdadfc2b67`
- index는 첫 entry를 `supersedes=null`로 결속했다. exact 12-path local publication commit `65f8b5ea34be332aaf4714e9a56774e7fa2721f4`와 required-CI append-only 실행 경로 보강 commit `3bb03ab15c5cc6ddb0a37a79d59465f3e134d0b3`을 포함한 5개 commit을 PR #434로 병합했다. detached clean checkout의 dependency install·publication contract·전체 event-range gate·digest/blob repository readback, PR head required CI run `32502622801`, merge commit `f39ba9930df973710318088ccb00a2800643d9a3`의 post-merge Java CI run `32504902346`과 dependency graph run `32504902338`이 모두 성공했다.

이 결과는 사람 검토, tracked publication, clean-checkout readback, 원격 병합과 required CI readback이 끝났다는 증거다. UA-04는 완료됐지만 r12의 historical automated-only 범위는 바뀌지 않으며 `measured` 승격 근거가 아니다.

완료 조건:

- full JSON 282개와 diagnostic JSON 8개의 privacy 검사를 발행 직전에 다시 통과
- closed allowlist aggregate만 canonical summary에 포함하고 원본 290개 JSON은 계속 ignored/untracked 유지
- summary canonical bytes의 64-hex SHA-256과 committed Git blob identity를 독립 readback
- digest-derived 경로와 tracked index에는 bounded metadata만 있고 raw path·content·locator·인증 값·endpoint 원문이 없음
- 기존 summary를 덮어쓰지 않고 `supersedes`로 연결하며 최초 entry는 `supersedes=null`
- 사람 redaction review 승인 뒤 summary와 index를 tracked commit으로 발행하고 clean checkout과 required CI에서 index, summary, digest, provenance, redaction 상태를 해석할 수 있음
- `manualEvidenceCount=0`인 automated-only summary나 digest/privacy mismatch가 `measured` 승격을 red로 차단

## 8. UA-05 — 수동 접근성 평가 48건

8개 시나리오 각각에 다음 6개 검사를 수행한다.

- keyboard-only
- NVDA/Chrome
- 200% text
- 400% zoom / 320 CSS px reflow
- Windows forced colors
- reduced motion

총 48건 중 현재 40건은 전문가 검토 필요, NVDA/Chrome 8건은 외부 평가자·실제 Windows 환경이 필요하다. 절차는 [baseline protocol §7](ui-ux-baseline-protocol.md#7-manual-accessibility-procedures)을 따른다. 자동 assisted observation은 수동 결과를 대체하지 않는다.

모든 평가는 synthetic account/data로 수행하고, ADR-0005의 closed compact summary 범위 밖인 screenshot·trace·자유 입력은 저장소에 넣지 않는다. 각 결과는 최소한 `scenarioId`, `checkId`, 환경, `pass|fail|blocked`, issue code, redaction 상태, 검토 역할과 evidence digest를 가져야 한다.

48건을 단순히 별도 파일이나 대화 기록으로 남기는 것으로 이 단계를 끝내지 않는다. 평가 완료 후 다음 durability gate를 모두 통과해야 한다.

- 48건 전체의 privacy scan과 승인된 redaction review 완료
- protocol hash를 실행 시점에 기록하는 새 authoritative baseline run 수행; 현재 protocol hash를 r12에 소급 대입하는 방식은 금지
- 새 run은 protocol·runner/core·두 contract의 worktree raw bytes와 실행 commit Git blob raw bytes가 exact 일치하고 production input dirty fingerprint가 `null`인 clean committed snapshot에서만 시작
- UUID-v4 execution ID를 가진 fresh staging에서 exact 282개 자동 JSON을 생성하고, 최종 source/protocol/tooling 재검증 뒤 283번째 `automated-run-seal.json`을 마지막으로 발행; 실패·staging·다른 attempt 혼합은 수동 평가 입력으로 사용하지 않음
- 새 run/combined evidence용 schema·validator를 별도 version으로 구현하고, clean checkout의 `measured` 계약은 ignored raw `artifactPath` 존재가 아니라 tracked current summary의 96 state·48 performance·48 manual bounded projection을 검증하도록 전환
- 각 수동 결과를 새 run의 exact protocol/build/execution plan/scenario manifest/source artifact provenance와 자동 summary digest에 결속
- 새 run의 자동 증거와 수동 48건을 함께 담는 digest-derived versioned compact combined summary 발행
- combined summary canonical SHA-256과 committed Git blob identity의 독립 readback 일치
- tracked index의 `currentDigest`를 새 combined digest로 갱신하고 UA-04 r12 automated-only digest를 historical predecessor로 exact `supersedes` 연결
- clean checkout에서 current index가 새 run의 같은 provenance를 가진 combined summary와 수동 결과 48/48를 해석하는지 확인
- 수동 결과 누락·중복·다른 실행 provenance 혼합·digest mismatch·execution-captured protocol hash 부재가 `measured` 승격을 red로 차단

UA-06은 이 current indexed combined summary의 committed clean-checkout readback까지 통과한 뒤에만 시작한다.

## 9. UA-06 — G0 제품·연구 입력

다음 실제 소유자와 입력을 확보한다.

- product/UX owner와 최종 승인 역할
- 실제 사용자군과 우선 top task
- 현재 기본 profile이 아닌 승인된 브랜드/KRDS version·scope·mapping·예외
- 독립 holdout card-sort/tree-test 대상, 표본, 성공 기준과 결과
- ADR-0004 잠정 방향을 유지·수정·거부할 판정

ADR-0004는 `Accepted — provisional direction only`다. 이 단계 결과 없이 final IA로 승격하거나 KRDS 정렬·준수를 주장하지 않는다.

## 10. UA-07 — G1 live IA·권한 승인

live target의 read-only evidence로 다음을 확인한다.

- menu 구조와 active/nondeleted 상태
- authority assignment와 역할별 effective menu exposure
- 119 routes + 2 aliases의 exact keep/merge/redirect/remove disposition
- route별 owner, authorization, privacy, profile, canonical URL
- exact label/group/order/visibility와 rollback 기준

현재 overlay는 `state=proposed`, `acceptedDecision=null`, menu/generator consumer disabled다. live evidence와 domain/security/privacy 승인이 없는 값을 임의로 채우지 않는다.

## 11. UA-08 — release 변수와 runtime handoff

현재 repository variable은 0개다. release build와 runtime에는 다음 두 변수가 필요하다.

- `BACKEND_API_URL`: server-side container가 접근하는 absolute HTTP(S) URL, 정확한 `/api/v1` base
- `NEXT_PUBLIC_API_URL`: 브라우저가 접근하는 absolute HTTP(S) URL, 정확한 `/api/v1` base

실제 환경 값을 확정하기 전 placeholder를 GitHub에 넣지 않는다. 값은 secret이 아니더라도 내부 topology일 수 있으므로 대화·로그에는 변수 이름, 설정 여부와 validation 결과만 남긴다. build args와 runtime env 양쪽의 exact binding, API/actuator/WebSocket rewrite, CORS origin과 배포 owner readback을 확인해야 한다.

## 12. UA-09 — commit·PR·required CI

현재 워킹트리는 대규모 WIP이며 HEAD의 과거 CI green은 이 변경분의 증거가 아니다. 이 단계에서는 먼저 변경 inventory와 commit grouping을 검토하고 사용자가 commit·push를 명시 승인해야 한다.

PR에서 필요한 안정 context는 다음 5개다.

- `backend-build`
- `frontend-build`
- `secret-scan`
- `e2e-test`
- `mutation-test`

모두 현재 PR SHA에서 `success`이고 merge state가 green인지 확인한다. 로컬 green이나 기존 `origin/main` run을 현재 WIP의 required CI로 대체하지 않는다.

## 13. UA-10 — 최종 감사와 자원 처분

다음이 모두 충족돼야 Genuine completion을 선언한다.

- manual accessibility 48/48가 승인되고 execution-captured protocol hash를 가진 새 authoritative 자동 증거와 같은 current indexed versioned compact combined summary에 결속됨
- combined summary의 canonical SHA-256·committed Git blob identity와 tracked index가 clean checkout에서 검증되고 이전 r12 automated-only digest를 historical predecessor로 `supersedes`함
- G0/G1 final acceptance와 119+2 disposition이 승인됨
- release build/runtime handoff가 실제 환경에서 검증됨
- 현재 PR required CI 5종이 모두 green
- unresolved 보안 자격 수명주기 조치가 닫힘
- scenario manifest가 근거 없이가 아니라 계약을 통해 `measured`로 전환됨

r12·과거 컨테이너/image/cache/DB volume의 stop·삭제는 별도 exact 목록과 복구 영향을 제시하고 승인을 받은 뒤 수행한다. 광범위 prune이나 shared volume 삭제는 금지한다.

## 14. 결과 전달 형식

각 단계가 끝날 때 다음 형식을 사용한다.

```text
USER ACTION RESULT
task: UA-XX
executor-role: <role only>
started-at: <ISO-8601 with timezone>
finished-at: <ISO-8601 with timezone>
result: PASS | FAIL | BLOCKED | STOP
checks:
  - <bounded check>: <result>
evidence-location: <approved channel or NONE>
secrets-or-personal-data-pasted: false
notes: <bounded, redacted>
```

현재 실행 중인 대상은 **UA-05의 protocol-hash capture와 combined evidence v2 준비**다. UA-04의 후보 생성·기계 검증·사람 redaction review·digest-derived summary/index·tracked commit·clean-checkout readback·원격 병합·required CI는 완료됐다. r12 자체는 계속 `unmeasured`이며, 새 authoritative run과 사람 수동 증거 48건을 실제로 수집하기 전에는 UA-05를 완료하거나 `measured`로 승격하지 않는다.
