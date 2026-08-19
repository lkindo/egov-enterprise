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
| [legacy-migration-tool-design.md](02-architecture/legacy-migration-tool-design.md) | 레거시 데이터 이관 도구 설계 |
| [pitest-mutation-testing.md](02-architecture/pitest-mutation-testing.md) | PITest 증분 Mutation Testing 연동 설계 |
| [dual-operator-coordination.md](02-architecture/dual-operator-coordination.md) | 레거시 Gemini↔Claude 실시간 조정 설계(구현 보류); 현행 다중 operator 공통 계약은 [AGENTS.md](../AGENTS.md) |

### 02-architecture 비정본·정리 상태

아래 문서는 시점별 진단이나 완료 이력이 본문을 지배한다. 현행 판단에는 대체 정본을 사용하며, 삭제 전 immutable Flyway 주석 같은 소비 링크를 별도로 처리한다.

| 후보 | 상태 | 대체 정본 |
|---|---|---|
| [framework-reusability-assessment.md](02-architecture/framework-reusability-assessment.md) | 삭제 후보 | [ADR-0001](02-architecture/decisions/ADR-0001-core-app-product-boundary.md), [reusable-base-guide.md](03-guides/reusable-base-guide.md) |
| [quality-score-root-cause-analysis.md](02-architecture/quality-score-root-cause-analysis.md) | 삭제 후보 | 잔여 암호 데이터 census·입력 계약·운영 복구 위험을 [known-gaps.md](../.agent/memory/known-gaps.md)로 이관했으므로 소비 링크 최종 확인 후 제거 |
| [db-standardization-assessment.md](02-architecture/db-standardization-assessment.md) | tombstone 유지 | 적용된 Flyway 주석의 immutable 참조; DB 헌법·예외 대장·live metadata로 대체 |
| [a-group-decision-recommendations.md](02-architecture/a-group-decision-recommendations.md) | tombstone 유지 | 적용된 `V2_32` 주석의 immutable 참조; [pending-decisions.md](04-operations/pending-decisions.md)로 대체 |

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
| [non-e2e-verification-guide.md](03-guides/non-e2e-verification-guide.md) | E2E 범위 밖 기능의 정밀 검증 |
| [cicd-pipeline.md](03-guides/cicd-pipeline.md) | CI/CD 파이프라인 |
| [api-documentation-guide.md](03-guides/api-documentation-guide.md) | API 설계·문서화 (OpenAPI) |
| [db-standardization-manual.md](03-guides/db-standardization-manual.md) | DB 표준화·거버넌스 매뉴얼 |
| [identity-model-guide.md](03-guides/identity-model-guide.md) | 정체성 모델 사용 규약 |
| [security-hardening-playbook.md](03-guides/security-hardening-playbook.md) | 보안 강화·인증 플레이북 |
| [cross-cutting-conventions.md](03-guides/cross-cutting-conventions.md) | 횡단관심사 관례 |
| [design-tokens.md](03-guides/design-tokens.md) | 디자인 토큰 & 브랜딩 규약 (+ 색 하드코딩 게이트) |
| [reusable-base-guide.md](03-guides/reusable-base-guide.md) | 재사용 Base 생성 가이드 |

### 03-guides 정리 후보

| 후보 | 상태 | 대체 정본 |
|---|---|---|
| [tailwind-lint-rules.md](03-guides/tailwind-lint-rules.md) | 삭제 후보 | [design-tokens.md](03-guides/design-tokens.md), `frontend/eslint.config.mjs`, 색상 guard 테스트 |
| [e2e-self-healing-guide.md](03-guides/e2e-self-healing-guide.md) | 삭제 후보 | [e2e-test-guide.md](03-guides/e2e-test-guide.md), 실제 fixture 소스; 현 spec 소비 0건 |

## 04-operations — 운영

| 문서 | 내용 |
|---|---|
| [verification-blindspots.md](04-operations/verification-blindspots.md) | **검증 사각지대** — "빌드 성공"과 "실제 작동"의 차이 |
| [pending-decisions.md](04-operations/pending-decisions.md) | 사용자 결정 대기 항목 트래커 |
| [crypto-key-rotation.md](04-operations/crypto-key-rotation.md) | 암호화 마스터 키 로테이션·PII 재암호화 런북 |
| [log-retention-policy.md](04-operations/log-retention-policy.md) | 로그 보존기간·개인정보 파기 정책 |
| [database-optimization-guide.md](04-operations/database-optimization-guide.md) | DB 최적화 |
| [performance-optimization-guide.md](04-operations/performance-optimization-guide.md) | 성능 최적화 |
| [load-test-guide.md](04-operations/load-test-guide.md) | k6 부하 테스트 |
| [dependabot-alert-census.md](04-operations/dependabot-alert-census.md) | 의존성 취약점 판정 절차 |
| [project-safe-deletion-analysis.md](04-operations/project-safe-deletion-analysis.md) | 프레임워크 간접 소비를 포함한 안전 삭제 절차 |

### 04-operations 비정본·정리 후보

| 후보 | 상태 | 대체 정본·선행조건 |
|---|---|---|
| [wave2-carryover.md](04-operations/wave2-carryover.md) | 이관 후 삭제 후보 | 활성 `TestSecurityConfig` 위험과 source 주석 소비자를 gap/현행 문서로 이관 |
| [k6-load-test-quickstart.md](04-operations/k6-load-test-quickstart.md) | 중복 삭제 후보 | [load-test-guide.md](04-operations/load-test-guide.md) |
| [harness-architecture-guide.html](04-operations/harness-architecture-guide.html) | 삭제 후보 | [Governance & Harness Atlas](../frontend/public/governance_harness_atlas.html), 하네스 소스, required checks |

## archived — 구버전 보관

> 아래는 **더 이상 현행이 아니다.** 현행 상태를 판단하는 근거로 쓰지 말 것.

| 문서 | 내용 |
|---|---|
| [PRD.MD](archived/PRD.MD) | 초기 제품 요구의 역사 원본 — 대체 PRD 확정 전 보존 또는 tombstone 축약 |
| [TRD.MD](archived/TRD.MD) | 초기 기술 요구 역사 원본 — PRD와 함께 보존 여부 결정 |
| [DB_COMPLIANCE_TRACKER.md](archived/DB_COMPLIANCE_TRACKER.md) | 삭제 후보 — 현 DB 헌법·live metadata로 대체됨 |
| [detailed-module-audit.md](archived/detailed-module-audit.md) | 삭제 후보 — 과거 점수·분기 로드맵 |
| [modernization-walkthrough.md](archived/modernization-walkthrough.md) | 삭제 후보 — 과거 UI 완료 보고 |
| [ui-ux-improvement-plan.md](archived/ui-ux-improvement-plan.md) | 삭제 후보 — 구버전 Next.js 완료 체크리스트 |

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
