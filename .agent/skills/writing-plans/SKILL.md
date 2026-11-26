---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# 여러 단계 작업의 계획

요구사항이 정해진 여러 단계 작업을 코드에 손대기 전에 계획할 때 쓴다. 상류 스킬의 범용 서식은 걷고 이 저장소의 규칙만 남겼다.

**상위 권위:** [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) 와 [오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md)(§2 등급, §3 Stage 1 승인, §4 Task Specification, §6 시간 예산). 이 스킬과 어긋나면 그쪽을 따르고 어긋난 점을 보고한다.

## 계획에 담을 것

- **등급과 범위.** 프로토콜 §4 의 TASK PROPOSAL 형식(TARGET·SCOPE·PROPOSED MODE·CONSTITUTION)으로 적는다. 설계 문서를 두고 구현 전에 검토하는 작업은 다섯째 칸 DESIGN BRIEF 도 채우고 §7 을 따른다. 이미 승인된 작업은 등급·SCOPE 한 줄이면 된다.
- **읽을 것.** 자동 로드된 [decisions.md](../../memory/decisions.md)(`Do-Not-Break` 체크리스트 포함)·[known-gaps.md](../../memory/known-gaps.md), 관련 헌법 조항 및 관련 [ADR 목록](../../../docs/02-architecture/decisions/README.md)·[보관 원문](../../../docs/archived/operational-decisions-history.md).
- **단계마다의 검증.** 그 단계가 바꾸는 범위의 최소 검증(AGENTS 표)과 영향 시험(`node scripts/impact-tests.mjs --diff origin/main`). 게이트·계약을 바꾸는 단계는 의도적 위반이 붉어지는 증명을 함께 적는다(AGENTS H5).
- **승인이 필요한 지점.** 스키마·데이터·인가·운영 적용·외부 전송처럼 포괄 승인으로 넘을 수 없는 단계를 따로 표시한다.
- **PR 묶음.** 응집된 배치는 PR 하나로 묶고, 넓은 로컬 검증은 푸시 직전에 한 번 둔다(프로토콜 §6.1·§6.2).

## 계획을 둘 곳

- 작업 계획은 대화, PR 설명, 저장소 밖 임시 파일에 둔다. `docs/plans/` 는 없다.
- 오래 남길 설계만 `docs/01-product`·`02-architecture`·`03-guides`·`04-operations` 의 kebab-case 문서로 올리고 [문서 인덱스](../../../docs/README.md)를 갱신한다.
- 세션 계획·TODO·진행률은 `.agent/memory` 에 넣지 않는다(AGENTS.md 「Documentation and memory」).

## 커밋과 실행

- 계획의 "커밋" 단계는 확인 지점이지 권한이 아니다. 커밋은 사용자 요청 범위에서 자기 경로만 `git commit --only -- <paths>` 로 하고, 그 경로에 다른 작업의 변경이 섞여 있으면 멈추고 보고한다(AGENTS.md 「공유 워킹트리와 Git」).
- 실행은 같은 세션에서 직접 하거나 [subagent-driven-development](../subagent-driven-development/SKILL.md)로 위임한다. 사용자가 따로 세션을 나눠 확인 지점을 두자고 했을 때만 [executing-plans](../executing-plans/SKILL.md)를 쓴다.
