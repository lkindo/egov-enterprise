-- ADR-0025 D11. 2026-09-28 live information_schema/metadata를 확인했다.
-- 사용자 승인: 신규 단어 1개·도메인 1개·용어 10개의 개발 migration 및 격리 검증.
-- 운영 적용/강제 활성화/실계정 권한 부여는 이 migration의 범위가 아니다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

INSERT INTO meta_standard_words(word_name,eng_abbr,word_dc,rprs_yn)
VALUES ('해시','HASH','암호학적 단방향 digest; 해시태그/문서 요약과 구분','Y')
ON CONFLICT (word_name,eng_abbr) DO NOTHING;
INSERT INTO meta_standard_domains(domain_group,domain_name,data_type,data_length)
VALUES ('해시값','해시값V64','VARCHAR',64)
ON CONFLICT (domain_name) DO NOTHING;
INSERT INTO meta_standard_terms(term_name,eng_abbr,description,domain_name) VALUES
('OTP인증일련번호','OTP_CERT_SN','사용자별 로컬 OTP 자격의 DB 생성 식별자','일련번호N19'),
('인증요청일련번호','CERT_DMND_SN','제한된 용도의 인증 도전 DB 생성 식별자','일련번호N19'),
('복구코드일련번호','RSTR_CD_SN','일회용 복구코드의 DB 생성 식별자','일련번호N19'),
('사용자내부식별자','USER_INSD_IDNTFR','tb_user_info.esntl_id; 로그인 ID와 구분','명V20'),
('OTP비밀암호화내용','OTP_SECRET_ENCPT_CN','버전/키 식별자/nonce/AES-GCM 암호문 및 tag envelope','내용V4000'),
('인증상태코드','CERT_STTS_CD','NONE/PENDING/ACTIVE/RECOVER 자격 상태','코드C10'),
('인증버전번호','CERT_VER_NO','자격 변경 및 세션 폐기를 결속하는 임의 UUID 버전','번호V50'),
('OTP최종성공일련번호','OTP_LAST_SCS_SN','RFC 6238에서 마지막으로 소모한 시간 counter T','일련번호N19'),
('인증유형코드','CERT_TYPE_CD','ENROLL/LOGIN/REAUTH/RECOVER 제한 도전 목적','코드C10'),
('해시값','HASH_VL','목적별로 분리한 SHA-256 lowercase hex digest','해시값V64')
ON CONFLICT (eng_abbr) DO NOTHING;

DO $$
DECLARE expected RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM meta_standard_words WHERE word_name='해시' AND eng_abbr='HASH' AND rprs_yn='Y') THEN
        RAISE EXCEPTION 'MFA standard word conflict';
    END IF;
    FOR expected IN SELECT * FROM (VALUES
        ('일련번호N19','BIGINT',19),('명V20','VARCHAR',20),('내용V4000','VARCHAR',4000),
        ('코드C10','VARCHAR',10),('번호V50','VARCHAR',50),('해시값V64','VARCHAR',64),
        ('수N10','NUMERIC',10),('연월일시분초D','DATETIME',0)
    ) AS domains(domain_name,data_type,data_length) LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_domains d WHERE d.domain_name=expected.domain_name
                AND d.data_type=expected.data_type AND d.data_length=expected.data_length) THEN
            RAISE EXCEPTION 'MFA standard domain conflict: %',expected.domain_name;
        END IF;
    END LOOP;
    FOR expected IN SELECT * FROM (VALUES
        ('OTP_CERT_SN','OTP인증일련번호','일련번호N19'),('CERT_DMND_SN','인증요청일련번호','일련번호N19'),
        ('RSTR_CD_SN','복구코드일련번호','일련번호N19'),('USER_INSD_IDNTFR','사용자내부식별자','명V20'),
        ('OTP_SECRET_ENCPT_CN','OTP비밀암호화내용','내용V4000'),('CERT_STTS_CD','인증상태코드','코드C10'),
        ('CERT_VER_NO','인증버전번호','번호V50'),('OTP_LAST_SCS_SN','OTP최종성공일련번호','일련번호N19'),
        ('CERT_TYPE_CD','인증유형코드','코드C10'),('HASH_VL','해시값','해시값V64'),
        ('FAIL_NMTM','실패횟수','수N10'),('LCK_DT','잠금일시','연월일시분초D'),
        ('CERT_DT','인증일시','연월일시분초D'),('CERT_BGNG_DT','인증시작일시','연월일시분초D'),
        ('CERT_END_DT','인증종료일시','연월일시분초D'),('USE_DT','사용일시','연월일시분초D')
    ) AS terms(eng_abbr,term_name,domain_name) LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_terms t WHERE t.eng_abbr=expected.eng_abbr
                AND t.term_name=expected.term_name AND t.domain_name=expected.domain_name) THEN
            RAISE EXCEPTION 'MFA standard term conflict: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

CREATE SEQUENCE sq_auth_otp_cert START WITH 1 INCREMENT BY 1;
CREATE TABLE tb_auth_otp_cert (
    otp_cert_sn bigint NOT NULL DEFAULT nextval('sq_auth_otp_cert'),
    user_insd_idntfr varchar(20) NOT NULL,
    otp_secret_encpt_cn varchar(4000),
    cert_stts_cd varchar(10) NOT NULL,
    cert_ver_no varchar(50) NOT NULL,
    otp_last_scs_sn bigint,
    fail_nmtm numeric(10,0) NOT NULL DEFAULT 0,
    lck_dt timestamp without time zone,
    cert_dt timestamp without time zone,
    frst_rgtr_id varchar(20), crt_dt timestamp without time zone NOT NULL,
    last_mdfr_id varchar(20), mdfcn_dt timestamp without time zone NOT NULL,
    CONSTRAINT pk_tb_auth_otp_cert PRIMARY KEY (otp_cert_sn),
    CONSTRAINT uk_tb_auth_otp_cert_user_insd_idntfr UNIQUE (user_insd_idntfr),
    CONSTRAINT fk_tb_auth_otp_cert_tb_user_info FOREIGN KEY (user_insd_idntfr)
        REFERENCES tb_user_info(esntl_id) ON DELETE CASCADE,
    CONSTRAINT ck_tb_auth_otp_cert_cert_stts_cd CHECK (cert_stts_cd IN ('NONE','PENDING','ACTIVE','RECOVER')),
    CONSTRAINT ck_tb_auth_otp_cert_secret_state CHECK (
        (cert_stts_cd IN ('PENDING','ACTIVE') AND otp_secret_encpt_cn IS NOT NULL)
        OR (cert_stts_cd='NONE' AND otp_secret_encpt_cn IS NULL)
        OR cert_stts_cd='RECOVER'),
    CONSTRAINT ck_tb_auth_otp_cert_otp_last_scs_sn CHECK (otp_last_scs_sn IS NULL OR otp_last_scs_sn >= 0),
    CONSTRAINT ck_tb_auth_otp_cert_fail_nmtm CHECK (fail_nmtm BETWEEN 0 AND 5)
);

CREATE SEQUENCE sq_auth_cert_dmnd START WITH 1 INCREMENT BY 1;
CREATE TABLE tb_auth_cert_dmnd (
    cert_dmnd_sn bigint NOT NULL DEFAULT nextval('sq_auth_cert_dmnd'),
    otp_cert_sn bigint NOT NULL,
    hash_vl varchar(64) NOT NULL,
    cert_type_cd varchar(10) NOT NULL,
    cert_ver_no varchar(50) NOT NULL,
    cert_bgng_dt timestamp without time zone NOT NULL,
    cert_end_dt timestamp without time zone NOT NULL,
    fail_nmtm numeric(10,0) NOT NULL DEFAULT 0,
    use_dt timestamp without time zone,
    frst_rgtr_id varchar(20), crt_dt timestamp without time zone NOT NULL,
    last_mdfr_id varchar(20), mdfcn_dt timestamp without time zone NOT NULL,
    CONSTRAINT pk_tb_auth_cert_dmnd PRIMARY KEY (cert_dmnd_sn),
    CONSTRAINT uk_tb_auth_cert_dmnd_hash_vl UNIQUE (hash_vl),
    CONSTRAINT fk_tb_auth_cert_dmnd_tb_auth_otp_cert FOREIGN KEY (otp_cert_sn)
        REFERENCES tb_auth_otp_cert(otp_cert_sn) ON DELETE CASCADE,
    CONSTRAINT ck_tb_auth_cert_dmnd_hash_vl CHECK (hash_vl ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_tb_auth_cert_dmnd_cert_type_cd CHECK (cert_type_cd IN ('ENROLL','LOGIN','REAUTH','RECOVER')),
    CONSTRAINT ck_tb_auth_cert_dmnd_fail_nmtm CHECK (fail_nmtm BETWEEN 0 AND 5),
    CONSTRAINT ck_tb_auth_cert_dmnd_cert_end_dt CHECK (
        cert_end_dt > cert_bgng_dt AND cert_end_dt <= cert_bgng_dt + INTERVAL '5 minutes')
);
CREATE INDEX ix_tb_auth_cert_dmnd_otp_cert_sn ON tb_auth_cert_dmnd(otp_cert_sn);
CREATE INDEX ix_tb_auth_cert_dmnd_cert_end_dt ON tb_auth_cert_dmnd(cert_end_dt);

CREATE SEQUENCE sq_auth_rstr_cd START WITH 1 INCREMENT BY 1;
CREATE TABLE tb_auth_rstr_cd (
    rstr_cd_sn bigint NOT NULL DEFAULT nextval('sq_auth_rstr_cd'),
    otp_cert_sn bigint NOT NULL,
    cert_ver_no varchar(50) NOT NULL,
    hash_vl varchar(64) NOT NULL,
    use_dt timestamp without time zone,
    frst_rgtr_id varchar(20), crt_dt timestamp without time zone NOT NULL,
    last_mdfr_id varchar(20), mdfcn_dt timestamp without time zone NOT NULL,
    CONSTRAINT pk_tb_auth_rstr_cd PRIMARY KEY (rstr_cd_sn),
    CONSTRAINT uk_tb_auth_rstr_cd_hash_vl UNIQUE (hash_vl),
    CONSTRAINT fk_tb_auth_rstr_cd_tb_auth_otp_cert FOREIGN KEY (otp_cert_sn)
        REFERENCES tb_auth_otp_cert(otp_cert_sn) ON DELETE CASCADE,
    CONSTRAINT ck_tb_auth_rstr_cd_hash_vl CHECK (hash_vl ~ '^[0-9a-f]{64}$')
);
CREATE INDEX ix_tb_auth_rstr_cd_otp_cert_sn ON tb_auth_rstr_cd(otp_cert_sn);

COMMENT ON TABLE tb_auth_otp_cert IS '로컬 OTP 인증 자격; 운영 강제 적용과 키 설정은 별도';
COMMENT ON TABLE tb_auth_cert_dmnd IS '목적과 자격 버전에 결속한 일회용 인증 도전';
COMMENT ON TABLE tb_auth_rstr_cd IS '원문을 저장하지 않는 일회용 MFA 복구코드';
COMMENT ON COLUMN tb_auth_otp_cert.user_insd_idntfr IS '사용자내부식별자: tb_user_info.esntl_id';
COMMENT ON COLUMN tb_auth_otp_cert.otp_secret_encpt_cn IS 'OTP비밀암호화내용: 전용 키링 AES-GCM envelope';
COMMENT ON COLUMN tb_auth_otp_cert.otp_last_scs_sn IS 'OTP최종성공일련번호: RFC6238 성공 counter';
COMMENT ON COLUMN tb_auth_cert_dmnd.hash_vl IS '해시값: 도전 목적의 SHA-256';
COMMENT ON COLUMN tb_auth_rstr_cd.hash_vl IS '해시값: 사용자·자격 버전·복구 목적에 결속';
