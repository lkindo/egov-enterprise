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
- **Timeout**: CI 환경을 고려하여 120s 이상으로 설정되어 있습니다. (`playwright.config.ts` 참조)

---

## 📊 현재 복구 및 보완된 모듈
- **BBS (게시판)**: POM 기반 리팩토링 및 검색 로직 보정 완료 (`bbs.spec.ts`)
- **Common Code (공통코드)**: 계층 트레이스 및 필드 매핑 보완 (`admin-code.spec.ts`)
- **User Management**: 모킹 기반 테스트 및 실제 DB 클린업 스크립트 확보

---

## 💻 주요 명령어
```bash
npm run test:e2e        # (권장) 전체 E2E 테스트 실행
npm run test:cleanup    # DB 가비지 데이터(user_test_ 접두사 등) 강제 정리
npm run test:e2e:full   # [정리 -> 테스트 -> 다시 정리] 통합 사이클 실행
npm run test:e2e:ui     # 시각적 UI 모드에서 테스트 디버깅
```

---

## 🛠️ 향후 과제
- **Visual Regression**: 주요 대시보드 화면에 대해 스톱샷(Snapshot) 비교 테스트 도입.
- **A11y Testing**: `@axe-core/playwright`를 활용한 웹 접근성 자동화 검증 추가.
- **Load Testing Integration**: 핵심 시나리오에 대한 부하 테스트용 데이터 셋 확장.
