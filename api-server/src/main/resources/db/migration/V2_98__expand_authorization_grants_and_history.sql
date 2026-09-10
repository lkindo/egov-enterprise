-- 권한 핵심 3개 + 변경 이력 1개 전환의 Expand 단계.
-- 기존 읽기/쓰기 경로는 보존한다. OPERATION 정책 이관과 구 writer 종료는 후속 단계다.
-- OCI 2026-09-10 읽기 실측: 단어/용어/도메인, PK/FK, 감사 컬럼 폭을 확인했다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE tb_authrt_info, tb_user_info, tb_user_authrt_map, tb_menu_info, tb_menu_crt_dtl
    IN SHARE MODE NOWAIT;

-- 표준 단어는 이미 등록돼 있다. 동명이의 약어/미등록 단어를 추측하지 않는다.
DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('권한','AUTHRT'), ('부여','GRNT'), ('코드','CD'), ('유형','TYPE'),
        ('변경','CHG'), ('이력','HSTRY'), ('일련번호','SN'), ('대상','TRGT'),
        ('요청','DMND'), ('식별자','IDNTFR'), ('정책','PLCY'), ('버전','VER'),
        ('번호','NO'), ('사용자','USER'), ('보안','SCRTY'), ('결정','DCSN'),
        ('아이디','ID'), ('회원','MBR'), ('최초','FRST'), ('등록자','RGTR'),
        ('최종','LAST'), ('수정자','MDFR')
    ) AS words(word_name,eng_abbr)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_words w
                       WHERE w.word_name=expected.word_name AND w.eng_abbr=expected.eng_abbr
                         AND w.rprs_yn='Y') THEN
            RAISE EXCEPTION 'Authorization standard word is missing or not representative: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

-- 현 코드 도메인의 최대 폭은 12자다. 기존 도메인을 늘리지 않고 20자 코드 도메인을 추가한다.
INSERT INTO meta_standard_domains (domain_group,domain_name,data_type,data_length)
VALUES ('코드','코드V20','VARCHAR',20)
ON CONFLICT (domain_name) DO NOTHING;

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('코드V20','VARCHAR',20), ('코드C12','VARCHAR',12),
        ('명V20','VARCHAR',20), ('명V100','VARCHAR',100),
        ('내용V4000','VARCHAR',4000), ('번호V50','VARCHAR',50),
        ('번호V64','VARCHAR',64), ('일련번호N19','BIGINT',19),
        ('연월일시분초D','DATETIME',0)
    ) AS domains(domain_name,data_type,data_length)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_domains d
                       WHERE d.domain_name=expected.domain_name
                         AND d.data_type=expected.data_type AND d.data_length=expected.data_length) THEN
            RAISE EXCEPTION 'Authorization standard domain conflict: %',expected.domain_name;
        END IF;
    END LOOP;
END $$;

-- 기존 컬럼명에 대한 신규 사전 등록은 물리 타입을 바꾸지 않는다.
-- FRST_RGTR_ID/LAST_MDFR_ID는 기존 규약대로 loginId이며 변경자의 esntlId는 별도 보존한다.
INSERT INTO meta_standard_terms (term_name,eng_abbr,description,domain_name)
VALUES
    ('권한코드','AUTHRT_CD','권한그룹 마스터의 기존 식별 코드','코드V20'),
    ('권한유형코드','AUTHRT_TYPE_CD','기능 실행(OPERATION)과 메뉴 노출(NAVIGATION)의 구분','코드C12'),
    ('권한부여코드','AUTHRT_GRNT_CD','코드 기능 카탈로그 또는 메뉴 카탈로그의 부여 대상 코드','코드V20'),
    ('권한변경이력일련번호','AUTHRT_CHG_HSTRY_SN','DB IDENTITY로 생성하는 불변 권한 변경 사건의 키','일련번호N19'),
    ('변경대상유형코드','CHG_TRGT_TYPE_CD','그룹·사용자 배정·그룹 권한 중 변경 대상의 종류','코드C12'),
    ('변경유형코드','CHG_TYPE_CD','추가·회수·수정·이관 사건의 구분','코드C12'),
    ('요청식별자','DMND_IDNTFR','같은 원자적 변경 요청의 여러 감사 행을 묶는 식별자','번호V50'),
    ('정책버전번호','PLCY_VER_NO','권한 카탈로그 SHA-256 또는 이관 버전 식별자','번호V64'),
    ('변경사용자식별자','CHG_USER_IDNTFR','변경자 esntlId의 감사 사본; 시스템 이관 시 NULL','명V20'),
    ('보안결정대상아이디','SCRTY_DCSN_TRGT_ID','기존 보안 배정 대상인 사용자 esntlId; loginId가 아님','명V20'),
    ('회원유형코드','MBR_TYPE_CD','기존 사용자 권한 배정의 회원 유형 코드','코드C12'),
    ('최초등록자아이디','FRST_RGTR_ID','공통 생성 감사 loginId; 시스템 작업은 SYSTEM','명V20'),
    ('최종수정자아이디','LAST_MDFR_ID','공통 수정 감사 loginId','명V20')
ON CONFLICT (eng_abbr) DO NOTHING;

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('AUTHRT_CD','권한코드','코드V20'),
        ('AUTHRT_TYPE_CD','권한유형코드','코드C12'),
        ('AUTHRT_GRNT_CD','권한부여코드','코드V20'),
        ('AUTHRT_CHG_HSTRY_SN','권한변경이력일련번호','일련번호N19'),
        ('CHG_TRGT_TYPE_CD','변경대상유형코드','코드C12'),
        ('CHG_TYPE_CD','변경유형코드','코드C12'),
        ('DMND_IDNTFR','요청식별자','번호V50'),
        ('PLCY_VER_NO','정책버전번호','번호V64'),
        ('CHG_USER_IDNTFR','변경사용자식별자','명V20'),
        ('SCRTY_DCSN_TRGT_ID','보안결정대상아이디','명V20'),
        ('MBR_TYPE_CD','회원유형코드','코드C12'),
        ('FRST_RGTR_ID','최초등록자아이디','명V20'),
        ('LAST_MDFR_ID','최종수정자아이디','명V20'),
        ('CHG_ARTCL_NM','변경항목명','명V100'),
        ('CHG_BFR_CN','변경이전내용','내용V4000'),
        ('CHG_AFTR_CN','변경이후내용','내용V4000'),
        ('CHG_RSN','변경사유','내용V4000'),
        ('CRT_DT','생성일시','연월일시분초D'),
        ('MDFCN_DT','수정일시','연월일시분초D')
    ) AS terms(eng_abbr,term_name,domain_name)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_terms t
                       WHERE t.eng_abbr=expected.eng_abbr AND t.term_name=expected.term_name
                         AND t.domain_name=expected.domain_name) THEN
            RAISE EXCEPTION 'Authorization standard term conflict: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

CREATE TABLE tb_authrt_user_map (
    scrty_dcsn_trgt_id varchar(20) NOT NULL,
    authrt_cd varchar(20) NOT NULL,
    mbr_type_cd varchar(12),
    frst_rgtr_id varchar(20),
    crt_dt timestamp without time zone,
    last_mdfr_id varchar(20),
    mdfcn_dt timestamp without time zone,
    CONSTRAINT pk_tb_authrt_user_map PRIMARY KEY (scrty_dcsn_trgt_id,authrt_cd),
    CONSTRAINT fk_tb_authrt_user_map_tb_user_info FOREIGN KEY (scrty_dcsn_trgt_id)
        REFERENCES tb_user_info(esntl_id) ON DELETE NO ACTION,
    CONSTRAINT fk_tb_authrt_user_map_tb_authrt_info FOREIGN KEY (authrt_cd)
        REFERENCES tb_authrt_info(authrt_cd) ON DELETE NO ACTION
);
CREATE INDEX ix_tb_authrt_user_map_authrt_cd ON tb_authrt_user_map(authrt_cd,scrty_dcsn_trgt_id);

CREATE TABLE tb_authrt_grnt_map (
    authrt_cd varchar(20) NOT NULL,
    authrt_type_cd varchar(12) NOT NULL,
    authrt_grnt_cd varchar(20) NOT NULL,
    frst_rgtr_id varchar(20),
    crt_dt timestamp without time zone,
    last_mdfr_id varchar(20),
    mdfcn_dt timestamp without time zone,
    CONSTRAINT pk_tb_authrt_grnt_map PRIMARY KEY (authrt_cd,authrt_type_cd,authrt_grnt_cd),
    CONSTRAINT fk_tb_authrt_grnt_map_tb_authrt_info FOREIGN KEY (authrt_cd)
        REFERENCES tb_authrt_info(authrt_cd) ON DELETE NO ACTION,
    CONSTRAINT ck_tb_authrt_grnt_map_authrt_type_cd CHECK (authrt_type_cd IN ('OPERATION','NAVIGATION')),
    CONSTRAINT ck_tb_authrt_grnt_map_authrt_grnt_cd CHECK (
        authrt_grnt_cd <> '' AND authrt_grnt_cd=btrim(authrt_grnt_cd)
        AND (authrt_type_cd <> 'NAVIGATION' OR authrt_grnt_cd ~ '^[1-9][0-9]{0,18}$')
    )
);
CREATE INDEX ix_tb_authrt_grnt_map_grant_lookup
    ON tb_authrt_grnt_map(authrt_type_cd,authrt_grnt_cd,authrt_cd);

-- 이력은 삭제된 사용자·그룹·메뉴의 사건도 보존해야 하므로 대상 FK를 두지 않는다.
-- 각 행은 한 배정/한 권한/한 필드의 delta다. 4000자 설명 원문을 JSON으로 팽창시키지 않는다.
CREATE TABLE tb_authrt_chg_hstry (
    authrt_chg_hstry_sn bigint GENERATED BY DEFAULT AS IDENTITY
        (SEQUENCE NAME sq_authrt_chg_hstry_sn),
    dmnd_idntfr varchar(50) NOT NULL,
    plcy_ver_no varchar(64) NOT NULL,
    chg_trgt_type_cd varchar(12) NOT NULL,
    chg_type_cd varchar(12) NOT NULL,
    authrt_cd varchar(20) NOT NULL,
    scrty_dcsn_trgt_id varchar(20),
    authrt_type_cd varchar(12),
    authrt_grnt_cd varchar(20),
    chg_artcl_nm varchar(100) NOT NULL,
    chg_bfr_cn varchar(4000),
    chg_aftr_cn varchar(4000),
    chg_rsn varchar(4000),
    chg_user_idntfr varchar(20),
    frst_rgtr_id varchar(20) NOT NULL,
    crt_dt timestamp without time zone NOT NULL,
    CONSTRAINT pk_tb_authrt_chg_hstry PRIMARY KEY (authrt_chg_hstry_sn),
    CONSTRAINT ck_tb_authrt_chg_hstry_chg_trgt_type_cd
        CHECK (chg_trgt_type_cd IN ('GROUP','USER_GROUP','GROUP_GRANT')),
    CONSTRAINT ck_tb_authrt_chg_hstry_chg_type_cd
        CHECK (chg_type_cd IN ('ADD','REMOVE','UPDATE','MIGRATE')),
    CONSTRAINT ck_tb_authrt_chg_hstry_authrt_type_cd
        CHECK (authrt_type_cd IS NULL OR authrt_type_cd IN ('OPERATION','NAVIGATION')),
    CONSTRAINT ck_tb_authrt_chg_hstry_target_shape CHECK (
        (chg_trgt_type_cd='GROUP' AND scrty_dcsn_trgt_id IS NULL
            AND authrt_type_cd IS NULL AND authrt_grnt_cd IS NULL)
        OR (chg_trgt_type_cd='USER_GROUP' AND scrty_dcsn_trgt_id IS NOT NULL
            AND authrt_type_cd IS NULL AND authrt_grnt_cd IS NULL)
        OR (chg_trgt_type_cd='GROUP_GRANT' AND scrty_dcsn_trgt_id IS NULL
            AND authrt_type_cd IS NOT NULL AND authrt_grnt_cd IS NOT NULL)
    ),
    CONSTRAINT ck_tb_authrt_chg_hstry_change_value CHECK (
        chg_bfr_cn IS NOT NULL OR chg_aftr_cn IS NOT NULL
    )
);
CREATE INDEX ix_tb_authrt_chg_hstry_dmnd_idntfr ON tb_authrt_chg_hstry(dmnd_idntfr,authrt_chg_hstry_sn);
CREATE INDEX ix_tb_authrt_chg_hstry_authrt_cd ON tb_authrt_chg_hstry(authrt_cd,crt_dt,authrt_chg_hstry_sn);
CREATE INDEX ix_tb_authrt_chg_hstry_crt_dt ON tb_authrt_chg_hstry(crt_dt,authrt_chg_hstry_sn);

COMMENT ON TABLE tb_authrt_user_map IS '권한그룹 사용자 다중 배정';
COMMENT ON TABLE tb_authrt_grnt_map IS '권한그룹별 유형화된 기능 및 메뉴 권한';
COMMENT ON TABLE tb_authrt_chg_hstry IS '동일 트랜잭션으로 보존하는 권한 변경의 원자적 이력';
COMMENT ON COLUMN tb_authrt_user_map.scrty_dcsn_trgt_id IS '사용자 esntlId; loginId가 아님';
COMMENT ON COLUMN tb_authrt_grnt_map.authrt_grnt_cd IS 'OPERATION 코드 또는 NAVIGATION 메뉴 일련번호의 10진 문자열';
COMMENT ON COLUMN tb_authrt_chg_hstry.chg_user_idntfr IS '변경자 esntlId 감사 사본; 시스템 이관은 NULL';
COMMENT ON COLUMN tb_authrt_chg_hstry.frst_rgtr_id IS '공통 감사 loginId; esntlId와 구분';
COMMENT ON COLUMN tb_authrt_chg_hstry.chg_bfr_cn IS '원자적 변경 이전 값; 문자열 원문 또는 길이 검증된 이관 행';
COMMENT ON COLUMN tb_authrt_chg_hstry.chg_aftr_cn IS '원자적 변경 이후 값; 문자열 원문 또는 길이 검증된 이관 행';

-- 이관 전 길이·대상 존재·감사 원문 폭을 검사한다. 절단과 암묵적 USER 추가는 하지 않는다.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_user_authrt_map legacy
               WHERE char_length(legacy.authrt_id)>20
                  OR NOT EXISTS (SELECT 1 FROM tb_authrt_info a WHERE a.authrt_cd=legacy.authrt_id)
                  OR NOT EXISTS (SELECT 1 FROM tb_user_info u WHERE u.esntl_id=legacy.scrty_dcsn_trgt_id)
                  OR char_length(to_jsonb(legacy)::text)>4000) THEN
        RAISE EXCEPTION 'Legacy authorization membership cannot be copied without loss';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_menu_crt_dtl legacy
               WHERE legacy.menu_sn<1
                  OR NOT EXISTS (SELECT 1 FROM tb_menu_info m WHERE m.menu_sn=legacy.menu_sn)
                  OR NOT EXISTS (SELECT 1 FROM tb_authrt_info a WHERE a.authrt_cd=legacy.authrt_cd)
                  OR char_length(to_jsonb(legacy)::text)>4000) THEN
        RAISE EXCEPTION 'Legacy navigation grant cannot be copied without loss';
    END IF;
END $$;

INSERT INTO tb_authrt_user_map
    (scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
SELECT scrty_dcsn_trgt_id,authrt_id,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt
FROM tb_user_authrt_map;

INSERT INTO tb_authrt_grnt_map
    (authrt_cd,authrt_type_cd,authrt_grnt_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
SELECT authrt_cd,'NAVIGATION',menu_sn::text,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt
FROM tb_menu_crt_dtl;

INSERT INTO tb_authrt_chg_hstry
    (dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,scrty_dcsn_trgt_id,
     chg_artcl_nm,chg_bfr_cn,chg_aftr_cn,chg_rsn,frst_rgtr_id,crt_dt)
SELECT 'migration:2.98','migration:2.98','USER_GROUP','MIGRATE',legacy.authrt_id,legacy.scrty_dcsn_trgt_id,
       'legacy_membership',to_jsonb(legacy)::text,to_jsonb(target)::text,
       '기존 단일 배정의 값과 감사 필드를 변경 없이 복제','SYSTEM',CURRENT_TIMESTAMP
FROM tb_user_authrt_map legacy
JOIN tb_authrt_user_map target
  ON target.scrty_dcsn_trgt_id=legacy.scrty_dcsn_trgt_id AND target.authrt_cd=legacy.authrt_id;

INSERT INTO tb_authrt_chg_hstry
    (dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,authrt_type_cd,authrt_grnt_cd,
     chg_artcl_nm,chg_bfr_cn,chg_aftr_cn,chg_rsn,frst_rgtr_id,crt_dt)
SELECT 'migration:2.98','migration:2.98','GROUP_GRANT','MIGRATE',legacy.authrt_cd,'NAVIGATION',legacy.menu_sn::text,
       'legacy_menu_mapping',to_jsonb(legacy)::text,to_jsonb(target)::text,
       '기존 메뉴 배정과 mapng_crt_id를 포함한 원본 행 보존','SYSTEM',CURRENT_TIMESTAMP
FROM tb_menu_crt_dtl legacy
JOIN tb_authrt_grnt_map target
  ON target.authrt_cd=legacy.authrt_cd AND target.authrt_type_cd='NAVIGATION'
 AND target.authrt_grnt_cd=legacy.menu_sn::text;

DO $$
BEGIN
    IF (SELECT count(*) FROM tb_authrt_user_map) <> (SELECT count(*) FROM tb_user_authrt_map)
       OR EXISTS (
           SELECT scrty_dcsn_trgt_id,authrt_id,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt
           FROM tb_user_authrt_map
           EXCEPT
           SELECT scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt
           FROM tb_authrt_user_map
       ) THEN
        RAISE EXCEPTION 'Authorization membership copy differs from legacy source';
    END IF;
    IF (SELECT count(*) FROM tb_authrt_grnt_map) <> (SELECT count(*) FROM tb_menu_crt_dtl)
       OR EXISTS (
           SELECT authrt_cd,menu_sn::text,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt FROM tb_menu_crt_dtl
           EXCEPT
           SELECT authrt_cd,authrt_grnt_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt
           FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION'
       ) THEN
        RAISE EXCEPTION 'Navigation grant copy differs from legacy source';
    END IF;
    IF (SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr='migration:2.98')
       <> (SELECT count(*) FROM tb_user_authrt_map)+(SELECT count(*) FROM tb_menu_crt_dtl) THEN
        RAISE EXCEPTION 'Authorization migration audit is incomplete';
    END IF;
END $$;
