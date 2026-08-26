# PostgreSQL 성능 진단·최적화 가이드

DB 성능 변경은 추정이나 일반 권장값이 아니라 **현재 workload, live schema, 실행계획**을 근거로 한다.
이 문서의 기본 경로는 read-only 진단이다. extension·index·schema·parameter 변경과 VACUUM 같은 쓰기 작업은
[AGENTS.md](../../AGENTS.md)의 승인 경계와
[DB 헌법](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)을 먼저 따른다.

## 현재 프로젝트 설정

- 기본 데이터소스는 PostgreSQL이며 접속정보는 [`application.yml`](../../api-server/src/main/resources/application.yml)에 있다.
- `LegacyConfig`가 `spring.datasource`를 Hikari에 직접 바인딩하므로 pool 설정은 nested
  `spring.datasource.hikari.*`가 아니라 `spring.datasource.*` flat key가 정본이다.
- 현재 기본 pool은 maximum 10, minimum idle 2, connection timeout 3초다. 환경변수 override가 우선한다.
- Hibernate batch는 `spring.jpa.properties.hibernate.jdbc.batch_size=25`, insert/update 정렬 활성 상태다.
- 상세 SQL·binding·Hibernate 통계는
  [`application-dev-performance.yml`](../../api-server/src/main/resources/application-dev-performance.yml)을 명시한
  개발 진단에서만 켠다. 운영에 verbose SQL·binding logging을 상시 적용하지 않는다.

설정값은 바뀔 수 있으므로 문서 숫자보다 현재 YAML과 런타임 actuator·JMX를 우선한다.

## 1. 증상과 기준선 고정

진단 기록에는 다음을 함께 남긴다.

- 대상 endpoint·job·query와 재현 입력
- application·DB SHA/schema version, profile, 데이터량
- p50/p95/p99, 처리량, 오류율, pool active/pending
- query 호출 수·평균/총 시간·반환 행 수
- `EXPLAIN (ANALYZE, BUFFERS)` 실행 조건과 plan
- 같은 시간대 CPU, I/O, lock, JVM pause

임의의 “응답 1초”, “cache hit 95%”, “bloat 20%”를 보편 합격선으로 쓰지 않는다. 서비스 SLO와 이전
기준선을 먼저 정한다.

## 1.5 스키마 최신성 확인 (실측 전 필수)

실측으로 스키마를 판단하기 전에 **그 DB 가 저장소와 같은 스키마인지** 먼저 본다. 뒤처진 DB 로 실측하면
현재가 아닌 과거 스키마를 근거로 결정하게 되며, 이는 실측을 하지 않는 것보다 위험할 수 있다
(2026-08-26 실측: 한 환경이 88개 중 38개만 적용된 상태였고, 그 사이 추가된 인덱스가 없어
"인덱스가 없다"는 잘못된 결론으로 이어질 뻔했다).

```sql
-- 적용 수와 최대 버전을 저장소의 마이그레이션 파일 수·최신 버전과 대조한다.
SELECT count(*) FILTER (WHERE success) AS applied,
       count(*) FILTER (WHERE NOT success) AS failed,
       max(installed_on) AS last_applied
FROM flyway_schema_history;
```

저장소 쪽 기준값은 `api-server/src/main/resources/db/migration/` 의 파일 수와 최신 `V*` 번호다.

### 뒤처진 환경 현행화

Flyway 는 앱 기동 시 실행된다(별도 CLI 태스크 없음). 기본 프로필은 `JWT_SECRET` 만 요구하므로
데이터소스 3개만 덮어 기동하면 마이그레이션이 적용된다(`prod` 프로필은 메일·암호화 키까지 요구한다).

```bash
DB_URL=jdbc:postgresql://<host>:<port>/<db>?currentSchema=public&prepareThreshold=0 DB_USERNAME=<user> DB_PASSWORD=<pass> JWT_SECRET=<secret> ./gradlew :api-server:bootRun
```

⚠ **데이터 정합성 가드에서 멈출 수 있다.** bigint identity 계열 마이그레이션은 부모 없는 자식 행이나
FK 자리의 빈 문자열이 있으면 키를 채울 수 없어 `RAISE EXCEPTION` 으로 중단한다 — 이는 결함이 아니라
**잘못된 데이터로 키를 채우는 것을 막는 정상 동작**이며, PostgreSQL 트랜잭션 DDL 이라 해당 마이그레이션은
통째로 롤백되고 실패 이력도 남지 않는다.

실제로 관측된 두 유형(2026-08-26):

| 지점 | 조건 | 성격 |
|---|---|---|
| `V2_49` 주소록 | `tb_adbk_info` 에 부모(`tb_adbk_manage`)가 없는 행 | `V2_12` 가 부모만 정리하고 자식을 남겨 생긴 고아 |
| `V2_71` 커뮤니티 | `tb_bbs_master.cmnty_id = ''` | 빈 문자열이 FK 로 오인됨(참조가 아니라 "없음") |

정리는 **데이터 변경이므로 사용자 승인이 필요하다**(AGENTS 안전 규칙). 승인 후에는 대상 건수를 먼저 세고,
삭제·정규화 뒤 같은 조건이 0건인지 확인하는 것을 한 트랜잭션으로 묶는다. 판단 근거를 남기려면 조치 전에
대상 행을 조회해 기록한다.

## 2. read-only 진단

저장소 스크립트:

```psql
\i config/db/performance-analysis.sql
```

이 스크립트의 실행 SELECT는 통계·lock·connection·크기 조회다. 뒤쪽 CREATE INDEX와 VACUUM은 주석 예시이며
승인 없는 실행 절차가 아니다. `pg_stat_statements`가 설치·preload되지 않은 환경에서는 관련 query가 실패할 수 있다.

주요 조회:

```sql
SELECT queryid, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

SELECT pid, usename, state, wait_event_type, wait_event,
       age(clock_timestamp(), xact_start) AS transaction_age,
       query
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
ORDER BY xact_start NULLS LAST;

SELECT schemaname, relname, seq_scan, idx_scan, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

통계 reset 시각과 workload 기간을 확인하지 않은 `idx_scan=0`은 삭제 근거가 아니다. 작은 테이블의 seq scan도
정상일 수 있다.

## 3. 실행계획

먼저 쓰기를 실행하지 않는 `EXPLAIN`으로 plan을 확인한다.

```sql
EXPLAIN (VERBOSE, COSTS, SETTINGS)
SELECT ...;
```

`EXPLAIN ANALYZE`는 query를 **실제로 실행**한다. SELECT라도 부하가 클 수 있고 DML이면 데이터가 바뀐다.
승인된 복제·성능 환경에서 제한된 SELECT에만 사용한다.

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)
SELECT ...;
```

확인할 항목:

- estimated row와 actual row 차이
- sequential/index/bitmap scan 선택과 filter 제거 행
- sort/hash spill, temp I/O
- nested loop 반복 수와 N+1 호출
- lock wait와 long transaction
- parameter 값에 따른 plan 차이

## 4. 최적화 선택

### query·fetch 구조

- ORM 호출 수를 먼저 센다. fetch join, projection, batch fetch는 반환 cardinality와 pagination 의미를 확인한 뒤 적용한다.
- 필요한 열·행만 조회하고 정렬·필터 술어를 index 후보와 함께 본다.
- 캐시는 stale 허용 범위와 invalidation 소비자를 먼저 정의한다. hit rate만 높이는 것이 목표가 아니다.

### index

index 변경 전 다음을 증명한다.

1. 실제 query predicate·join·order와 column 순서가 맞는다.
2. representative data에서 plan과 latency가 개선된다.
3. write amplification·storage·vacuum 비용이 허용된다.
4. 동등·prefix 중복 index가 없다.
5. Flyway migration, rollback, production lock 방식이 정의됐다.

`CREATE/DROP INDEX CONCURRENTLY`도 schema 변경이다. 문서 예시를 콘솔에 복사해 실행하지 않고 사용자 승인 뒤
migration으로 관리한다.

### pool·batch

- pool 크기는 `CPU * 2 + 1` 같은 공식으로 단정하지 않는다. DB `max_connections`, app instance 수, query latency,
  pending·timeout을 함께 측정한다.
- pool을 키우기 전에 slow query와 long transaction을 해결한다. 인스턴스 수 × pool max가 DB 예산을 넘지 않아야 한다.
- batch size 변경은 SQL round trip 개선과 메모리·lock duration·generated key 동작을 함께 검증한다.

### VACUUM·통계

autovacuum 지연, dead tuple, transaction age를 확인한 뒤 원인을 판정한다. 수동 `VACUUM ANALYZE`나 DB parameter
변경은 운영 창구와 승인 아래 수행한다. 장기 transaction이 vacuum을 막는다면 vacuum 반복보다 transaction 원인을
먼저 해결한다.

## 5. 변경 검증

1. 같은 데이터 snapshot과 workload로 변경 전·후를 여러 회차 비교한다.
2. latency뿐 아니라 error, CPU/I/O, lock, pool pending, write throughput을 함께 본다.
3. schema 변경은 live `information_schema`와 Flyway history, application mapping을 대조한다.
4. backend 영향 테스트와 `./gradlew compileJava compileTestJava`를 실행한다.
5. 실제 부하가 필요하면 [k6 가이드](load-test-guide.md)를 따르고, 미실행이면 그렇게 보고한다.
6. 개선이 noise보다 작거나 다른 SLO를 악화시키면 원복한다.

관련: [성능 최적화 가이드](performance-optimization-guide.md),
[DB 표준화 매뉴얼](../03-guides/db-standardization-manual.md).
