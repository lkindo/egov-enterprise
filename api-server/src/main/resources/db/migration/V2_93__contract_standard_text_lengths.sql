-- ADR-0013: 승인된 24개 표준 길이 정합 중 선행 입력 차단/정규화 완료 후 축소 5개.
-- 기존 데이터/표준을 다시 검사한다. 값 절단·메타 표준 변경·설계 보류 6개 변경은 하지 않는다.
-- 각 파일은 Flyway transaction 단위로 원자적이다. 여러 파일의 배포는 runbook의 단계 경계를 따른다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE tb_authrt_info, tb_event_info, tb_sms_rcptn, tb_user_info IN ACCESS EXCLUSIVE MODE NOWAIT;

DO $$
DECLARE
    target RECORD;
    oversized BOOLEAN;
BEGIN
    FOR target IN SELECT * FROM (VALUES
        ('tb_authrt_info','authrt_nm',300,100),
        ('tb_event_info','pic_nm',300,100),
        ('tb_sms_rcptn','rcptn_telno',13,11),
        ('tb_user_info','daddr',300,200),
        ('tb_user_info','home_addr',300,200)
    ) AS desired(table_name,column_name,old_length,new_length)
    LOOP
        IF (SELECT count(*) FROM meta_standard_terms t
            JOIN meta_standard_domains d ON d.domain_name=t.domain_name
            WHERE lower(t.eng_abbr)=target.column_name
              AND upper(d.data_type) IN ('VARCHAR','CHARACTER VARYING')
              AND d.data_length=target.new_length) <> 1 THEN
            RAISE EXCEPTION 'Standard metadata mismatch for %.%',target.table_name,target.column_name;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema='public' AND c.table_name=target.table_name
              AND c.column_name=target.column_name AND c.data_type='character varying'
              AND c.character_maximum_length=target.old_length) THEN
            RAISE EXCEPTION 'Unexpected physical type for %.%',target.table_name,target.column_name;
        END IF;
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE char_length(%I)>%s)',
            target.table_name,target.column_name,target.new_length) INTO oversized;
        IF oversized THEN
            RAISE EXCEPTION 'Over-length data in %.%; migration refused without truncation',target.table_name,target.column_name;
        END IF;
    END LOOP;
END $$;

-- V2_92의 검증된 제약이 실제로 있어야 Contract를 진행한다.
DO $$
BEGIN
    IF (SELECT count(*) FROM pg_constraint
        WHERE conname IN ('ck_tb_authrt_info_authrt_nm_length','ck_tb_event_info_pic_nm_length',
            'ck_tb_user_info_home_addr_length','ck_tb_user_info_daddr_length','ck_tb_sms_rcptn_rcptn_telno_digits')
          AND convalidated) <> 5 THEN
        RAISE EXCEPTION 'Validated V2_92 input fences are required before contract';
    END IF;
END $$;

ALTER TABLE tb_authrt_info ALTER COLUMN authrt_nm TYPE varchar(100); -- linter:ignore ZDM-2026-0030 tb_authrt_info.authrt_nm 표준 100자 정합: V2_92 선행 입력 차단·SMS 정규화, 초과 0 재검사 및 NOWAIT 선점 후 축소
ALTER TABLE tb_event_info ALTER COLUMN pic_nm TYPE varchar(100); -- linter:ignore ZDM-2026-0031 tb_event_info.pic_nm 표준 100자 정합: V2_92 선행 입력 차단·SMS 정규화, 초과 0 재검사 및 NOWAIT 선점 후 축소
ALTER TABLE tb_sms_rcptn ALTER COLUMN rcptn_telno TYPE varchar(11); -- linter:ignore ZDM-2026-0032 tb_sms_rcptn.rcptn_telno 표준 11자 정합: V2_92 선행 입력 차단·SMS 정규화, 초과 0 재검사 및 NOWAIT 선점 후 축소
ALTER TABLE tb_user_info ALTER COLUMN daddr TYPE varchar(200); -- linter:ignore ZDM-2026-0033 tb_user_info.daddr 표준 200자 정합: V2_92 선행 입력 차단·SMS 정규화, 초과 0 재검사 및 NOWAIT 선점 후 축소
ALTER TABLE tb_user_info ALTER COLUMN home_addr TYPE varchar(200); -- linter:ignore ZDM-2026-0034 tb_user_info.home_addr 표준 200자 정합: V2_92 선행 입력 차단·SMS 정규화, 초과 0 재검사 및 NOWAIT 선점 후 축소
