-- [Phase 1: Expand] - 신규 대리키 컬럼 추가 (기본값 gen_random_uuid() 적용)
ALTER TABLE tb_file_detail ADD COLUMN file_detail_id UUID DEFAULT gen_random_uuid();

-- [Phase 2: Backfill (기존 데이터 복구)]
UPDATE tb_file_detail SET file_detail_id = gen_random_uuid() WHERE file_detail_id IS NULL;

-- [Phase 3: Contract (PK 교체 및 Unique 제약조건 강등)]
ALTER TABLE tb_file_detail ALTER COLUMN file_detail_id SET NOT NULL;
ALTER TABLE tb_file_detail DROP CONSTRAINT pk_tb_file_detail;
ALTER TABLE tb_file_detail ADD CONSTRAINT pk_tb_file_detail PRIMARY KEY (file_detail_id);
ALTER TABLE tb_file_detail ADD CONSTRAINT uk_tb_file_detail_sn UNIQUE (atch_file_id, atch_file_seq);
