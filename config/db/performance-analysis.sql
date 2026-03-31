-- ==========================================
-- PostgreSQL 성능 분석 및 최적화 스크립트
-- eGov Enterprise 데이터베이스 최적화
-- ==========================================

-- 1. 느린 쿼리 분석 (pg_stat_statements)
-- -----------------------------------------
-- 주의: pg_stat_statements 확장 기능이 활성화되어 있어야 합니다.
-- 활성화 방법: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 가장 오래 실행되는 쿼리 상위 10 개
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 가장 많이 실행된 쿼리 상위 10 개
SELECT 
    query,
    calls,
    total_exec_time,
    rows
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- 전체 실행 시간이 가장 긴 쿼리 상위 10 개
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;


-- 2. 인덱스 사용 현황 분석
-- -----------------------------------------

-- 인덱스 사용 빈도 분석
SELECT 
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 인덱스를 사용하지 않는 테이블 (전체 스캔 발생 가능성)
SELECT 
    schemaname,
    relname AS table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_scan - idx_scan AS seq_minus_idx
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan DESC;

-- 사용되지 않는 인덱스 (삭제 후보)
SELECT 
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;


-- 3. 테이블 및 인덱스 크기 분석
-- -----------------------------------------

-- 테이블 크기 순위
SELECT 
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- 인덱스 크기 순위
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;


-- 4. 테이블 bloat (낭비 공간) 분석
-- -----------------------------------------

-- 테이블 bloat 추정 (간이 버전)
SELECT 
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    CASE 
        WHEN n_live_tup > 0 THEN round(100.0 * n_dead_tup / n_live_tup, 2)
        ELSE 0 
    END AS dead_ratio_percent
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC;


-- 5. 잠금 (Lock) 분석
-- -----------------------------------------

-- 현재 활성 잠금
SELECT 
    l.locktype,
    l.database,
    l.relation::regclass,
    l.page,
    l.tuple,
    l.virtualxid,
    l.transactionid,
    l.classid::regclass,
    l.objid,
    l.objsubid,
    l.virtualtransaction,
    l.pid,
    l.mode,
    l.granted,
    a.query,
    a.age(clock_timestamp(), a.xact_start) AS query_age
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.granted = true
ORDER BY a.xact_start;

-- 잠금을 기다리는 쿼리
SELECT 
    l.locktype,
    l.relation::regclass,
    l.pid,
    l.mode,
    l.granted,
    a.query,
    a.age(clock_timestamp(), a.xact_start) AS query_age
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.granted = false
ORDER BY a.xact_start;


-- 6. 캐시 히트 비율 분석
-- -----------------------------------------

-- 데이터베이스 캐시 히트 비율
SELECT 
    datname,
    numbackends,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit,
    round(100.0 * blks_hit / nullif(blks_hit + blks_read, 0), 2) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();

-- 테이블별 캐시 히트 비율
SELECT 
    schemaname,
    relname,
    heap_blks_read,
    heap_blks_hit,
    round(100.0 * heap_blks_hit / nullif(heap_blks_hit + heap_blks_read, 0), 2) AS cache_hit_ratio
FROM pg_statio_user_tables
ORDER BY heap_blks_read DESC;


-- 7. 연결 (Connection) 분석
-- -----------------------------------------

-- 현재 연결 상태
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    wait_event_type,
    wait_event,
    query,
    age(clock_timestamp(), xact_start) AS transaction_age,
    age(clock_timestamp(), query_start) AS query_age
FROM pg_stat_activity
WHERE state IS NOT NULL
ORDER BY query_start;

-- 연결 수 집계
SELECT 
    state,
    count(*) AS connection_count
FROM pg_stat_activity
GROUP BY state;


-- 8. 추천 인덱스 생성 스크립트
-- -----------------------------------------

-- 자주 조회되는 컬럼에 인덱스 생성 예시
-- 실제 환경에 맞게 수정하여 사용하세요.

-- 예: 사용자 ID 로 자주 조회하는 경우
-- CREATE INDEX CONCURRENTLY idx_users_username ON users(username);

-- 예: 생성일자로 정렬/필터링하는 경우
-- CREATE INDEX CONCURRENTLY idx_posts_created_at ON posts(created_at DESC);

-- 예: 복합 인덱스 (여러 컬럼으로 필터링)
-- CREATE INDEX CONCURRENTLY idx_common_codes_group ON common_codes(group_id, use_at);


-- 9. VACUUM 및 ANALYZE 실행
-- -----------------------------------------

-- 모든 테이블 VACUUM ANALYZE
-- VACUUM ANALYZE;

-- 특정 테이블만 VACUUM ANALYZE
-- VACUUM ANALYZE common_code;
-- VACUUM ANALYZE users;


-- 10. 설정 값 확인
-- -----------------------------------------

-- 주요 PostgreSQL 설정 값
SHOW shared_buffers;
SHOW work_mem;
SHOW maintenance_work_mem;
SHOW effective_cache_size;
SHOW random_page_cost;
SHOW max_connections;
