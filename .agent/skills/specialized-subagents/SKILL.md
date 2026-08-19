---
name: specialized-subagents
description: "DEPRECATED: 정적 persona 파일 대신 현재 에이전트 런타임의 bounded subtask 위임과 AGENTS.md를 사용한다."
---

# Specialized Subagents — Deprecated

이 패키지는 과거의 정적 persona prompt 모음이다. 현재는 에이전트 런타임이 bounded subtask를 직접 위임하고 각 에이전트가 `AGENTS.md`, 관련 헌법과 필요한 스킬을 읽는다. 이 파일의 하위 persona에는 낡은 버전·수치·DB 타입 지시가 남아 있으므로 새 작업에 로드하지 않는다.

## 현재 위임 원칙

1. 독립적으로 검증 가능한 구체적 하위 작업만 위임한다.
2. 역할 이름 대신 대상 경로, 산출물, 수정 권한, 검증 기준을 prompt에 적는다.
3. DB·백엔드·프런트 작업은 각각 관련 헌법을 직접 읽게 한다.
4. 공유 워킹트리에서 다른 변경을 덮어쓰지 않고 결과를 주 에이전트가 재검증한다.

## 수명주기

`backend-subagent.md`, `db-subagent.md`, `frontend-subagent.md`, `security-subagent.md`, `test-subagent.md`는 현재 런타임에서 소비되는 근거가 없고 현행 규칙과 충돌한다. 삭제 전 소비자가 없음을 다시 확인한 뒤 이 디렉터리 전체를 제거하는 후보로 관리한다.
