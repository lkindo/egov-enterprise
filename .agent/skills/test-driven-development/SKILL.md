---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# 시험 먼저

기능이나 버그 수정을 구현하기 전에 쓴다. 실패하는 시험을 먼저 보고, 그 시험을 통과시키는 가장 작은 코드를 쓴 뒤 정리한다. 상류 스킬의 범용 예시와 문구는 걷고 이 저장소에서 필요한 것만 남겼다.

**상위 권위:** [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) 와 [오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md)(§2.3 감사 귀속, §2.4 실패 복구, §6 시간 예산). 이 스킬과 어긋나면 그쪽을 따르고 어긋난 점을 보고한다.

## 순서

1. **붉음.** 바꿀 동작을 단언하는 시험을 먼저 쓰고 돌려, 기대한 사유로 실패하는지 본다. 아무 실패나 붉음이 아니다 — 컴파일 오류나 다른 단언의 실패는 증명이 아니다.
2. **초록.** 그 시험을 통과시키는 가장 작은 변경을 한다.
3. **정리.** 동작을 바꾸지 않고 다듬은 뒤 같은 시험을 다시 돌린다.

붉음·초록을 도는 동안에는 영향 시험만 돌린다. 완료 전에는 바꾼 범위의 최소 검증을 더한다(AGENTS 표). 무거운 검증은 한 번에 하나씩이다(프로토콜 §6.3).

## 어디서 어떻게 돌리나

| 대상 | 영향 시험 |
|---|---|
| 백엔드 단위·서비스 | `./gradlew :<모듈>:test --tests '*<시험 클래스>'`(Windows 는 `.\gradlew.bat`) |
| 하네스·아키텍처 게이트 | `./gradlew :api-server:harnessTest --tests '<클래스>'` — 태그가 붙은 시험을 기본 `test` 로 고르면 0건이 통과로 끝난다 |
| 엔티티·DDL | `./gradlew :api-server:schemaValidationTest`(Docker 필요). H2 의 초록은 물리 스키마의 증거가 아니다 |
| 프런트 | `pnpm -C frontend exec vitest run <시험 파일>` |
| 저장소 스크립트·계약 | `node --test scripts/<파일>.test.mjs` |

루트 `npm test` 는 Gradle 전체 시험이고 TypeScript 파일을 고르지 않는다. 영향 시험은 `node scripts/impact-tests.mjs --diff origin/main` 이 추천한다.

## 이 저장소의 규칙

- 시험을 초록으로 만들려고 약화·삭제·건너뛰기를 하지 않는다. 구현·시험·명세 가운데 무엇이 틀렸는지 증거로 판정한다. `skip`·`only`·`todo` 와 조건부 등록(`if (…) it(…)`)은 게이트가 막는다.
- 게이트·계약을 새로 만들거나 고쳤으면 의도적 위반이 그 사유로 붉어지는 부정 시험까지 둔다(AGENTS H5).
- 인가(H3)·물리 스키마(H1)·식별자 축을 바꾸는 시험은 통과만이 아니라 **거부되어야 할 경우**를 함께 단언한다.
- 원장이 세는 수(operation 수, 메뉴 수 등)를 시험에 옮겨 적지 않는다 — 원장에서 읽는다.
- 날짜·시각은 한국 표준시다. 날짜 경계를 건드리는 시험은 JVM 기본 시간대에 기대지 말고 `ServiceTime` 을 쓴다.

## 예외

이유를 보고나 PR 에 적는다. 새 종류의 예외일 때만 묻는다.

- 저장소 밖의 일회용 시제품.
- 생성물 — 생성기의 검사(`npm run regen -- --check`, codegen verify)로 확인한다.
- 실행·인가·게이트에 영향이 없는 설정(형식, 주석, 편집기 설정). 동작을 바꾸는 설정(권한 원장, `application*.yml` 의 한도·보안 값, edge·배포 설정, 게이트 원장)은 예외가 아니다.
