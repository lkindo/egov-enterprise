---
name: verify-app
description: 화면·API 변경이 실제 앱에서 동작하는지 확인할 때 쓴다 — 단위 시험으로 끝내지 않고 격리 스택에서 바꾼 사용자 동선을 직접 조작해 증거를 남긴다(공유 DB 는 건드리지 않는다).
---

# Verify App

바꾼 화면·API 를 **새 격리 스택**에서 실제 사용자 동선으로 조작해 동작을 증명한다. 단위 시험이 통과해도 화면에서
깨지는 결함(예: 설문 주관식 문항은 관리 화면에서 만들 수 있지만 응답 서비스가 거부해 답할 수 없었다)을 푸시 전에 잡는다.
PR CI 실패의 절반가량이 E2E 라 그 비용을 앞당기려는 것이다.

**상위 권위:** 검증 범위는 [AGENTS 범위별 검증](../../../AGENTS.md#verification-by-change-scope), 무거운 실행의 순서·예산은
[오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md) §6.3(한 기계에서 하나씩)을 따른다. 이 스킬은
그 위에서 "어떻게 실제로 몰아 보는가"만 정한다. 실행 기준·명령의 정본은 [E2E 운영 런북](../../../docs/03-guides/e2e-test-guide.md)이다.
(구조는 pstack `/create-verification-skill` 의 Launch·Doctor·Drive·Evidence·Cleanup 을 따랐다.)

## 1. Doctor — 몰아도 되는 상태인지 먼저 본다(읽기만)

- **공유 DB 가 아니다.** 루트 `.env` 의 `DB_URL` 은 공유 DB 를 가리킬 수 있다(이 저장소는 공유 OCI DB 를 가리킨다). 그러면
  `npm run dev`(8080)는 그 DB 에 붙어, 화면을 조작하면 공유 데이터가 바뀐다. 동작 확인은 dev 스택이 아니라 아래 격리 실행기로만 한다. `.env` 내용은 출력하지 않는다.
- **격리 작업 트리 조건:** 실행기는 `.env` 가 있으면 거부한다. 의존성은 실제로 설치돼 있어야 한다 — `frontend/node_modules` 를
  링크(junction)로 빌린 작업 트리는 Turbopack 이 링크를 풀지 못해 빌드가 실패한다(SOP §6.6).
- **겹치는 무거운 실행이 없다.** Gradle 전체 시험·전체 Vitest·다른 격리 E2E 가 돌고 있으면 기다린다(§6.3). 겹쳐 실행한 결과는
  red 든 green 이든 증거로 쓰지 않는다.
- Docker·Java 21 이 있는지 `docker version`·`java -version` 으로 확인한다.

## 2. Launch — 새 격리 스택

실행기가 일회용 DB 와 자기 소유의 API·프런트 프로세스를 만들고, 인증·fixture·정리 전에 소유를 확인한다.

```powershell
# 바꾼 동선의 spec 만(아래 3) — 가장 흔한 사용
node scripts/run-isolated-e2e.mjs -- --project=full-suite e2e/journeys/<동선>.spec.ts
# API 계약만
node scripts/run-isolated-e2e.mjs -- --project=api-contract e2e/contracts/<계약>.spec.ts
# 전체(푸시 직전 한 번, 넓은 변경일 때만)
npm run verify:e2e
```

## 3. Drive — 바꾼 동선을 고른다

1. 바꾼 화면의 경로(`frontend/src/app/<경로>/page.tsx` → URL `/<경로>`)로 그 동선을 다루는 spec 을 찾는다:
   `grep -rln "/<경로>" frontend/e2e/journeys frontend/e2e/quality frontend/e2e/contracts`
2. 그 spec 이 바꾼 동작을 실제로 밟는지 읽어 본다. 안 밟으면 **기존 spec 에 단계를 더한다** — 새 spec 은 소유 계약이 겹치지
   않을 때만 만든다(E2E 런북 「계약 소유권과 중복 판정」).
3. 조작은 사용자가 보는 이름으로 한다: 역할·라벨(`getByRole`·`getByLabel`), 화면 문구. 좌표·탭 순서·내부 setter·시험 전용
   엔드포인트로 상태를 만들지 않는다. 화면과 대조하는 날짜는 `e2e/helpers/screen-date.ts` 로 만든다.
4. 실패하면 [resilience-debugger](../resilience-debugger/SKILL.md) 순서로 진단한다 — DOM·trace·스크린샷과 백엔드 로그를 서로 대조한다.

## 4. Evidence — 무엇을 증거로 남기나

- 실행한 정확한 명령, 통과·실패 수, 실패면 실패한 단언의 문구.
- 바꾼 동작이 일어난 순간: Playwright trace·스크린샷(`frontend/test-results/`), 필요하면 응답 본문.
- "돌았다"를 확인한다: 목록에 바꾼 spec 의 테스트가 실제로 잡혔는지(`--list` 또는 결과 수). 0건 실행·skip 은 통과가 아니다.
- 보고에는 Doctor 에서 확인한 것과 확인하지 못한 것(예: Docker 미기동으로 실행 못 함)을 나눠 적는다.

## 5. Cleanup

- 실행기가 만든 DB·프로세스는 실행기가 정리한다. 직접 띄운 것만 그 PID 로 끈다 — `node.exe`·`java.exe`·`chrome.exe` 를
  이름으로 일괄 종료하지 않는다(다른 에이전트·IDE 의 프로세스가 함께 죽는다).
- 증거 파일(trace·스크린샷)은 지우지 않는다. 작업 트리 디렉터리는 사용자가 승인했을 때만 지운다(SOP §6.6).

## 하지 않는 것

- dev 스택(8080)이나 공유 DB 로 동작을 확인하지 않는다.
- 실패를 재시도로 덮지 않는다 — 로컬 retries 는 0 이고 결과 계약은 flaky 를 실패로 본다.
- 이 스킬의 실행이 required CI 의 `e2e-test` 를 대신하지 않는다.
