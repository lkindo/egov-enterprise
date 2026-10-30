-- PROPOSAL ONLY: withdrawal BEFORE Redirect, after stopping all new-column consumers.
-- Caller owns ONE transaction for this ENTIRE file. Shared DB use requires separate approval.
-- Destructive DDL requires an approved waiver in the eventual versioned Flyway migration.
-- Preserve metadata, legacy values and Flyway history. No CASCADE, no automatic metadata deletion.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
SET LOCAL search_path = pg_catalog, public;
LOCK TABLE public.tb_sys_log IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.tb_web_log IN ACCESS EXCLUSIVE MODE;

DO $d02_log_withdraw_guard$
BEGIN
    IF current_setting('transaction_isolation') <> 'read committed'
       OR current_setting('session_replication_role') <> 'origin' THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log withdrawal requires READ COMMITTED and origin';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name IN ('tb_sys_log','tb_web_log')
          AND column_name IN ('prcs_tm','prcs_req_msec') AND data_type='bigint'
          AND is_nullable='YES' AND column_default IS NULL) <> 4 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log withdrawal column contract differs';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tb_sys_log
        WHERE prcs_req_msec IS NOT NULL AND prcs_req_msec IS DISTINCT FROM prcs_tm)
       OR EXISTS (SELECT 1 FROM public.tb_web_log
        WHERE prcs_req_msec IS NOT NULL AND prcs_req_msec IS DISTINCT FROM prcs_tm) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log withdrawal would discard a different nonnull value';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_trigger WHERE NOT tgisinternal
        AND tgrelid IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass)) <> 2 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log withdrawal requires review of changed triggers';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_trigger WHERE NOT tgisinternal
        AND tgenabled='O' AND tgtype=23 AND tgnargs=0 AND tgqual IS NULL
        AND ((tgrelid='public.tb_sys_log'::regclass AND tgname='tr_sync_sys_log_prcs_req_msec'
              AND tgfoid=to_regprocedure('public.fn_sync_sys_log_prcs_req_msec()'))
          OR (tgrelid='public.tb_web_log'::regclass AND tgname='tr_sync_web_log_prcs_req_msec'
              AND tgfoid=to_regprocedure('public.fn_sync_web_log_prcs_req_msec()')))) <> 2 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log withdrawal synchronization objects differ';
    END IF;
END;
$d02_log_withdraw_guard$;

-- Missing/changed dependencies fail and the caller rolls back BOTH tables.
DROP TRIGGER tr_sync_sys_log_prcs_req_msec ON public.tb_sys_log;
DROP FUNCTION public.fn_sync_sys_log_prcs_req_msec();
ALTER TABLE public.tb_sys_log DROP COLUMN prcs_req_msec;
DROP TRIGGER tr_sync_web_log_prcs_req_msec ON public.tb_web_log;
DROP FUNCTION public.fn_sync_web_log_prcs_req_msec();
ALTER TABLE public.tb_web_log DROP COLUMN prcs_req_msec;
