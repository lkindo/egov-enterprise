---
schema_version: 1
memory_kind: decisions
status: active
authority: adr-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-08-18
verified_against: aa744fd48a232d6bda388094cca6dd2487ef8950
canonical_sources:
  - ../../AGENTS.md
  - ../../docs/02-architecture/decisions/README.md
  - ../../.github/required-checks.json
refresh_triggers:
  - accepted-decision
  - superseding-adr
  - project-rule-change
---

# 공용 결정 인덱스

## 범위와 승격 규칙

제품·아키텍처 결정의 정본은 [ADR 디렉터리](../../docs/02-architecture/decisions/README.md)다. 이 파일은 Accepted ADR과 장기적인 운영 결정을 찾기 위한 인덱스이며 ADR 내용을 복제하거나 바꾸지 않는다. 제안·보류 항목은 결정으로 기록하지 않고 [known-gaps.md](known-gaps.md)에 둔다.

- 허용 상태: `accepted`, `superseded`, `rejected`.
- 기존 결정을 소급 편집하지 않는다. 변경은 후속 ADR/DEC가 `supersedes`로 연결한다.
- 헌법과 `AGENTS.md`의 실질 정책 변경은 사용자 명시 요청이 먼저다.

## Accepted ADR index

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| ADR-0001 | accepted | core/app 제품 경계와 main·release-tag 배포 기준을 분리한다. | 재사용 기반과 제품 구현의 결합을 낮추기 위해서다. | [ADR-0001](../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md) | 2026-08-16 | - |
| ADR-0002 | accepted | UI는 한국어 우선이고 API의 ko/en 메시지 계약은 유지한다. | 사용자 언어 일관성과 재사용 API 호환성을 함께 지키기 위해서다. | [ADR-0002](../../docs/02-architecture/decisions/ADR-0002-korean-first-frontend.md) | 2026-08-16 | - |

## 운영 결정 index

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-001 | accepted | 프로젝트 공통 규칙은 `AGENTS.md` 한 곳에 두고 `GEMINI.md`·`CLAUDE.md`는 자동 탐색용 얇은 어댑터로 유지한다. | 도구별 복제와 글로벌 절 번호 드리프트를 없애면서 네이티브 자동 로드는 보존하기 위해서다. | [AGENTS.md](../../AGENTS.md), [GEMINI.md](../../GEMINI.md), [CLAUDE.md](../../CLAUDE.md) | 2026-08-18 | - |
| DEC-OPS-002 | accepted | 공용 메모리 3종은 규범이 아닌, 근거 링크와 검증일을 가진 파생 인덱스로 운영한다. | Gemini·Claude·Codex 간 지속 지식을 공유하되 두 번째 SSOT와 세션 로그 유출을 만들지 않기 위해서다. | [AGENTS Documentation and memory](../../AGENTS.md#documentation-and-memory) | 2026-08-18 | - |
| DEC-OPS-003 | accepted | 프론트 도구체인은 Node 22+와 pnpm 9를 단일 축으로 사용하고 계약 생성은 offline-first로 한다. | 환경 스큐와 live API 의존형 codegen의 비결정성을 줄이기 위해서다. | [package.json](../../package.json), [frontend/package.json](../../frontend/package.json) | 2026-08-18 | - |
| DEC-OPS-004 | accepted | 로컬 훅은 범위별 빠른 피드백, required CI는 병합 권위로 구분한다. | 문서-only 작업의 비용을 낮추면서 우회 가능한 훅을 최종 통제로 오인하지 않기 위해서다. | [AGENTS Verification](../../AGENTS.md#verification-by-change-scope), [.github/required-checks.json](../../.github/required-checks.json) | 2026-08-18 | - |
| DEC-OPS-005 | accepted | `migration-tool`은 온라인 런타임에 포함하지 않는 독립·선택형 offline ETL이다. | 재사용 런타임 DAG와 일회성 레거시 이관 책임을 분리하기 위해서다. | [README.md](../../README.md), [migration-tool/build.gradle](../../migration-tool/build.gradle) | 2026-08-18 | - |

## 기록 템플릿

새 결정은 `ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes`를 모두 채운다. 아키텍처·제품 경계를 바꾸면 먼저 ADR을 만들고 이 표에는 한 줄 링크만 추가한다.

