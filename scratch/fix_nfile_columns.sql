-- 1. nfile 테이블 정비
ALTER TABLE nfile ADD COLUMN IF NOT EXISTS frst_register_id varchar(20);
ALTER TABLE nfile ADD COLUMN IF NOT EXISTS last_updusr_id varchar(20);
ALTER TABLE nfile ADD COLUMN IF NOT EXISTS frst_regist_pnttm timestamp;
ALTER TABLE nfile ADD COLUMN IF NOT EXISTS last_updt_pnttm timestamp;

-- 기존 데이터 보정 (creat_dt -> frst_regist_pnttm)
UPDATE nfile SET frst_regist_pnttm = creat_dt WHERE frst_regist_pnttm IS NULL AND creat_dt IS NOT EXISTS;
-- (테이블 구조 확인 결과 creat_dt가 있으므로 안전하게 복사)
UPDATE nfile SET frst_regist_pnttm = creat_dt WHERE frst_regist_pnttm IS NULL;

-- 2. nfiledetail 테이블 정비
ALTER TABLE nfiledetail ADD COLUMN IF NOT EXISTS frst_register_id varchar(20);
ALTER TABLE nfiledetail ADD COLUMN IF NOT EXISTS last_updusr_id varchar(20);
ALTER TABLE nfiledetail ADD COLUMN IF NOT EXISTS frst_regist_pnttm timestamp;
ALTER TABLE nfiledetail ADD COLUMN IF NOT EXISTS last_updt_pnttm timestamp;
