-- ADR-0013: 승인된 24개 표준 길이 정합 중 일반 VARCHAR 확장 19개.
-- 기존 데이터/표준을 다시 검사한다. 값 절단·메타 표준 변경·설계 보류 6개 변경은 하지 않는다.
-- 각 파일은 Flyway transaction 단위로 원자적이다. 여러 파일의 배포는 runbook의 단계 경계를 따른다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE tb_adbk_manage, tb_bbs_item, tb_cmnty_info, tb_email_dsptch_manage, tb_extrl_hr_info, tb_file_detail, tb_inst_cd, tb_inst_cd_rcptn_log, tb_menu_info, tb_note_info, tb_ognz_info, tb_role_info, tb_rward_manage, tb_schdl_info, tb_srvy_info, tb_srvy_tmplt, tb_stmp_info IN ACCESS EXCLUSIVE MODE NOWAIT;

DO $$
DECLARE
    target RECORD;
    oversized BOOLEAN;
BEGIN
    FOR target IN SELECT * FROM (VALUES
        ('tb_adbk_manage','adbk_nm',100,200),
        ('tb_bbs_item','pst_ttl',100,256),
        ('tb_cmnty_info','cmnty_nm',100,300),
        ('tb_email_dsptch_manage','eml_ttl',100,256),
        ('tb_extrl_hr_info','ogdp_inst_nm',100,200),
        ('tb_file_detail','orgnl_file_nm',100,300),
        ('tb_file_detail','strg_file_nm',100,300),
        ('tb_inst_cd','inst_abbr_nm',100,300),
        ('tb_inst_cd_rcptn_log','inst_abbr_nm',100,300),
        ('tb_menu_info','rel_img_nm',100,300),
        ('tb_note_info','note_ttl',100,256),
        ('tb_ognz_info','ognz_nm',100,200),
        ('tb_role_info','role_nm',100,300),
        ('tb_rward_manage','rwrd_nm',100,300),
        ('tb_schdl_info','schdl_nm',100,300),
        ('tb_srvy_info','srvy_prps',1000,4000),
        ('tb_srvy_info','srvy_ttl',100,256),
        ('tb_srvy_tmplt','srvy_tmplt_path_nm',100,300),
        ('tb_stmp_info','mpng_file_nm',100,300)
    ) AS desired(table_name,column_name,old_length,new_length)
    LOOP
        IF (SELECT count(*) FROM meta_standard_terms t
            JOIN meta_standard_domains d ON d.domain_name=t.domain_name
            WHERE lower(t.eng_abbr)=target.column_name
              AND upper(d.data_type) IN ('VARCHAR','CHARACTER VARYING')
              AND d.data_length=target.new_length) <> 1 THEN
            RAISE EXCEPTION 'Standard metadata mismatch for %.%',target.table_name,target.column_name;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema='public' AND c.table_name=target.table_name
              AND c.column_name=target.column_name AND c.data_type='character varying'
              AND c.character_maximum_length=target.old_length) THEN
            RAISE EXCEPTION 'Unexpected physical type for %.%',target.table_name,target.column_name;
        END IF;
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE char_length(%I)>%s)',
            target.table_name,target.column_name,target.new_length) INTO oversized;
        IF oversized THEN
            RAISE EXCEPTION 'Over-length data in %.%; migration refused without truncation',target.table_name,target.column_name;
        END IF;
    END LOOP;
END $$;

ALTER TABLE tb_adbk_manage ALTER COLUMN adbk_nm TYPE varchar(200); -- linter:ignore ZDM-2026-0011 tb_adbk_manage.adbk_nm 표준 200자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_bbs_item ALTER COLUMN pst_ttl TYPE varchar(256); -- linter:ignore ZDM-2026-0012 tb_bbs_item.pst_ttl 표준 256자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_cmnty_info ALTER COLUMN cmnty_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0013 tb_cmnty_info.cmnty_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_email_dsptch_manage ALTER COLUMN eml_ttl TYPE varchar(256); -- linter:ignore ZDM-2026-0014 tb_email_dsptch_manage.eml_ttl 표준 256자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_extrl_hr_info ALTER COLUMN ogdp_inst_nm TYPE varchar(200); -- linter:ignore ZDM-2026-0015 tb_extrl_hr_info.ogdp_inst_nm 표준 200자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_file_detail ALTER COLUMN orgnl_file_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0016 tb_file_detail.orgnl_file_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_file_detail ALTER COLUMN strg_file_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0017 tb_file_detail.strg_file_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_inst_cd ALTER COLUMN inst_abbr_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0018 tb_inst_cd.inst_abbr_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN inst_abbr_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0019 tb_inst_cd_rcptn_log.inst_abbr_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_menu_info ALTER COLUMN rel_img_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0020 tb_menu_info.rel_img_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_note_info ALTER COLUMN note_ttl TYPE varchar(256); -- linter:ignore ZDM-2026-0021 tb_note_info.note_ttl 표준 256자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_ognz_info ALTER COLUMN ognz_nm TYPE varchar(200); -- linter:ignore ZDM-2026-0022 tb_ognz_info.ognz_nm 표준 200자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_role_info ALTER COLUMN role_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0023 tb_role_info.role_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_rward_manage ALTER COLUMN rwrd_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0024 tb_rward_manage.rwrd_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_schdl_info ALTER COLUMN schdl_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0025 tb_schdl_info.schdl_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_srvy_info ALTER COLUMN srvy_prps TYPE varchar(4000); -- linter:ignore ZDM-2026-0026 tb_srvy_info.srvy_prps 표준 4000자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_srvy_info ALTER COLUMN srvy_ttl TYPE varchar(256); -- linter:ignore ZDM-2026-0027 tb_srvy_info.srvy_ttl 표준 256자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_srvy_tmplt ALTER COLUMN srvy_tmplt_path_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0028 tb_srvy_tmplt.srvy_tmplt_path_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
ALTER TABLE tb_stmp_info ALTER COLUMN mpng_file_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0029 tb_stmp_info.mpng_file_nm 표준 300자 정합: 기존 값 보존 VARCHAR 확장; NOWAIT 선점 및 표준 메타 검사
