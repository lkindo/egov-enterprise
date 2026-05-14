/*
 * DB Standardization Migration Script (Common & Collaboration Master v4)
 * Targets: tb_com_cd, tb_com_dtl_cd, tb_menu_info, tb_progrm_list, tb_schdul_info, tb_rpt_info
 * Date: 2026-05-14
 */

BEGIN;

-- 1. [Common Code & Menu]
ALTER TABLE tb_com_cd RENAME COLUMN code_id TO com_cd;
ALTER TABLE tb_com_dtl_cd RENAME COLUMN code TO dtl_cd;

ALTER TABLE tb_menu_info 
    RENAME COLUMN menu_nm TO menu_nm, -- Gold standard
    RENAME COLUMN menu_dc TO menu_expln;

ALTER TABLE tb_progrm_list 
    RENAME COLUMN progrm_korean_nm TO prgrm_nm,
    RENAME COLUMN progrm_dc TO prgrm_expln;

-- 2. [Collaboration]
ALTER TABLE tb_schdul_info 
    RENAME COLUMN schdul_nm TO schdl_nm,
    RENAME COLUMN schdul_cn TO schdl_cn,
    RENAME COLUMN schdul_bgnde TO schdl_bgng_ymd;

ALTER TABLE tb_rpt_info 
    RENAME COLUMN reprt_sj TO rpt_ttl,
    RENAME COLUMN reprt_cn TO rpt_cn;

-- 3. [Leader Status]
ALTER TABLE tb_leader_sttus RENAME TO tb_leader_stts;
ALTER TABLE tb_leader_stts 
    RENAME COLUMN leader_sttus TO leader_stts_cd,
    ALTER COLUMN leader_stts_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMIT;
