# CLAUDE.md — eGov Enterprise Claude Code 어댑터

> 이 파일은 Claude Code의 자동 탐색을 위한 **얇은 어댑터**다.
> 프로젝트 공통 규칙 원본은 [AGENTS.md](AGENTS.md)이며, 여기에는 같은 규칙을 복제하지 않는다.

@AGENTS.md
@.agent/memory/project-context.md
@.agent/memory/decisions.md
@.agent/memory/known-gaps.md

## Claude 실행 어댑터

- `AGENTS.md`가 요구하는 작업 등급·헌법·검증은 [오케스트레이션 프로토콜](docs/03-guides/orchestration-protocol.md)과 현재 도구에 맞춰 수행한다.
- 작업 브랜치의 승인 범위와 마무리는 [AGENTS.md 공유 워킹트리와 Git](AGENTS.md#공유-워킹트리와-git)에 연결한다.
- 저장소 스킬은 `.claude/skills/` 안내 파일로 Skill 도구에 노출되며 정본은 `.agent/skills/`다(AGENTS.md 「도구별 진입점」). 안내 파일이 가리키는 정본 `SKILL.md`를 읽고 따르며, 쓸 수 없으면 같은 목적의 코드 조회·검사·테스트로 대체하고 그 사실을 숨기지 않는다.
- 셸 명령은 `.claude/settings.json`의 PreToolUse 가드(scripts/agent-guard.mjs)를 거친다. 막히면 돌려받은 이유와 대신 쓸 방법을 따르고, 우회하지 않는다.
- Windows에서는 PowerShell을 기본으로 하되 저장소 스크립트의 셸 요구사항을 따른다. 패키지 매니저는 루트 스크립트는 npm, `frontend`는 pnpm이다(프로젝트 컨텍스트 CTX-003).
- 프로젝트 정책은 `AGENTS.md`에서만 바꾼다. 이 파일은 import 경로나 Claude 전용 실행 매핑이 달라질 때만 함께 갱신한다.
