-- ADR-0012: 사용하지 않는 블로그 도메인의 쓰기를 먼저 차단한다.
-- 기존 데이터가 있으면 검증된 CHECK 추가가 실패하며 데이터는 삭제하지 않는다.
-- 읽기 호환성을 유지하는 Expand 단계. V2_90 적용 전 블로그를 제거한 애플리케이션으로 전환한다.
LOCK TABLE tb_blog_info, tb_blog_user_map, tb_bbs_master, tb_bbs_item
    IN ACCESS EXCLUSIVE MODE NOWAIT;

ALTER TABLE tb_blog_info
    ADD CONSTRAINT ck_tb_blog_info_retired CHECK (false);
ALTER TABLE tb_blog_user_map
    ADD CONSTRAINT ck_tb_blog_user_map_retired CHECK (false);
ALTER TABLE tb_bbs_master
    ADD CONSTRAINT ck_tb_bbs_master_blog_retired
        CHECK (blog_sn IS NULL AND (blog_yn IS NULL OR blog_yn = 'N'));
ALTER TABLE tb_bbs_item
    ADD CONSTRAINT ck_tb_bbs_item_blog_retired CHECK (blog_sn IS NULL);
