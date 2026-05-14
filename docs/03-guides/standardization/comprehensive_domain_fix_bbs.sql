/*
 * DB Standardization - Comprehensive Domain & Abbreviation Fix
 * Domain: BBS (7 Tables)
 * Standards Enforcement: _YMD (CHAR 8), _YN (CHAR 1), _TTL (V300), _EXPLN/CN (V4000), _CD (V12)
 */

BEGIN;

-- 1. tb_bbs_master
ALTER TABLE tb_bbs_master RENAME COLUMN bbs_ty_code TO bbs_ty_cd;
ALTER TABLE tb_bbs_master RENAME COLUMN bbs_attrb_code TO bbs_attrb_cd;
ALTER TABLE tb_bbs_master RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_bbs_master ALTER COLUMN use_yn TYPE CHAR(1);
ALTER TABLE tb_bbs_master ALTER COLUMN bbs_intrcn TYPE VARCHAR(4000);

-- 2. tb_bbs_master_optn
ALTER TABLE tb_bbs_master_optn RENAME COLUMN answer_at TO answer_yn;
ALTER TABLE tb_bbs_master_optn ALTER COLUMN answer_yn TYPE CHAR(1);
ALTER TABLE tb_bbs_master_optn RENAME COLUMN stsfdg_at TO stsfdg_yn;
ALTER TABLE tb_bbs_master_optn ALTER COLUMN stsfdg_yn TYPE CHAR(1);

-- 3. tb_bbs_item
ALTER TABLE tb_bbs_item ALTER COLUMN pst_ttl TYPE VARCHAR(300);
ALTER TABLE tb_bbs_item ALTER COLUMN pst_cn TYPE VARCHAR(4000);

ALTER TABLE tb_bbs_item RENAME COLUMN ntce_bgnde TO ntce_bgng_ymd;
ALTER TABLE tb_bbs_item ALTER COLUMN ntce_bgng_ymd TYPE CHAR(8);
ALTER TABLE tb_bbs_item RENAME COLUMN ntce_endde TO ntce_end_ymd;
ALTER TABLE tb_bbs_item ALTER COLUMN ntce_end_ymd TYPE CHAR(8);

ALTER TABLE tb_bbs_item RENAME COLUMN answer_at TO answer_yn;
ALTER TABLE tb_bbs_item ALTER COLUMN answer_yn TYPE CHAR(1);
ALTER TABLE tb_bbs_item RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_bbs_item ALTER COLUMN use_yn TYPE CHAR(1);

-- 4. tb_bbs_comment
ALTER TABLE tb_bbs_comment ALTER COLUMN answer TYPE VARCHAR(4000);
ALTER TABLE tb_bbs_comment RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_bbs_comment ALTER COLUMN use_yn TYPE CHAR(1);

-- 5. tb_bbs_use_info
ALTER TABLE tb_bbs_use_info RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_bbs_use_info ALTER COLUMN use_yn TYPE CHAR(1);

-- 6. tb_bbs_scrap
ALTER TABLE tb_bbs_scrap RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_bbs_scrap ALTER COLUMN use_yn TYPE CHAR(1);

-- 7. tb_bbs_stats
ALTER TABLE tb_bbs_stats RENAME COLUMN stats_id TO stats_id; -- Keep name but check type
ALTER TABLE tb_bbs_stats ALTER COLUMN stats_id TYPE VARCHAR(20);

COMMIT;
