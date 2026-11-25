-- V2_157: 게시글 검색(제목·본문·작성자 이름 부분 일치)에 pg_trgm GIN 인덱스를 둔다(2026-11-25 사용자 승인, DEC-OPS-432 ④).
--
-- 게시판 검색은 QueryDSL contains(LIKE '%검색어%')라 B-tree 인덱스를 쓰지 못하고 게시글 전체를 훑었다(2026-11-25 품질 평가 —
-- BoardPredicate.pstTtlContains·pstCnContains·userNmContains). 게시글이 쌓일수록 목록 검색이 느려진다.
-- trigram GIN 은 앞뒤 와일드카드 LIKE 를 인덱스로 받는다(검색어 3자 이상에서 효과가 크다).
--
-- [V2_37 관례] pg_trgm 은 확장 설치 권한이 필요하다. 권한이 없는 환경에서 기동이 막히면 안 되므로 실패를 삼키고 인덱스를
--   건너뛴다(성능 최적화이지 정합성 요건이 아니다). PG 전용 구문은 DO $$ EXECUTE 문자열에 둔다 — H2 시험은 문자열만 본다.
-- [잠금] CREATE INDEX 는 생성 동안 테이블 쓰기를 막는다. 2026-09-25 OCI 실측 tb_bbs_item 은 378행이라 짧다 — 큰 운영 복제본은
--   유지보수 창에서 소요 시간을 먼저 재고, 필요하면 DBA 절차로 CONCURRENTLY 생성한다(Flyway 트랜잭션 밖).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '300s';

DO $$
BEGIN
    BEGIN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
        EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_pst_ttl_trgm ON tb_bbs_item USING gin (pst_ttl gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_pst_cn_trgm ON tb_bbs_item USING gin (pst_cn gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_user_nm_trgm ON tb_bbs_item USING gin (user_nm gin_trgm_ops)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_trgm 인덱스 생성을 건너뜁니다(확장 권한 부재 가능): %', SQLERRM;
    END;
END $$;
