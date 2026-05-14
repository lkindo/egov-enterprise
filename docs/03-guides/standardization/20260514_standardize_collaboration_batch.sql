/*
 * DB Standardization Migration Script (Collaboration Domain Batch) - Full Comments Included
 * Targets: tb_schdul_info, tb_diary_info, tb_memo_rpt_info, tb_memo_todo_info, tb_dept_job_bx, tb_dept_task_info, tb_leader_schdl, tb_leader_sttus, tb_rpt_info
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_schdul_info
ALTER TABLE tb_schdul_info 
    RENAME COLUMN schdul_nm TO schdul_ttl,
    ALTER COLUMN schdul_ttl TYPE VARCHAR(300),
    RENAME COLUMN schdul_cn TO schdul_expln,
    ALTER COLUMN schdul_expln TYPE VARCHAR(4000),
    RENAME COLUMN schdul_knd_code TO schdul_knd_cd,
    ALTER COLUMN schdul_knd_cd TYPE VARCHAR(12),
    RENAME COLUMN schdul_ipcr_code TO schdul_ipcr_cd,
    ALTER COLUMN schdul_ipcr_cd TYPE VARCHAR(12),
    RENAME COLUMN reptit_se_code TO reptit_se_cd,
    ALTER COLUMN reptit_se_cd TYPE VARCHAR(12),
    RENAME COLUMN schdul_bgnde TO schdul_bgng_ymd,
    ALTER COLUMN schdul_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN schdul_endde TO schdul_end_ymd,
    ALTER COLUMN schdul_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_schdul_info IS '일정 정보';
COMMENT ON COLUMN tb_schdul_info.schdul_id IS '일정아이디';
COMMENT ON COLUMN tb_schdul_info.schdul_se IS '일정구분';
COMMENT ON COLUMN tb_schdul_info.schdul_dept_id IS '일정부서아이디';
COMMENT ON COLUMN tb_schdul_info.schdul_knd_cd IS '일정종류코드';
COMMENT ON COLUMN tb_schdul_info.schdul_bgng_ymd IS '일정시작일자';
COMMENT ON COLUMN tb_schdul_info.schdul_end_ymd IS '일정종료일자';
COMMENT ON COLUMN tb_schdul_info.schdul_ttl IS '일정제목';
COMMENT ON COLUMN tb_schdul_info.schdul_expln IS '일정내용';
COMMENT ON COLUMN tb_schdul_info.schdul_ipcr_cd IS '일정중요도코드';
COMMENT ON COLUMN tb_schdul_info.schdul_charger_id IS '일정담당자아이디';
COMMENT ON COLUMN tb_schdul_info.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_schdul_info.reptit_se_cd IS '반복구분코드';
COMMENT ON COLUMN tb_schdul_info.schdul_place IS '일정장소';
COMMENT ON COLUMN tb_schdul_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_schdul_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_schdul_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_schdul_info.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_diary_info
ALTER TABLE tb_diary_info 
    RENAME COLUMN diary_nm TO diary_ttl,
    ALTER COLUMN diary_ttl TYPE VARCHAR(300),
    RENAME COLUMN drct_matter TO drct_expln,
    ALTER COLUMN drct_expln TYPE VARCHAR(4000),
    RENAME COLUMN partclr_matter TO partclr_expln,
    ALTER COLUMN partclr_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_diary_info IS '일기 정보';
COMMENT ON COLUMN tb_diary_info.diary_id IS '일기아이디';
COMMENT ON COLUMN tb_diary_info.schdul_id IS '일정아이디';
COMMENT ON COLUMN tb_diary_info.diary_ttl IS '일기제목';
COMMENT ON COLUMN tb_diary_info.drct_expln IS '지시사항내용';
COMMENT ON COLUMN tb_diary_info.partclr_expln IS '특이사항내용';
COMMENT ON COLUMN tb_diary_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_diary_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_diary_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_diary_info.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_memo_rpt_info
ALTER TABLE tb_memo_rpt_info 
    RENAME COLUMN reprt_sj TO reprt_ttl,
    ALTER COLUMN reprt_ttl TYPE VARCHAR(300),
    RENAME COLUMN report_cn TO reprt_expln,
    ALTER COLUMN reprt_expln TYPE VARCHAR(4000),
    RENAME COLUMN drct_matter TO drct_expln,
    ALTER COLUMN drct_expln TYPE VARCHAR(4000),
    RENAME COLUMN memo_rpt_ymd TO reprt_ymd,
    ALTER COLUMN reprt_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_memo_rpt_info IS '메모보고 정보';
COMMENT ON COLUMN tb_memo_rpt_info.reprt_id IS '보고아이디';
COMMENT ON COLUMN tb_memo_rpt_info.reprt_ttl IS '보고제목';
COMMENT ON COLUMN tb_memo_rpt_info.reprt_expln IS '보고내용';
COMMENT ON COLUMN tb_memo_rpt_info.wrter_id IS '작성자아이디';
COMMENT ON COLUMN tb_memo_rpt_info.reportr_id IS '보고자아이디';
COMMENT ON COLUMN tb_memo_rpt_info.reprt_ymd IS '보고일자';
COMMENT ON COLUMN tb_memo_rpt_info.drct_expln IS '지시사항내용';
COMMENT ON COLUMN tb_memo_rpt_info.drct_matter_regist_dt IS '지시사항등록일시';
COMMENT ON COLUMN tb_memo_rpt_info.reportr_inqire_dt IS '보고자조회일시';
COMMENT ON COLUMN tb_memo_rpt_info.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_memo_rpt_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_memo_rpt_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_memo_rpt_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_memo_rpt_info.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_memo_todo_info
ALTER TABLE tb_memo_todo_info 
    RENAME COLUMN todo_sj TO todo_ttl,
    ALTER COLUMN todo_ttl TYPE VARCHAR(300),
    RENAME COLUMN todo_cn TO todo_expln,
    ALTER COLUMN todo_expln TYPE VARCHAR(4000),
    RENAME COLUMN todo_begin_time TO todo_bgng_tm,
    ALTER COLUMN todo_bgng_tm TYPE CHAR(6),
    RENAME COLUMN todo_end_time TO todo_end_tm,
    ALTER COLUMN todo_end_tm TYPE CHAR(6),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_memo_todo_info IS '메모할일 정보';
COMMENT ON COLUMN tb_memo_todo_info.todo_id IS '할일아이디';
COMMENT ON COLUMN tb_memo_todo_info.todo_ttl IS '할일제목';
COMMENT ON COLUMN tb_memo_todo_info.todo_expln IS '할일내용';
COMMENT ON COLUMN tb_memo_todo_info.wrter_id IS '작성자아이디';
COMMENT ON COLUMN tb_memo_todo_info.todo_bgng_tm IS '할일시작시각';
COMMENT ON COLUMN tb_memo_todo_info.todo_end_tm IS '할일종료시각';
COMMENT ON COLUMN tb_memo_todo_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_memo_todo_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_memo_todo_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_memo_todo_info.last_mdfr_id IS '최종수정자아이디';

-- 5. tb_dept_job_bx
ALTER TABLE tb_dept_job_bx 
    RENAME COLUMN dept_job_bx_nm TO dept_jobbx_ttl,
    ALTER COLUMN dept_jobbx_ttl TYPE VARCHAR(300),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_dept_job_bx IS '부서업무함';
COMMENT ON COLUMN tb_dept_job_bx.dept_jobbx_id IS '부서업무함아이디';
COMMENT ON COLUMN tb_dept_job_bx.dept_id IS '부서아이디';
COMMENT ON COLUMN tb_dept_job_bx.dept_jobbx_ttl IS '부서업무함제목';
COMMENT ON COLUMN tb_dept_job_bx.sort_ordr IS '정렬순서';
COMMENT ON COLUMN tb_dept_job_bx.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_dept_job_bx.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_dept_job_bx.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_dept_job_bx.last_mdfr_id IS '최종수정자아이디';

-- 6. tb_dept_task_info
ALTER TABLE tb_dept_task_info 
    RENAME COLUMN dept_job_nm TO dept_job_ttl,
    ALTER COLUMN dept_job_ttl TYPE VARCHAR(300),
    RENAME COLUMN dept_job_cn TO dept_job_expln,
    ALTER COLUMN dept_job_expln TYPE VARCHAR(4000),
    RENAME COLUMN prord TO sort_ordr,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_dept_task_info IS '부서업무 정보';
COMMENT ON COLUMN tb_dept_task_info.dept_job_id IS '부서업무아이디';
COMMENT ON COLUMN tb_dept_task_info.dept_jobbx_id IS '부서업무함아이디';
COMMENT ON COLUMN tb_dept_task_info.dept_job_ttl IS '부서업무제목';
COMMENT ON COLUMN tb_dept_task_info.dept_job_expln IS '부서업무내용';
COMMENT ON COLUMN tb_dept_task_info.charger_id IS '담당자아이디';
COMMENT ON COLUMN tb_dept_task_info.sort_ordr IS '정렬순서';
COMMENT ON COLUMN tb_dept_task_info.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_dept_task_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_dept_task_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_dept_task_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_dept_task_info.last_mdfr_id IS '최종수정자아이디';

-- 7. tb_leader_schdl
ALTER TABLE tb_leader_schdl 
    RENAME COLUMN schdul_nm TO schdul_ttl,
    ALTER COLUMN schdul_ttl TYPE VARCHAR(300),
    RENAME COLUMN schdul_cn TO schdul_expln,
    ALTER COLUMN schdul_expln TYPE VARCHAR(4000),
    RENAME COLUMN schdul_ipcr_code TO schdul_ipcr_cd,
    ALTER COLUMN schdul_ipcr_cd TYPE VARCHAR(12),
    RENAME COLUMN reptit_se_code TO reptit_se_cd,
    ALTER COLUMN reptit_se_cd TYPE VARCHAR(12),
    RENAME COLUMN schdul_bgnde TO schdul_bgng_ymd,
    ALTER COLUMN schdul_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN schdul_endde TO schdul_end_ymd,
    ALTER COLUMN schdul_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_leader_schdl IS '간부일정 정보';
COMMENT ON COLUMN tb_leader_schdl.schdul_id IS '일정아이디';
COMMENT ON COLUMN tb_leader_schdl.leader_id IS '간부아이디';
COMMENT ON COLUMN tb_leader_schdl.schdul_se IS '일정구분';
COMMENT ON COLUMN tb_leader_schdl.schdul_bgng_ymd IS '일정시작일자';
COMMENT ON COLUMN tb_leader_schdl.schdul_end_ymd IS '일정종료일자';
COMMENT ON COLUMN tb_leader_schdl.schdul_ttl IS '일정제목';
COMMENT ON COLUMN tb_leader_schdl.schdul_expln IS '일정내용';
COMMENT ON COLUMN tb_leader_schdl.schdul_ipcr_cd IS '일정중요도코드';
COMMENT ON COLUMN tb_leader_schdl.schdul_charger_id IS '일정담당자아이디';
COMMENT ON COLUMN tb_leader_schdl.reptit_se_cd IS '반복구분코드';
COMMENT ON COLUMN tb_leader_schdl.schdul_place IS '일정장소';
COMMENT ON COLUMN tb_leader_schdl.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_leader_schdl.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_leader_schdl.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_leader_schdl.last_mdfr_id IS '최종수정자아이디';

-- 8. tb_leader_sttus
ALTER TABLE tb_leader_sttus 
    RENAME COLUMN leader_sttus TO leader_sttus_cd,
    ALTER COLUMN leader_sttus_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_leader_sttus IS '간부상태 정보';
COMMENT ON COLUMN tb_leader_sttus.leader_id IS '간부아이디';
COMMENT ON COLUMN tb_leader_sttus.leader_sttus_cd IS '간부상태코드';
COMMENT ON COLUMN tb_leader_sttus.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_leader_sttus.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_leader_sttus.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_leader_sttus.last_mdfr_id IS '최종수정자아이디';

-- 9. tb_rpt_info
ALTER TABLE tb_rpt_info 
    RENAME COLUMN reprt_sj TO reprt_ttl,
    ALTER COLUMN reprt_ttl TYPE VARCHAR(300),
    RENAME COLUMN reprt_cn TO reprt_expln,
    ALTER COLUMN reprt_expln TYPE VARCHAR(4000),
    RENAME COLUMN reprt_de TO reprt_ymd,
    ALTER COLUMN reprt_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_rpt_info IS '보고 정보';
COMMENT ON COLUMN tb_rpt_info.reprt_id IS '보고아이디';
COMMENT ON COLUMN tb_rpt_info.reprt_se IS '보고구분';
COMMENT ON COLUMN tb_rpt_info.reprt_ymd IS '보고일자';
COMMENT ON COLUMN tb_rpt_info.reprt_ttl IS '보고제목';
COMMENT ON COLUMN tb_rpt_info.reprt_expln IS '보고내용';
COMMENT ON COLUMN tb_rpt_info.wrter_id IS '작성자아이디';
COMMENT ON COLUMN tb_rpt_info.reprt_sttus IS '보고상태';
COMMENT ON COLUMN tb_rpt_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_rpt_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_rpt_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_rpt_info.last_mdfr_id IS '최종수정자아이디';

COMMIT;
