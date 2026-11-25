-- V2_157: 게시글 검색(제목·본문·작성자 이름 부분 일치)에 pg_trgm GIN 인덱스를 둔다(2026-11-25 사용자 승인, DEC-OPS-432 ④).
--
-- 게시판 검색은 QueryDSL contains(LIKE '%검색어%')라 B-tree 인덱스를 쓰지 못하고 게시글 전체를 훑었다(2026-11-25 품질 평가 —
-- BoardPredicate.pstTtlContains·pstCnContains·userNmContains). 게시글이 쌓일수록 목록 검색이 느려진다.
-- trigram GIN 은 앞뒤 와일드카드 LIKE 를 인덱스로 받는다(검색어 3자 이상에서 효과가 크다).
--
-- [두 단계 — 2026-11-25 Codex 검토]
--   ① 확장 설치: pg_trgm 은 확장 설치 권한이 필요하다. 권한이 없거나 서버에 확장이 없는 환경에서 기동이 막히면 안 되므로
--      그 두 오류만 삼키고 건너뛴다(성능 최적화이지 정합성 요건이 아니다 — V2_37 관례).
--   ② 인덱스 생성: 확장이 있을 때만 만든다. 여기서 나는 오류(잠금 대기 초과·시간 초과 등)는 삼키지 않는다 — 삼키면 인덱스 없이
--      성공 이력이 남아 다시 시도되지 않는다. 마이그레이션이 실패하고 다음 배포에서 다시 돈다.
--   PG 전용 구문은 DO $$ EXECUTE 문자열에 둔다 — H2 시험은 문자열만 본다.
--
-- [잠금] CREATE INDEX 는 생성 동안 tb_bbs_item 쓰기(글 등록·수정·삭제)를 막는다. lock_timeout 은 잠금을 얻기까지의 한도이고,
--   생성 시간 자체는 statement_timeout 이 자른다. 2026-11-25 공유 OCI 의 tb_bbs_item 은 378행이라 짧다. 게시글이 많은 운영 DB 는
--   배포 전에 DBA 가 같은 이름으로 미리 만든다(트랜잭션 밖, 쓰기를 막지 않음) — 그러면 이 마이그레이션은 IF NOT EXISTS 로 건너뛴다:
--     CREATE EXTENSION IF NOT EXISTS pg_trgm;
--     CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tb_bbs_item_pst_ttl_trgm ON tb_bbs_item USING gin (pst_ttl gin_trgm_ops);
--     CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tb_bbs_item_pst_cn_trgm  ON tb_bbs_item USING gin (pst_cn gin_trgm_ops);
--     CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tb_bbs_item_user_nm_trgm ON tb_bbs_item USING gin (user_nm gin_trgm_ops);
--   (CONCURRENTLY 가 중간에 실패하면 INVALID 인덱스가 남는다 — DROP INDEX CONCURRENTLY 뒤 다시 만든다.)
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '300s';

DO $$
BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
EXCEPTION
    -- 42501 권한 없음, 58P01 서버에 확장 파일 없음, 0A000 지원하지 않음 — 그 밖의 오류는 마이그레이션을 실패시킨다.
    WHEN insufficient_privilege OR undefined_file OR feature_not_supported THEN
        RAISE NOTICE 'pg_trgm 확장을 설치하지 못해 게시글 검색 인덱스를 건너뜁니다: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_pst_ttl_trgm ON tb_bbs_item USING gin (pst_ttl gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_pst_cn_trgm ON tb_bbs_item USING gin (pst_cn gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_user_nm_trgm ON tb_bbs_item USING gin (user_nm gin_trgm_ops)';
    ELSE
        RAISE NOTICE 'pg_trgm 확장이 없어 게시글 검색 인덱스를 건너뜁니다(권한이 생기면 위 주석의 CONCURRENTLY 절차로 만든다).';
    END IF;
END $$;
