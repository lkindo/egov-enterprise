-- nindvdlpgecntnts 테이블 정비
ALTER TABLE nindvdlpgecntnts ADD COLUMN IF NOT EXISTS frst_register_id varchar(20);
ALTER TABLE nindvdlpgecntnts ADD COLUMN IF NOT EXISTS last_updusr_id varchar(20);
ALTER TABLE nindvdlpgecntnts ADD COLUMN IF NOT EXISTS frst_regist_pnttm timestamp;
ALTER TABLE nindvdlpgecntnts ADD COLUMN IF NOT EXISTS last_updt_pnttm timestamp;

-- nindvdlpgeestbs 테이블 정비
ALTER TABLE nindvdlpgeestbs ADD COLUMN IF NOT EXISTS frst_register_id varchar(20);
ALTER TABLE nindvdlpgeestbs ADD COLUMN IF NOT EXISTS last_updusr_id varchar(20);
ALTER TABLE nindvdlpgeestbs ADD COLUMN IF NOT EXISTS frst_regist_pnttm timestamp;
ALTER TABLE nindvdlpgeestbs ADD COLUMN IF NOT EXISTS last_updt_pnttm timestamp;
