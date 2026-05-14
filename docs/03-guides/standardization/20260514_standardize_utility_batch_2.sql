/*
 * DB Standardization Migration Script (Utility Domain Batch 2) - Full Comments Included
 * Targets: tb_admdst_cd_rcptn_log, tb_admin_district_code, tb_orgnzt_info, tb_hldy_info
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_admdst_cd_rcptn_log
ALTER TABLE tb_admdst_cd_rcptn_log 
    RENAME COLUMN admdst_cd TO admdst_cd,
    RENAME COLUMN occrrnc_de TO occr_ymd,
    ALTER COLUMN occr_ymd TYPE CHAR(8),
    RENAME COLUMN administ_zone_se TO admdst_se_cd,
    ALTER COLUMN admdst_se_cd TYPE VARCHAR(12),
    RENAME COLUMN opert_sn TO oper_sn,
    RENAME COLUMN change_se_code TO chg_se_cd,
    ALTER COLUMN chg_se_cd TYPE VARCHAR(12),
    RENAME COLUMN process_se TO prcs_se_cd,
    ALTER COLUMN prcs_se_cd TYPE VARCHAR(12),
    RENAME COLUMN administ_zone_nm TO admdst_nm,
    RENAME COLUMN lowest_administ_zone_nm TO lowest_admdst_nm,
    RENAME COLUMN ctprvn_code TO ctprvn_cd,
    ALTER COLUMN ctprvn_cd TYPE VARCHAR(12),
    RENAME COLUMN signgu_code TO signgu_cd,
    ALTER COLUMN signgu_cd TYPE VARCHAR(12),
    RENAME COLUMN emd_code TO emd_cd,
    ALTER COLUMN emd_cd TYPE VARCHAR(12),
    RENAME COLUMN li_code TO li_cd,
    ALTER COLUMN li_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_de TO crt_ymd,
    ALTER COLUMN crt_ymd TYPE CHAR(8),
    RENAME COLUMN abl_de TO abl_ymd,
    ALTER COLUMN abl_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_admdst_cd_rcptn_log IS '행정구역코드 수신로그';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.occr_ymd IS '발생일자';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_se_cd IS '행정구역구분코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_cd IS '행정구역코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.oper_sn IS '작업일련번호';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.chg_se_cd IS '변경구분코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.prcs_se_cd IS '처리구분코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_nm IS '행정구역명';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.lowest_admdst_nm IS '최하위행정구역명';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.ctprvn_cd IS '시도코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.signgu_cd IS '시군구코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.emd_cd IS '읍면동코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.li_cd IS '리코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.crt_ymd IS '생성일자';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.abl_ymd IS '폐지일자';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.abl_yn IS '폐지여부';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_admin_district_code
ALTER TABLE tb_admin_district_code 
    RENAME COLUMN admdst_se TO admdst_se_cd,
    ALTER COLUMN admdst_se_cd TYPE VARCHAR(12),
    RENAME COLUMN administ_zone_nm TO admdst_nm,
    RENAME COLUMN up_admdst_cd TO up_admdst_cd,
    RENAME COLUMN creat_de TO crt_ymd,
    ALTER COLUMN crt_ymd TYPE CHAR(8),
    RENAME COLUMN abl_de TO abl_ymd,
    ALTER COLUMN abl_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_admin_district_code IS '행정구역 코드';
COMMENT ON COLUMN tb_admin_district_code.admdst_cd IS '행정구역코드';
COMMENT ON COLUMN tb_admin_district_code.admdst_nm IS '행정구역명';
COMMENT ON COLUMN tb_admin_district_code.admdst_se_cd IS '행정구역구분코드';
COMMENT ON COLUMN tb_admin_district_code.up_admdst_cd IS '상위행정구역코드';
COMMENT ON COLUMN tb_admin_district_code.crt_ymd IS '생성일자';
COMMENT ON COLUMN tb_admin_district_code.abl_ymd IS '폐지일자';
COMMENT ON COLUMN tb_admin_district_code.use_yn IS '사용여부';
COMMENT ON COLUMN tb_admin_district_code.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_admin_district_code.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_admin_district_code.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_admin_district_code.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_orgnzt_info
ALTER TABLE tb_orgnzt_info 
    RENAME COLUMN orgnzt_nm TO orgnzt_ttl,
    ALTER COLUMN orgnzt_ttl TYPE VARCHAR(300),
    RENAME COLUMN orgnzt_dc TO orgnzt_expln,
    ALTER COLUMN orgnzt_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_orgnzt_info IS '조직 정보';
COMMENT ON COLUMN tb_orgnzt_info.orgnzt_id IS '조직아이디';
COMMENT ON COLUMN tb_orgnzt_info.orgnzt_ttl IS '조직제목';
COMMENT ON COLUMN tb_orgnzt_info.orgnzt_expln IS '조직설명';
COMMENT ON COLUMN tb_orgnzt_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_orgnzt_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_orgnzt_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_orgnzt_info.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_hldy_info
ALTER TABLE tb_hldy_info 
    RENAME COLUMN hldy_nm TO hldy_ttl,
    ALTER COLUMN hldy_ttl TYPE VARCHAR(300),
    RENAME COLUMN hldy_expln TO hldy_expln,
    ALTER COLUMN hldy_expln TYPE VARCHAR(4000),
    RENAME COLUMN hldy_se_cd TO hldy_se_cd,
    ALTER COLUMN hldy_se_cd TYPE VARCHAR(12),
    RENAME COLUMN hldy_ymd TO hldy_ymd,
    ALTER COLUMN hldy_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_hldy_info IS '휴일 정보';
COMMENT ON COLUMN tb_hldy_info.restde_no IS '휴일번호';
COMMENT ON COLUMN tb_hldy_info.hldy_ymd IS '휴일일자';
COMMENT ON COLUMN tb_hldy_info.hldy_ttl IS '휴일제목';
COMMENT ON COLUMN tb_hldy_info.hldy_expln IS '휴일설명';
COMMENT ON COLUMN tb_hldy_info.hldy_se_cd IS '휴일구분코드';
COMMENT ON COLUMN tb_hldy_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_hldy_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_hldy_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_hldy_info.last_mdfr_id IS '최종수정자아이디';

COMMIT;
