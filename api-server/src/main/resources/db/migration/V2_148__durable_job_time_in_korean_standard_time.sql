-- 후속 작업 원장의 시각을 한국 표준시로 기록한다(DEC-OPS-396). 데이터는 바꾸지 않고 컬럼 설명만 고친다.
COMMENT ON COLUMN tb_sys_job.job_prnmnt_dt IS '작업예정일시: 실행 예정 또는 소유권 만료';
COMMENT ON COLUMN tb_sys_job.job_cmptn_dt IS '작업완료일시';
