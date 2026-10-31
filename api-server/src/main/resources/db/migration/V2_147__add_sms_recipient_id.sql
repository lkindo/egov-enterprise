-- DEC-OPS-394: 수신자가 한 사람인 SMS 조회의 개인정보 접속기록이 정보주체를 남기게 수신자 식별자를 저장한다.
--
-- 수신 행에는 번호만 있어 조회 때 정보주체를 알 수 없었다. 현재 번호로 사용자를 되찾으면 번호가 재할당된 뒤 다른 사람이
-- 감사 기록에 남으므로, 발송 시점에 사용자를 골랐을 때의 식별자(esntlId)를 그대로 저장한다(V2_108 메일 수신자와 같은 방식).
-- 직접 입력한 번호와 이 변경 전의 행은 NULL 이다. 기존 행은 채우지 않는다.
-- 쪽지 수신(tb_note_rcptn)·메일(tb_email_dsptch_manage)과 같은 표준 용어·길이를 쓴다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE tb_sms_rcptn ADD COLUMN rcvr_id varchar(20);

COMMENT ON COLUMN tb_sms_rcptn.rcvr_id IS '수신자아이디 (rcvr_id)';
