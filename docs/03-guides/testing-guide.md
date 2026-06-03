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

### 계층형 아키텍처 (22-Tier Architecture)

본 프로젝트는 테스트의 중복을 제거하고 비즈니스 도메인별 체계적 검증을 위해 총 **22개 계층(Tier)**으로 테스트를 관리합니다.

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
| | 19 | `19-hierarchy-modernization.spec.ts` | 부서 및 메뉴 계층 구조 최적화 검증 |
| | 20 | `20-common-security-validation.spec.ts` | 공통 보안 취약점 및 보안 필터 검증 |
| | 21 | `21-advanced-resilience.spec.ts` | API 및 DB 장애 극복 회복탄력성 검증 |
| | 22 | `22-deep-security-guard.spec.ts` | 심층 보안 통제 및 가디언 동작 검증 |

### 실행 명령어

```bash
# 전체 E2E 실행
npm run test:e2e

# 클린업 포함 전체 실행 (권장)
npm run test:e2e:full

# 특정 Tier만 실행
npx playwright test --project=tier-1-core
npx playwright test --project=tier-18-business-ext
npx playwright test --project=tier-21-resilience
npx playwright test --project=tier-22-security

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

### Docker 없는 환경 (H2 + Flyway 로컬 정합성 검증)

로컬 개발 환경에서 Docker(Testcontainers)를 실행할 수 없거나 빠른 테스트 실행을 위해 **H2 In-Memory DB**를 활용할 수 있습니다. 

단순히 H2에 스키마를 자동 생성(`ddl-auto: create`)하는 방식은 실제 PostgreSQL 운영 스키마와의 자바 엔티티 정합성 불일치를 잡아내지 못합니다. 이를 차단하기 위해 **Flyway 마이그레이션 적용 후 `ddl-auto: validate`를 실행하는 엄격 검증 체계**를 준수합니다.

```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: validate  # 💥 엔티티-H2 DDL 스펙이 불일치할 경우 테스트 기동 단계에서 Fail-Fast
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect
  flyway:
    enabled: true        # 💥 테스트 구동 전 V1__init_test_schema.sql DDL 스크립트 강제 주입
    locations: classpath:db/migration
```

> [!NOTE]
> - `MODE=PostgreSQL`: H2가 PostgreSQL 문법과 호환되도록 설정합니다.
> - `DATABASE_TO_LOWER=TRUE`: 테이블명 및 컬럼명의 대소문자 불일치 오류를 방지하기 위해 강제로 소문자 맵핑을 보증합니다.
> - `locations: classpath:db/migration`: `/src/test/resources/db/migration/V1__init_test_schema.sql`에 저장된 H2 호환 DDL 파일을 기동합니다.


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

### 1. 전역 브라우저 에러 감시 (Zero-Tolerance Console Guard)
E2E 테스트 실행 중 브라우저 콘솔에 에러가 발생하거나 런타임 예외가 던져지면 테스트 코드가 'Pass' 하더라도 강제로 실패 처리합니다.
- **설정**: `e2e/fixtures/error-detector.ts` 및 `base-test.ts`
- **감지 항목**:
    - `console.error()`: 스크립트 실행 중 발생하는 비치명적 오류
    - `pageerror`: 런타임 예외 및 Uncaught Error
    - `unhandledrejection`: 처리되지 않은 비동기(Promise) 오류
    - **Hydration Mismatch**: React/Next.js 하이드레이션 불일치 로그가 감지되면 즉시 `🌊 [HYDRATION MISMATCH]` 에러로 강제 실패 처리 (Fail-Fast).

### 2. 네트워크 리소스 무결성 검사 (Network Auditor & Silent API 가드)
이미지 404, 깨진 폰트, CSS 로딩 실패 및 백그라운드 API 호출 오류(Silent API Failure)를 자동으로 감지합니다.
- **동작**: `response` 리스너를 통해 주요 리소스 및 API의 응답 상태 코드가 400 이상인 경우 E2E 테스트를 즉시 실패시킵니다.
- **세부 진단 정보**: 오류 발생 시 HTTP Method(`GET`, `POST` 등), 요청 URL, 상태 코드, 리소스 타입을 상세 로그로 출력하여 원인 파악을 극대화합니다.
- **예외적 허용**: 기능 안정성을 해치지 않기 위해 이미지 로드 오류(`image`) 및 비인가 시나리오가 의도된 특정 인증 API(`isAuthExpected`)는 무시 필터링(Whitelist)을 적용합니다.

### 3. 정밀 시각 회귀 테스트 (VRT)
UI 프레임워크나 테마 변경 시 발생하는 미세한 레이아웃 시프트를 감지합니다.
- **임계값**: `maxDiffPixelRatio` 기준 일반 페이지 **0.2%**, 통계 데이터 페이지 **0.5%** 이하로 제한.
- **실행**: `npm run test:e2e -- visual-regression.spec.ts`

### 4. 하이드레이션 오류 조기 경보 및 E2E 연동
Next.js의 서버/클라이언트 불일치 문제를 신속히 잡기 위해, 클라이언트 컴포넌트의 `StandardErrorBoundary`가 수집한 불일치 정보를 콘솔에 `🌊 [HYDRATION MISMATCH DETECTED]` 플래그로 출력하며, 이는 `ConsoleErrorGuard`에 의해 실시간 가로채어져 E2E 빌드 파이프라인에서 100% 빌드 실패로 직결됩니다.

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
    // ⚠️ [경고] 테스트 데이터 정리 목적의 물리적 DELETE. 
    // DB 헌법 제8조 2항의 '테스트 환경 예외'에 의해서만 허용되며, 실무 비즈니스 로직에서는 절대 금지(논리삭제 원칙).
    await db.deleteFrom('tb_user_log').execute();
    await db.deleteFrom('tb_user_master').execute();
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

## 로컬 단위 테스트 정합성 하네스 강제화

단위 테스트 환경에서 H2 In-Memory DB와 Java 엔티티 간의 정합성 유효성 검사(`ddl-auto: validate`) 체계가 도입되었습니다. 
이 체계는 엔티티 클래스의 매핑 정보(예: `@Table(name = "...")`, `@Column(name = "...")`)가 실제 DB 마이그레이션 파일(`V1__init_test_schema.sql`)의 물리 스키마와 단 하나의 글자라도 다를 경우 컴파일 및 테스트 기동 시 즉시 예외를 발생시켜 빌드를 실패하게 만드는 강력한 안전 장치입니다.

### 🛡️ 하네스 강제화 및 정합성 보증 방안

이 체계가 개발자 로컬 및 협업 파이프라인에서 누락 없이 지속적으로 동작하고 강제되도록 다음 세 가지 수준의 강제 장치를 가동합니다.

#### 1. Gradle 빌드 라이프사이클 및 설정 강제화 (Fail-Fast Gate)
모든 개발자의 로컬 빌드 및 CI 서버 빌드 시, 정합성 테스트가 우회되는 것을 방지하기 위해 Gradle 테스트 환경의 기본 프로필로 `test`를 강제 설정하고, JVM 환경을 통제합니다.

- **`build.gradle` 테스트 태스크 강제화 설정**:
  단위 테스트 실행 시 Active Profile이 `test`로 고정되도록 명시적으로 강제하여, `application-test.yml`에 있는 `ddl-auto: validate` 정책이 무조건 적용되도록 설계합니다.
  ```groovy
  test {
      useJUnitPlatform()
      systemProperty 'spring.profiles.active', 'test' // 💥 테스트 실행 시 test 프로필 강제 주입
      
      // 테스트 리포트 출력 형식 고도화 (실패 원인 즉시 파악)
      testLogging {
          events "passed", "skipped", "failed"
          exceptionFormat "full"
      }
  }
  ```

#### 2. CI/CD 파이프라인 정합성 차단 게이트 (Gatekeeper)
코드 저장소에 PUSH되거나 Pull Request(PR)가 생성될 때, 백엔드 빌드 검증 단계가 필수적으로 실행되도록 CI 설정(GitHub Actions 또는 GitLab CI)을 구성합니다.
- **원칙**: DB 스키마가 변경되었으나 자바 엔티티 매핑을 누락한 경우, 혹은 그 반대의 경우 CI 테스트 단계(`validate` 검증 실패)에서 빌드가 깨져 PR 병합이 원천 차단됩니다.
- **파이프라인 필수 명령어**:
  ```bash
  # 로컬/CI 공통: 캐시를 사용하지 않고 완전한 테스트 검증 수행
  ./gradlew :foundation:test --no-build-cache
  ```

#### 3. Git Pre-Push Hook을 통한 로컬 Fail-Fast (생산성 밸런스 강제)
개발 과정에서 커밋(Commit)할 때마다 매번 무거운 단위 테스트를 돌리는 것은 개발자의 기동성과 생산성을 크게 훼손합니다. 따라서, 로컬에서는 커밋 단계가 아닌 원격 저장소로 **PUSH**를 시도하는 최종 관문에서 JPA 정합성 테스트를 강제하는 **Pre-Push Hook** 방식의 도입이 기술적으로 매우 합리적입니다.
- **자동화 인스톨러 배포**: 개발자가 수동으로 훅을 등록하는 오버헤드를 없애기 위해 원클릭 자동 설치 스크립트가 프로젝트에 제공됩니다.
  - Windows 개발자: [install-git-hooks.bat](../../scripts/install-git-hooks.bat) 실행 (더블 클릭)
  - macOS/Linux 개발자: `sh scripts/install-git-hooks.sh` 실행
- **Pre-Push 훅 동작 쉘 스크립트 (`.git/hooks/pre-push`)**:
  ```bash
  #!/bin/sh
  echo "🔍 [Pre-Push Hook] Git Push 전 로컬 데이터베이스 스키마 및 Entity 정합성을 검증합니다..."
  ./gradlew :foundation:test
  if [ $? -ne 0 ]; then
      echo "❌ [Push Rejected] JPA Entity와 Flyway H2 DDL 정합성이 깨져있거나 테스트가 실패했습니다. 수정을 완료한 후 푸시하세요."
      exit 1
  fi
  ```

#### 4. 스키마 변경 시 DDL 최신화 자동화 프로토콜 (Dump Clean Protocol)
PostgreSQL 운영 스키마가 바뀜에 따라 H2 테스트 DDL인 `V1__init_test_schema.sql`도 동기화되어야 합니다. 이때 H2의 `SCRIPT` 엔진이 덤프하는 DDL 파일에는 H2 전용 환경 변수 설정(`SET DB_CLOSE_DELAY` 등) 및 불필요한 메타 정보 등의 불순물이 대거 유입됩니다.
이를 완벽히 해결하기 위해 정규식(Regex) 기반의 실시간 후처리 청정 필터링을 내장한 [SchemaDumper.java](../../foundation/src/test/java/nuri/foundation/support/SchemaDumper.java)가 실무 코드로 구현되어 있습니다.

- **실제 구현 클래스**: `nuri.foundation.support.SchemaDumper`
- **검증 및 정제 동작 흐름**:
  1. 임시 파일 IO를 거치지 않고 H2 메모리로부터 직접 DDL 스트림을 쿼리로 로딩.
  2. H2 고유의 세팅(`SET ...`), 유저 생성(`CREATE USER ...`), LOB 데이터 스트림 등의 구문을 정규식 패턴으로 정밀 필터링하여 스킵.
  3. `CREATE MEMORY TABLE PUBLIC.TB_...` 등의 구문을 표준 규격인 `CREATE TABLE TB_...` 로 깔끔하게 변환 및 `PUBLIC.` 스키마 접두사를 완전 제초(Cleanups).
  4. 오직 순수한 DDL 테이블 스키마, 인덱스, 외래키 제약조건만 정제하여 `V1__init_test_schema.sql`로 영구 기록.
- **덤프 실행 방법**:
  1. `SchemaDumper.java` 소스 상의 `@Disabled` 주석을 잠시 비활성화하거나, IDE에서 해당 단위 테스트를 단독 러닝시킵니다.
  2. 또는 터미널에서 아래 명시적인 Gradle 테스트 명령을 통해 덤프 태스크만 단독 구동할 수 있습니다:
     ```bash
     ./gradlew :foundation:test --tests nuri.foundation.support.SchemaDumper.dumpCleanSchema -Dspring.profiles.active=test-dump
     ```
  3. 추출 및 정제가 완료되면 변경된 `V1__init_test_schema.sql` 파일의 변경 내역(Git Diff)을 가볍게 검토한 후 소스 코드와 함께 커밋합니다.

---

- [CI/CD 파이프라인 가이드](./cicd-pipeline.md)
- [E2E 테스트 가이드 (상세)](./e2e-test-guide.md)
- [E2E 범위 외 정밀 검증 가이드 (Non-E2E)](./non-e2e-verification-guide.md)
- [성능 최적화 가이드](../04-operations/performance-optimization-guide.md)

---
*Last Updated: 2026-05-26 (Updated via Antigravity — Production-ready Git Pre-Push Hook Installer & Non-E2E Verification Guide Integrated)*

