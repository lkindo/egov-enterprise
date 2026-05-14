/*
 * DB Standardization - Comprehensive Domain & Abbreviation Fix
 * Domain: Community & Collaboration (16 Tables)
 * Standards Enforcement: _YMD (CHAR 8), _YN (CHAR 1), _TTL/NM (V300), _CN/EXPLN (V4000), _CD (V12)
 */

BEGIN;

-- 1. tb_cmnty_info
ALTER TABLE tb_cmnty_info ALTER COLUMN cmnty_nm TYPE VARCHAR(300);
ALTER TABLE tb_cmnty_info ALTER COLUMN cmnty_intrcn TYPE VARCHAR(4000);
ALTER TABLE tb_cmnty_info RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_cmnty_info ALTER COLUMN use_yn TYPE CHAR(1);

-- 2. tb_cmnty_user_map
ALTER TABLE tb_cmnty_user_map RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_cmnty_user_map ALTER COLUMN use_yn TYPE CHAR(1);

-- 3. tb_club_info
ALTER TABLE tb_club_info ALTER COLUMN club_nm TYPE VARCHAR(300);
ALTER TABLE tb_club_info ALTER COLUMN club_intrcn TYPE VARCHAR(4000);
ALTER TABLE tb_club_info RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_club_info ALTER COLUMN use_yn TYPE CHAR(1);

-- 4. tb_club_user_map
ALTER TABLE tb_club_user_map RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_club_user_map ALTER COLUMN use_yn TYPE CHAR(1);

-- 5. tb_blog_info
ALTER TABLE tb_blog_info ALTER COLUMN blog_nm TYPE VARCHAR(300);
ALTER TABLE tb_blog_info ALTER COLUMN blog_intrcn TYPE VARCHAR(4000);
ALTER TABLE tb_blog_info RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_blog_info ALTER COLUMN use_yn TYPE CHAR(1);

-- 6. tb_indvdl_pge
ALTER TABLE tb_indvdl_pge RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_indvdl_pge ALTER COLUMN use_yn TYPE CHAR(1);

-- 7. tb_schdul_info
ALTER TABLE tb_schdul_info ALTER COLUMN schdul_nm TYPE VARCHAR(300);
ALTER TABLE tb_schdul_info ALTER COLUMN schdul_cn TYPE VARCHAR(4000);
ALTER TABLE tb_schdul_info RENAME COLUMN schdul_bgnde TO schdul_bgng_ymd;
ALTER TABLE tb_schdul_info ALTER COLUMN schdul_bgng_ymd TYPE CHAR(8);
ALTER TABLE tb_schdul_info RENAME COLUMN schdul_endde TO schdul_end_ymd;
ALTER TABLE tb_schdul_info ALTER COLUMN schdul_end_ymd TYPE CHAR(8);
ALTER TABLE tb_schdul_info RENAME COLUMN schdul_ipcr_code TO schdul_ipcr_cd;
ALTER TABLE tb_schdul_info RENAME COLUMN schdul_knd_code TO schdul_knd_cd;
ALTER TABLE tb_schdul_info RENAME COLUMN reptit_se_code TO reptit_se_cd;

-- 8. tb_diary_info
ALTER TABLE tb_diary_info ALTER COLUMN diary_nm TYPE VARCHAR(300);
ALTER TABLE tb_diary_info ALTER COLUMN diary_cn TYPE VARCHAR(4000);

-- 9. tb_memo_rpt_info
ALTER TABLE tb_memo_rpt_info ALTER COLUMN reprt_ttl TYPE VARCHAR(300);
ALTER TABLE tb_memo_rpt_info ALTER COLUMN reprt_cn TYPE VARCHAR(4000);

-- 10. tb_memo_todo_info
ALTER TABLE tb_memo_todo_info ALTER COLUMN todo_nm TYPE VARCHAR(300);
ALTER TABLE tb_memo_todo_info ALTER COLUMN todo_cn TYPE VARCHAR(4000);

-- 11. tb_dept_task_info
ALTER TABLE tb_dept_task_info ALTER COLUMN dept_job_nm TYPE VARCHAR(300);
ALTER TABLE tb_dept_task_info ALTER COLUMN dept_job_cn TYPE VARCHAR(4000);

-- 12. tb_leader_sttus
ALTER TABLE tb_leader_sttus ALTER COLUMN leader_nm TYPE VARCHAR(300);

-- 13. tb_rpt_info
ALTER TABLE tb_rpt_info ALTER COLUMN reprt_ttl TYPE VARCHAR(300);
ALTER TABLE tb_rpt_info ALTER COLUMN reprt_cn TYPE VARCHAR(4000);
ALTER TABLE tb_rpt_info RENAME COLUMN reprt_de TO reprt_ymd;
ALTER TABLE tb_rpt_info ALTER COLUMN reprt_ymd TYPE CHAR(8);

COMMIT;
