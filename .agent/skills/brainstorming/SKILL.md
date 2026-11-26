---
name: brainstorming
description: "Use when the user asks to explore an idea or a design before implementation, or when the intent is ambiguous enough to change the result. Explores user intent, requirements and design."
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# 설계 전에 의도를 좁힌다

구현 전에 사용자의 의도·요구·설계를 탐색할 때 쓴다. 상류 스킬의 범용 절차는 걷고 이 저장소의 규칙만 남겼다.

**상위 권위:** [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) 와 [오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md)(§3 Stage 1 승인, §7 설계 검토 예산). 이 스킬과 어긋나면 그쪽을 따르고 어긋난 점을 보고한다.

## 언제 묻고 언제 진행하나

- 답에 따라 결과가 달라지는 질문만 한다. 요청이 분명하거나 현재 요청·상시 승인이 그 작업을 덮으면 가정을 밝히고 진행한다.
- 묻기 전에 현재 구현을 읽는다 — 대상 파일, 관련 헌법, 자동 로드된 [decisions.md](../../memory/decisions.md)(`Do-Not-Break` 체크리스트 포함)·[known-gaps.md](../../memory/known-gaps.md) 및 관련 [ADR 목록](../../../docs/02-architecture/decisions/README.md). 이미 결정된 것을 다시 묻지 않는다.
- 선택지를 낼 때는 권고안을 먼저 두고, 각 선택지가 무엇을 바꾸는지 한 줄로 적는다.

## 설계를 남길 곳

- 일회성 설계는 대화나 PR 설명에 둔다. `docs/plans/` 는 없다.
- 오래 남길 설계는 `docs/01-product`·`02-architecture`·`03-guides`·`04-operations` 에 kebab-case 문서로 두고 [문서 인덱스](../../../docs/README.md)를 갱신한다(AGENTS.md 「Documentation and memory」).
- 검토받는 설계 문서는 프로토콜 §7 을 따른다 — 검토 예산, 부정 시험이 딸린 결정 카드. 절마다 승인을 받는 방식이 아니다.
- 시안 확인은 스키마·데이터·인가·IA 처분·운영 적용의 승인이 아니다(프로토콜 §7.2). 그런 변경은 따로 승인받는다.

## 다음 단계

구현으로 넘어갈 때는 프로토콜 §4 의 Task Specification 으로 등급·SCOPE 를 밝힌다. 계획이 여러 단계면 [writing-plans](../writing-plans/SKILL.md)를 본다.
