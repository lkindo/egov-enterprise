# CLAUDE.md — eGov Enterprise (Claude Code 진입점)

> 이 저장소는 **Antigravity/Gemini와 Claude Code가 동일한 워킹트리를 공유**하는 이중(dual) operator 환경이다.
> 프로젝트의 **운영 규칙 원본(SSOT)은 [GEMINI.md](GEMINI.md)** 이며, Claude Code도 이를 그대로 상속·준수한다.
> 아래 두 파일을 세션 컨텍스트로 자동 로드한다.

@GEMINI.md
@docs/03-guides/orchestration-protocol.md

---

## Claude Code 어댑터 (Gemini 규칙 → Claude 실행 매핑)

[GEMINI.md](GEMINI.md)는 Antigravity 기준으로 작성되어 있다. Claude Code에서는 다음과 같이 적용한다.

### 1. 코드 법(法) — 변경 전 필수 조회
코드 변경(L1↑) 착수 전, 관련 헌법을 **직접 읽는다**(자동 로드 아님):
- 백엔드 / DTO / Controller → [backend 헌법](.agent/knowledge/backend-api-constitution/artifacts/constitution.md) (18조)
- 프론트엔드 / UI → [frontend 헌법](.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) (17조)
- DB / 스키마 → [DB 헌법](.agent/knowledge/db-standard-constitution/artifacts/constitution.md) (10조)

### 2. 스킬 매핑 (`.agent/skills/` 는 Antigravity 전용 — Claude 미인식)
GEMINI.md가 "강제 가동"하는 스킬을 Claude에서는 아래 동등 행위로 대응한다:

| GEMINI 스킬 | Claude 대응 |
|---|---|
| `gstack-review` | 인라인 설계 3관점 검토(CEO·EM·Paranoid Engineer, 1줄 요약) |
| `api-contract-guardian` | DTO 변경 시 `codegen:verify` + `codegen:verify:zod` 실행, DB→DTO→Zod 일치 확인 |
| `owasp-security-auditor` | `/security-review` |
| `mutation-testing-auditor` | 증분 pitest (CI `mutation-scope`는 `STRICT_MUTATION=true`로 Mutation Score ≥ 75% 하드 게이트, required `mutation-test`가 집계; 로컬 기본 실행은 report-only) |
| `docs-as-code-sync` | 로직/아키텍처 변경 시 관련 docs·Mermaid 갱신 |
| `deep-context-mapper` | 다중 모듈 변경 전 영향 범위 선(先)매핑 |
| (검증 일반) | `/verify`, `/code-review` |

### 3. 실행 환경 델타
- **OS/셸**: Windows 11 + PowerShell(주) / Git Bash(POSIX). 인코딩 UTF-8.
- **응답**: 한국어 + 기술용어 원문 병기 + 말미 **1줄 요약** (글로벌 §1).
- **패키지 매니저**: **pnpm** 표준 — frontend는 `pnpm -C frontend ...`. (npm/pnpm 혼용·이중 lockfile 주의)
- **컴파일 무결성 게이트(§0.6, HARD)**: `./gradlew compileJava compileTestJava` + `npx tsc --noEmit`(frontend). `.githooks/`의 pre-push가 동일 게이트를 기계적으로 강제한다.
- **codegen 현실**: 오프라인 기본은 `pnpm -C frontend codegen:file`(api-docs.json 기반) **+ `codegen:zod`**. `codegen:ts`는 로컬 서버(`:8080`) 기동 필요. ⚠ `api-docs.json`이 stale일 때 임의 재생성 금지 — 원인(백엔드 재빌드 여부)부터 확인.

### 4. 공유 워킹트리 규율 (Gemini와 동시 작업)
- Gemini가 같은 인덱스에서 작업 중일 수 있다. 커밋 시 **`git commit --only -- <경로>`** 로 내 변경분만 커밋하여 타 operator의 WIP 혼입을 차단한다.
- 파일 변경 전 항상 현재 디스크 상태를 **직접 조회**한다(과거 세션 가정 금지, 글로벌 §4).

### 5. 불가침 (수정 시 사용자 명시 승인 필수)
[GEMINI.md](GEMINI.md) 본문과 3대 헌법(`constitution.md`)은 에이전트 단독 수정 금지. 운영성 자산(`docs/`, `.gemini/tasks/`, `README.md` 등)의 생성·갱신은 자율 허용.

---
*이 파일은 Claude Code ↔ Gemini 하네스 정합을 위한 브리지다. 규칙 본문은 GEMINI.md가 SSOT이며 여기서 중복 정의하지 않는다.*
