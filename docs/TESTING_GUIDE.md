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
7. [모범 사례](#모범-사례)

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

## E2E 테스트

### Playwright 설정

```typescript
// playwright.config.ts
export default defineConfig({
    testDir: './e2e',
    timeout: 120000,
    retries: process.env.CI ? 3 : 1,
    workers: process.env.CI ? 2 : undefined,
    projects: [
        {
            name: 'admin-tests',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/admin.json',
            },
        },
    ],
});
```

### 테스트 작성 예시

```typescript
// e2e/01-admin-domain.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Domain Tests', () => {
    test('should login and access admin panel', async ({ page }) => {
        // 로그인
        await page.goto('/login');
        await page.fill('#userId', 'admin');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');

        // 관리자 패널 확인
        await expect(page).toHaveURL('/admin');
        await expect(page.getByText('관리자 대시보드')).toBeVisible();
    });
});
```

### 실행 명령어

```bash
# 전체 E2E 테스트
npm run test:e2e

# UI 모드 (디버깅)
npm run test:e2e:ui

# 특정 테스트 실행
npx playwright test e2e/01-admin-domain.spec.ts

# Sharding (병렬 실행)
npx playwright test --shard=1/3
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

## 관련 문서

- [CI/CD 파이프라인 가이드](./CICD_PIPELINE.md)
- [성능 최적화 가이드](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [Contributing Guide](../CONTRIBUTING.md)
