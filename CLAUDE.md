# CLAUDE.md — eGov Enterprise Claude Code 어댑터

> 이 파일은 Claude Code의 자동 탐색을 위한 **얇은 어댑터**다.
> 프로젝트 공통 규칙 원본은 [AGENTS.md](AGENTS.md)이며, 여기에는 같은 규칙을 복제하지 않는다.

@AGENTS.md
@.agent/memory/project-context.md
@.agent/memory/decisions.md
@.agent/memory/known-gaps.md

## Claude 실행 어댑터

- `AGENTS.md`가 요구하는 작업 등급·헌법·검증은 [오케스트레이션 프로토콜](docs/03-guides/orchestration-protocol.md)과 현재 도구에 맞춰 수행한다.
- `.agent/skills/`의 지시를 직접 사용할 수 있으면 해당 `SKILL.md`를 읽고, 사용할 수 없으면 같은 목적의 코드 조회·검사·테스트로 대체한다. 대체 사실을 숨기지 않는다.
- Windows에서는 PowerShell을 기본으로 하되 저장소 스크립트의 셸 요구사항을 따른다. 패키지 매니저는 프로젝트 컨텍스트에 명시된 `pnpm` 축을 사용한다.
- 프로젝트 정책은 `AGENTS.md`에서만 바꾼다. 이 파일은 import 경로나 Claude 전용 실행 매핑이 달라질 때만 함께 갱신한다.
