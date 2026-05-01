# EGOV Enterprise E2E Testing Guide (v2.0)

본 가이드는 전자정부 프레임워크 현대화 프로젝트의 E2E 테스트 안정성 확보 및 효율적인 데이터 관리를 위한 표준 운영 절차를 제공합니다.

---

## 🛡️ 테스트 작성 및 운영 원칙

### 1. 테스트 작성 전략 (Mocking vs Integration)
- **UI/UX 테스트 (권장)**: 브라우저 동작 및 프론트엔드 로직 검증 시 `page.route`를 이용한 **Mocking**을 기본으로 합니다. (`e2e/user-mock.spec.ts` 참조)
  *   *이유*: 속도가 빠르고 실제 DB에 쓰기 작업이 발생하지 않아 데이터 오염이 없습니다.
- **전체 통합 테스트**: 백엔드와 DB 연동까지 반드시 확인해야 하는 핵심 비즈니스 로직에만 선별적으로 적용합니다.

### 2. 데이터 관리 및 명명 규칙 (Naming Convention)
- **Prefix**: 테스트에서 생성하는 데이터(UserId, 제목 등)는 반드시 `user_test_` 또는 `test_` 접두사를 붙여야 합니다.
- **Cleanup**: 테스트가 종료되면 가능한 한 직접 데이터를 삭제(Teardown)하거나, 아래의 클린업 명령어를 통해 가비지 데이터를 정리합니다.

### 3. 구조적 설계 (POM & Fixtures)
- **Page Object Model (POM)**: 모든 페이지 요소와 동작은 `e2e/pages` 폴더의 클래스로 캡슐화하여 유지보수성을 높입니다.
- **Fixtures**: `e2e/fixtures/base-test.ts`를 상속받아 온보딩 투어 우회 및 공통 객체 주입을 자동화합니다.

---

## 🚀 실행 환경 최적화

### 1. 좀비 프로세스 정리
윈도우 환경에서 반복 실행 시 `node.exe`와 `chrome.exe`가 메모리에 남을 수 있습니다. 실행 전 아래 명령어로 정리하십시오.
```powershell
taskkill /F /IM node.exe /T; taskkill /F /IM chrome.exe /T
```

### 2. 서버 포트 및 타임아웃
- 프론트엔드: `http://localhost:3001` / 백엔드: `http://localhost:8080` (API Proxy)
- **Timeout**: CI 환경을 고려하여 120s로 설정되어 있습니다. (`playwright.config.ts` 참조)

### 3. CI 설정 (`playwright.config.ts`)

| 항목 | 로컬 | CI 환경 |
|------|------|---------|
| **Retries** | 1 | 3 (플레이키 테스트 안정화) |
| **Workers** | 자동 (CPU 기반) | 2 |
| **Timeout** | 120,000ms | 120,000ms |
| **Expect Timeout** | 30,000ms | 30,000ms |

---

## 📊 계층형 테스트 구조 (Tiered Architecture)

본 프로젝트는 중복을 제거하고 검증력을 높이기 위해 테스트를 총 **18개 계층(Tier)**으로 세분화하여 운영합니다.

### Core & Admin (Tier 1~2)
- **Tier 1: Core Base**: 인증, 대시보드 위젯, 전역 레이아웃 무결성.
- **Tier 2: Admin System**: 사용자 CRUD, 메뉴 계층, 공통코드 관리.

### Business & Experience (Tier 3~5)
- **Tier 3: Business Domain**: 게시판 생성 마법사, 게시글 생명주기(다중 템플릿).
- **Tier 4: Quality & Resilience**: 보안(RBAC/CSRF), UX(자동저장), 접근성(A11y), 시각적 회귀.
- **Tier 5: Public Experience**: 대국민 포털 연동 및 사용자 경험 검증.

### Ops & Productivity (Tier 6~10)
- **Tier 6: Ops Governance**: 감사 로그, 시스템 모니터링 관리.
- **Tier 7: Productivity Suite**: 개인 일정, 스크랩, 부서 업무함 등 도구 모음.
- **Tier 8~10**: 협업 고도화, 관리자 관측성, 운영 확장 모듈.

### Enterprise Workflow (Tier 11~18)
- **Tier 11: Enterprise Workflow**: 결재 프로세스 및 워크플로우 엔진.
- **Tier 12~13**: 알림 센터, 메일 연동 모듈.
- **Tier 14~16**: 관리자 업무 자동화, 협업 확장, 시스템 가시성 강화.
- **Tier 17: Support & Service Governance**: 온라인 매뉴얼, FAQ 생명주기 관리.
- **Tier 18: Business Extensions**: 비정형 결재(ISM), 간부 일정(LSM), 헬프 콘텐츠(HPCM) 등 확장 비즈니스 모듈.

---

## 💻 주요 명령어

```bash
# 1. 기본 실행 (전체 16 Tier 순차 실행)
npm run test:e2e

# 2. 전체 실행 (클린업 포함: 실행 전/후 가비지 데이터 제거)
npm run test:e2e:full

# 3. 특정 계층(Tier)만 실행
npx playwright test --project=tier-1-core
npx playwright test --project=tier-5-public
npx playwright test --project=tier-17-support
npx playwright test --project=tier-18-business

# 4. 특정 파일만 실행
npx playwright test e2e/01-core-base.spec.ts

# 5. UI 모드에서 대화형 디버깅
npm run test:e2e:ui

# 6. 스텝별 디버그 모드
npm run test:e2e:debug

# 7. 수동 DB 클린업 (테스트 데이터 강제 삭제)
npm run test:cleanup
```

---

## 🛠️ 유지보수 지침
- **POM 활용**: 새로운 페이지 추가 시 `e2e/pages`에 클래스를 정의하고 `fixtures/base-test.ts`에 등록하십시오.
- **자동 클린업**: 테스트 종료 시 `globalTeardown`에 등록된 `cleanup-db.ts`가 가비지 데이터를 자동으로 정리합니다.
- **에러 감시**: `ConsoleErrorGuard`가 모든 테스트에서 자동으로 동작하며, 하이드레이션 오류나 런타임 예외 발생 시 테스트를 즉시 실패 처리합니다.

---
*Last Updated: 2026-05-01 (Updated via Antigravity — Commands & CI Config Synchronized)*
