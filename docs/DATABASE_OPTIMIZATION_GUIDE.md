# 데이터베이스 최적화 가이드

본 가이드는 eGov Enterprise 의 PostgreSQL 데이터베이스 성능을 분석하고 최적화하는 방법을 제공합니다.

---

## 📊 성능 분석 도구

### 1. pg_stat_statements 활성화

`pg_stat_statements` 는 실행된 모든 쿼리의 통계를 수집하는 PostgreSQL 확장 기능입니다.

```sql
-- 확장 기능 활성화 (superuser 권한 필요)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 활성화 확인
SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
```

### 2. Hibernate 통계 활성화

개발 환경에서 Hibernate 통계를 활성화합니다:

```yaml
# application-dev.yml
egov:
  performance:
    logging:
      enabled: true
```

---

## 🔍 성능 분석 스크립트 사용법

### 분석 스크립트 실행

```bash
# PostgreSQL 연결
psql -h localhost -p 5433 -U egov -d egovdb

# 분석 스크립트 실행
\i config/db/performance-analysis.sql
```

### 주요 분석 항목

#### 1. 느린 쿼리 찾기

```sql
-- 평균 실행 시간이 긴 쿼리 상위 10 개
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### 2. 인덱스 사용 현황

```sql
-- 인덱스를 사용하지 않는 테이블
SELECT relname, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan;
```

#### 3. 캐시 히트 비율

```sql
-- 캐시 히트 비율 확인 (95% 이상 권장)
SELECT 
    blks_hit, 
    blks_read,
    100.0 * blks_hit / (blks_hit + blks_read) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = 'egovdb';
```

---

## 🚀 최적화 기법

### 1. 인덱스 최적화

#### 인덱스 생성 예시

```sql
-- 단일 컬럼 인덱스
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- 복합 인덱스
CREATE INDEX CONCURRENTLY idx_common_codes_group 
ON common_codes(group_id, use_at);

-- 부분 인덱스 (조건부 인덱스)
CREATE INDEX CONCURRENTLY idx_active_users 
ON users(created_at) 
WHERE is_active = true;
```

#### 인덱스 삭제 (사용되지 않는 인덱스)

```sql
-- 사용되지 않는 인덱스 찾기
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- 인덱스 삭제
DROP INDEX CONCURRENTLY unused_index_name;
```

### 2. N+1 쿼리 해결

#### Hibernate 통계로 N+1 감지

```
Hibernate 성능 분석 로그에서 다음을 확인:
- Entity Fetch Count 가 Entity Load Count 보다 훨씬 크면 N+1 의심
```

#### 해결 방법 1: @BatchSize 사용

```java
@Entity
public class User {
    
    @OneToMany(mappedBy = "user")
    @BatchSize(size = 20)  -- 20 개씩 일괄 조회
    private List<Post> posts;
}
```

#### 해결 방법 2: JOIN FETCH 사용

```java
@Query("SELECT u FROM User u JOIN FETCH u.posts WHERE u.id = :id")
User findByIdWithPosts(@Param("id") Long id);
```

#### 해결 방법 3: Entity Graph 사용

```java
@EntityGraph(attributePaths = {"posts", "comments"})
User findById(Long id);
```

### 3. 배치 처리 최적화

#### JDBC 배치 사이즈 설정

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 25
        order_inserts: true
        order_updates: true
```

#### 대량 데이터 처리

```java
// 50 개씩 배치 처리
for (int i = 0; i < users.size(); i++) {
    entityManager.persist(users.get(i));
    
    if (i % 50 == 0) {
        entityManager.flush();
        entityManager.clear();
    }
}
```

### 4. VACUUM 및 ANALYZE

#### 자동 VACUUM 설정 확인

```sql
-- 자동 VACUUM 상태 확인
SELECT 
    relname, 
    last_vacuum, 
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'common_codes';
```

#### 수동 VACUUM 실행 (저피크 타임)

```sql
-- 일반 VACUUM (블록 해제만)
VACUUM common_codes;

-- VACUUM ANALYZE (통계 업데이트)
VACUUM ANALYZE common_codes;

-- 전체 데이터베이스
VACUUM ANALYZE;
```

### 5. 연결 풀 최적화

#### HikariCP 설정

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20      # 최대 연결 수
      minimum-idle: 5            # 최소 유휴 연결
      idle-timeout: 300000       # 유휴 연결 종료 시간 (5 분)
      max-lifetime: 600000       # 연결 최대 수명 (10 분)
      connection-timeout: 20000  # 연결 타임아웃 (20 초)
      leak-detection-threshold: 60000  # 리크 감지 (60 초)
```

---

## 📈 모니터링

### 1. 실시간 쿼리 모니터링

```sql
-- 현재 실행 중인 쿼리
SELECT 
    pid,
    usename,
    query,
    state,
    age(clock_timestamp(), query_start) AS duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

### 2. 잠금 모니터링

```sql
-- 잠금 대기 중인 쿼리
SELECT 
    l.pid,
    l.mode,
    l.granted,
    a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;
```

### 3. Prometheus 메트릭

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
```

Prometheus 엔드포인트: `http://localhost:8080/actuator/prometheus`

---

## 🛠️ 문제 해결 체크리스트

- [ ] 느린 쿼리가 있는가? (mean_exec_time > 1000ms)
- [ ] 캐시 히트 비율이 95% 이상인가?
- [ ] 사용되지 않는 인덱스가 있는가?
- [ ] N+1 쿼리가 발생하는가?
- [ ] 테이블 bloat 이 20% 이상인가?
- [ ] 연결 풀이 고갈되는가?
- [ ] 장기간 실행되는 트랜잭션이 있는가?

---

## 📚 추가 리소스

- [PostgreSQL 공식 문서 - 성능 최적화](https://www.postgresql.org/docs/current/performance-tips.html)
- [Pg_stat_statements 문서](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [Hibernate 사용자 가이드](https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/)

---

*Last Updated: 2026-03-31*
