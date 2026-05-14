/*
 * DB Standardization Migration Script (Utility Domain Batch 7)
 * Targets: tb_rward_manage, tb_policy_manage, tb_extrl_hr_info, tb_internet_svc
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_rward_manage
ALTER TABLE tb_rward_manage 
    RENAME COLUMN rwardwnr_id TO rward_user_id,
    RENAME COLUMN rward_nm TO rward_ttl,
    ALTER COLUMN rward_ttl TYPE VARCHAR(300),
    RENAME COLUMN rward_de TO rward_ymd,
    ALTER COLUMN rward_ymd TYPE CHAR(8),
    RENAME COLUMN rward_code TO rward_cd,
    ALTER COLUMN rward_cd TYPE VARCHAR(12),
    RENAME COLUMN pblen_cn TO rward_expln,
    ALTER COLUMN rward_expln TYPE VARCHAR(4000),
    RENAME COLUMN informl_sanctn_id TO sanctn_id,
    RENAME COLUMN sanctner_id TO sanctn_user_id,
    RENAME COLUMN rtrn_rsn_cn TO rtrn_rsn_expln,
    ALTER COLUMN rtrn_rsn_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_rward_manage IS '포상 관리';

-- 2. tb_policy_manage
ALTER TABLE tb_policy_manage 
    RENAME COLUMN title TO policy_ttl,
    ALTER COLUMN policy_ttl TYPE VARCHAR(300),
    RENAME COLUMN policy_cn TO policy_expln,
    ALTER COLUMN policy_expln TYPE VARCHAR(4000),
    RENAME COLUMN policy_type TO policy_type_cd,
    ALTER COLUMN policy_type_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_policy_manage IS '정책 관리';

-- 3. tb_extrl_hr_info
ALTER TABLE tb_extrl_hr_info 
    ALTER COLUMN extrl_hr_nm TYPE VARCHAR(300),
    RENAME COLUMN sexdstn_code TO gender_cd,
    ALTER COLUMN gender_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN occp_ty_code TO occp_type_cd,
    ALTER COLUMN occp_type_cd TYPE VARCHAR(12),
    RENAME COLUMN psitn_instt_nm TO psitn_inst_nm,
    ALTER COLUMN psitn_inst_nm TYPE VARCHAR(300),
    RENAME COLUMN middle_telno TO mtlno,
    RENAME COLUMN eml_addr TO email_addr,
    ALTER COLUMN email_addr TYPE VARCHAR(300),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_extrl_hr_info IS '외부 인사 정보';

-- 4. tb_internet_svc
ALTER TABLE tb_internet_svc 
    RENAME COLUMN intnet_svc_id TO internet_svc_id,
    RENAME COLUMN intnet_svc_nm TO internet_svc_ttl,
    ALTER COLUMN internet_svc_ttl TYPE VARCHAR(300),
    ALTER COLUMN internet_svc_expln TYPE VARCHAR(4000),
    RENAME COLUMN reflct_yn TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_internet_svc IS '인터넷 서비스 정보';

COMMIT;
