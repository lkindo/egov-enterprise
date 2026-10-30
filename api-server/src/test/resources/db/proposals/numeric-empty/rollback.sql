-- REVIEW CANDIDATE ONLY. Not an automatic undo and not authorized for shared DB execution.
-- Requires a new approved forward Flyway version/waiver; never delete or edit V2_144 history.
-- Only before the first business write: BOTH tables must still be empty under exclusive locks.
-- The caller owns ONE transaction for this entire file; commit only after every statement succeeds.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
SET LOCAL transaction_timeout = '15s';
SET LOCAL search_path = pg_catalog, public;
LOCK TABLE ONLY public.tb_dept_task_info IN ACCESS EXCLUSIVE MODE NOWAIT;
LOCK TABLE ONLY public.tb_popup_info IN ACCESS EXCLUSIVE MODE NOWAIT;

DO $numeric_rollback_preflight$
BEGIN
    IF current_setting('transaction_isolation') <> 'read committed'
       OR (SELECT count(*) FROM pg_class
           WHERE oid IN ('public.tb_dept_task_info'::regclass, 'public.tb_popup_info'::regclass)
             AND relkind='r' AND relpersistence='p' AND NOT relispartition
             AND NOT relrowsecurity AND NOT relforcerowsecurity) <> 2
       OR EXISTS (SELECT 1 FROM pg_inherits
           WHERE inhrelid IN ('public.tb_dept_task_info'::regclass, 'public.tb_popup_info'::regclass)
              OR inhparent IN ('public.tb_dept_task_info'::regclass, 'public.tb_popup_info'::regclass))
       OR EXISTS (SELECT 1 FROM pg_rewrite
           WHERE ev_class IN ('public.tb_dept_task_info'::regclass, 'public.tb_popup_info'::regclass))
       OR EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal
           AND tgrelid IN ('public.tb_dept_task_info'::regclass, 'public.tb_popup_info'::regclass)) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Numeric rollback table/isolation/protection differs';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND data_type='numeric' AND numeric_scale=0
          AND is_nullable='YES' AND column_default IS NULL
          AND ((table_name='tb_dept_task_info' AND column_name='prrty_rnk' AND numeric_precision=10)
            OR (table_name='tb_popup_info' AND column_name IN ('popup_wdth_sz','popup_vrtc_sz') AND numeric_precision=7))) <> 3
       OR EXISTS (SELECT 1 FROM pg_depend d JOIN pg_attribute a
           ON d.refclassid='pg_class'::regclass AND d.refobjid=a.attrelid AND d.refobjsubid=a.attnum
           WHERE NOT a.attisdropped
             AND ((a.attrelid='public.tb_dept_task_info'::regclass AND a.attname='prrty_rnk')
               OR (a.attrelid='public.tb_popup_info'::regclass AND a.attname IN ('popup_wdth_sz','popup_vrtc_sz')))) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Numeric rollback column/dependency contract differs';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tb_dept_task_info)
       OR EXISTS (SELECT 1 FROM public.tb_popup_info) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Numeric rollback requires BOTH business tables empty; preserve post-migration writes';
    END IF;
END;
$numeric_rollback_preflight$;

ALTER TABLE public.tb_dept_task_info ALTER COLUMN prrty_rnk TYPE VARCHAR(12) USING prrty_rnk::VARCHAR(12);
ALTER TABLE public.tb_popup_info ALTER COLUMN popup_wdth_sz TYPE VARCHAR(12) USING popup_wdth_sz::VARCHAR(12);
ALTER TABLE public.tb_popup_info ALTER COLUMN popup_vrtc_sz TYPE VARCHAR(12) USING popup_vrtc_sz::VARCHAR(12);

DO $numeric_rollback_postflight$
BEGIN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND data_type='character varying' AND character_maximum_length=12
          AND is_nullable='YES' AND column_default IS NULL
          AND ((table_name='tb_dept_task_info' AND column_name='prrty_rnk')
            OR (table_name='tb_popup_info' AND column_name IN ('popup_wdth_sz','popup_vrtc_sz')))) <> 3 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Numeric rollback postcondition differs';
    END IF;
END;
$numeric_rollback_postflight$;
