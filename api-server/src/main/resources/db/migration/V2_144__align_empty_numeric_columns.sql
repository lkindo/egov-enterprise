-- Approved implementation: only these three columns, only while BOTH tables are empty,
-- in a maintenance window with all application/external writers stopped.
-- Shared database execution still requires the final environment-specific packet approval.
-- Flyway owns one transaction for this whole file. No metadata or business DML is performed.
-- Existing names, NULL/default semantics, comments, PK/FK/version and API strings are retained.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
-- PostgreSQL 17+: terminate the connection and roll back if the whole transaction exceeds its budget.
SET LOCAL transaction_timeout = '15s';
SET LOCAL search_path = pg_catalog, public;

-- Stable order; never wait while holding earlier metadata/business locks.
LOCK TABLE public.meta_standard_words IN SHARE MODE NOWAIT;
LOCK TABLE public.meta_standard_domains IN SHARE MODE NOWAIT;
LOCK TABLE public.meta_standard_terms IN SHARE MODE NOWAIT;
LOCK TABLE ONLY public.tb_dept_task_info IN ACCESS EXCLUSIVE MODE NOWAIT;
LOCK TABLE ONLY public.tb_popup_info IN ACCESS EXCLUSIVE MODE NOWAIT;

DO $numeric_preflight$
BEGIN
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='V2_144 requires READ COMMITTED';
    END IF;
    IF (SELECT count(*) FROM pg_class
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
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='V2_144 unexpected table, inheritance, RLS, rule or user trigger';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND data_type='character varying'
          AND character_maximum_length=12 AND is_nullable='YES' AND column_default IS NULL
          AND is_generated='NEVER' AND is_identity='NO'
          AND ((table_name='tb_dept_task_info' AND column_name='prrty_rnk')
            OR (table_name='tb_popup_info' AND column_name IN ('popup_wdth_sz','popup_vrtc_sz')))) <> 3 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='V2_144 expected three VARCHAR(12) NULL columns without defaults';
    END IF;
    -- A view, expression index, CHECK, generated column or other dependency needs separate review.
    IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_attribute a
        ON d.refclassid='pg_class'::regclass AND d.refobjid=a.attrelid AND d.refobjsubid=a.attnum
        WHERE NOT a.attisdropped
          AND ((a.attrelid='public.tb_dept_task_info'::regclass AND a.attname='prrty_rnk')
            OR (a.attrelid='public.tb_popup_info'::regclass AND a.attname IN ('popup_wdth_sz','popup_vrtc_sz')))) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='V2_144 numeric target has an unexpected dependent object';
    END IF;
    IF (SELECT count(*) FROM public.meta_standard_words WHERE rprs_yn='Y'
        AND (word_name,eng_abbr) IN (('우선','PRRTY'),('순위','RNK'),('팝업','POPUP'),
                                   ('가로','WDTH'),('세로','VRTC'),('크기','SZ'))) <> 6 THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='V2_144 representative standard words differ';
    END IF;
    IF (SELECT count(*) FROM public.meta_standard_terms t JOIN public.meta_standard_domains d
        ON d.domain_name=t.domain_name
        WHERE t.deprecated_yn='N' AND d.domain_group='수량' AND d.data_type='NUMERIC'
          AND ((t.term_name='우선순위' AND t.eng_abbr='PRRTY_RNK' AND t.domain_name='수N10' AND d.data_length=10)
            OR (t.term_name='팝업가로크기' AND t.eng_abbr='POPUP_WDTH_SZ' AND t.domain_name='수N7' AND d.data_length=7)
            OR (t.term_name='팝업세로크기' AND t.eng_abbr='POPUP_VRTC_SZ' AND t.domain_name='수N7' AND d.data_length=7))) <> 3
       OR (SELECT count(*) FROM public.meta_standard_terms
           WHERE term_name IN ('우선순위','팝업가로크기','팝업세로크기')
              OR upper(eng_abbr) IN ('PRRTY_RNK','POPUP_WDTH_SZ','POPUP_VRTC_SZ')) <> 3 THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='V2_144 existing numeric standard terms/domains differ';
    END IF;
    -- The exclusive locks make this an apply-time condition, not a stale preflight count.
    -- A row with NULL values is still a row and must stop this empty-table-only migration.
    IF EXISTS (SELECT 1 FROM public.tb_dept_task_info)
       OR EXISTS (SELECT 1 FROM public.tb_popup_info) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='V2_144 requires BOTH business tables empty; no data conversion is approved';
    END IF;
END;
$numeric_preflight$;

ALTER TABLE public.tb_dept_task_info ALTER COLUMN prrty_rnk TYPE NUMERIC(10,0) USING prrty_rnk::NUMERIC(10,0); -- linter:ignore ZDM-2026-0044 승인된 빈 표 정비창 한정으로 세 컬럼을 원자 변경하고 두 표 잠금을 NOWAIT로 선점함
ALTER TABLE public.tb_popup_info ALTER COLUMN popup_wdth_sz TYPE NUMERIC(7,0) USING popup_wdth_sz::NUMERIC(7,0); -- linter:ignore ZDM-2026-0045 승인된 빈 표 정비창 한정으로 세 컬럼을 원자 변경하고 두 표 잠금을 NOWAIT로 선점함
ALTER TABLE public.tb_popup_info ALTER COLUMN popup_vrtc_sz TYPE NUMERIC(7,0) USING popup_vrtc_sz::NUMERIC(7,0); -- linter:ignore ZDM-2026-0046 승인된 빈 표 정비창 한정으로 세 컬럼을 원자 변경하고 두 표 잠금을 NOWAIT로 선점함

DO $numeric_postflight$
BEGIN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND data_type='numeric' AND numeric_scale=0
          AND is_nullable='YES' AND column_default IS NULL
          AND ((table_name='tb_dept_task_info' AND column_name='prrty_rnk' AND numeric_precision=10)
            OR (table_name='tb_popup_info' AND column_name IN ('popup_wdth_sz','popup_vrtc_sz') AND numeric_precision=7))) <> 3 THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='V2_144 numeric postcondition differs';
    END IF;
END;
$numeric_postflight$;
