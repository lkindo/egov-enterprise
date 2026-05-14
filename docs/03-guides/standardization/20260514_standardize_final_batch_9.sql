/*
 * DB Standardization Migration Script (Final Batch 9)
 * Targets: tb_main_image, tb_event_info, tb_ifml_atrz_info, tb_indvdl_pge_cntnts, tb_indvdl_pge_estbs, tb_tmplt_info, tb_leader_schdl_de, tb_user_absence, tb_user_info_chg_dtls, tb_user_ntcn
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_main_image
ALTER TABLE tb_main_image 
    RENAME COLUMN image_id TO main_img_id,
    RENAME COLUMN image_nm TO main_img_ttl,
    ALTER COLUMN main_img_ttl TYPE VARCHAR(300),
    ALTER COLUMN main_img_expln TYPE VARCHAR(4000),
    RENAME COLUMN image_file TO main_img_nm,
    RENAME COLUMN main_img_file_path TO main_img_path,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_main_image IS '메인 이미지 정보';

-- 2. tb_event_info
ALTER TABLE tb_event_info 
    RENAME COLUMN event_ty_code TO event_type_cd,
    ALTER COLUMN event_type_cd TYPE VARCHAR(12),
    RENAME COLUMN bsns_code TO biz_cd,
    ALTER COLUMN biz_cd TYPE VARCHAR(12),
    RENAME COLUMN charger_nm TO pic_user_nm,
    ALTER COLUMN pic_user_nm TYPE VARCHAR(300),
    RENAME COLUMN event_cn TO event_expln,
    ALTER COLUMN event_expln TYPE VARCHAR(4000),
    RENAME COLUMN event_svc_bgnde TO event_bgng_ymd,
    ALTER COLUMN event_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN event_svc_endde TO event_end_ymd,
    ALTER COLUMN event_end_ymd TYPE CHAR(8),
    RENAME COLUMN event_confm_de TO confm_ymd,
    ALTER COLUMN confm_ymd TYPE CHAR(8),
    RENAME COLUMN evnt_srvc_use_prsnl_cnt TO user_cnt,
    RENAME COLUMN prep_mttr TO prep_mttr_expln,
    ALTER COLUMN prep_mttr_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_event_info IS '행사 정보';

-- 3. tb_ifml_atrz_info
ALTER TABLE tb_ifml_atrz_info 
    RENAME COLUMN infrml_sanctn_id TO sanctn_id,
    RENAME COLUMN applcnt_id TO user_id,
    RENAME COLUMN rjct_rsn_cn TO rjct_rsn_expln,
    ALTER COLUMN rjct_rsn_expln TYPE VARCHAR(4000),
    RENAME COLUMN sanctner_id TO sanctn_user_id,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_ifml_atrz_info IS '비정형 결재 정보';

-- 4. tb_indvdl_pge_cntnts
ALTER TABLE tb_indvdl_pge_cntnts 
    RENAME COLUMN cntnts_nm TO cntnts_ttl,
    ALTER COLUMN cntnts_ttl TYPE VARCHAR(300),
    RENAME COLUMN cntnts_dc TO cntnts_expln,
    ALTER COLUMN cntnts_expln TYPE VARCHAR(4000),
    RENAME COLUMN cntc_url TO cntnts_url,
    RENAME COLUMN cntnts_use_yn TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_indvdl_pge_cntnts IS '개인페이지 컨텐츠';

-- 5. tb_indvdl_pge_estbs
ALTER TABLE tb_indvdl_pge_estbs 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN upend_image TO top_img_path,
    RENAME COLUMN titlebar_color TO ttl_bar_clr,
    RENAME COLUMN algn_mthd TO algn_mthd_cd,
    ALTER COLUMN algn_mthd_cd TYPE VARCHAR(12),
    RENAME COLUMN align_cnt TO algn_cnt,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_indvdl_pge_estbs IS '개인페이지 설정';

-- 6. tb_tmplt_info
ALTER TABLE tb_tmplt_info 
    RENAME COLUMN tmplat_id TO tmplt_id,
    RENAME COLUMN tmplat_nm TO tmplt_ttl,
    ALTER COLUMN tmplt_ttl TYPE VARCHAR(300),
    RENAME COLUMN tmplat_se_code TO tmplt_se_cd,
    ALTER COLUMN tmplt_se_cd TYPE VARCHAR(12),
    RENAME COLUMN tmplat_cours TO tmplt_path,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_tmplt_info IS '템플릿 정보';

-- 7. tb_leader_schdl_de
ALTER TABLE tb_leader_schdl_de 
    RENAME COLUMN schdul_de TO schdul_ymd,
    ALTER COLUMN schdul_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_leader_schdl_de IS '간부 일정 일자';

-- 8. tb_user_absence
ALTER TABLE tb_user_absence 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_user_absence IS '사용자 부재 정보';

-- 9. tb_user_info_chg_dtls
ALTER TABLE tb_user_info_chg_dtls 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN emplyr_sttus_code TO user_sttus_cd,
    ALTER COLUMN user_sttus_cd TYPE VARCHAR(12),
    RENAME COLUMN change_de TO chg_ymd,
    ALTER COLUMN chg_ymd TYPE CHAR(8),
    RENAME COLUMN pstinst_code TO inst_cd,
    ALTER COLUMN inst_cd TYPE VARCHAR(12),
    RENAME COLUMN sexdstn_code TO gender_cd,
    ALTER COLUMN gender_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    ALTER COLUMN zip TYPE CHAR(5),
    RENAME COLUMN house_adres TO home_addr,
    ALTER COLUMN home_addr TYPE VARCHAR(300),
    RENAME COLUMN detail_adres TO dtl_addr,
    ALTER COLUMN dtl_addr TYPE VARCHAR(300),
    RENAME COLUMN mbtlnum TO mbl_telno,
    RENAME COLUMN eml_addr TO email_addr,
    ALTER COLUMN email_addr TYPE VARCHAR(300),
    RENAME COLUMN area_no TO home_area_telno,
    RENAME COLUMN house_middle_telno TO home_mtlno,
    RENAME COLUMN house_end_telno TO home_end_telno,
    RENAME COLUMN offm_telno TO office_telno,
    RENAME COLUMN fxnum TO fxno,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_user_info_chg_dtls IS '사용자 정보 변경 내역';

-- 10. tb_user_ntcn
ALTER TABLE tb_user_ntcn 
    RENAME COLUMN ntcn_ttl_nm TO ntcn_ttl,
    ALTER COLUMN ntcn_ttl TYPE VARCHAR(300),
    RENAME COLUMN ntcn_cn TO ntcn_expln,
    ALTER COLUMN ntcn_expln TYPE VARCHAR(4000),
    RENAME COLUMN rcvr_id TO user_id,
    RENAME COLUMN ntcn_ivl_val TO ntcn_intvl_val,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_user_ntcn IS '사용자 알림';

COMMIT;
