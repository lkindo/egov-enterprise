# GEMINI.md — eGov Enterprise Gemini 어댑터

> 이 파일은 Gemini/Antigravity의 자동 탐색을 위한 **얇은 어댑터**다.
> 프로젝트 공통 규칙 원본은 [AGENTS.md](AGENTS.md)이며, 여기에는 같은 규칙을 복제하지 않는다.

@./AGENTS.md
@./.agent/memory/project-context.md
@./.agent/memory/decisions.md
@./.agent/memory/known-gaps.md

## 상속

- Gemini 런타임이 사용자 글로벌 `~/.gemini/GEMINI.md`를 먼저 로드한다. 사용자 홈 절대경로나 글로벌 문서의 절 번호를 저장소에 고정하지 않는다.
- 이 어댑터는 글로벌 기본 규칙 위에 `AGENTS.md`의 프로젝트 규칙과 공용 메모리를 연결한다.
- 글로벌·플랫폼 규칙과 프로젝트 규칙이 충돌하면 상위 규칙을 따르고, 조용히 임의 해석하지 말고 충돌과 영향을 보고한다.

## Gemini 실행 어댑터

- 작업에 정확히 맞는 `.agent/skills/` 또는 사용 가능한 네이티브 스킬만 선택한다. 스킬 전수 탐색이나 이름만 맞춘 강제 호출은 하지 않는다.
- 스킬이 헌법·`AGENTS.md`·현재 구현과 충돌하면 스킬을 적용하지 말고 상위 원본과 실제 증거를 따른다.
- `.gemini/tasks/`는 과거 작업 근거로만 사용한다. 지속 가능한 현재 사실·결정·gap은 공용 메모리 규칙에 따라 선별 승격한다.
- 프로젝트 정책은 `AGENTS.md`에서만 바꾼다. 이 파일은 import 경로나 Gemini 전용 실행 매핑이 달라질 때만 함께 갱신한다.

