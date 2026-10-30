-- Reader/writer readiness gate. Run V2_145, the bounded Sync operation, then V2_146.
-- Nonempty unsynchronized environments must stop; this migration never backfills or repairs data.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
SET LOCAL transaction_timeout = '15s';
SET LOCAL search_path = pg_catalog, public;
LOCK TABLE public.meta_standard_words IN SHARE MODE NOWAIT;
LOCK TABLE public.meta_standard_domains IN SHARE MODE NOWAIT;
LOCK TABLE public.meta_standard_terms IN SHARE MODE NOWAIT;
LOCK TABLE public.tb_sys_log IN SHARE MODE NOWAIT;
LOCK TABLE public.tb_web_log IN SHARE MODE NOWAIT;
DO $d02_log_metadata$
BEGIN
    IF EXISTS (SELECT 1 FROM public.meta_standard_words
        WHERE (word_name='밀리초' OR upper(eng_abbr)='MSEC')
          AND ROW(word_name,eng_abbr,word_dc,rprs_yn) IS DISTINCT FROM
              ROW('밀리초','MSEC','1초의 1,000분의 1에 해당하는 시간량의 단위(ms). 시계의 시각이나 날짜·시간대 표현과 구분한다.','Y')) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log word name, abbreviation or exact definition conflicts';
    END IF;
    IF EXISTS (SELECT 1 FROM public.meta_standard_domains
        WHERE upper(domain_name)=upper('밀리초N19')
          AND ROW(domain_group,domain_name,data_type,data_length) IS DISTINCT FROM
              ROW('수량','밀리초N19','BIGINT',19)) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log domain name or exact definition conflicts';
    END IF;
    IF EXISTS (SELECT 1 FROM public.meta_standard_terms
        WHERE (term_name='처리소요밀리초' OR upper(eng_abbr)='PRCS_REQ_MSEC')
          AND ROW(term_name,eng_abbr,description,domain_name,synonyms,allowed_values,deprecated_yn)
              IS DISTINCT FROM ROW('처리소요밀리초','PRCS_REQ_MSEC','요청 또는 작업 처리에 걸린 시간을 밀리초(ms) 단위의 64비트 정수로 기록한 값. 시계의 처리시각(HHmmss)과 구분한다. 기존 값·NULL과 API 표현을 보존하며 단위 변환이나 값 보정은 수행하지 않는다.',
                                   '밀리초N19',NULL::text,NULL::text,'N')) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log term name, abbreviation or exact definition conflicts';
    END IF;
    IF (SELECT count(*) FROM public.meta_standard_words WHERE word_name='밀리초' OR upper(eng_abbr)='MSEC') <> 1
       OR (SELECT count(*) FROM public.meta_standard_domains WHERE upper(domain_name)=upper('밀리초N19')) <> 1
       OR (SELECT count(*) FROM public.meta_standard_terms WHERE term_name='처리소요밀리초' OR upper(eng_abbr)='PRCS_REQ_MSEC') <> 1 THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log exact metadata cardinality differs';
    END IF;
END;
$d02_log_metadata$;

DO $d02_log_function_guard$
BEGIN
    IF (SELECT count(*) FROM (VALUES
            ('fn_sync_sys_log_prcs_req_msec','41446683e9f7ad61dc677ca353fbfda9'),
            ('fn_sync_web_log_prcs_req_msec','961612955b1991940fd01e6de750243a')
        ) expected(name,body_md5)
        JOIN pg_catalog.pg_proc p ON p.oid=to_regprocedure('public.'||expected.name||'()')
        WHERE md5(replace(p.prosrc,E'\r\n',E'\n'))=expected.body_md5
          AND p.prorettype='pg_catalog.trigger'::regtype AND p.pronargs=0 AND NOT p.prosecdef
          AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
          AND p.proconfig=ARRAY['search_path=pg_catalog, public']) <> 2 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log approved synchronization function definition differs';
    END IF;
END;
$d02_log_function_guard$;

DO $d02_log_backfill_guard$
BEGIN
    IF (SELECT count(*) FROM pg_catalog.pg_class
        WHERE oid IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass)
          AND relkind='r' AND relpersistence='p' AND NOT relispartition
          AND NOT relrowsecurity AND NOT relforcerowsecurity) <> 2
       OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits
           WHERE inhrelid IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass)
              OR inhparent IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass))
       OR EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite
           WHERE ev_class IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass)) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log table shape, RLS, inheritance or rule differs';
    END IF;
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


DO $d02_log_redirect_ready$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_sys_log WHERE prcs_req_msec IS DISTINCT FROM prcs_tm)
       OR EXISTS (SELECT 1 FROM public.tb_web_log WHERE prcs_req_msec IS DISTINCT FROM prcs_tm) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='V2_146 requires complete log duration parity; run approved bounded Sync before Redirect';
    END IF;
END;
$d02_log_redirect_ready$;
