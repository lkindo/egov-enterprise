-- V2_157: 게시글 검색(제목·본문·작성자 이름 부분 일치)에 pg_trgm GIN 인덱스를 둔다(2026-11-25 사용자 승인, DEC-OPS-432 ④).
--
-- 게시판 검색은 QueryDSL contains(LIKE '%검색어%')라 B-tree 인덱스를 쓰지 못하고 게시글 전체를 훑었다(2026-11-25 품질 평가 —
-- BoardPredicate.pstTtlContains·pstCnContains·userNmContains). 게시글이 쌓일수록 목록 검색이 느려진다.
-- trigram GIN 은 앞뒤 와일드카드 LIKE 를 인덱스로 받는다(검색어 3자 이상에서 효과가 크다).
--
-- [두 단계 — 2026-11-25 Codex 1·2차 검토]
--   ① 확장 설치: pg_trgm 은 확장 설치 권한이 필요하다. 권한이 없거나 서버에 확장이 없는 환경에서 기동이 막히면 안 되므로
--      그 오류만 삼키고 건너뛴다(성능 최적화이지 정합성 요건이 아니다 — V2_37 관례).
--   ② 인덱스: 카탈로그를 먼저 본다 — 일반 CREATE INDEX 는 IF NOT EXISTS 라도 이름을 보기 전에 표 잠금을 요청하므로, 이미 있으면
--      생성문을 아예 내지 않는다(잠금 없음). 이미 있는데 쓸 수 없거나(INVALID — CONCURRENTLY 실패 잔여) 정의가 다르면 멈춘다.
--      없으면 게시글이 적을 때만 여기서 만든다 — 생성 동안 tb_bbs_item 쓰기가 막히기 때문이다. 많으면(추정 50,000행 초과) 멈추고
--      배포 전 사전 생성을 요구한다. 오류(잠금 대기 초과·시간 초과 포함)는 삼키지 않는다 — 마이그레이션이 실패하고 다음 배포에서
--      다시 돈다(인덱스 없이 성공 이력이 남지 않는다). 연산자 클래스는 확장이 설치된 스키마로 한정한다(search_path 와 무관).
--   PG 전용 구문은 DO $$ EXECUTE 문자열에 둔다 — H2 시험은 Flyway 를 쓰지 않는다.
--
-- [게시글이 많은 DB — 배포 전 DBA 절차] 트랜잭션 밖에서 쓰기를 막지 않고 만든다. 그러면 이 마이그레이션은 잠금 없이 건너뛴다.
--   (확장이 public 이 아닌 스키마에 있으면 gin_trgm_ops 를 그 스키마로 한정한다.)
--     CREATE EXTENSION IF NOT EXISTS pg_trgm;
--     CREATE INDEX CONCURRENTLY ix_tb_bbs_item_pst_ttl_trgm ON tb_bbs_item USING gin (pst_ttl gin_trgm_ops);
--     CREATE INDEX CONCURRENTLY ix_tb_bbs_item_pst_cn_trgm  ON tb_bbs_item USING gin (pst_cn gin_trgm_ops);
--     CREATE INDEX CONCURRENTLY ix_tb_bbs_item_user_nm_trgm ON tb_bbs_item USING gin (user_nm gin_trgm_ops);
--   CONCURRENTLY 가 중간에 실패하면 INVALID 인덱스가 남는다 — DROP INDEX CONCURRENTLY <이름> 뒤 다시 만든다(이 마이그레이션은
--   INVALID 인덱스를 보면 멈춘다). 2026-11-25 공유 OCI 의 tb_bbs_item 은 378행이라 여기서 만든다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '300s';

DO $$
BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
EXCEPTION
    -- 42501 권한 없음, 58P01 확장 파일을 열지 못함, 0A000 서버에 확장 없음 — 그 밖의 오류는 마이그레이션을 실패시킨다.
    WHEN insufficient_privilege OR undefined_file OR feature_not_supported THEN
        RAISE NOTICE 'pg_trgm 확장을 설치하지 못해 게시글 검색 인덱스를 건너뜁니다: %', SQLERRM;
END $$;

DO $$
DECLARE
    trgm_schema text;
    estimated_rows double precision;
    spec record;
    found_index record;
BEGIN
    SELECT n.nspname INTO trgm_schema
      FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
     WHERE e.extname = 'pg_trgm';
    IF trgm_schema IS NULL THEN
        RAISE NOTICE 'pg_trgm 확장이 없어 게시글 검색 인덱스를 건너뜁니다(권한이 생기면 머리 주석의 CONCURRENTLY 절차로 만든다).';
        RETURN;
    END IF;

    FOR spec IN SELECT * FROM (VALUES
            ('ix_tb_bbs_item_pst_ttl_trgm', 'pst_ttl'),
            ('ix_tb_bbs_item_pst_cn_trgm', 'pst_cn'),
            ('ix_tb_bbs_item_user_nm_trgm', 'user_nm')) AS v(index_name, column_name) LOOP
        SELECT i.indrelid, i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid) AS definition INTO found_index
          FROM pg_class ic JOIN pg_index i ON i.indexrelid = ic.oid
         WHERE ic.relname = spec.index_name
           AND ic.relnamespace = (SELECT relnamespace FROM pg_class WHERE oid = 'tb_bbs_item'::regclass);
        IF FOUND THEN
            IF found_index.indrelid <> 'tb_bbs_item'::regclass OR NOT found_index.indisvalid OR NOT found_index.indisready
                    OR found_index.definition NOT LIKE '%USING gin (' || spec.column_name || ' %gin_trgm_ops)%' THEN
                RAISE EXCEPTION '인덱스 % 가 이미 있지만 쓸 수 없거나(INVALID) 정의가 다릅니다: % — DROP INDEX CONCURRENTLY % 뒤 다시 만드세요.',
                    spec.index_name, found_index.definition, spec.index_name;
            END IF;
            CONTINUE; -- 유효한 같은 인덱스가 있다 — 생성문을 내지 않으므로 표 잠금도 없다.
        END IF;

        IF estimated_rows IS NULL THEN
            SELECT c.reltuples INTO estimated_rows FROM pg_class c WHERE c.oid = 'tb_bbs_item'::regclass;
            IF estimated_rows < 0 THEN -- 한 번도 분석하지 않은 표 — 실제 행 수를 센다(읽기 잠금만 쓴다).
                SELECT count(*) INTO estimated_rows FROM tb_bbs_item;
            END IF;
        END IF;
        IF estimated_rows > 50000 THEN
            RAISE EXCEPTION '게시글이 많아(약 % 행) 인덱스 % 를 마이그레이션 안에서 만들지 않습니다 — 생성 동안 게시글 쓰기가 막힙니다. 배포 전에 V2_157 머리 주석의 CONCURRENTLY 절차로 만드세요.',
                estimated_rows::bigint, spec.index_name;
        END IF;
        EXECUTE format('CREATE INDEX %I ON tb_bbs_item USING gin (%I %I.gin_trgm_ops)', spec.index_name, spec.column_name, trgm_schema);
    END LOOP;
END $$;
