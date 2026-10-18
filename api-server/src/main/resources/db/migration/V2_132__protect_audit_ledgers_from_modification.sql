-- V2_132: 감사 원장 세 표의 행을 DB 에서 고치거나 함부로 지울 수 없게 한다(2026-10-18 보안 보강, 사용자 승인).
--
-- 대상: tb_sys_adt_log(민감 작업 감사), tb_authrt_chg_hstry(권한 변경 이력), tb_privacy_log(개인정보 접근 기록).
-- 세 표는 쓰는 경로가 INSERT 하나다(2026-10-18 저장소 전수 확인 — SensitiveAuditService·PrivacyAccessLogListener·
--   AuthorizationAdministrationService·DurableJobAdministrationService 와 승인된 migration·시드). 종전에는 앱 버그·잘못 쓴 관리 SQL·
--   SQL 주입이 감사 행을 바꾸거나 지워도 DB 가 막지 않았다 — 고칠 수 있는 감사 기록은 증거가 되지 못한다.
--
-- 규칙(행 트리거, 같은 함수):
--   UPDATE — 언제나 거부한다. 고칠 일이 생기면 정정 행을 새로 남긴다.
--   DELETE — 같은 트랜잭션이 보존 정리를 선언했을 때만(SET LOCAL app.audit_retention = 'on') 허용한다. 보존 기간이 지난 행을
--            지우는 LogRetentionScheduler(개인정보 접근 기록·민감 작업 감사)가 그 삭제 트랜잭션 안에서 이 값을 켠다.
--            tb_authrt_chg_hstry 에는 보존 정리 경로가 없다 — 선언 없이는 지울 수 없다.
-- 선언은 트랜잭션 지역(SET LOCAL·set_config(..., true))으로 쓴다. 이 함수는 세션 전체에 켠 값과 구분하지 않으므로 앱은 지역 선언만 쓴다.
--
-- 경계(정직한 한계): 앱과 같은 DB 계정으로 일어나는 실수·주입을 막는 장치다. 표 소유자는 트리거를 끄거나 지울 수 있고, 행 트리거는
--   표 전체를 비우는 문장(문장 단위 비우기)을 거치지 않는다 — 그 권한은 운영 계정 분리로 막는다(이 변경 밖). DB 관리자에 대한
--   위·변조 방지(WORM 보관 등)도 아니다. 트리거를 끄는 migration 은 그 사유를 같은 파일에 남긴다.
-- 기존 행·컬럼·제약은 바꾸지 않는다. 함수·트리거만 더한다(되돌리기: 트리거 셋과 함수 fn_adt_log_chg_prhb 를 지운다).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE FUNCTION fn_adt_log_chg_prhb() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('app.audit_retention', true) = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Audit ledger % rejects %: rows are append-only (retention must SET LOCAL app.audit_retention = on)',
        TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'restrict_violation';
END $$;

COMMENT ON FUNCTION fn_adt_log_chg_prhb() IS
    '감사로그변경금지: 감사 원장 행의 수정을 거부하고 삭제는 트랜잭션 지역 app.audit_retention=on 일 때만 허용한다';

CREATE TRIGGER tr_tb_sys_adt_log_chg_prhb BEFORE UPDATE OR DELETE ON tb_sys_adt_log
    FOR EACH ROW EXECUTE FUNCTION fn_adt_log_chg_prhb();

CREATE TRIGGER tr_tb_authrt_chg_hstry_chg_prhb BEFORE UPDATE OR DELETE ON tb_authrt_chg_hstry
    FOR EACH ROW EXECUTE FUNCTION fn_adt_log_chg_prhb();

CREATE TRIGGER tr_tb_privacy_log_chg_prhb BEFORE UPDATE OR DELETE ON tb_privacy_log
    FOR EACH ROW EXECUTE FUNCTION fn_adt_log_chg_prhb();
