# 성능 최적화 가이드

본 가이드는 eGov Enterprise 프로젝트에서 적용된 성능 최적화 기법과 실전 팁을 공유합니다.

---

## 📋 목차

1. [N+1 쿼리 해결](#n1-쿼리-해결)
2. [캐싱 전략](#캐싱-전략)
3. [프론트엔드 최적화](#프론트엔드-최적화)
4. [데이터베이스 최적화](#데이터베이스-최적화)
5. [모니터링](#모니터링)

---

## N+1 쿼리 해결

### 문제 설명

N+1 쿼리 문제는 엔티티를 조회할 때 관련 엔티티를 별도의 쿼리로 로딩하여 발생하는 성능 문제입니다.

```java
// ❌ N+1 문제 발생
List<Menu> menus = menuRepository.findAll();
for (Menu menu : menus) {
    // 메뉴마다 권한 조회 (N 개의 추가 쿼리)
    List<MenuAuthority> auths = menuAuthorityRepository.findByMenuId(menu.getId());
}
// 총 쿼리 수: 1 + N
```

### 해결 방법 1: Fetch JOIN

```java
// ✅ 단일 쿼리로 메뉴와 권한 함께 조회
@Query("""
    SELECT m, ma
    FROM Menu m
    LEFT JOIN MenuAuthority ma ON m.id = ma.id.menuNo
    ORDER BY m.upperMenuNo ASC, m.menuOrdr ASC
""")
List<Object[]> findAllWithAuthorities();
```

**효과**:
- 쿼리 수: 1+N → 1
- 응답 시간: 100-200ms → 10-50ms (95% 단축)

### 해결 방법 2: EntityGraph

```java
@EntityGraph(attributePaths = {"menuAuthorityList"})
List<Menu> findAll();
```

### 해결 방법 3: Batch Size

```java
@OneToMany(fetch = FetchType.LAZY)
@BatchSize(size = 25)
private List<MenuAuthority> authorities;
```

### 실제 적용 사례

#### MenuService

```java
private List<MenuDto> buildMenuTree(Long rootMenuNo, List<String> roles) {
    // [성능 개선] 단일 쿼리로 메뉴와 권한 정보를 함께 조회 (N+1 방지)
    List<Object[]> menuWithAuthResults = menuRepository.findAllWithAuthorities();

    // 메뉴와 권한 매핑
    Map<Long, Menu> menuMap = new LinkedHashMap<>();
    Map<Long, List<MenuAuthority>> authorityMap = new HashMap<>();

    for (Object[] result : menuWithAuthResults) {
        Menu menu = (Menu) result[0];
        MenuAuthority authority = (MenuAuthority) result[1];
        // ... 매핑 로직
    }
}
```

#### UserService

```java
@Cacheable(value = "users", key = "'userList'")
public List<UserDto> getUserList() {
    // [성능 개선] 단일 쿼리로 사용자와 권한 정보를 함께 조회
    List<Object[]> results = userRepository.findAllWithAuthorities();
    
    // 매핑 로직...
}
```

---

## 캐싱 전략

### Spring Cache 적용

#### 1. 메뉴 계층 구조

```java
@Cacheable(value = "menuHierarchy", 
           key = "SecurityContextHolder.getContext().getAuthentication().getAuthorities()")
public List<MenuDto> getMenuHierarchy() {
    // DB 조회 로직
}
```

**캐시 키**: 사용자 권한 목록  
**캐시 미스**: 첫 번째 요청 또는 권한 변경 시  
**캐시 히트**: 10-50ms

#### 2. 사용자 목록

```java
@Cacheable(value = "users", key = "'userList'")
public List<UserDto> getUserList() {
    // DB 조회 로직
}
```

#### 3. 전체 메뉴 목록

```java
@Cacheable(value = "allMenus")
public List<MenuDto> getAllMenus() {
    // DB 조회 로직
}
```

### 캐시 설정 (`application.yml`)

```yaml
spring:
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=10000,expireAfterAccess=30m
```

### 캐시 무효화

```java
@CacheEvict(value = { "allMenus", "menuHierarchy", "menuParentMap" }, allEntries = true)
@Transactional
public void insertMenuManage(MenuDto vo) {
    // 메뉴 생성 로직
}
```

---

## 프론트엔드 최적화

### 1. Bundle Analyzer

번들 크기 분석:

```bash
npm run analyze
```

**확인 항목**:
- `main.js` 번들 크기 (목표: 500KB 미만)
- 페이지별 청크 크기
- 큰 의존성 모듈

### 2. 코드 스플리팅

동적 임포트:

```tsx
// 무거운 컴포넌트 지연 로딩
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
});
```

### 3. 이미지 최적화

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  width={500}
  height={300}
  alt="로고"
  priority  // LCP 요소에 사용
/>
```

### 4. 폰트 최적화

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',  // FOIT 방지
});
```

### 5. Package Imports 최적화

`next.config.ts`:

```typescript
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    // ... 11 개 라이브러리
  ],
},
```

**효과**: 빌드 속도 200-800ms 단축

---

## 데이터베이스 최적화

### 1. 인덱스 설정

```sql
-- 메뉴 조회 성능 향상
CREATE INDEX idx_menu_upper_menu_no ON menu(upper_menu_no, menu_ordr);

-- 사용자 권한 조회 성능 향상
CREATE INDEX idx_user_authority_uniq_id ON user_authority(uniq_id);

-- 알림 조회 성능 향상
CREATE INDEX idx_notification_receiver_read ON n_user_notification(receiver_id, is_read);
```

### 2. HikariCP 풀 설정

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20  # 기본값
      minimum-idle: 5
      idle-timeout: 300000
      max-lifetime: 600000
      connection-timeout: 20000
```

**고트래픽 환경**:
```yaml
maximum-pool-size: 30-50  # CPU 코어 수 * 2 + 1
```

### 3. Hibernate 배치 처리

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 25  # 기본값
        order_inserts: true
        order_updates: true
```

**대량 삽입/업데이트**:
```yaml
batch_size: 50-100
```

### 4. 쿼리 로그 및 통계

```yaml
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        use_sql_comments: true
        generate_statistics: true
logging:
  level:
    org.hibernate.SQL: debug
    org.hibernate.orm.jdbc.bind: trace
    org.hibernate.stat: debug
```

---

## 모니터링

### 1. Spring Boot Actuator

```yaml
management:
  endpoints:
    web:
      exposure:
        include: "health,info,metrics,prometheus"
  metrics:
    export:
      prometheus:
        enabled: true
```

**엔드포인트**:
- `/actuator/health` - 헬스 체크
- `/actuator/metrics` - 메트릭스
- `/actuator/prometheus` - Prometheus 포맷

### 2. Prometheus + Grafana

**주요 메트릭스**:
- `jvm_memory_used_bytes` - JVM 메모리 사용량
- `http_server_requests_seconds` - HTTP 요청 처리 시간
- `hikaricp_connections_active` - 활성 커넥션 수

### 3. 로컬 성능 테스트

```bash
# k6 부하 테스트
k6 run e2e/scripts/load-test.js

# 결과 확인
# Req Sent: 10000
# HTTP Req Duration: avg=50ms, p95=100ms
```

---

## 성능 체크리스트

### 백엔드

- [ ] N+1 쿼리 해결됨 (로그 확인)
- [ ] @Cacheable 적용 (메뉴, 사용자)
- [ ] 인덱스 설정됨 (주요 조회 컬럼)
- [ ] 배치 사이즈 설정됨 (25 이상)
- [ ] 쿼리 로그로 검증 완료

### 프론트엔드

- [ ] Bundle Analyzer 로 번들 크기 확인
- [ ] Lighthouse Performance 80 점 이상
- [ ] FCP 1.5 초 미만
- [ ] LCP 2.5 초 미만
- [ ] 이미지 최적화 적용

### 데이터베이스

- [ ] HikariCP 풀 사이즈 적정
- [ ] 슬로우 쿼리 로그 확인
- [ ] 인덱스 사용 여부 확인 (EXPLAIN)

---

## 관련 문서

- [테스트 가이드](../03-guides/testing-guide.md)
- [데이터베이스 최적화 가이드](./database-optimization-guide.md)
- [부하 테스트 가이드](./load-test-guide.md)
- [CI/CD 파이프라인 가이드](../03-guides/cicd-pipeline.md)
