# 문서 인덱스 (Documentation Index)

이 파일은 `docs/` 전체의 **단일 진입점**이다. 현행 정본과 비정본 역사 자료를 분리해 표시하며, 저장소에 남아 있는 문서는 여기서 도달할 수 있어야 한다.

> **분류 규칙**([AGENTS.md](../AGENTS.md#documentation-and-memory)): `01-product/`(기획) · `02-architecture/`(설계) · `03-guides/`(개발 지침) · `04-operations/`(운영) · `archived/`(구버전 보관). 파일명은 **`kebab-case.md`**. 새 문서를 추가하면 **이 인덱스에도 한 줄 추가**한다.

---

## 🧭 어디부터 읽나

| 상황 | 문서 |
|---|---|
| 이 프레임워크로 **새 프로젝트를 시작**한다 | [getting-started.md](03-guides/getting-started.md) — 온보딩 런북 |
| **에이전트로 작업**한다(작업 등급·승인·검증 절차) | [orchestration-protocol.md](03-guides/orchestration-protocol.md) — SOP |
| **테스트를 쓴다** | [testing-guide.md](03-guides/testing-guide.md) (SSOT) → [e2e-test-guide.md](03-guides/e2e-test-guide.md) |
| **게이트가 red 인데 원인을 모른다** | [verification-blindspots.md](04-operations/verification-blindspots.md) · [.githooks/README.md](../.githooks/README.md) |
| **DB 객체를 설계**한다 | [db-standardization-manual.md](03-guides/db-standardization-manual.md) → [DB 헌법](../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) |

> **규범의 SSOT 는 `docs/` 가 아니다.** 프로젝트 공통 규칙은 [AGENTS.md](../AGENTS.md), 코드 규범은 3대 헌법([백엔드](../.agent/knowledge/backend-api-constitution/artifacts/constitution.md) 18조 · [프론트엔드](../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) 17조 · [DB](../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) 10조)이 우선하며, `docs/` 는 이를 실무에 적용하는 가이드다.

> **에이전트 규칙 로드 경계**: 저장소의 `GEMINI.md`·`CLAUDE.md`는 `AGENTS.md`와 공용 메모리를 연결하는 얇은 어댑터이고 Codex 등 AGENTS 지원 도구는 `AGENTS.md`를 직접 읽는다. 사용자 글로벌 규칙은 저장소 밖의 도구별 네이티브 진입점에서 독립적으로 로드된다. 한 환경에서 내용이 같더라도 도구 간 런타임 import/자동 상속을 뜻하지 않으며, 다른 PC나 사용자는 각 진입점을 별도로 프로비저닝·검증해야 한다.

---

## 01-product — 기획

[01-product/README.md](01-product/README.md) — 현행 제품 정의의 상태와 이력 원본 위치.

[ui-ux-modernization-brief.md](01-product/ui-ux-modernization-brief.md) — 참조 구현·재사용 base의 adopter/end-user 분리 제품 brief와 사용자 연구 protocol(승인 전 Draft).

[information-architecture.md](01-product/information-architecture.md) — ADR-0004의 hybrid 잠정 방향, 119 route disposition, 로그 URL allowlist와 별도 전역 URL 후속 결정, 연구·최종 승인 계약(`PD-UX-001/002`는 계속 blocked-input).

## 02-architecture — 설계

| 문서 | 내용 |
|---|---|
| [backend-architecture.md](02-architecture/backend-architecture.md) | Backend Architecture Blueprint — 멀티모듈 구조·레이어 |
| [frontend-architecture.md](02-architecture/frontend-architecture.md) | Frontend Architecture (Next.js App Router 기준) |
| [frontend-design-system.md](02-architecture/frontend-design-system.md) | Design System |
| [krds-profile-mapping.md](02-architecture/krds-profile-mapping.md) | KRDS 공식 자산과 standard/aligned/premium 프로필의 채택·조정·보류 매핑(승인 전 Draft) |
| [ui-ux-modernization-plan.md](02-architecture/ui-ux-modernization-plan.md) | Claude 원안의 적대적 재검토와 사용자 과업 중심 UI/UX 전면 현대화 실행 계획 |
| [erp-transformation-master-plan.html](02-architecture/erp-transformation-master-plan.html) | 공통 프레임워크 × ERP·공공 업무시스템 전환 6단계 마스터플랜(2026-08-23, 결정 D1~D10 포함) |
| [work-screen-grammar-catalog.md](02-architecture/work-screen-grammar-catalog.md) | 포털형→업무형 전환의 화면 문법 SSOT — 공통 규칙 G1~G15·archetype 8종·밀도 계약(globals.css 결속) |
| [domain-resilience.md](02-architecture/domain-resilience.md) | 도메인 보안 및 회복탄력성 |
| [jpa-performance-guardrail.md](02-architecture/jpa-performance-guardrail.md) | JPA N+1 쿼리 가드레일 |
| [zero-downtime-migration.md](02-architecture/zero-downtime-migration.md) | 무중단 배포 4단계 이행 및 DDL 린터 |
| [user-reference-key-policy.md](02-architecture/user-reference-key-policy.md) | 사용자 참조 키 규약 |
| [db-naming-exceptions.md](02-architecture/db-naming-exceptions.md) | DB 명명 표준 **예외 대장** |
| [legacy-migration-tool-design.md](02-architecture/legacy-migration-tool-design.md) | 레거시 데이터 이관 도구 설계 |
| [pitest-mutation-testing.md](02-architecture/pitest-mutation-testing.md) | PITest 증분 Mutation Testing 연동 설계 |
| [dual-operator-coordination.md](02-architecture/dual-operator-coordination.md) | 레거시 Gemini↔Claude 실시간 조정 설계(구현 보류); 현행 다중 operator 공통 계약은 [AGENTS.md](../AGENTS.md) |

### 02-architecture 참조 보존 tombstone

아래 문서는 적용된 Flyway의 immutable 주석이 특정 절을 참조하므로 최소 근거만 남긴다. 현행 판단에는 대체 정본을 사용한다.

| 문서 | 상태 | 대체 정본 |
|---|---|---|
| [db-standardization-assessment.md](02-architecture/db-standardization-assessment.md) | tombstone 유지 | 적용된 Flyway 주석의 immutable 참조; DB 헌법·예외 대장·live metadata로 대체 |
| [a-group-decision-recommendations.md](02-architecture/a-group-decision-recommendations.md) | tombstone 유지 | 적용된 `V2_32` 주석의 immutable 참조; [pending-decisions.md](04-operations/pending-decisions.md)로 대체 |

### 02-architecture/decisions — ADR

| 문서 | 내용 |
|---|---|
| [decisions/README.md](02-architecture/decisions/README.md) | ADR 목록·작성 규약 |
| [ADR-0001](02-architecture/decisions/ADR-0001-core-app-product-boundary.md) | 코어/앱 제품 경계와 배포 기준 |
| [ADR-0002](02-architecture/decisions/ADR-0002-korean-first-frontend.md) | 한국어 우선 프런트엔드와 API 메시지 범위 |
| [ADR-0003](02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md) | 사용자 과업 중심 UX·브랜드 프로필·접근성·데이터 소유권 원칙 |
| [ADR-0004](02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md) | 하이브리드 정보구조를 검증용 잠정 방향으로 채택 |
| [ADR-0005](02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md) | UI 품질 증거를 버전형 compact summary와 tracked index로 보존 |
| [ADR-0006](02-architecture/decisions/ADR-0006-css-only-responsive-table.md) | 반응형 표현은 단일 SSR DOM 위에서 CSS로만 전환 |
| [ADR-0007](02-architecture/decisions/ADR-0007-reference-default-ia-approval.md) | 하이브리드 IA를 참조-기본 IA로 승인, 증거 요건은 채택 시점 재검증으로 이전 |

## 03-guides — 개발 지침

| 문서 | 내용 |
|---|---|
| [getting-started.md](03-guides/getting-started.md) | **온보딩 런북** — 새 프로젝트 시작 |
| [orchestration-protocol.md](03-guides/orchestration-protocol.md) | **SOP** — 작업 등급·위임·감사·증거 기반 검증 |
| [testing-guide.md](03-guides/testing-guide.md) | **테스트 SSOT** — 단위/통합/E2E 전략 |
| [e2e-test-guide.md](03-guides/e2e-test-guide.md) | E2E 운영 Runbook |
| [non-e2e-verification-guide.md](03-guides/non-e2e-verification-guide.md) | E2E 범위 밖 기능의 정밀 검증 |
| [cicd-pipeline.md](03-guides/cicd-pipeline.md) | CI/CD 파이프라인 |
| [api-documentation-guide.md](03-guides/api-documentation-guide.md) | API 설계·문서화 (OpenAPI) |
| [db-standardization-manual.md](03-guides/db-standardization-manual.md) | DB 표준화·거버넌스 매뉴얼 |
| [identity-model-guide.md](03-guides/identity-model-guide.md) | 정체성 모델 사용 규약 |
| [security-hardening-playbook.md](03-guides/security-hardening-playbook.md) | 보안 강화·인증 플레이북 |
| [cross-cutting-conventions.md](03-guides/cross-cutting-conventions.md) | 횡단관심사 관례 |
| [design-tokens.md](03-guides/design-tokens.md) | 디자인 토큰 & 브랜딩 규약 (+ 색 하드코딩 게이트) |
| [frontend-content-style.md](03-guides/frontend-content-style.md) | 한국어 우선 UI 문구·오류·복구·도메인 용어 계약 |
| [ui-ux-modernization-execution-loop-prompt.md](03-guides/ui-ux-modernization-execution-loop-prompt.md) | UI/UX 현대화 계획을 승인 경계·검증·재개 루프로 끝까지 실행하는 복사형 프롬프트 |
| [reusable-base-guide.md](03-guides/reusable-base-guide.md) | 재사용 Base 생성 가이드 |

## 04-operations — 운영

| 문서 | 내용 |
|---|---|
| [verification-blindspots.md](04-operations/verification-blindspots.md) | **검증 사각지대** — "빌드 성공"과 "실제 작동"의 차이 |
| [pending-decisions.md](04-operations/pending-decisions.md) | 사용자 결정 대기 항목 트래커 |
| [ui-ux-baseline-protocol.md](04-operations/ui-ux-baseline-protocol.md) | 긴급 수리 후·파일럿 전 8개 대표 시나리오 reference baseline·접근성·성능·증거 수집 프로토콜 |
| [ui-quality-assisted-accessibility.md](04-operations/ui-quality-assisted-accessibility.md) | 수동 접근성 평가를 대체하지 않는 keyboard·viewport·forced-colors·reduced-motion 자동 보조 증거 |
| [ui-ux-modernization-user-action-runbook.md](04-operations/ui-ux-modernization-user-action-runbook.md) | 자동화 완료 후 사용자·제품·운영 책임자가 남은 작업을 한 단계씩 검증·승인하는 마감 런북 |
| [crypto-key-rotation.md](04-operations/crypto-key-rotation.md) | 암호화 마스터 키 로테이션·PII 재암호화 런북 |
| [log-retention-policy.md](04-operations/log-retention-policy.md) | 로그 보존기간·개인정보 파기 정책 |
| [database-optimization-guide.md](04-operations/database-optimization-guide.md) | DB 최적화 |
| [performance-optimization-guide.md](04-operations/performance-optimization-guide.md) | 성능 최적화 |
| [load-test-guide.md](04-operations/load-test-guide.md) | k6 부하 테스트 |
| [dependabot-alert-census.md](04-operations/dependabot-alert-census.md) | 의존성 취약점 판정 절차 |
| [url-state-privacy-classification-draft.md](04-operations/url-state-privacy-classification-draft.md) | URL 상태 census 523건의 프라이버시 분류 **초안** — `PD-UX-002` 승인 회의 입력물(승인 아님) |
| [project-safe-deletion-analysis.md](04-operations/project-safe-deletion-analysis.md) | 프레임워크 간접 소비를 포함한 안전 삭제 절차 |
| [adopter-baseline-refreeze.md](04-operations/adopter-baseline-refreeze.md) | 파생 제품(adopter)이 base 채택 후 밀도·브랜드·래칫 기준선을 자기 실측으로 재동결하는 절차 (D10) |

## archived — 구버전 보관

> 아래는 **더 이상 현행이 아니다.** 현행 상태를 판단하는 근거로 쓰지 말 것.

| 문서 | 내용 |
|---|---|
| [PRD.MD](archived/PRD.MD) | 초기 제품 요구의 역사 원본 — 대체 PRD 확정 전 보존 또는 tombstone 축약 |
| [TRD.MD](archived/TRD.MD) | 초기 기술 요구 역사 원본 — PRD와 함께 보존 여부 결정 |

---

## 📌 저장소 밖 주요 문서

| 문서 | 위치 |
|---|---|
| 프로젝트 개요·설치·실행 | [README.md](../README.md) |
| 공통 프로젝트 규칙 SSOT | [AGENTS.md](../AGENTS.md) |
| Gemini 자동 로드 어댑터 | [GEMINI.md](../GEMINI.md) |
| Claude Code 자동 로드 어댑터 | [CLAUDE.md](../CLAUDE.md) |
| 공용 프로젝트 컨텍스트 | [.agent/memory/project-context.md](../.agent/memory/project-context.md) |
| 공용 결정 인덱스 | [.agent/memory/decisions.md](../.agent/memory/decisions.md) |
| 공용 활성 gap 인덱스 | [.agent/memory/known-gaps.md](../.agent/memory/known-gaps.md) |
| 게이트 계층·훅 규약 | [.githooks/README.md](../.githooks/README.md) |
| 3대 헌법 | [.agent/knowledge/](../.agent/knowledge/) |
| Gemini 역사 지원 자산 | [.gemini/tasks/](../.gemini/tasks/) — 활성 세션 저널은 두지 않고 기존 census·archive 지원 자산만 유지 |
