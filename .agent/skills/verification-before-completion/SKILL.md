---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# 완료를 말하기 전에 증거를 낸다

"끝났다·고쳤다·통과한다"고 말하기 전, 커밋이나 PR 을 만들기 전에 쓴다. 상류 스킬의 범용 문구는 걷고 이 저장소에서 무엇이 증거인지만 남겼다.

**상위 권위:** [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) 와 [오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md)(§2.3 감사 귀속, §2.4 실패 복구, Stage 4 「필수 증거」, §6 시간 예산). 이 스킬과 어긋나면 그쪽을 따르고 어긋난 점을 보고한다.

## 무엇이 증거인가

- 바꾼 범위의 최소 검증은 AGENTS 의 표가 정한다. 도메인별 증거 유형은 프로토콜 Stage 4 §4.1 의 표다.
- 실행한 명령의 출력과 종료 코드가 증거다. 실행하지 않은 검증을 실행했다고 쓰지 않는다 — 못 한 것은 이유와 영향 범위를 적는다.
- 게이트·계약을 새로 만들거나 고쳤으면 초록만으로 부족하다. 의도적 위반을 넣어 그 사유로 붉어지는 것까지 본다(AGENTS H5).
- 단위 시험 프로파일(H2, `create`)의 초록은 물리 스키마의 증거가 아니다. 엔티티·DDL 을 바꿨으면 `:api-server:schemaValidationTest` 다.
- pre-push 에는 E2E 가 없다. 화면을 바꾼 작업은 required CI 의 E2E 결과를 직접 확인한 뒤에 완료를 말한다.
- 하위 에이전트·워크플로의 "통과" 보고는 증거가 아니다. 메인이 diff 를 읽고 게이트를 다시 돌린다(§2.3).

## 흔한 거짓 통과

- 태그가 붙은 하네스 시험을 기본 `test` 태스크로 고르면 0건이 통과로 끝난다 — `:api-server:harnessTest` 로 돌리고 결과 XML 의 건수를 본다(실행 전 가드가 이 실수를 막는다).
- Gradle 이 입력이 아니라고 보는 파일(원장·다른 소스)을 바꾼 뒤의 재실행은 `UP-TO-DATE` 로 건너뛸 수 있다 — 붉음 증명에는 태스크 뒤에 `--rerun` 을 붙인다.
- 다른 무거운 실행과 겹친 결과는 붉든 초록이든 증거로 쓰지 않는다. 단독으로 다시 돌린다(§6.3).

## 겹치지 않게

pre-push 가 곧 돌릴 묶음 전체를 같은 커밋에서 미리 돌리지 않는다. 대신 훅이 보지 않는 검사 가운데 변경이 요구하는 것을 고른다(§6.2). 작업 브랜치는 push 뒤 `npm run verify:post-push` 가 운영 계약을 돌고, 병합 판정은 `node scripts/pr-checks-wait.mjs` 가 한다.
