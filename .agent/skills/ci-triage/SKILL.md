---
name: ci-triage
description: PR·main CI 나 정기 워크플로가 붉을 때 쓴다 — 기반 설비 실패인지 코드 결함인지 증거로 가르고, 실패한 잡만 다시 돌리거나 원인을 고쳐 PR 을 병합 가능한 상태로 지킨다.
---

# CI Triage

붉은 CI 를 보면 "코드 탓인가, 설비 탓인가"부터 증거로 가른다. 설비 실패를 코드로 고치려 하거나, 코드 결함을 재실행으로
덮으면 둘 다 비용이 커진다. (pstack `/fix-ci`·`/babysit` 의 흐름 — 실패 잡을 찾고 로그를 읽고 좁게 고친 뒤 PR 을 병합
가능한 상태로 지킨다 — 을 이 저장소의 반복 실패 계열에 맞춰 옮겼다.)

**상위 권위:** 검증 범위는 [AGENTS 범위별 검증](../../../AGENTS.md#verification-by-change-scope), PR·병합·브랜치 정리 범위는
[AGENTS 공유 워킹트리와 Git](../../../AGENTS.md#공유-워킹트리와-git), 재실행·무거운 검증의 예산은
[오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md) §6 을 따른다. 병합 권위는 required CI 다.

## 1. 정착을 먼저 확인한다

- PR CI 를 기다릴 때는 `node scripts/pr-checks-wait.mjs --pr <PR> --sha <검증한 커밋>` 을 백그라운드로 실행하고 **종료 코드로만**
  판정한다: 0 통과 · 1 required 실패·누락 · 2 조회·도구 오류(통과 아님) · 3 head 불일치·이동·PR 닫힘(새 head 로 다시 기다린다) ·
  4 시간 초과.
- 이 도구는 required 목록을 [.github/required-checks.json](../../../.github/required-checks.json)에서 읽고, 그 커밋의 ci.yml 실행이
  끝나고 required 가 모두 등록돼야 정착으로 본다 — required 집계 체크는 소스 잡이 끝난 뒤에야 **등록**되므로 pending 0 은 정착이 아니다.
- 폴링 루프를 새로 짜거나 `gh pr checks --watch` 로 기다리지 않는다(가드가 막는다). 한 번 볼 때만 `gh pr checks <PR> --required` 를 쓴다.
- 실패 잡을 재실행한 직후에는 실행이 다시 queued 가 되기 전 몇 초 동안 옛 실패로 1 이 날 수 있다 — 재실행 뒤에는 다시 기다린다.
- main 병합은 PR 경로다. push 트리거는 main 뿐이라 브랜치 push 로는 CI 가 돌지 않는다.

## 2. 실패 잡의 로그로 가른다

`gh run view <run-id> --log-failed` 로 실패한 단계와 문구를 읽고 아래 표와 대조한다. 표에 없는 실패는 코드 결함으로 보고
[resilience-debugger](../resilience-debugger/SKILL.md) 순서로 진단한다.

| 증상 | 판정 | 조치 |
|---|---|---|
| `mutation-scope` 가 수십 초 만에 plugins.gradle.org 해석 실패·`Cache service responded with 400` | 설비 | `gh run rerun <run-id> --failed`. 수 분 이상 돌았거나 PIT 결과가 남아 있으면 이 판정을 쓰지 않는다 |
| E2E 샤드가 'Install Playwright Dependencies' 단계 시간 초과(시험 단계는 skipped) | 설비 — 시험은 돌지 않았다 | 실패 잡만 재실행 |
| `schemaValidationTest` 간헐 실패, 내 커밋이 Java·`db/migration` 을 안 건드림 | flake 의심 | 직전 커밋의 같은 잡·main 최근 연속 통과·같은 run 의 설비 저하를 대조한다. 설비 저하가 확인될 때만 실패 잡을 재실행하고(SOP §6.2), 아니면 로그로 실패 시험을 특정해 불안정한 시험으로 다룬다 |
| `frontend-scope` 가 2분 안에 audit 정책으로 실패 | 새 보안 권고 게시 — 코드와 무관하게 모든 PR 이 붉다 | 권고를 확인해 의존성 갱신을 별도 작업으로 다룬다(재실행으로 안 풀린다) |
| `secret-scan` 이 PR 의 이전 커밋에서 오탐 | 증분 스캔은 PR 의 모든 커밋을 본다 — 문구 수정으로 안 사라진다 | `.gitleaksignore` 등록을 사용자와 판정한다. 푸시 전 원본 저장소 경로로 gitleaks 를 돌려 예방한다 |
| gitleaks 내려받기 `gzip: stdin: not in gzip format` | 설비 | 실패 잡만 재실행 |
| VRT 기준선이 문구 변경 화면에서 붉음 | 의도한 화면 변경이면 기준선 갱신 | 차이 이미지가 이번 변경의 의도와 같은지 먼저 보고 PR 에 남긴다 — 기준선은 현재 화면을 정답으로 굳히므로 의도하지 않은 차이는 코드를 고친다(GAP-UIF-001: 다시 만든 기준선은 사람이 검토한다). 기준선 워크플로를 돌린 뒤 봇 커밋은 PR CI 를 시작하지 않으므로 PR 을 닫았다 다시 연다 |
| CodeQL(`secure-coding`) 경고의 메시지가 비어 원인이 안 보임 | 흐름 확인 필요 | `gh run download <run-id> -n sast-javascript` 의 SARIF `codeFlows` 로 출처→싱크 줄을 본다 |
| E2E 재시도 통과(flaky)·늦은 포커스·ECONNRESET·하이드레이션 전 캡처 | 시험 또는 앱의 타이밍 결함 | 재시도로 덮지 않는다. trace·요청 시각으로 순서를 증명한 뒤 고친다 |

설비 판정도 증거로 한다 — 실패까지 걸린 시간, 단계 이름, 같은 run 의 다른 잡, main 의 같은 잡 이력을 함께 본다.
같은 실패를 재실행한 뒤에도 그대로면 설비 판정을 거둔다.

## 3. 고치고 다시 본다

- 코드 결함이면 원인 가설 → 표적 증거 → 최소 수정 → 재검증 순서로 고친다. 시험을 약화·skip 해서 green 으로 만들지 않는다.
- 새 커밋을 곧 올릴 예정이면 설비 실패를 재실행하지 않고 다음 CI 를 본다.
- 스택 PR 은 main 이 required checks 에 up-to-date 를 요구하므로 끝 PR 하나에 main 을 합쳐 한 번에 병합한다.

## 4. 정기 워크플로를 지킨다

PR 이 없는 정기 실행(ZAP·이관 도구·재사용 nightly·NVD·릴리스)은 붉어도 아무도 보지 않는다. 작업을 마무리할 때
`gh run list --workflow <파일> --limit 3` 으로 최근 결과를 보고, **두 번 연속 실패**면 실패 단계와 로그를 위 표로 가른 뒤
사용자에게 보고한다. 원인이 저장소 밖(키 만료·외부 서비스)이면 고치지 말고 필요한 조치만 알린다.

## 하지 않는 것

- `--no-verify`·강제 푸시로 막힌 것을 우회하지 않는다(저장소 가드가 묻는다).
- 정착 전에 "통과"로 보고하지 않는다. 재실행으로 통과한 flaky 를 해결로 보고하지 않는다.
