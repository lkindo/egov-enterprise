-- DEC-OPS-168(DIP B5 F7): 메일 재발송이 사용자 수신자의 현재 주소를 다시 찾을 수 있게 수신자 식별자를 남긴다.
--
-- 이력의 수신자 칸(rcvr_nm)은 사용자 수신자의 이름만 담는다 — 해석된 주소는 저장하지 않는다(DEC-OPS-134).
-- 그래서 실패한 메일을 다시 보내려면 누구에게 보냈는지를 이름이 아니라 식별자(esntlId)로 알아야 한다.
-- 주소를 저장하지 않는다는 결정은 그대로다: 재발송 시점의 등록 주소로 다시 해석한다.
-- 직접 입력한 주소 수신자와 이 변경 전의 행은 NULL 이다. 기존 행은 채우지 않는다(이름으로 사람을 추정하지 않는다).
-- 쪽지 수신(tb_note_rcptn)·알림(tb_user_noti)과 같은 표준 용어·길이를 쓴다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE tb_email_dsptch_manage ADD COLUMN rcvr_id varchar(20);

COMMENT ON COLUMN tb_email_dsptch_manage.rcvr_id IS '수신자아이디 (rcvr_id)';
