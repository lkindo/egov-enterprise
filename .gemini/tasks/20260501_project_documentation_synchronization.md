# 20260501_project_documentation_synchronization.md

## 🎯 목표
프로젝트의 현재 상태(Codebase)를 정밀 분석하여, 모든 기술 문서(`docs/`)를 최신 상태로 현행화한다.

## 📋 단계별 분석 및 현행화 로드맵

### [Phase 1] 기술 스택 및 시스템 아키텍처 (Tech Stack & Architecture)
- **분석 대상**: `build.gradle`, `package.json`, 모듈 구조, DB 스키마.
- **현행화 문서**: `docs/02-architecture/tech-stack.md`, 신규 LLD/TRD (필요 시).
- **활용 스킬**: `graphify`, `filesystem-context`.

### [Phase 2] API 명세 및 백엔드 인터페이스 (API Spec & Backend)
- **분석 대상**: `@Controller`, `@Service`, DTO 구조, OpenAPI Spec.
- **현행화 문서**: `docs/03-guides/api-documentation-guide.md`.
- **활용 스킬**: `graphify`, `systematic-debugging` (경로 분석용).

### [Phase 3] 프론트엔드 컴포넌트 및 허브 구조 (Frontend & Hubs)
- **분석 대상**: `src/app/`, `HubClient` 패턴, 전역 상태 관리.
- **현행화 문서**: 신규 `docs/02-architecture/frontend-architecture.md`.
- **활용 스킬**: `ui-ux-pro-max`, `playwright` (UI 흐름 확인).

### [Phase 4] 테스트 전략 및 품질 관리 (Testing & Quality)
- **분석 대상**: `e2e/` 스펙, JUnit 테스트 커버리지, CI 파이프라인.
- **현행화 문서**: `docs/03-guides/testing-guide.md`, `docs/03-guides/e2e-test-guide.md`.
- **활용 스킬**: `webapp-testing`.

### [Phase 5] 성능 최적화 및 운영 지침 (Performance & Operations)
- **분석 대상**: JVM 옵션, HikariCP 설정, Next.js 최적화 설정.
- **현행화 문서**: `docs/04-operations/` 하위 문서 전체.
- **활용 스킬**: `supabase-postgres-best-practices`.

---

## 🔄 진행 상태 (Checklist)

- [x] **Phase 1: Architecture Analysis**
    - [x] `tech-stack.md` 업데이트 (Next.js 16, React 19 반영)
- [x] **Phase 2: API Analysis**
    - [x] `api-documentation-guide.md` 업데이트 (신규 API 그룹 반영)
- [x] **Phase 3: Frontend Analysis**
    - [x] `frontend-architecture.md` 신규 생성 및 Hub 패턴 문서화
- [x] **Phase 4: Testing Analysis**
    - [x] `e2e-test-guide.md` 업데이트 (16개 Tier 체계 반영)
- [x] **Phase 5: Performance Analysis**
    - [x] `performance-optimization-guide.md` 내부 링크 현행화

---
*Last Updated: 2026-05-01*
