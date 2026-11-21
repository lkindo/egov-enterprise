---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# 독립된 일을 나눠 맡긴다

서로 상태를 나누지 않는 일이 둘 이상일 때 하위 에이전트에 나눠 맡기는 방법이다. 상류 스킬의 범용 예시는 걷고 이 저장소의 규칙만 남겼다.

**상위 권위:** [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) 와 [오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md)(§2.1 직접·위임, §2.2 위임 패킷, §2.3 감사 귀속, §2.4 실패 복구, §6.3 무거운 검증). 이 스킬과 어긋나면 그쪽을 따르고 어긋난 점을 보고한다.

## 맡기기 전에

- 직접 하는 것이 기본이다. 한두 번의 조회로 끝나거나 대상이 이미 분명하면 맡기지 않는다.
- 일마다 고치는 파일이 겹치지 않아야 한다. 같은 파일을 고치는 일은 순서대로 돌린다(프로토콜 §6.6).
- 다중 에이전트 팬아웃은 도구마다 조건이 다르다. Claude Code 의 Workflow 도구는 사용자가 `ultracode` 를 쓰거나 워크플로·다중 에이전트 실행을 직접 요청했을 때만 쓰고, "진행해" 같은 포괄 승인은 그 동의가 아니다(프로토콜 §2.1). 다른 도구는 그 플랫폼의 조건을 따른다.

## 맡길 때 — 위임 패킷

프로토콜 §2.2 의 다섯 항목을 모두 준다. 컨텍스트 없는 위임은 금지다.

```text
## TASK: {Stage 1 TASK PROPOSAL 전문}
## CONSTITUTION: {적용 헌법 조항 요약}
## FILE MAP: {수정/참조 파일 경로 목록}
## CONSTRAINTS: {금지 패턴 및 필수 규칙}
## DONE CRITERIA: {빌드/테스트 통과 기준}
```

- 인가·개인정보(H3)·물리 스키마(H1)·식별자 축·게이트 의미를 바꾸는 일은 사용자 원문 요청과, 그 기준의 수용 결과·금지 결과를 1~3줄로 함께 적는다.
- 하위 에이전트에는 영향 시험과 가벼운 정적 검사만 맡긴다. Gradle 전체 시험·전체 Vitest·`npm run verify`·격리 E2E 같은 무거운 검증은 통합한 뒤 메인이 하나씩 돌린다(§6.3).
- 병렬 에이전트(읽기 전용 검토 포함)가 도는 동안에는 메인도 무거운 검증을 시작하지 않는다 — 부하가 거짓 붉음과 거짓 통과를 함께 만든다.

## 돌아온 뒤

- 하위 에이전트가 "검증 통과"를 보고해도 완료 증거가 아니다. 메인이 현재 diff 를 직접 읽고 해당 게이트를 다시 돌린다(§2.3).
- 붉음·초록 증명, 훅, required CI 는 생략하지 않는다.
- 같은 원인의 실패는 첫 실패를 포함해 세 번에서 멈추고 보고한다(§2.4).
