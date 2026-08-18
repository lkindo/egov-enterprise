# 문서 인덱스 (Documentation Index)

이 파일은 `docs/` 전체의 **단일 진입점**이다. 저장소의 모든 문서를 여기서 도달할 수 있어야 한다.

> **왜 만들었나**: 종전에는 `docs/` 에 인덱스가 없었고, 문서 지도는 루트 [README.md](../README.md) 의 표 하나뿐이었다. 그 표는 당시 51개 문서 중 약 20개를 누락하고 있었다 — 즉 **문서의 40%가 어떤 인덱스에서도 발견되지 않았다.** 작성된 문서가 발견되지 않으면 없는 것과 같고, 그 상태에서 같은 주제의 문서가 다시 쓰인다.

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

---

## 01-product — 기획

[01-product/README.md](01-product/README.md) — 현행 제품 정의의 상태와 이력 원본 위치.

## 02-architecture — 설계

| 문서 | 내용 |
|---|---|
| [backend-architecture.md](02-architecture/backend-architecture.md) | Backend Architecture Blueprint — 멀티모듈 구조·레이어 |
| [frontend-architecture.md](02-architecture/frontend-architecture.md) | Frontend Architecture (Next.js App Router 기준) |
| [frontend-design-system.md](02-architecture/frontend-design-system.md) | Design System |
| [domain-resilience.md](02-architecture/domain-resilience.md) | 도메인 보안 및 회복탄력성 |
| [jpa-performance-guardrail.md](02-architecture/jpa-performance-guardrail.md) | JPA N+1 쿼리 가드레일 |
| [zero-downtime-migration.md](02-architecture/zero-downtime-migration.md) | 무중단 배포 4단계 이행 및 DDL 린터 |
| [user-reference-key-policy.md](02-architecture/user-reference-key-policy.md) | 사용자 참조 키 규약 |
| [db-naming-exceptions.md](02-architecture/db-naming-exceptions.md) | DB 명명 표준 **예외 대장** |
| [db-standardization-assessment.md](02-architecture/db-standardization-assessment.md) | DB 표준화 수준 종합 진단 |
| [framework-reusability-assessment.md](02-architecture/framework-reusability-assessment.md) | 프레임워크 재사용성·확장성 진단 |
| [legacy-migration-tool-design.md](02-architecture/legacy-migration-tool-design.md) | 레거시 데이터 이관 도구 설계 |
| [pitest-mutation-testing.md](02-architecture/pitest-mutation-testing.md) | PITest 증분 Mutation Testing 연동 설계 |
| [dual-operator-coordination.md](02-architecture/dual-operator-coordination.md) | 이중 Operator(Gemini↔Claude) 조정 계층 |
| [quality-score-root-cause-analysis.md](02-architecture/quality-score-root-cause-analysis.md) | 품질 스코어 근본원인 분석 |
| [a-group-decision-recommendations.md](02-architecture/a-group-decision-recommendations.md) | A그룹 결정 대기 항목 추천안 |

### 02-architecture/decisions — ADR

| 문서 | 내용 |
|---|---|
| [decisions/README.md](02-architecture/decisions/README.md) | ADR 목록·작성 규약 |
| [ADR-0001](02-architecture/decisions/ADR-0001-core-app-product-boundary.md) | 코어/앱 제품 경계와 배포 기준 |
| [ADR-0002](02-architecture/decisions/ADR-0002-korean-first-frontend.md) | 한국어 우선 프런트엔드와 API 메시지 범위 |

## 03-guides — 개발 지침

| 문서 | 내용 |
|---|---|
| [getting-started.md](03-guides/getting-started.md) | **온보딩 런북** — 새 프로젝트 시작 |
| [orchestration-protocol.md](03-guides/orchestration-protocol.md) | **SOP** — 작업 등급·위임·감사·증거 기반 검증 |
| [testing-guide.md](03-guides/testing-guide.md) | **테스트 SSOT** — 단위/통합/E2E 전략 |
| [e2e-test-guide.md](03-guides/e2e-test-guide.md) | E2E 운영 Runbook |
| [e2e-self-healing-guide.md](03-guides/e2e-self-healing-guide.md) | 자가 치유형 E2E 하네스 |
| [non-e2e-verification-guide.md](03-guides/non-e2e-verification-guide.md) | E2E 범위 밖 기능의 정밀 검증 |
| [cicd-pipeline.md](03-guides/cicd-pipeline.md) | CI/CD 파이프라인 |
| [api-documentation-guide.md](03-guides/api-documentation-guide.md) | API 설계·문서화 (OpenAPI) |
| [db-standardization-manual.md](03-guides/db-standardization-manual.md) | DB 표준화·거버넌스 매뉴얼 |
| [identity-model-guide.md](03-guides/identity-model-guide.md) | 정체성 모델 사용 규약 |
| [security-hardening-playbook.md](03-guides/security-hardening-playbook.md) | 보안 강화·인증 플레이북 |
| [cross-cutting-conventions.md](03-guides/cross-cutting-conventions.md) | 횡단관심사 관례 |
| [design-tokens.md](03-guides/design-tokens.md) | 디자인 토큰 & 브랜딩 규약 (+ 색 하드코딩 게이트) |
| [tailwind-lint-rules.md](03-guides/tailwind-lint-rules.md) | Tailwind 4 / HSL 토큰 ESLint 규칙 |
| [reusable-base-guide.md](03-guides/reusable-base-guide.md) | 재사용 Base 생성 가이드 |

## 04-operations — 운영

| 문서 | 내용 |
|---|---|
| [verification-blindspots.md](04-operations/verification-blindspots.md) | **검증 사각지대** — "빌드 성공"과 "실제 작동"의 차이 |
| [pending-decisions.md](04-operations/pending-decisions.md) | 사용자 결정 대기 항목 트래커 |
| [wave2-carryover.md](04-operations/wave2-carryover.md) | Wave 2 이월 과제 |
| [crypto-key-rotation.md](04-operations/crypto-key-rotation.md) | 암호화 마스터 키 로테이션·PII 재암호화 런북 |
| [log-retention-policy.md](04-operations/log-retention-policy.md) | 로그 보존기간·개인정보 파기 정책 |
| [database-optimization-guide.md](04-operations/database-optimization-guide.md) | DB 최적화 |
| [performance-optimization-guide.md](04-operations/performance-optimization-guide.md) | 성능 최적화 |
| [load-test-guide.md](04-operations/load-test-guide.md) | k6 부하 테스트 |
| [k6-load-test-quickstart.md](04-operations/k6-load-test-quickstart.md) | k6 빠른 시작 |
| [dependabot-alert-census.md](04-operations/dependabot-alert-census.md) | Dependabot 취약점 알림 census |
| [project-safe-deletion-analysis.md](04-operations/project-safe-deletion-analysis.md) | 안전 삭제 영향 분석 |
| [harness-architecture-guide.html](04-operations/harness-architecture-guide.html) | 하네스 게이트 아키텍처 (HTML) |

## archived — 구버전 보관

> 아래는 **더 이상 현행이 아니다.** 현행 상태를 판단하는 근거로 쓰지 말 것.

| 문서 | 내용 |
|---|---|
| [PRD.MD](archived/PRD.MD) | 제품 요구사항 정의서 (초기) |
| [TRD.MD](archived/TRD.MD) | 기술 요구사항 정의서 (초기) |
| [DB_COMPLIANCE_TRACKER.md](archived/DB_COMPLIANCE_TRACKER.md) | DB 표준화 최종 리포트 |
| [detailed-module-audit.md](archived/detailed-module-audit.md) | 도메인별 상세 진단 |
| [modernization-walkthrough.md](archived/modernization-walkthrough.md) | UI/UX 현대화 워크스루 |
| [ui-ux-improvement-plan.md](archived/ui-ux-improvement-plan.md) | UI/UX 개선 로드맵 |

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
| 작업 기록 | [.gemini/tasks/](../.gemini/tasks/) |

---
*Last Updated: 2026-08-18 (공통 규칙 SSOT를 AGENTS.md로 단일화하고 Gemini/Claude 어댑터 및 공용 메모리 3종을 연결.)*
