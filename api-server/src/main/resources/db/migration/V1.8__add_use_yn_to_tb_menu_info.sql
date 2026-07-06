-- V1.8 Add use_yn to tb_menu_info
ALTER TABLE tb_menu_info ADD COLUMN use_yn VARCHAR(1) DEFAULT 'Y' NOT NULL;
COMMENT ON COLUMN tb_menu_info.use_yn IS '사용여부';
