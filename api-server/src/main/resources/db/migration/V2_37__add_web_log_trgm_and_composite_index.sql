-- V2_37: tb_web_log 검색·정렬 인덱스 (pg_trgm GIN + occr_ymd/url 복합)
--
-- [근거] 12축 감사 Wave 2 '검색 인덱스 0건'. 접속기록 조회가 URL 부분검색 + 일자 정렬인데
--   해당 축에 인덱스가 없어 tb_web_log 가 커질수록 전수 스캔이 된다.
--
-- [2026-08-03 이전·정정] 이 마이그레이션은 처음에
--   `business-core/src/main/resources/db/migration/V2_34__...` 로 작성됐다. 두 가지가 틀렸다.
--
--   ① **버전 충돌** — `api-server/.../V2_34__disable_scratch_seed_menus.sql` 이 이미 2.34 를 쓴다.
--      두 모듈의 리소스가 같은 `classpath:db/migration` 에 합류하므로 Flyway 는
--      "Found more than one migration with version 2.34" 로 **기동을 거부**한다.
--      (마이그레이션 소유를 모듈별로 나누면 번호 공간이 갈라져 이 충돌이 구조적으로 반복된다 —
--       그래서 위치도 api-server 단일 소유로 되돌린다.)
--
--   ② **H2 파싱 실패** — 원본은 `CREATE EXTENSION` / `USING gin (url gin_trgm_ops)` 를 평문으로 뒀다.
--      단위 테스트는 H2 에서 Flyway 를 돌리므로 이 파일이 통째로 파싱 실패해
--      `entityManagerFactory` 생성이 깨지고 business-core 영속성 테스트가 무더기로 red 가 됐다.
--      이 저장소의 기존 관례(V2_4·V2_5 등)대로 PG 전용 구문을 `DO $$ ... $$` + `EXECUTE` 안에
--      **문자열로** 넣는다 — 그러면 H2 는 문자열만 보고 넘어가고, PostgreSQL 에서만 실제 실행된다.
--
-- [멱등] IF NOT EXISTS + 예외 무시. 재적용·기적용 DB 양쪽 안전.
-- [무중단] CREATE INDEX 는 테이블 쓰기를 잠근다. 대용량 tb_web_log 에서는 운영 반영 시
--   `CONCURRENTLY` 를 고려할 것 — 단 CONCURRENTLY 는 트랜잭션 밖에서만 되므로 Flyway 로는 불가하며,
--   그 경우 운영 DBA 절차로 분리한다(여기서는 신규/소규모 DB 기준으로 일반 CREATE INDEX 를 쓴다).

DO $$
BEGIN
    -- pg_trgm 은 확장 설치 권한이 필요하다. 권한이 없는 환경에서 기동이 막히면 안 되므로
    -- 실패를 삼키고 GIN 인덱스도 함께 건너뛴다(성능 최적화이지 정합성 요건이 아니다).
    BEGIN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
        EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_web_log_url_trgm '
             || 'ON tb_web_log USING gin (url gin_trgm_ops)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_trgm 인덱스 생성을 건너뜁니다(확장 권한 부재 가능): %', SQLERRM;
    END;

    -- 날짜 범주 조회 + 정렬 최적화. 확장 불요라 항상 만든다.
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_web_log_occr_ymd_url '
         || 'ON tb_web_log (occr_ymd DESC, url)';
END $$;
