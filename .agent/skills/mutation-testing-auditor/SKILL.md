---
name: mutation-testing-auditor
description: 테스트 변경이 실제 결함을 탐지하는지 기존 mutation 게이트와 좁은 음성 검증으로 확인한다.
version: 2.0.0
---

# Mutation Testing Auditor

## 원칙

테스트의 강도는 통과 여부가 아니라 잘못된 동작을 실패시키는지로 평가한다. 저장소 백엔드 mutation 정본은 Gradle PIT 설정과 required `mutation-test` workflow이며 CI strict threshold는 현재 75%다. 로컬 기본 실행은 같은 강도를 보장하지 않는다.

## 절차

1. 변경한 테스트가 보호해야 할 조건과 예상 실패를 먼저 적는다.
2. 이미 제공되는 PIT target 또는 해당 모듈의 mutation 명령을 우선 사용한다.
3. 수동 proof가 필요하면 사용자가 승인한 범위의 최소·가역 변경만 적용하고, 대상 파일의 기존 WIP를 확인한다.
4. mutation이 테스트를 실패시키는지 확인한 뒤 즉시 정확히 원복하고 diff로 잔존 변경이 없음을 확인한다.
5. 테스트가 통과하면 assertion 또는 관측 경계를 강화하고 다시 검증한다.

## 금지 사항

- 공유 워킹트리의 소스를 무조건 변조하지 않는다.
- 다른 에이전트의 변경 위에 임시 mutation을 덮어쓰지 않는다.
- threshold나 대상 패키지를 낮춰 green을 만들지 않는다.
- 단일 수동 mutation으로 전체 mutation score 또는 테스트 완전성을 증명했다고 표현하지 않는다.
- CSS selector 이름 변경처럼 테스트 대상의 핵심 논리와 무관한 sabotage를 품질 증거로 사용하지 않는다.

## 보고

대상 계약, 사용한 mutation 방법, 기대한 실패, 실제 결과, 원복 확인, 실행하지 못한 CI-only 경계를 구분해 기록한다.
