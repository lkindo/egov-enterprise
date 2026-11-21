---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# 같은 세션에서 나눠 맡겨 실행한다

계획의 독립된 일을 하위 에이전트에 맡기고, 메인이 결과를 직접 읽고 검증한다. 상류 스킬의 범용 예시는 걷고 이 저장소의 규칙만 남겼다.

**상위 권위:** [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) 와 [오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md)(§2.2 위임 패킷, §2.3 감사 귀속, §2.4 실패 복구, §6 시간 예산). 이 스킬과 어긋나면 그쪽을 따르고 어긋난 점을 보고한다.

## 진행

1. 계획과 현재 디스크 상태를 읽는다. 구현을 맡길 때마다 프로토콜 §2.2 의 위임 패킷(TASK·CONSTITUTION·FILE MAP·CONSTRAINTS·DONE CRITERIA), 고칠 파일의 소유, 허용하는 검사를 준다. 아래 템플릿 앞에 이 다섯 항목을 붙인다. 인가·개인정보(H3)·물리 스키마(H1)·식별자 축·게이트 의미를 바꾸는 일은 DONE CRITERIA 에 사용자 원문 요청과, 그 기준의 수용 결과·금지 결과(예: "소유자가 아닌 관리자는 거부한다")를 1~3줄로 함께 적는다 — 계획의 재진술만 넘기면 원문의 조건이 빠진다.
2. 서로 고치는 파일이 겹치지 않는 일만 함께 맡긴다. 하위 에이전트는 영향 시험과 가벼운 정적 검사만 돌리고, 무거운 검증은 통합한 뒤 메인이 하나씩 돌린다(§6.3).
3. 메인이 현재 diff 를 읽고 요구사항을 대조한 뒤 해당 게이트를 직접 다시 돌린다(§2.3). 하위 에이전트의 "통과" 보고는 완료 증거가 아니다.
4. 추가 검토자(명세·코드 품질)는 구체적인 위험이나 풀리지 않은 우려가 있을 때 둔다. 일마다 정해진 횟수로 두는 것이 아니다. 의미를 바꾸는 변경(H3·H1·식별자 축·게이트 의미)은 병합 전에 독립 검토를 한 번 둔다 — [requesting-code-review](../requesting-code-review/SKILL.md).
5. 지적은 고치고 해당 동작을 다시 확인한다. 같은 원인의 실패는 첫 실패를 포함해 세 번에서 멈추고 보고한다(§2.4). 승인된 범위 안에서는 메인이 직접 고치거나 다른 에이전트로 바꿔도 된다.
6. 묶음을 통합하고 §6 이 요구하는 범위 검증을 한 뒤, 증거와 남은 한계를 보고한다. 검토자의 승인만으로는 완료가 아니다.

## 커밋

커밋은 사용자 요청 범위에서 맡은 변경만 `git commit --only -- <paths>` 로 한다. 그 경로에 다른 작업의 변경이 섞여 있으면 멈추고 보고한다(AGENTS.md 「공유 워킹트리와 Git」).

## 템플릿

- [implementer-prompt.md](implementer-prompt.md) — 구현을 맡길 때
- [spec-reviewer-prompt.md](spec-reviewer-prompt.md) — 요구사항 준수 검토(프로토콜 §2.3 이 가리킨다)
- [code-quality-reviewer-prompt.md](code-quality-reviewer-prompt.md) — 코드 품질 검토

끝나면 [finishing-a-development-branch](../finishing-a-development-branch/SKILL.md)로 마무리한다.
