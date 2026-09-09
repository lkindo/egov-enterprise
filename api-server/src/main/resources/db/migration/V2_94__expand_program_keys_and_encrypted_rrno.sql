-- ADR-0014: 기존 프로그램 키 보존, 표준 암호화 주민번호 컬럼으로 Expand/Migrate.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE tb_prgrm_lst, tb_role_prgrm_map, tb_menu_info, tb_user_info IN ACCESS EXCLUSIVE MODE NOWAIT;

DO $$
DECLARE target text;
BEGIN
    IF (SELECT count(*) FROM meta_standard_terms t JOIN meta_standard_domains d USING(domain_name)
        WHERE (t.eng_abbr='PRGRM_FILE_NM' AND d.data_length=300)
           OR (t.eng_abbr='USER_ENRRNO' AND d.data_length=256 AND d.domain_name='암호화번호V256')) <> 2 THEN
        RAISE EXCEPTION 'Approved program/encrypted identifier standards are required';
    END IF;
    FOREACH target IN ARRAY ARRAY['tb_prgrm_lst','tb_role_prgrm_map','tb_menu_info'] LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
            AND table_name=target AND column_name='prgrm_file_nm'
            AND data_type='character varying' AND character_maximum_length=100) THEN
            RAISE EXCEPTION 'Unexpected program key type: %', target;
        END IF;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='tb_user_info' AND column_name='rrno'
        AND data_type='character varying' AND character_maximum_length=256) THEN
        RAISE EXCEPTION 'Unexpected encrypted identifier storage';
    END IF;
END $$;

ALTER TABLE tb_prgrm_lst ALTER COLUMN prgrm_file_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0035 ADR-0014 기존 PK 값·FK를 보존하는 300자 확장; 표준 검사·NOWAIT·복제 DB 검증
ALTER TABLE tb_role_prgrm_map ALTER COLUMN prgrm_file_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0036 ADR-0014 기존 복합 PK 값·FK를 보존하는 300자 확장; 표준 검사·NOWAIT·복제 DB 검증
ALTER TABLE tb_menu_info ALTER COLUMN prgrm_file_nm TYPE varchar(300); -- linter:ignore ZDM-2026-0037 ADR-0014 선택적 프로그램 참조의 300자 확장; 표준 검사·NOWAIT·복제 DB 검증

ALTER TABLE tb_user_info ADD COLUMN user_enrrno varchar(256);
COMMENT ON COLUMN tb_user_info.user_enrrno IS '사용자암호화주민등록번호';
UPDATE tb_user_info SET user_enrrno=rrno WHERE rrno IS NOT NULL;

-- 구·신 애플리케이션의 변경을 모두 동기화한다. 암호문을 복호화하거나 재암호화하지 않는다.
CREATE FUNCTION fn_sync_user_enrrno() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='INSERT' THEN
        IF NEW.rrno IS NOT NULL AND NEW.user_enrrno IS NOT NULL AND NEW.rrno IS DISTINCT FROM NEW.user_enrrno THEN
            RAISE EXCEPTION 'Conflicting encrypted identifier writes';
        END IF;
        NEW.user_enrrno := coalesce(NEW.user_enrrno,NEW.rrno);
        NEW.rrno := NEW.user_enrrno;
    ELSE
        IF NEW.rrno IS DISTINCT FROM OLD.rrno AND NEW.user_enrrno IS DISTINCT FROM OLD.user_enrrno
            AND NEW.rrno IS DISTINCT FROM NEW.user_enrrno THEN
            RAISE EXCEPTION 'Conflicting encrypted identifier writes';
        ELSIF NEW.rrno IS DISTINCT FROM OLD.rrno THEN
            NEW.user_enrrno := NEW.rrno;
        ELSE
            NEW.rrno := NEW.user_enrrno;
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_user_enrrno BEFORE INSERT OR UPDATE ON tb_user_info
    FOR EACH ROW EXECUTE FUNCTION fn_sync_user_enrrno();
