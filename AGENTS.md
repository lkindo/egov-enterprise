# AGENTS.md — eGov Enterprise 에이전트 운영 브리프

이 저장소는 여러 AI 에이전트(Antigravity/Gemini, Claude Code 등)가 **동일 워킹트리를 공유**한다.
모든 에이전트는 아래 규칙 계층을 최우선으로 준수한다.

## 운영 규칙 (SSOT 계층)
1. **운영 규칙 원본** — [GEMINI.md](GEMINI.md): 등급판정(L0/L1/L2)·헌법 가디언·컴파일 무결성 게이트 등 행동 규율.
2. **태스크 등급 / 오케스트레이션 SSOT** — [docs/03-guides/orchestration-protocol.md](docs/03-guides/orchestration-protocol.md).
3. **코드 법(3대 헌법 — 수정 시 사용자 명시 승인 필수)**:
   - 백엔드: [.agent/knowledge/backend-api-constitution/artifacts/constitution.md](.agent/knowledge/backend-api-constitution/artifacts/constitution.md)
   - 프론트엔드: [.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md](.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)
   - DB: [.agent/knowledge/db-standard-constitution/artifacts/constitution.md](.agent/knowledge/db-standard-constitution/artifacts/constitution.md)
4. **지식(KI)·스킬**: `.agent/knowledge/`, `.agent/skills/`.

## 도구별 진입점
- **Claude Code** → [CLAUDE.md](CLAUDE.md) (위 규칙 상속 + Claude 실행 매핑).
- **Antigravity/Gemini** → `GEMINI.md` 자동 로드.

> **공유 워킹트리 규율**: 커밋은 자기 변경분만 — `git commit --only -- <경로>`. 파일 변경 전 현재 디스크 상태를 직접 조회.
