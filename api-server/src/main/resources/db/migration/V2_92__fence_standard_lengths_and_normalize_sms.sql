-- ADR-0013: 기존 물리 폭을 유지한 상태에서 축소 대상의 신규 초과 입력을 차단한다.
-- SMS는 숫자 문자열로만 저장한다. 기존 번호 중복/형식 충돌은 데이터를 버리지 않고 전체 실패한다.
-- 이 단계 전 기존 SMS 발송 작업을 소진하고 정규화/구키 호환 애플리케이션으로 전환한다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE tb_authrt_info, tb_event_info, tb_sms_rcptn, tb_user_info
    IN ACCESS EXCLUSIVE MODE NOWAIT;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_sms_rcptn
        WHERE replace(rcptn_telno,'-','') !~ '^[0-9]{1,11}$') THEN
        RAISE EXCEPTION 'SMS recipient format conflict; manual reconciliation required';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_sms_rcptn
        GROUP BY sms_trsm_sn,replace(rcptn_telno,'-','') HAVING count(*)>1) THEN
        RAISE EXCEPTION 'SMS canonical recipient key collision; no rows were merged or deleted';
    END IF;
END $$;

ALTER TABLE tb_authrt_info ADD CONSTRAINT ck_tb_authrt_info_authrt_nm_length
    CHECK (char_length(authrt_nm)<=100);
ALTER TABLE tb_event_info ADD CONSTRAINT ck_tb_event_info_pic_nm_length
    CHECK (char_length(pic_nm)<=100);
ALTER TABLE tb_user_info ADD CONSTRAINT ck_tb_user_info_home_addr_length
    CHECK (char_length(home_addr)<=200);
ALTER TABLE tb_user_info ADD CONSTRAINT ck_tb_user_info_daddr_length
    CHECK (char_length(daddr)<=200);

-- 이미 완료된 발송 결과·전송 FK·선행 0을 그대로 보존한다. 이 SQL은 외부 SMS를 발송하지 않는다.
UPDATE tb_sms_rcptn SET rcptn_telno=replace(rcptn_telno,'-','')
WHERE rcptn_telno LIKE '%-%';

ALTER TABLE tb_sms_rcptn ADD CONSTRAINT ck_tb_sms_rcptn_rcptn_telno_digits
    CHECK (rcptn_telno ~ '^[0-9]{1,11}$');
