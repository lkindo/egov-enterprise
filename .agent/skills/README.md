# Agent Skills Index (`.agent/skills/`)

> 본 인덱스는 스킬 디스커버리를 문서화하기 위한 **매니페스트**다. 하네스는 GEMINI.md §0.3의
> **트리거→스킬 표**를 통해 스킬을 판단 기반으로 차용하며, 의무적 전수 스캔은 금지한다
> (GEMINI.md §0.3). 각 스킬의 상세 명세는 해당 디렉토리의 `SKILL.md`를 on-demand로 로드한다.

---

## 1. 프로젝트 네이티브 스킬 (GEMINI.md 트리거 연동)

프로젝트 거버넌스에 직접 연결된 핵심 스킬. GEMINI.md §0.3 트리거 표가 활성 조건의 SSOT다.

| 스킬 | 트리거 (GEMINI.md §0.3) |
|------|------------------------|
| `api-contract-guardian` | BE DTO/Controller 변경 |
| `owasp-security-auditor` | 인증·Spring Security·Next Middleware 변경 |
| `gstack-review` | L1+ 설계 검토 |
| `zero-downtime-migration-planner` | DB 스키마 변경 |
| `deep-context-mapper` | 다중 모듈 구조 변경 (선행 적재) |
| `mutation-testing-auditor` | 테스트(Unit/E2E) 작성·수정 |
| `visual-auditor` | UI/UX 변경 |
| `docs-as-code-sync` | 로직·아키텍처 변경 완료 후 |
| `resilience-debugger` | 빌드·DB 장애 진단 (§8 자가 성찰) |
| `caveman` | L0 간결 보고 |

## 2. 범용 보조 스킬 (미연동 · 문맥상 자율 차용 가능)

GEMINI.md에 트리거로 명시되진 않았으나 보존하는 범용 스킬. 필요 시 문맥 판단으로 차용한다.
프로젝트 고유 오케스트레이션은 `docs/03-guides/orchestration-protocol.md`를 SSOT로 하므로,
아래 계획/서브에이전트 계열 스킬은 참고용이다.

- **리뷰/품질**: `code-review`, `requesting-code-review`, `code-refactoring`, `verification-before-completion`
- **테스트/설계**: `test-driven-development`, `frontend-design`, `db-governance`
- **계획/오케스트레이션(상호 연동 클러스터)**: `brainstorming`, `writing-plans`, `executing-plans`,
  `subagent-driven-development`, `dispatching-parallel-agents`, `specialized-subagents`,
  `using-git-worktrees`, `finishing-a-development-branch`
- **문서**: `doc-coauthoring`

## 3. 정리 이력

- **2026-07-04**: 미로드(깨진) 스킬 및 미참조 범용 업스트림 스킬 8종 제거 — `theme-factory`,
  `web-artifacts-builder`(둘 다 `SKILL.md` 부재로 로드 불가), `docx`, `pdf`, `pptx`, `xlsx`,
  `skill-creator`, `writing-skills`. 34 → 26개. 모두 git 이력에서 복구 가능하며, 삭제 대상이
  남은 스킬에서 참조되지 않음을 사전 검증함.
