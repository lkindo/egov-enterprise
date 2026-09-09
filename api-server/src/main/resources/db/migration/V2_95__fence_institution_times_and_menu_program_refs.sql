-- ADR-0014: HHmmss 입력 계약과 선택적 메뉴→프로그램 참조를 확정한다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE tb_inst_cd, tb_inst_cd_rcptn_log, tb_menu_info, tb_prgrm_lst IN ACCESS EXCLUSIVE MODE NOWAIT;

DO $$
BEGIN
    IF (SELECT count(*) FROM meta_standard_terms t JOIN meta_standard_domains d USING(domain_name)
        WHERE t.eng_abbr='CHG_TM' AND d.domain_name='시분초C6' AND d.data_length=6) <> 1 THEN
        RAISE EXCEPTION 'HHmmss standard metadata mismatch';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_inst_cd WHERE chg_tm IS NOT NULL AND chg_tm !~ '^([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]$')
        OR EXISTS (SELECT 1 FROM tb_inst_cd_rcptn_log WHERE chg_tm IS NOT NULL AND chg_tm !~ '^([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]$') THEN
        RAISE EXCEPTION 'Invalid institution change time; explicit source conversion required';
    END IF;
    -- 독립 라우트 또는 자식이 있는 명시적 폴더만 연결을 해제할 수 있다.
    -- 그 밖의 레거시 키는 경로 유실 가능성이 있어 자동 정리하지 않는다.
    IF EXISTS (SELECT 1 FROM tb_menu_info m WHERE m.prgrm_file_nm IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM tb_prgrm_lst p WHERE p.prgrm_file_nm=m.prgrm_file_nm)
        AND NOT (NULLIF(btrim(m.modern_route),'') IS NOT NULL
            OR (m.prgrm_file_nm IN ('dir','/') AND EXISTS (SELECT 1 FROM tb_menu_info c WHERE c.up_menu_sn=m.menu_sn)))) THEN
        RAISE EXCEPTION 'Unresolved legacy menu route; explicit mapping required';
    END IF;
END $$;

ALTER TABLE tb_inst_cd ADD CONSTRAINT ck_tb_inst_cd_chg_tm_hhmmss
    CHECK (chg_tm ~ '^([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]$') NOT VALID;
ALTER TABLE tb_inst_cd_rcptn_log ADD CONSTRAINT ck_tb_inst_cd_rcptn_log_chg_tm_hhmmss
    CHECK (chg_tm ~ '^([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]$') NOT VALID;
ALTER TABLE tb_inst_cd VALIDATE CONSTRAINT ck_tb_inst_cd_chg_tm_hhmmss;
ALTER TABLE tb_inst_cd_rcptn_log VALIDATE CONSTRAINT ck_tb_inst_cd_rcptn_log_chg_tm_hhmmss;

UPDATE tb_menu_info m SET prgrm_file_nm=NULL
WHERE m.prgrm_file_nm IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM tb_prgrm_lst p WHERE p.prgrm_file_nm=m.prgrm_file_nm);
ALTER TABLE tb_menu_info ADD CONSTRAINT fk_tb_menu_info_tb_prgrm_lst
    FOREIGN KEY(prgrm_file_nm) REFERENCES tb_prgrm_lst(prgrm_file_nm) ON DELETE NO ACTION NOT VALID;
ALTER TABLE tb_menu_info VALIDATE CONSTRAINT fk_tb_menu_info_tb_prgrm_lst;
