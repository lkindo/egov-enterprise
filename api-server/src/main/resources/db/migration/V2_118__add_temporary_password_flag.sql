-- 2026-10-01 결정 18(사용자 승인): 관리자가 비밀번호를 초기화한 계정은 다음 로그인에서 비밀번호를 바꿔야 한다.
--
-- 종전에는 관리자가 정해 알려 준 비밀번호를 그대로 계속 쓸 수 있어, 관리자도 아는 비밀번호가 계정에 남았다.
-- 표준 용어 '임시비밀번호여부'(TMPR_PSWD_YN, 여부C1). 이 변경 전 계정은 바꿀 의무가 없으므로 'N' 이다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE tb_user_info ADD COLUMN tmpr_pswd_yn varchar(1) NOT NULL DEFAULT 'N';
ALTER TABLE tb_user_info ADD CONSTRAINT ck_tb_user_info_tmpr_pswd_yn CHECK (tmpr_pswd_yn IN ('Y', 'N'));

COMMENT ON COLUMN tb_user_info.tmpr_pswd_yn IS '임시비밀번호여부 (tmpr_pswd_yn)';
