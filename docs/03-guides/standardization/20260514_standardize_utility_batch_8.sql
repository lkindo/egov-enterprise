/*
 * DB Standardization Migration Script (Utility Domain Batch 8)
 * Targets: tb_onln_mnl_info, tb_onln_poll_manage, tb_onln_poll_artcl, tb_onln_poll_rslt
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_onln_mnl_info
ALTER TABLE tb_onln_mnl_info 
    RENAME COLUMN online_mnl_id TO onln_mnl_id,
    RENAME COLUMN online_mnl_nm TO onln_mnl_ttl,
    ALTER COLUMN onln_mnl_ttl TYPE VARCHAR(300),
    RENAME COLUMN online_mnl_se_code TO onln_mnl_se_cd,
    ALTER COLUMN onln_mnl_se_cd TYPE VARCHAR(12),
    RENAME COLUMN onln_mnl_dfn TO onln_mnl_dfn_expln,
    ALTER COLUMN onln_mnl_dfn_expln TYPE VARCHAR(4000),
    RENAME COLUMN online_mnl_dc TO onln_mnl_expln,
    ALTER COLUMN onln_mnl_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_onln_mnl_info IS '온라인 매뉴얼 정보';

-- 2. tb_onln_poll_manage
ALTER TABLE tb_onln_poll_manage 
    RENAME COLUMN poll_nm TO poll_ttl,
    ALTER COLUMN poll_ttl TYPE VARCHAR(300),
    RENAME COLUMN poll_knd TO poll_knd_cd,
    ALTER COLUMN poll_knd_cd TYPE VARCHAR(12),
    ALTER COLUMN poll_bgng_ymd TYPE CHAR(8),
    ALTER COLUMN poll_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_onln_poll_manage IS '온라인 설문 관리';

-- 3. tb_onln_poll_artcl
ALTER TABLE tb_onln_poll_artcl 
    RENAME COLUMN poll_iem_id TO poll_artcl_id,
    RENAME COLUMN poll_iem_nm TO poll_artcl_ttl,
    ALTER COLUMN poll_artcl_ttl TYPE VARCHAR(300),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_onln_poll_artcl IS '온라인 설문 항목';

-- 4. tb_onln_poll_rslt
ALTER TABLE tb_onln_poll_rslt 
    RENAME COLUMN poll_result_id TO poll_rslt_id,
    RENAME COLUMN poll_iem_id TO poll_artcl_id,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_onln_poll_rslt IS '온라인 설문 결과';

COMMIT;
