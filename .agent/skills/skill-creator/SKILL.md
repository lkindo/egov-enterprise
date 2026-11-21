---
name: skill-creator
description: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
license: Complete terms in LICENSE.txt
source: anthropics/skills (https://github.com/anthropics/skills, 이 저장소에서 수정함)
---

# 이 저장소에서 스킬 만들기·고치기

스킬을 새로 만들거나 고칠 때 쓴다. 상류의 범용 안내와 패키징 도구는 걷고 이 저장소의 규칙만 남겼다.

## 어디에 쓰나

- 정본은 `.agent/skills/<이름>/SKILL.md` 하나다. 여기에서만 만들고 고친다([AGENTS.md 도구별 진입점](../../../AGENTS.md#도구별-진입점)).
- `.agents/skills/`·`.claude/skills/` 의 안내 파일은 `npm run regen`(`node scripts/agent-skill-adapters.mjs --write`)이 만든다. 손으로 쓰지 않는다. 낡았는지는 `node scripts/regenerate.mjs --check` 가 알린다.
- `.skill` 묶음으로 포장하지 않는다. 스킬 폴더를 그대로 커밋한다.

## 머리말

```yaml
---
name: <폴더 이름과 같은 kebab-case>
description: <언제 이 스킬을 쓰는지 — 세션의 스킬 목록에는 이 문장만 실린다>
---
```

- `name`·`description` 은 필수다. 안내 파일 생성기가 이 둘을 원문 그대로 옮긴다.
- 밖에서 가져와 고친 스킬은 `source`(출처와 "이 저장소에서 수정함")와 `license` 를 적고 라이선스 파일을 폴더에 둔다.
- `description` 은 "무엇을 하는가"보다 "언제 쓰는가"를 적는다. 너무 넓으면(예: 모든 변경) 거의 모든 작업에서 본문이 읽힌다.

## 본문

- 이 저장소에서만 참인 것을 적는다 — 명령, 경로, 원장, 함정. 모델이 이미 아는 범용 절차는 적지 않는다.
- 규칙을 다시 쓰지 않는다. AGENTS.md·오케스트레이션 프로토콜·헌법이 정하는 것은 링크로 가리키고, 어긋나면 그쪽을 따른다고 적는다.
- 명령과 경로는 실제로 있는지 확인하고 적는다. 실행 전 가드가 막는 형태(예: 무거운 실행의 직접 호출)를 안내하지 않는다.
- 원장이 세는 수나 하한 값을 옮겨 적지 않는다 — 원장을 가리킨다.
- 긴 참고 자료는 같은 폴더의 다른 파일로 나누고 본문에서 링크한다.

## 함께 고칠 곳

| 무엇을 했나 | 함께 고칠 곳 |
|---|---|
| 스킬을 더하거나 지웠다 | [배포 분류표](../../../scripts/reusable-source-tree.mjs)의 `SKILL_DISTRIBUTION`(재사용 생성물에 복사할지), `npm run regen` |
| 실행 절차 스킬(검증·위임·완료·검토 등)을 더했다 | [공용 메모리 계약](../../../scripts/shared-memory-contract.test.mjs)의 `workflowSkills` — AGENTS 의 범위별 검증과 프로토콜 링크를 요구한다 |
| 스킬 이름을 바꿨다 | 다른 스킬·문서의 링크, 위 두 곳 |

## 확인

```bash
node scripts/regenerate.mjs --check
node --test scripts/shared-memory-contract.test.mjs scripts/docs-link-integrity.test.mjs
```
