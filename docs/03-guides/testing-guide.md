# 테스트 가이드

본 프로젝트는 단위 테스트, 통합 테스트, E2E 테스트를 포함한 다양한 테스트 계층을 사용합니다.

---

## 📋 목차

1. [테스트 구조](#테스트-구조)
2. [단위 테스트](#단위-테스트)
3. [통합 테스트](#통합-테스트)
4. [E2E 테스트](#e2e-테스트)
5. [Testcontainers](#testcontainers)
6. [JaCoCo 커버리지](#jacoco-커버리지)
7. [고급 오류 감지 및 디버깅](#고급-오류-감지-및-디버깅)
8. [모범 사례](#모범-사례)

---

## 테스트 구조

```
backend/
├── src/test/java/
│   ├── **/*Test.java          # 단위 테스트
│   ├── **/*IntegrationTest.java # 통합 테스트
│   └── support/
│       ├── IntegrationTest.java    # 통합 테스트 베이스
│       └── TestcontainersConfig.java # Testcontainers 설정
└── src/test/resources/
    └── application-test.yml   # 테스트 설정

frontend/
├── e2e/
│   ├── *.spec.ts              # Playwright E2E 테스트
│   └── fixtures/              # 테스트 데이터
├── src/
│   └── **/*.test.tsx          # 단위 테스트
└── playwright.config.ts       # Playwright 설정
```

---

## 단위 테스트

### 백엔드 (JUnit 5 + Mockito)

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @InjectMocks private UserService userService;

    @Test
    @DisplayName("사용자 조회 - 성공")
    void getUser_success() {
        // Given
        User user = new User("user1", "사용자 1");
        when(userRepository.findById("user1")).thenReturn(Optional.of(user));

        // When
        UserDto result = userService.getUser("user1");

        // Then
        assertEquals("사용자 1", result.getUserNm());
    }
}
```

### 프론트엔드 (Vitest + React Testing Library)

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

---

## 통합 테스트

### @IntegrationTest 애노테이션

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfig.class)
@ActiveProfiles("test")
public @interface IntegrationTest {
}
```

### 사용 예시

```java
@IntegrationTest
class MenuServiceIntegrationTest {

    @Autowired private MenuService menuService;
    @Autowired private MenuRepository menuRepository;

    @Test
    @DisplayName("메뉴 계층 구조 조회 - N+1 쿼리 해결 검증")
    void getMenuHierarchy_NPlusOneResolved() {
        // Given: 10 개의 메뉴와 권한 설정
        // ...

        // When: 메뉴 계층 구조 조회
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: 1 개의 쿼리로 모든 메뉴와 권한 조회
        assertThat(result).hasSize(10);
    }
}
```

---

## E2E 테스트 (Playwright)

### 계층형 아키텍처 (18-Tier Architecture)

본 프로젝트는 테스트의 중복을 제거하고 비즈니스 도메인별 체계적 검증을 위해 총 **18개 계층(Tier)**으로 테스트를 관리합니다.

| 그룹 | Tier | 파일 | 검증 범위 |
|------|------|------|-----------|
| **Core** | 1 | `01-core-base.spec.ts` | 인증, 대시보드, 전역 레이아웃 |
| | 2 | `02-admin-system.spec.ts` | 사용자 CRUD, 메뉴, 공통코드 |
| **Business** | 3 | `03-board-community.spec.ts` | 게시판 생명주기 |
| | 4 | `04-quality-resilience.spec.ts` | RBAC/CSRF, A11y, 시각적 회귀 |
| | 5 | `05-public-experience.spec.ts` | 대국민 포털 연동 |
| **Ops** | 6 | `06-ops-governance.spec.ts` | 감사 로그, 모니터링 |
| | 7 | `07-productivity-suite.spec.ts` | 개인 일정, 스크랩 |
| | 8 | `08-advanced-collaboration.spec.ts` | 협업 고도화 |
| | 9 | `09-admin-observability-workspace.spec.ts` | 관리자 관측성 |
| | 10 | `10-operational-extension.spec.ts` | 운영 확장 |
| **Enterprise** | 11 | `11-enterprise-workflow.spec.ts` | 결재 프로세스 |
| | 12 | `12-notification.spec.ts` | 알림 센터 |
| | 13 | `13-mail.spec.ts` | 메일 연동 |
| | 14 | `14-admin-workflow.spec.ts` | 관리자 업무 자동화 |
| | 15 | `15-collaboration-extension.spec.ts` | 협업 확장 |
| | 16 | `16-system-observability.spec.ts` | 시스템 가시성 |
| | 17 | `17-support-governance.spec.ts` | 온라인 매뉴얼, FAQ 생명주기 |
| | 18 | `18-business-extension.spec.ts` | ISM(비정형결재), LSM(간부일정), HPCM |

### 실행 명령어

```bash
# 전체 E2E 실행
npm run test:e2e

# 클린업 포함 전체 실행 (권장)
npm run test:e2e:full

# 특정 Tier만 실행
npx playwright test --project=tier-1-core
npx playwright test --project=tier-17-support
npx playwright test --project=tier-18-business

# UI 모드 (대화형 디버깅)
npm run test:e2e:ui

# 수동 DB 클린업
npm run test:cleanup
```

---

## Testcontainers

### PostgreSQL 컨테이너 설정

```java
@TestConfiguration
@Testcontainers
@Profile("test")
public class TestcontainersConfig {

    @Bean
    public PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>("postgres:16")
                .withDatabaseName("testdb")
                .withUsername("test")
                .withPassword("test");
    }
}
```

### 테스트에서 사용

```java
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class PostgresContainerTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Test
    void canExecuteQuery() throws Exception {
        try (Connection connection = postgres.createConnection("");
             Statement statement = connection.createStatement()) {

            ResultSet resultSet = statement.executeQuery("SELECT 1");
            resultSet.next();
            
            assertThat(resultSet.getInt(1)).isEqualTo(1);
        }
    }
}
```

### Docker 없는 환경

로컬에서 Docker 를 실행할 수 없는 경우, H2 데이터베이스를 사용:

```yaml
# application-test.yml (Docker 없음)
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
  jpa:
    database-platform: org.hibernate.dialect.H2Dialect
```

---

## JaCoCo 커버리지

### 설정 (`build.gradle`)

```groovy
jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                minimum = 0.60 // 최소 60% 커버리지 목표
            }
        }
        rule {
            element = 'CLASS'
            limit {
                counter = 'LINE'
                value = 'COVEREDRATIO'
                minimum = 0.50 // 클래스별 50% 라인 커버리지
            }
            excludes = [
                '*.Q*',
                '*.dto.*',
                '*Config*',
                '*Application*',
                '*VO'
            ]
        }
    }
}
```

### 실행 및 확인

```bash
# 테스트 실행 및 리포트 생성
./gradlew test jacocoTestReport

# HTML 리포트 확인
open build/reports/jacoco/test/html/index.html

# 루트 프로젝트 통합 리포트
./gradlew jacocoRootReport
open build/reports/jacoco/aggregated/html/index.html
```

### 커버리지 제외 항목

- **Q 클래스**: QueryDSL Q 클래스
- **DTO**: 데이터 전송 객체
- **Config**: 설정 클래스
- **Application**: 메인 애플리케이션 클래스
- **VO**: 값 객체

---

## 고급 오류 감지 및 디버깅

본 프로젝트는 단순히 기능의 성공/실패를 넘어, 사용자 경험을 저해하는 미세한 오류를 사전에 차단하기 위해 고도화된 감지 시스템을 운용합니다.

### 1. 전역 브라우저 에러 감시 (Zero-Tolerance)
E2E 테스트 실행 중 브라우저 콘솔에 에러가 발생하거나 런타임 예외가 던져지면 테스트 코드가 'Pass' 하더라도 강제로 실패 처리합니다.
- **설정**: `e2e/fixtures/error-detector.ts` 및 `base-test.ts`
- **감지 항목**:
    - `console.error()`: 스크립트 실행 중 발생하는 비치명적 오류
    - `pageerror`: 하이드레이션 오류를 포함한 런타임 예외
    - `unhandledrejection`: 처리되지 않은 비동기(Promise) 오류

### 2. 네트워크 리소스 무결성 검사 (Network Auditor)
이미지 404, 깨진 폰트, CSS 로딩 실패 등 정적 리소스 로드 오류를 자동으로 감지합니다.
- **동작**: `image`, `stylesheet`, `font`, `script` 등 주요 리소스의 응답 상태 코드가 400 이상인 경우 경고 로그 및 필요 시 테스트 실패를 유도합니다.

### 3. 정밀 시각 회귀 테스트 (VRT)
UI 프레임워크나 테마 변경 시 발생하는 미세한 레이아웃 시프트를 감지합니다.
- **임계값**: `maxDiffPixelRatio` 기준 일반 페이지 **0.2%**, 통계 데이터 페이지 **0.5%** 이하로 제한.
- **실행**: `npm run test:e2e -- visual-regression.spec.ts`

### 4. 하이드레이션 오류 조기 경보
Next.js 15의 서버/클라이언트 불일치 문제를 잡기 위해 `StandardErrorBoundary`에서 전역 이벤트를 수신하여 콘솔에 `🌊 [HYDRATION MISMATCH DETECTED]` 로그를 남깁니다.

---

## 모범 사례

### 1. 테스트命名

```java
// ❌ 나쁜 예
@Test
void test1() { }

// ✅ 좋은 예
@Test
@DisplayName("사용자 목록 조회 - N+1 쿼리 해결 검증")
void getUserList_NPlusOneResolved() { }
```

### 2. AAA 패턴

```java
@Test
void getUser_success() {
    // Arrange (Given)
    User user = new User("user1", "사용자 1");
    when(userRepository.findById("user1")).thenReturn(Optional.of(user));

    // Act (When)
    UserDto result = userService.getUser("user1");

    // Assert (Then)
    assertEquals("사용자 1", result.getUserNm());
}
```

### 3. 테스트 독립성

```java
// ❌ 나쁜 예: 순서 의존적
@Test void test1() { repository.save(data); }
@Test void test2() { // test1 이 실행되었다고 가정 }

// ✅ 좋은 예: 각 테스트가 독립적
@BeforeEach
void setUp() {
    repository.deleteAll();
    repository.save(testData);
}
```

### 4. Testcontainers 정리

```java
// ✅ 컨테이너는 자동으로 정리됨
@Testcontainers
class MyTest {
    @Container
    static PostgreSQLContainer<?> postgres = ...;
    // 테스트 종료 후 자동 종료
}
```

### 5. E2E 테스트 데이터 정리

```typescript
// e2e/scripts/cleanup-db.ts
export default async function cleanup() {
    // 테스트 데이터 정리
    await db.deleteFrom('NUSERLOG').execute();
    await db.deleteFrom('COMVNUSERMASTER').execute();
}
```

---

## 문제 해결

### "Could not find docker"

**해결**: Docker Desktop 설치 및 실행

### "Executable doesn't exist" (Playwright)

**해결**:
```bash
cd frontend
npx playwright install --with-deps chromium
```

### JaCoCo 커버리지 0%

**원인**: 테스트가 실행되지 않음

**해결**:
```bash
./gradlew clean test --no-build-cache
```

---

- [CI/CD 파이프라인 가이드](./cicd-pipeline.md)
- [E2E 테스트 가이드 (상세)](./e2e-test-guide.md)
- [성능 최적화 가이드](../04-operations/performance-optimization-guide.md)

---
*Last Updated: 2026-05-01 (Updated via Antigravity — 16-Tier E2E Architecture Synchronized)*
