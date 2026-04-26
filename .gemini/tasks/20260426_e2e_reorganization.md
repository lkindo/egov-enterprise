# 🔄 E2E Test Optimization & Reorganization Plan

본 문서는 eGov Enterprise 프로젝트의 E2E 테스트를 정교하고 체계적으로 재구성하기 위한 마스터 플랜이다. 기존 14개 이상의 산발적인 테스트 파일을 핵심 비즈니스 로직 중심으로 통합하고, 중복을 제거하여 유지보수 효율성을 극대화한다.

---

## 1. 현재 문제점 분석 (As-Is)

- **높은 중복도**: `01`, `02` 파일에서 동일한 대시보드 진입 및 권한 확인 반복.
- **취약한 검증 (Soft Checks)**: 단순히 페이지에 특정 단어("사용자", "Board")가 포함되어 있는지만 확인하는 수준의 테스트가 다수 존재.
- **도메인 혼재**: `01-admin` 파일에 통계, 정책, 배너 등 너무 많은 모듈이 포함되어 관리가 어려움.
- **실행 순서 의존성**: 로그인/로그아웃 테스트가 다른 테스트의 세션을 파괴하는 등 격리 문제 발생.

---

## 2. 목표 구조 (To-Be: Tiered Architecture)

테스트를 4가지 계층으로 분리하여 순차적으로 수행한다.

### Tier 1: Core Base (01-auth-dashboard)
- **목표**: 시스템 최소 기동성 확인
- **범위**: 로그인/로그아웃, 대시보드 위젯 로딩, 사이드바 메뉴 매핑.
- **파일명**: `e2e/01-core-base.spec.ts`

### Tier 2: Administrative Core (02-admin-system)
- **목표**: 시스템 관리 기능의 무결성
- **범위**: 사용자(CRUD), 메뉴 계층 관리, 공통코드 관리.
- **파일명**: `e2e/02-admin-system.spec.ts`

### Tier 3: Business Domain (03-board-community)
- **목표**: 핵심 비즈니스(게시판) 로직 검증
- **범위**: 게시판 생성 마법사, 게시글 생명주기(작성-수정-삭제), 다양한 템플릿(Q&A, 일정) 대응.
- **파일명**: `e2e/03-board-community.spec.ts`

### Tier 4: Quality & Resilience (04-quality-resilience)
- **목표**: 비기능적 품질 및 회복력
- **범위**: UX 최적화(자동저장, 낙관적 업데이트), 보안(Rate Limit), 접근성(A11y), 시각적 회귀(Visual).
- **파일명**: `e2e/04-quality-resilience.spec.ts`

---

## 3. 세부 개선 전략

### 3.1 중복 제거 (Deduping)
- `auth.setup.ts`를 활용하여 세션 생성을 일원화하고, 각 테스트 파일에서는 `test.use({ storageState: ... })`만 사용.
- 페이지 진입 및 하이드레이션 대기 로직을 전역 Fixture(`base-test.ts`)로 이관.

### 3.2 정교한 검증 (Hard Assertions)
- `page.content().includes()` 대신 `expect(locator).toHaveText()` 또는 API 응답 가로채기(Intercept)를 통한 데이터 정합성 확인.
- 실제 DB에 데이터가 생성되었는지 상세 페이지 진입을 통해 확인.

### 3.3 안정성 강화
- **ConsoleErrorGuard**: 모든 테스트에서 기본 동작하도록 Fixture에 통합.
- **Auto-Cleanup**: 테스트가 생성한 임시 데이터(테스트용 사용자, 게시글)를 테스트 종료 후 자동으로 삭제하는 `afterAll` 로직 추가.

---

## 4. 단계별 실행 로드맵 (Roadmap)

- [x] **Step 1**: 기존 테스트 통합 분석 및 도메인 맵핑
- [x] **Step 2**: `Tier 1: Core Base` 구현 및 기존 Auth 테스트 통합
- [x] **Step 3**: `Tier 2: Admin System` 구현 (사용자/메뉴/코드 통합)
- [x] **Step 4**: `Tier 3: Board Community` 구현 (마법사 및 게시글 통합)
- [x] **Step 5**: `Tier 4: Quality` 통합 (A11y, Visual, Security)
- [x] **Step 6**: 레거시 테스트 파일 삭제 및 최종 검증

---
*Created by Antigravity on 2026-04-26*
