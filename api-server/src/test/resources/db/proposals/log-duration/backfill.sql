-- PROPOSAL ONLY: caller owns ONE transaction for this ENTIRE file; shared DB application requires approval.
-- One invocation updates at most 500 rows PER table (1000 total), system log then web log.
-- Two result sets: each has target text and changed_rows bigint. Retry only after rollback.
-- New readers AND writers remain disabled until complete parity=0 and trigger verification.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
SET LOCAL search_path = pg_catalog, public;
-- Compatible with normal DML; blocks concurrent trigger/table DDL during the batch.
LOCK TABLE public.tb_sys_log IN ROW EXCLUSIVE MODE;
LOCK TABLE public.tb_web_log IN ROW EXCLUSIVE MODE;

DO $d02_log_backfill_guard$
BEGIN
    IF current_setting('session_replication_role') <> 'origin' THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log backfill requires origin trigger execution';
    END IF;
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log backfill requires READ COMMITTED';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name IN ('tb_sys_log','tb_web_log')
          AND column_name IN ('prcs_tm','prcs_req_msec') AND data_type='bigint'
          AND is_nullable='YES' AND column_default IS NULL) <> 4 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log backfill column contract differs';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_trigger
        WHERE NOT tgisinternal AND tgrelid='public.tb_sys_log'::regclass) <> 1
       OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
        WHERE NOT tgisinternal AND tgrelid='public.tb_sys_log'::regclass
          AND tgname='tr_sync_sys_log_prcs_req_msec' AND tgenabled='O'
          AND tgtype=23 AND tgnargs=0 AND tgqual IS NULL
          AND ARRAY(SELECT unnest(tgattr) ORDER BY 1) = ARRAY(
              SELECT attnum FROM pg_catalog.pg_attribute
              WHERE attrelid='public.tb_sys_log'::regclass AND attname IN ('prcs_tm','prcs_req_msec') ORDER BY attnum)
          AND tgfoid=to_regprocedure('public.fn_sync_sys_log_prcs_req_msec()')) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log expected enabled synchronization trigger differs: tb_sys_log';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tb_sys_log
        WHERE prcs_req_msec IS NOT NULL AND prcs_req_msec IS DISTINCT FROM prcs_tm) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log nonnull target drift: tb_sys_log; preserve values and investigate';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_trigger
        WHERE NOT tgisinternal AND tgrelid='public.tb_web_log'::regclass) <> 1
       OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
        WHERE NOT tgisinternal AND tgrelid='public.tb_web_log'::regclass
          AND tgname='tr_sync_web_log_prcs_req_msec' AND tgenabled='O'
          AND tgtype=23 AND tgnargs=0 AND tgqual IS NULL
          AND ARRAY(SELECT unnest(tgattr) ORDER BY 1) = ARRAY(
              SELECT attnum FROM pg_catalog.pg_attribute
              WHERE attrelid='public.tb_web_log'::regclass AND attname IN ('prcs_tm','prcs_req_msec') ORDER BY attnum)
          AND tgfoid=to_regprocedure('public.fn_sync_web_log_prcs_req_msec()')) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log expected enabled synchronization trigger differs: tb_web_log';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tb_web_log
        WHERE prcs_req_msec IS NOT NULL AND prcs_req_msec IS DISTINCT FROM prcs_tm) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log nonnull target drift: tb_web_log; preserve values and investigate';
    END IF;
END;
$d02_log_backfill_guard$;

WITH selected AS MATERIALIZED (
    SELECT sys_log_sn FROM public.tb_sys_log
    WHERE prcs_req_msec IS NULL AND prcs_tm IS NOT NULL
    ORDER BY sys_log_sn LIMIT 500 FOR UPDATE SKIP LOCKED
), changed AS (
    UPDATE public.tb_sys_log AS target SET prcs_req_msec=target.prcs_tm
    FROM selected
    WHERE target.sys_log_sn=selected.sys_log_sn
      AND target.prcs_req_msec IS NULL AND target.prcs_tm IS NOT NULL
    RETURNING 1
)
SELECT 'tb_sys_log.prcs_req_msec'::text AS target, count(*) AS changed_rows FROM changed;

WITH selected AS MATERIALIZED (
    SELECT web_log_sn FROM public.tb_web_log
    WHERE prcs_req_msec IS NULL AND prcs_tm IS NOT NULL
    ORDER BY web_log_sn LIMIT 500 FOR UPDATE SKIP LOCKED
), changed AS (
    UPDATE public.tb_web_log AS target SET prcs_req_msec=target.prcs_tm
    FROM selected
    WHERE target.web_log_sn=selected.web_log_sn
      AND target.prcs_req_msec IS NULL AND target.prcs_tm IS NOT NULL
    RETURNING 1
)
SELECT 'tb_web_log.prcs_req_msec'::text AS target, count(*) AS changed_rows FROM changed;
