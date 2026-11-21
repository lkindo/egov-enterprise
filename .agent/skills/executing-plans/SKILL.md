---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# 적어 둔 계획을 따로 실행한다

사용자가 세션을 나눠 확인 지점을 두고 계획을 실행하자고 했을 때 쓴다. 같은 세션에서 바로 실행하는 것이 기본이고 이 스킬은 그 예외다.

**상위 권위:** [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) 와 [오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md)(§3 Stage 1 승인, §2.3 감사, §2.4 실패 복구, §6 시간 예산). 이 스킬과 어긋나면 그쪽을 따르고 어긋난 점을 보고한다.

## 진행

1. 계획과 현재 디스크 상태(`git status`, 대상 파일)를 다시 읽는다. 계획이 낡았거나 현재 코드와 어긋나면 그 점을 먼저 알린다.
2. 묶음 단위로 실행한다. 현재 요청이나 상시 승인이 그 작업을 덮으면 묶음 경계에서 보고하고 계속 간다 — 새 권한이나 사용자 결정이 필요할 때만 기다린다.
3. 묶음마다 영향 시험을 돌리고, 넓은 검증은 푸시 직전에 한 번 한다(프로토콜 §6.2). 무거운 검증은 한 번에 하나씩이다(§6.3).
4. 실패는 원인 가설 → 표적 증거 → 최소 수정 → 재검증 순으로 고친다. 같은 원인으로 세 번 실패하면 멈추고 증거와 선택지를 보고한다(§2.4).
5. 끝나면 [finishing-a-development-branch](../finishing-a-development-branch/SKILL.md)로 마무리한다.

## 보고에 담을 것

- 실행한 검증과 그 결과, 실행하지 못한 검증과 이유.
- 계획에서 벗어난 점과 그 까닭.
- 남은 승인 지점(스키마·데이터·인가·운영 적용·외부 전송).
