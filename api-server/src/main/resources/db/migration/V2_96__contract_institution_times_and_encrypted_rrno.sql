-- ADR-0014 Contract: V2_94 호환 창에서 신 버전 쓰기/읽기 검증 후 실행한다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE tb_user_info, tb_inst_cd, tb_inst_cd_rcptn_log IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_user_info WHERE rrno IS DISTINCT FROM user_enrrno) THEN
        RAISE EXCEPTION 'Encrypted identifier columns diverged; contract refused';
    END IF;
    IF (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND convalidated
        AND conname IN ('ck_tb_inst_cd_chg_tm_hhmmss','ck_tb_inst_cd_rcptn_log_chg_tm_hhmmss')) <> 2 THEN
        RAISE EXCEPTION 'Validated HHmmss input fences required before contract';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public'
        AND table_name IN ('tb_inst_cd','tb_inst_cd_rcptn_log') AND column_name='chg_tm'
        AND data_type='character varying' AND character_maximum_length=20) <> 2 THEN
        RAISE EXCEPTION 'Unexpected institution time column type';
    END IF;
END $$;
ALTER TABLE tb_inst_cd ALTER COLUMN chg_tm TYPE varchar(6); -- linter:ignore ZDM-2026-0038 ADR-0014 V2_95 HHmmss 검증·입력 차단 후 6자 축소; 값 절단 없음
ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN chg_tm TYPE varchar(6); -- linter:ignore ZDM-2026-0039 ADR-0014 V2_95 HHmmss 검증·입력 차단 후 6자 축소; 값 절단 없음
DROP TRIGGER trg_sync_user_enrrno ON tb_user_info;
DROP FUNCTION fn_sync_user_enrrno();
ALTER TABLE tb_user_info DROP COLUMN rrno; -- linter:ignore ZDM-2026-0040 ADR-0014 V2_94 암호문 바이트 보존·양방향 동기화·신 컬럼 전환 검증 후 구 컬럼 제거
