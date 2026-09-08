-- ADR-0012: 사용자 승인(2026-09-08)에 따른 블로그 도메인 Contract.
-- V2_89가 쓰기를 차단한다. 블로그 제거 코드 전환 후 적용한다.
-- 잠금/데이터/예상 밖 의존성이 있으면 중단한다. CASCADE와 업무 데이터 삭제는 사용하지 않는다.
LOCK TABLE tb_blog_info, tb_blog_user_map, tb_bbs_master, tb_bbs_item
    IN ACCESS EXCLUSIVE MODE NOWAIT;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_blog_info)
        OR EXISTS (SELECT 1 FROM tb_blog_user_map)
        OR EXISTS (SELECT 1 FROM tb_bbs_master WHERE blog_sn IS NOT NULL OR blog_yn NOT IN ('N'))
        OR EXISTS (SELECT 1 FROM tb_bbs_item WHERE blog_sn IS NOT NULL) THEN
        RAISE EXCEPTION 'blog retirement requires empty blog data and references';
    END IF;
END $$;

ALTER TABLE tb_bbs_master DROP CONSTRAINT ck_tb_bbs_master_blog_retired;
ALTER TABLE tb_bbs_item DROP CONSTRAINT ck_tb_bbs_item_blog_retired;
ALTER TABLE tb_bbs_master DROP COLUMN blog_sn; -- linter:ignore ZDM-2026-0006 ADR-0012: 비어 있는 블로그 연결 필드 폐기
ALTER TABLE tb_bbs_master DROP COLUMN blog_yn; -- linter:ignore ZDM-2026-0007 ADR-0012: 폐기된 블로그 기능 여부 제거
ALTER TABLE tb_bbs_item DROP COLUMN blog_sn; -- linter:ignore ZDM-2026-0008 ADR-0012: 비어 있는 게시글 블로그 연결 폐기
DROP TABLE tb_blog_user_map; -- linter:ignore ZDM-2026-0009 ADR-0012: 비어 있는 블로그 회원 테이블 폐기
DROP TABLE tb_blog_info; -- linter:ignore ZDM-2026-0010 ADR-0012: 비어 있는 블로그 테이블과 소유 identity sequence 폐기
