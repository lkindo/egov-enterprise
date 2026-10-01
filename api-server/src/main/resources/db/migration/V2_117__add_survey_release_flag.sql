-- 2026-10-01 결정 21(사용자 승인): 설문에 공개 여부를 둔다. 새 설문은 작성 중으로 시작하고, 이 변경 전 설문은 공개로 둔다.
--
-- 종전에는 등록하는 순간 응답자 목록에 보여, 문항을 다 넣기 전의 설문에 응답이 쌓일 수 있었다.
-- 표준 용어 '공개여부'(RLS_YN, 여부C1). 기존 행은 이미 응답자에게 보이던 설문이라 'Y' 로 채우고,
-- 그 뒤 기본값을 'N' 으로 바꿔 새 행만 작성 중으로 시작하게 한다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE tb_srvy_info ADD COLUMN rls_yn varchar(1) NOT NULL DEFAULT 'Y';
ALTER TABLE tb_srvy_info ALTER COLUMN rls_yn SET DEFAULT 'N';
ALTER TABLE tb_srvy_info ADD CONSTRAINT ck_tb_srvy_info_rls_yn CHECK (rls_yn IN ('Y', 'N'));

COMMENT ON COLUMN tb_srvy_info.rls_yn IS '공개여부 (rls_yn)';
