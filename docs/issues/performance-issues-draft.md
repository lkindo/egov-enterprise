# 성능 이슈 초안 (Performance Issues Draft)

## 개요

부하 테스트中发现된 예상 병목 지점과 성능 문제들을 정리한 문서입니다.  
테스트 실행 후 실제 결과에 기반하여 업데이트될 예정입니다.

---

## 예상 병목 지점

### 1. DB 커넥션 풀 (High Priority)

**증상:**
- 고부하 시 DB 커넥션 고갈로 인한 요청 지연
- `Cannot acquire connection from pool` 에러 발생 가능성

**예상 근거:**
- 기본 HikariCP 설정: maxPoolSize = 10
- 1000 명 동시 사용자 시 초당 수백 건의 쿼리 발생
- 복잡한 조인 쿼리 (대시보드 조회) 가 장시간 커넥션 점유

**영향:**
- 응답시간 급증 (p95 > 2000ms 예상)
- 요청 실패율 증가 (5% 이상)

**확인 방법:**
```sql
-- 현재 커넥션 풀 상태 확인
SELECT 
    schemaname, 
    relname, 
    seq_scan, 
    idx_scan, 
    n_tup_ins, 
    n_tup_upd, 
    n_tup_del
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

**개선 방안:**
1. HikariCP maxPoolSize 증가 (기본 10 → 50)
2. 쿼리 타임아웃 설정 (30 초)
3. 느린 쿼리 로깅 활성화
4. 인덱스 추가 검토

---

### 2. 대시보드 조회 쿼리 최적화 (High Priority)

**증상:**
- 대시보드 조회 API 응답시간이 다른 엔드포인트보다 김
- 여러 테이블 조인 및 집계 함수 사용

**예상 SQL:**
```sql
SELECT 
    COUNT(DISTINCT u.user_id) AS total_users,
    COUNT(DISTINCT p.post_id) AS total_posts,
    SUM(p.view_count) AS total_views
FROM users u
CROSS JOIN posts p
-- ... 추가 조인
```

**영향:**
- p95 응답시간 기준치 초과 (1000ms)
- DB CPU 사용률 급증

**개선 방안:**
1. 캐싱 도입 (Redis, 5 분 TTL)
2. 물질화 뷰 (Materialized View) 활용
3. 비동기 집계 테이블 사용
4. 쿼리 단순화 (불필요한 조인 제거)

---

### 3. 게시글 등록 시 고유성 검증 오버헤드 (Medium Priority)

**증상:**
- 게시글 등록 시 중복 제목 검증 로직
- 고부하 시 동시성 문제 발생 가능성

**예상 코드:**
```java
@Transactional
public Post createPost(PostCreateRequest request) {
    // 중복 제목 검증 (전체 스캔)
    if (postRepository.existsByTitle(request.getTitle())) {
        throw new DuplicateTitleException();
    }
    return postRepository.save(request.toEntity());
}
```

**영향:**
- 등록 요청 처리 시간 증가
- 동시 등록 시 데드락 가능성

**개선 방안:**
1. DB 유니크 제약조건 활용 (추천)
2. Redis 를 사용한 분산 락
3. 비동기 검증 (최종 일관성)
4. 제목 중복 허용 정책 검토

---

### 4. JWT 토큰 검증 오버헤드 (Medium Priority)

**증상:**
- 모든 인증 요청마다 JWT 서명 검증
- RSA 비대칭 키 사용 시 연산 비용 높음

**영향:**
- 인증된 API 호출 시 응답시간 50-100ms 증가
- 고부하 시 CPU 사용률 20% 이상 점유

**개선 방안:**
1. HMAC 대칭키 방식 전환 (성능 우선)
2. 토큰 검증 결과 캐싱 (단, 만료 시간 고려)
3. API Gateway 에서 일괄 검증
4. 무상태 인증 유지 vs 세션 기반 전환 검토

---

### 5. 로깅 및 감사 로그 동기 작성 (Low Priority)

**증상:**
- 모든 API 호출에 대한 동기 로깅
- DB 감사 로그 테이블에 직접 삽입

**영향:**
- 요청 처리 시간의 10-20% 를 로깅이 점유
- 고부하 시 로그 작성 병목

**개선 방안:**
1. 비동기 로깅 (Logback AsyncAppender)
2. 배치 삽입 (100 건마다 일괄 작성)
3. 샘플링 로깅 (10% 만 상세 로그)
4. 로그 레벨 동적 조정

---

### 6. JSON 직렬화/역직렬화 (Low Priority)

**증상:**
- 대용량 JSON 응답 시 직렬화 시간 증가
- Jackson 기본 설정은 범용성 우선

**영향:**
- 대시보드 응답 (예상 10KB+) 직렬화 시 50ms 소요
- 전체 응답시간의 5-10% 점유

**개선 방안:**
1. JSON 필드 필터링 (불필요한 필드 제거)
2. Gson 대신 Jackson 사용 (이미 사용 중)
3. Binary 포맷 고려 (Protobuf, MsgPack)
4. 응답 압축 (GZIP)

---

## 이슈 등록 템플릿

### GitHub Issue 템플릿

```markdown
## [Performance] {이슈 제목}

### 설명
{간단한 설명}

### 재현 단계
1. k6 부하 테스트 실행 (--scenario users-{level})
2. {특정 API} 호출
3. {증상 관찰}

### 예상 동작
{정상적인 경우의 동작}

### 실제 동작
{문제 발생 시 동작}

### 환경
- k6 v1.7.1
- Spring Boot 3.x
- PostgreSQL 14
- 부하 레벨: {100|500|1000}

### 성능 메트릭
- 평균 응답시간: {value}ms
- p(95) 응답시간: {value}ms
- TPS: {value}
- 실패율: {value}%

### 스크린샷
{k6 HTML 리포트 또는 Grafana 스크린샷}

### 제안 해결 방안
1. {해결 방안 1}
2. {해결 방안 2}

### 참고
- 관련 테스트 리포트: {링크}
- 관련 코드: {링크}
```

---

## 우선순위 정의

| 우선순위 | 기준 | 대응 시간 |
|---------|------|----------|
| **Critical** | 서비스 마비, 데이터 유실 | 즉시 |
| **High** | SLO 심각하게 미달 (응답시간 2 배 이상) | 24 시간 이내 |
| **Medium** | SLO 경미하게 미달 (10-20% 초과) | 1 주 이내 |
| **Low** | 개선 여지 있음, 영향 미미 | 다음 스프린트 |

---

## 다음 단계

1. **k6 설치** - https://k6.io/docs/getting-started/installation/
2. **100 명 부하 테스트 실행** - 실제 메트릭 수집
3. **이 문서 업데이트** - 실제 병목 지점 기록
4. **GitHub Issues 등록** - 우선순위에 따라
5. **개선 작업** - 개발 팀과 협업
6. **재테스트** - 개선 효과 검증

---

## 참고 문서

- [LOAD_TEST_GUIDE.md](./LOAD_TEST_GUIDE.md)
- [load-test-report-1.md](./reports/load-test-report-1.md)
- [records/](../records/) - 개별 테스트 결과

---

**문서 상태**: 📝 초안 (테스트 실행 필요)  
**최종 업데이트**: 2026-04-01
