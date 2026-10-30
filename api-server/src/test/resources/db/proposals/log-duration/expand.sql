-- PROPOSAL ONLY: NOT APPROVED FOR SHARED DATABASE APPLICATION.
-- Caller must run this ENTIRE file in one transaction with autocommit=false.
-- No BEGIN/COMMIT: suitable for an eventual separately approved Flyway migration.
-- External runner must bound total transaction/lock-hold time; statement_timeout is per statement.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
SET LOCAL search_path = pg_catalog, public;

-- Fixed metadata lock order precedes all conflict checks and target-table locks.
-- SHARE ROW EXCLUSIVE excludes competing metadata INSERT/UPDATE/DELETE through commit.
LOCK TABLE public.meta_standard_words IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.meta_standard_domains IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.meta_standard_terms IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.tb_sys_log IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.tb_web_log IN ACCESS EXCLUSIVE MODE;

DO $d02_log_preflight$
BEGIN
    IF current_setting('session_replication_role') <> 'origin' THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log Expand requires origin trigger execution';
    END IF;
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log Expand requires READ COMMITTED metadata visibility after lock acquisition';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name IN ('tb_sys_log','tb_web_log')
          AND column_name='prcs_tm' AND data_type='bigint'
          AND is_nullable='YES' AND column_default IS NULL) <> 2 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log legacy columns differ from BIGINT NULL without defaults';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND data_type='bigint' AND is_nullable='NO'
          AND ((table_name='tb_sys_log' AND column_name='sys_log_sn')
            OR (table_name='tb_web_log' AND column_name='web_log_sn'))) <> 2 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log key columns differ';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_constraint k
        JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND k.conkey=ARRAY[a.attnum]
        WHERE k.contype='p' AND NOT a.attisdropped
          AND ((k.conrelid='public.tb_sys_log'::regclass AND a.attname='sys_log_sn')
            OR (k.conrelid='public.tb_web_log'::regclass AND a.attname='web_log_sn'))) <> 2 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log single-column primary keys differ';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname IN ('tb_sys_log','tb_web_log')
          AND c.relkind='r' AND NOT c.relispartition) <> 2
       OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits
           WHERE inhrelid IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass)
              OR inhparent IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass))
       OR EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite
           WHERE ev_class IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass)) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log target tables require separate partition/view/inheritance/rule review';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name IN ('tb_sys_log','tb_web_log')
          AND column_name='prcs_req_msec') THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log target column already exists: inspect provenance, do not reapply Expand';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
        WHERE NOT tgisinternal
          AND tgrelid IN ('public.tb_sys_log'::regclass,'public.tb_web_log'::regclass)) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log existing user trigger requires review; no protection is disabled';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname IN ('fn_sync_sys_log_prcs_req_msec','fn_sync_web_log_prcs_req_msec')) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='D02 log synchronization function already exists';
    END IF;
    IF (SELECT count(*) FROM public.meta_standard_words
        WHERE rprs_yn='Y' AND (word_name,eng_abbr) IN (('처리','PRCS'),('소요','REQ'))) <> 2 THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log base representative words differ';
    END IF;
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
END;
$d02_log_preflight$;

-- Exact, pre-existing candidate metadata may be reused; no existing metadata is updated.
-- Metadata tables remain locked throughout validation, insertion and postvalidation.
INSERT INTO public.meta_standard_words(word_name,eng_abbr,word_dc,rprs_yn)
SELECT '밀리초','MSEC','1초의 1,000분의 1에 해당하는 시간량의 단위(ms). 시계의 시각이나 날짜·시간대 표현과 구분한다.','Y'
WHERE NOT EXISTS (SELECT 1 FROM public.meta_standard_words WHERE word_name='밀리초' OR upper(eng_abbr)='MSEC');
INSERT INTO public.meta_standard_domains(domain_group,domain_name,data_type,data_length)
SELECT '수량','밀리초N19','BIGINT',19
WHERE NOT EXISTS (SELECT 1 FROM public.meta_standard_domains WHERE upper(domain_name)=upper('밀리초N19'));
INSERT INTO public.meta_standard_terms(term_name,eng_abbr,description,domain_name,synonyms,allowed_values,deprecated_yn)
SELECT '처리소요밀리초','PRCS_REQ_MSEC','요청 또는 작업 처리에 걸린 시간을 밀리초(ms) 단위의 64비트 정수로 기록한 값. 시계의 처리시각(HHmmss)과 구분한다. 기존 값·NULL과 API 표현을 보존하며 단위 변환이나 값 보정은 수행하지 않는다.','밀리초N19',NULL,NULL,'N'
WHERE NOT EXISTS (SELECT 1 FROM public.meta_standard_terms WHERE term_name='처리소요밀리초' OR upper(eng_abbr)='PRCS_REQ_MSEC');

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

ALTER TABLE public.tb_sys_log ADD COLUMN prcs_req_msec BIGINT;
COMMENT ON COLUMN public.tb_sys_log.prcs_req_msec IS '처리소요밀리초 — 요청 또는 작업 처리에 걸린 밀리초(ms) 수량; 기존 prcs_tm 값과 동일 단위';

CREATE FUNCTION public.fn_sync_sys_log_prcs_req_msec() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $d02_log_sync$
DECLARE
    legacy_changed boolean := false;
    target_changed boolean := false;
BEGIN
    -- Supported writers provide one representation; see log-duration-transition-proposal.md for limits.
    IF TG_OP='INSERT' THEN
        IF NEW.prcs_tm IS NULL THEN NEW.prcs_tm := NEW.prcs_req_msec; END IF;
        IF NEW.prcs_req_msec IS NULL THEN NEW.prcs_req_msec := NEW.prcs_tm; END IF;
    ELSE
        IF OLD.prcs_req_msec IS NOT NULL AND OLD.prcs_req_msec IS DISTINCT FROM OLD.prcs_tm THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log existing value drift: tb_sys_log; preserve and investigate';
        END IF;
        legacy_changed := NEW.prcs_tm IS DISTINCT FROM OLD.prcs_tm;
        target_changed := NEW.prcs_req_msec IS DISTINCT FROM OLD.prcs_req_msec;
        IF legacy_changed AND NOT target_changed THEN
            NEW.prcs_req_msec := NEW.prcs_tm;
        ELSIF target_changed AND NOT legacy_changed THEN
            NEW.prcs_tm := NEW.prcs_req_msec;
        ELSIF NOT legacy_changed AND NOT target_changed AND NEW.prcs_req_msec IS NULL THEN
            NEW.prcs_req_msec := NEW.prcs_tm;
        END IF;
    END IF;
    IF NEW.prcs_req_msec IS DISTINCT FROM NEW.prcs_tm THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log conflicting value pair: tb_sys_log';
    END IF;
    RETURN NEW;
END;
$d02_log_sync$;
CREATE TRIGGER tr_sync_sys_log_prcs_req_msec BEFORE INSERT OR UPDATE OF prcs_tm,prcs_req_msec
ON public.tb_sys_log FOR EACH ROW EXECUTE FUNCTION public.fn_sync_sys_log_prcs_req_msec();

ALTER TABLE public.tb_web_log ADD COLUMN prcs_req_msec BIGINT;
COMMENT ON COLUMN public.tb_web_log.prcs_req_msec IS '처리소요밀리초 — 요청 또는 작업 처리에 걸린 밀리초(ms) 수량; 기존 prcs_tm 값과 동일 단위';

CREATE FUNCTION public.fn_sync_web_log_prcs_req_msec() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $d02_log_sync$
DECLARE
    legacy_changed boolean := false;
    target_changed boolean := false;
BEGIN
    -- Supported writers provide one representation; see log-duration-transition-proposal.md for limits.
    IF TG_OP='INSERT' THEN
        IF NEW.prcs_tm IS NULL THEN NEW.prcs_tm := NEW.prcs_req_msec; END IF;
        IF NEW.prcs_req_msec IS NULL THEN NEW.prcs_req_msec := NEW.prcs_tm; END IF;
    ELSE
        IF OLD.prcs_req_msec IS NOT NULL AND OLD.prcs_req_msec IS DISTINCT FROM OLD.prcs_tm THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log existing value drift: tb_web_log; preserve and investigate';
        END IF;
        legacy_changed := NEW.prcs_tm IS DISTINCT FROM OLD.prcs_tm;
        target_changed := NEW.prcs_req_msec IS DISTINCT FROM OLD.prcs_req_msec;
        IF legacy_changed AND NOT target_changed THEN
            NEW.prcs_req_msec := NEW.prcs_tm;
        ELSIF target_changed AND NOT legacy_changed THEN
            NEW.prcs_tm := NEW.prcs_req_msec;
        ELSIF NOT legacy_changed AND NOT target_changed AND NEW.prcs_req_msec IS NULL THEN
            NEW.prcs_req_msec := NEW.prcs_tm;
        END IF;
    END IF;
    IF NEW.prcs_req_msec IS DISTINCT FROM NEW.prcs_tm THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='D02 log conflicting value pair: tb_web_log';
    END IF;
    RETURN NEW;
END;
$d02_log_sync$;
CREATE TRIGGER tr_sync_web_log_prcs_req_msec BEFORE INSERT OR UPDATE OF prcs_tm,prcs_req_msec
ON public.tb_web_log FOR EACH ROW EXECUTE FUNCTION public.fn_sync_web_log_prcs_req_msec();
