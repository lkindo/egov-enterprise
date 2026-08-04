-- V2_38: 첨부 참조원 역참조 인덱스 (atch_file_id 13종)
--
-- [근거] 첨부 인가를 '도달성'으로 판정하도록 바꿨다(FileAccessPolicy / AttachmentSource).
--   목록 조회·다운로드 1건마다 "이 atch_file_id 를 참조하는 업무 행이 있는가" 를 참조원별로 묻는다.
--   그 컬럼에 인덱스가 없으면 첨부 1건 열람이 13개 테이블 전수 스캔이 된다 —
--   인가를 붙이면서 성능 회귀를 같이 심는 셈이라, 가드와 같은 변경에 인덱스를 함께 넣는다.
--
-- [대상 확정 근거] 2026-08-04 information_schema 전수 조회.
--   atch_file_id 컬럼 보유 테이블 = tb_file_master/tb_file_detail(저장소 자신) + 아래 13종.
--   코드의 atchFileId 보유 @Entity 13종과 1:1 대응하며, 그 정합은
--   AttachmentSourceRegistryLinterTest 가 pre-push 에서 기계로 고정한다.
--
-- [H2 호환] 단위 테스트는 H2 에서 Flyway 를 돌린다. PG 전용은 아니지만 저장소 관례(V2_37)를 따라
--   DO $$ + EXECUTE 문자열로 감싼다 — H2 는 문자열만 보고 넘어가고 PostgreSQL 에서만 실제 실행된다.
--
-- [멱등] CREATE INDEX IF NOT EXISTS. 재적용·기적용 DB 양쪽 안전.
-- [무중단] 일반 CREATE INDEX 는 대상 테이블 쓰기를 잠근다. 현행 실측 행수는 최대 462행
--   (tb_email_dsptch_manage)이라 잠금 시간이 무시 가능하다. 대용량 이관 후에는 CONCURRENTLY 를
--   운영 DBA 절차로 분리할 것(Flyway 트랜잭션 안에서는 불가).

DO $$
BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_atch_file_id ON tb_bbs_item (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_faq_info_atch_file_id ON tb_faq_info (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_bnr_info_atch_file_id ON tb_bnr_info (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_schdl_info_atch_file_id ON tb_schdl_info (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_dept_task_info_atch_file_id ON tb_dept_task_info (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_dscsn_list_atch_file_id ON tb_dscsn_list (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_diary_info_atch_file_id ON tb_diary_info (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_rpt_info_atch_file_id ON tb_rpt_info (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_memo_rpt_info_atch_file_id ON tb_memo_rpt_info (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_rward_manage_atch_file_id ON tb_rward_manage (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_email_dsptch_manage_atch_file_id ON tb_email_dsptch_manage (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_note_info_atch_file_id ON tb_note_info (atch_file_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_dta_use_stats_atch_file_id ON tb_dta_use_stats (atch_file_id)';

    -- 쪽지 첨부의 소유 판정은 note_id 로 발신/수신 테이블을 조인한다. 그 축도 함께 연다.
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_note_sndng_note_id ON tb_note_sndng (note_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_note_rcptn_note_id ON tb_note_rcptn (note_id)';

    -- 팝업은 유일하게 URL 문자열(file_url)로 첨부를 참조한다(전용 컬럼 없음).
    -- 판정이 등가 비교라 일반 btree 로 충분하다.
    EXECUTE 'CREATE INDEX IF NOT EXISTS ix_tb_popup_info_file_url ON tb_popup_info (file_url)';
END $$;
