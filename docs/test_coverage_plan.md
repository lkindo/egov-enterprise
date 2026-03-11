# 🧪 테스트 커버리지 강화 및 최적화 계획 (EGov-Enterprise)

현재 프로젝트의 테스트 커버리지(약 11%)를 체계적으로 향상시키고, 고품질의 엔터프라이즈 애플리케이션 유지를 위한 상세 실행 계획입니다.

---

## 🏗️ 현재 환경 분석 (Analysis)

### 1. 백엔드 (Backend - Java/Spring)
- **Stack:** Java 21, Spring Boot 3.4.1, Gradle 8.x
- **Test:** JUnit 5, Mockito
- **Coverage:** JaCoCo (0.8.12) - **현재 11% (Instruction 기준)**
- **특이사항:** `api-server`, `common-core`, `module-*` 형태의 멀티 모듈 구조. `subprojects` 단위로 JaCoCo 설정이 통합되어 있음.

### 2. 프론트엔드 (Frontend - Next.js)
- **Stack:** Next.js 15, TypeScript 5, React 19
- **Test:** Vitest, Testing Library, Playwright (E2E)
- **Coverage:** Vitest `@vitest/coverage-v8`
- **특이사항:** `frontend` 디렉토리에 독립적으로 존재하며, 백엔드와 OpenAPI(Swagger) 기반의 타입 생성을 연동 중.

---

## 🎯 목표 (Objectives)

| 단계 | 목표 기간 | 백엔드 목표 | 프론트엔드 목표 | 주요 전략 | 상태 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1단계** | 4주 이내 | **30%** | **20%** | 보안/공통 모듈 및 핵심 서비스 로직 확보 | 진행 중 🔄 |
| **2단계** | 8주 이내 | **50%** | **40%** | 주요 도메인 엔티티 및 API 컨트롤러 검증 | 진행 중 🔄 |
| **3단계** | 12주 이내 | **70%** | **60%** | 예외 케이스(Corner Case) 및 통합 테스트 | 대기 중 ⏳ |
| **4단계** | 상시 유지 | **80%+** | **70%+** | CI/CD 파이프라인 연동 및 빌드 가드레일 설정 | 대기 중 ⏳ |

---

## ✅ 최근 진행 상황 (Recent Progress)

### 🗓️ 2026-03-10
- **백엔드 (Unit Tests):**
    - `MenuService`: 메뉴 계층 구조 조회, 등록, 수정, 삭제 로직 검증 완료. (커버리지 확보)
    - `BoardService`: 게시판 핵심 CRUD 및 예외 케이스 검증 완료.
    - `CommentService`: 댓글 등록, 수정, 삭제 및 이벤트 발행 로직 검증 완료.
- **프론트엔드 (Unit Tests):**
    - `CommentSection`: 댓글 목록 렌더링, 등록, 수정, 삭제 UI 인터랙션 검증.
    - `MenuAdminClient`: 메뉴 관리 트리 구조, 모달 팝업, 삭제 연동 테스트 완료.
- **인프라:**
    - JaCoCo 멀티 모듈 통합 리포트(`jacocoRootReport`) 생성 및 검증 완료.
    - Vitest 환경 하의 프론트엔드 유닛 테스트 환경 안정화.

---

## 🚀 상세 실행 로드맵 (Roadmap)

### Phase 1: 기반 인프라 및 핵심 보안 (우선순위: 매우 높음)
- **백엔드:**
    - `common-security` 모듈 내 JWT 발급, 검증, 권한 필터 로직 커버리지 90% 이상 확보.
    - `common-core`의 유틸리티 클래스 및 예외 처리 핸들러 검증.
    - `module-core-iam` (계정 관리) 핵심 가입/인증 로직 테스트.
- **프론트엔드:**
    - `AuthContext` 및 API 클라이언트 모듈(`axios` interceptor) 유닛 테스트.
    - 공통 UI 컴포넌트(Button, Input 등)의 렌더링 검증.

### Phase 2: 주요 비즈니스 도메인 (우선순위: 높음)
- **백엔드:**
    - 게시판(`board`), 사용자 관리(`user`), 메뉴(`menu`) 등 주요 CRUD 서비스 테스트.
    - **전략:** `Service` 레이어는 100% Mocking을 이용한 유닛 테스트 진행, `Repository`는 H2를 이용해 쿼리 정확도 확인.
- **프론트엔드:**
    - 주요 페이지(게시판 목록, 로그인, 프로필 등)의 비즈니스 훅(`useQuery`) 연동 테스트.
    - Zod 기반의 폼 밸리데이션(`react-hook-form`) 시나리오 테스트.

### Phase 3: 도메인 엔티티 및 인프라 통합 (우선순위: 보통)
- **백엔드:**
    - 모든 `Entity` 내 비즈니스 메서드 검증.
    - `module-*` 시리즈 간의 내부 호출 통합 테스트.
- **프론트엔드:**
    - 복잡한 상태 관리 로직(Zustand 또는 Context) 테스트.
    - Framer Motion 등 애니메이션 라이브러리가 포함된 컴포넌트의 가용성 테스트.

### Phase 4: 전체 통합 및 안정화 (우선순위: 보통)
- **E2E 테스트:**
    - Playwright를 활용하여 핵심 시나리오(로그인 -> 메뉴 이동 -> 게시글 작성 -> 로그아웃) 전체 흐름 검증.
- **예외 처리:**
    - 백엔드 `GlobalExceptionHandler`의 모든 HTTP 오류 상태(4xx, 5xx) 발생 시나리오 강제 유발 테스트.

---

## 🛠️ 최적화 및 보완 전략 (Optimization)

### 1. 백엔드 JaCoCo 설정 고도화
- **Exclude 설정 최적화:** 테스트가 불필요한 영역은 제외하여 '진짜' 비즈니스 로직 커버리지에 집중합니다.
    - DTO, Request/Response 객체
    - QueryDSL 생성 클래스 (`QClass`)
    - 단순 설정 클래스 (`@Configuration`)
    - Lombok에 의해 생성된 코드 제외 (`lombok.addLombokGeneratedAnnotation = true`)

### 2. 프론트엔드 테스트 환경 개선
- **MSW(Mock Service Worker) 도입:** 실제 API 서버 없이도 네트워크 레벨의 모킹 테스트를 수행하여 테스트 독립성을 확보합니다.
- **Storybook 연동:** 시각적 회귀 테스트(Visual Regression Test)와 병행하여 UI 변경 시 커버리지를 보완합니다.

### 3. CI/CD 자동화 연동
- **GitHub Actions 연동:**
    - PR 생성 시마다 `test:coverage` 스크립트 실행.
    - 이전 PR 대비 커버리지가 하락할 경우 "Comment"로 알림 또는 빌드 실패 처리.
- **SonarQube 연동:** 정적 코드 분석과 연동하여 커버리지뿐 아니라 코드 스멜(Code Smell)과 결함 동시 관리.

---

## 📝 테스트 작성 원칙

1.  **Given-When-Then** 구조를 엄격히 준수합니다.
2.  **F.I.R.S.T** 원칙 (Fast, Independent, Repeatable, Self-Validating, Timely)을 따릅니다.
3.  **Assertion**은 구체적이어야 합니다 (단순히 `null`이 아니라는 확인보다는 결과 데이터의 정합성 확인).
4.  **Mocking**은 외부 의존성에 한정하며, 테스트 대상 내부 로직은 최대한 실제 코드를 실행합니다.

---

*본 계획은 프로젝트 진행 상황과 리소스에 따라 유연하게 조정될 수 있으며, 주 단위 스프린트 회의를 통해 커버리지 상승 지표를 공유합니다.*
