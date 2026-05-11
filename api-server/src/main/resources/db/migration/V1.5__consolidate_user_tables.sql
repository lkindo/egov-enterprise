-- ============================================================
-- V1.5: 사용자 테이블 통합 (nemplyrinfo + ngnrlmber + nentrprsmber → nuserinfo)
-- Pure Column 방식: 모든 필드를 물리 컬럼으로 관리
-- ============================================================

-- 1. FK 제약조건 임시 제거
ALTER TABLE nuserlog DROP CONSTRAINT IF EXISTS fk_nuserlog_rqester;

-- 2. vnusermaster 뷰 제거 (기존 3테이블 UNION 뷰)
DROP VIEW IF EXISTS vnusermaster;

-- 3. nuserinfo 통합 테이블 생성
CREATE TABLE nuserinfo (
    -- ■ PK 및 식별
    esntl_id            VARCHAR(20) PRIMARY KEY,
    user_id             VARCHAR(30) NOT NULL UNIQUE,
    user_type           VARCHAR(10) NOT NULL DEFAULT 'EMP',

    -- ■ 인증 정보
    password            VARCHAR(600) NOT NULL,
    password_hint       VARCHAR(300),
    password_cnsr       VARCHAR(300),
    chg_pwd_last_pnttm  TIMESTAMP,
    chg_pwd_cnt         INTEGER,
    lock_at             VARCHAR(1) DEFAULT 'N',
    lock_cnt            INTEGER,
    lock_last_pnttm     TIMESTAMP,
    otp_secret          VARCHAR(32),
    crtfc_dn_value      VARCHAR(100),

    -- ■ 개인 정보
    user_nm             VARCHAR(60) NOT NULL,
    ihidnum             VARCHAR(600),
    sexdstn_code        VARCHAR(1),
    brthdy              VARCHAR(20),
    email_adres         VARCHAR(50),
    mbtlnum             VARCHAR(20),

    -- ■ 주소 정보
    zip                 VARCHAR(6),
    adres               VARCHAR(300),
    detail_adres        VARCHAR(300),
    area_no             VARCHAR(4),
    middle_telno        VARCHAR(4),
    end_telno           VARCHAR(4),
    fxnum               VARCHAR(20),
    offm_telno          VARCHAR(20),

    -- ■ 조직 및 권한
    group_id            VARCHAR(20),
    orgnzt_id           VARCHAR(20),
    pstinst_code        VARCHAR(8),
    empl_no             VARCHAR(20),
    ofcps_nm            VARCHAR(60),
    role                VARCHAR(50) DEFAULT 'USER',

    -- ■ 기업 전용 (nullable)
    bizrno              VARCHAR(10),
    jurirno             VARCHAR(13),
    cmpny_nm            VARCHAR(50),
    cxfc                VARCHAR(50),
    induty_code         VARCHAR(15),
    entrprs_se_code     VARCHAR(15),

    -- ■ 상태 및 감사
    status_code         VARCHAR(15) DEFAULT 'P',
    sbscrb_de           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    frst_register_id    VARCHAR(20),
    last_updusr_id      VARCHAR(20),
    frst_regist_pnttm   TIMESTAMP,
    last_updt_pnttm     TIMESTAMP
);

-- 4. 데이터 이관: nemplyrinfo → nuserinfo
INSERT INTO nuserinfo (
    esntl_id, user_id, user_type,
    password, password_hint, password_cnsr,
    chg_pwd_last_pnttm, chg_pwd_cnt,
    lock_at, lock_cnt, lock_last_pnttm,
    otp_secret, crtfc_dn_value,
    user_nm, ihidnum, sexdstn_code, brthdy,
    email_adres, mbtlnum,
    zip, adres, detail_adres,
    area_no, middle_telno, end_telno,
    fxnum, offm_telno,
    group_id, orgnzt_id, pstinst_code, empl_no, ofcps_nm, role,
    status_code, sbscrb_de,
    frst_register_id, last_updusr_id,
    frst_regist_pnttm, last_updt_pnttm
)
SELECT
    esntl_id, emplyr_id, 'EMP',
    password, password_hint, password_cnsr,
    chg_pwd_last_pnttm, chg_pwd_cnt,
    COALESCE(lock_at, 'N'), lock_cnt, lock_last_pnttm,
    otp_secret, crtfc_dn_value,
    user_nm, ihidnum, sexdstn_code, brthdy,
    email_adres, mbtlnum,
    zip, house_adres, detail_adres,
    area_no, house_middle_telno, house_end_telno,
    fxnum, offm_telno,
    group_id, orgnzt_id, pstinst_code, empl_no, ofcps_nm, role,
    COALESCE(emplyr_sttus_code, 'P'), sbscrb_de,
    frst_register_id, last_updusr_id,
    frst_regist_pnttm, last_updt_pnttm
FROM nemplyrinfo;

-- 5. 데이터 이관: ngnrlmber → nuserinfo (현재 0건이지만 안전을 위해 포함)
INSERT INTO nuserinfo (
    esntl_id, user_id, user_type,
    password, password_hint, password_cnsr,
    chg_pwd_last_pnttm,
    lock_at,
    user_nm, ihidnum, sexdstn_code,
    email_adres, mbtlnum,
    zip, adres, detail_adres,
    area_no, middle_telno, end_telno,
    fxnum,
    group_id,
    status_code, sbscrb_de,
    frst_register_id, last_updusr_id,
    frst_regist_pnttm, last_updt_pnttm
)
SELECT
    esntl_id, mber_id, 'GNR',
    password, password_hint, password_cnsr,
    chg_pwd_last_pnttm,
    COALESCE(lock_at, 'N'),
    mber_nm, ihidnum, sexdstn_code,
    mber_email_adres, mbtlnum,
    zip, adres, detail_adres,
    area_no, middle_telno, end_telno,
    mber_fxnum,
    group_id,
    COALESCE(mber_sttus, 'P'), sbscrb_de,
    frst_register_id, last_updusr_id,
    frst_regist_pnttm, last_updt_pnttm
FROM ngnrlmber;

-- 6. 데이터 이관: nentrprsmber → nuserinfo (현재 0건이지만 안전을 위해 포함)
INSERT INTO nuserinfo (
    esntl_id, user_id, user_type,
    password, password_hint, password_cnsr,
    chg_pwd_last_pnttm,
    lock_at,
    user_nm,
    email_adres,
    zip, adres, detail_adres,
    area_no, middle_telno, end_telno,
    fxnum,
    group_id,
    bizrno, jurirno, cmpny_nm, cxfc, induty_code, entrprs_se_code,
    status_code, sbscrb_de,
    frst_register_id, last_updusr_id,
    frst_regist_pnttm, last_updt_pnttm
)
SELECT
    esntl_id, entrprs_mber_id, 'ENT',
    entrprs_mber_password, entrprs_mber_password_hint, entrprs_mber_password_cnsr,
    chg_pwd_last_pnttm,
    COALESCE(lock_at, 'N'),
    COALESCE(applcnt_nm, cmpny_nm),
    applcnt_email_adres,
    zip, adres, detail_adres,
    area_no, entrprs_middle_telno, entrprs_end_telno,
    fxnum,
    group_id,
    bizrno, jurirno, cmpny_nm, cxfc, induty_code, entrprs_se_code,
    COALESCE(entrprs_mber_sttus, 'P'), sbscrb_de,
    frst_register_id, last_updusr_id,
    frst_regist_pnttm, last_updt_pnttm
FROM nentrprsmber;

-- 7. 인덱스 생성
CREATE INDEX idx_nuserinfo_type ON nuserinfo(user_type);
CREATE INDEX idx_nuserinfo_user_nm ON nuserinfo(user_nm);
CREATE INDEX idx_nuserinfo_email ON nuserinfo(email_adres);
CREATE INDEX idx_nuserinfo_sbscrb ON nuserinfo(sbscrb_de);

-- 8. FK 재생성 (nuserlog → nuserinfo)
ALTER TABLE nuserlog ADD CONSTRAINT fk_nuserlog_rqester
    FOREIGN KEY (rqester_id) REFERENCES nuserinfo(esntl_id);

-- 9. vnusermaster 뷰 재생성 (하위 호환성)
CREATE OR REPLACE VIEW vnusermaster AS
SELECT esntl_id, user_id, password, user_nm,
       zip AS user_zip, adres AS user_adres,
       email_adres AS user_email, group_id,
       user_type AS user_se, orgnzt_id
FROM nuserinfo;

-- 10. Audit 테이블 이름 변경
ALTER TABLE nemplyrinfo_aud RENAME TO nuserinfo_aud;

-- 11. 테이블 코멘트
COMMENT ON TABLE nuserinfo IS '통합 사용자 정보 테이블 (업무/일반/기업 통합)';
COMMENT ON COLUMN nuserinfo.esntl_id IS '고유 식별값';
COMMENT ON COLUMN nuserinfo.user_id IS '로그인 아이디';
COMMENT ON COLUMN nuserinfo.user_type IS '사용자 유형 (EMP: 업무, GNR: 일반, ENT: 기업)';
COMMENT ON COLUMN nuserinfo.user_nm IS '사용자명 또는 회사명';
COMMENT ON COLUMN nuserinfo.role IS '시스템 권한 (ADMIN, USER 등)';
COMMENT ON COLUMN nuserinfo.status_code IS '상태코드 (P: 승인, S: 중지, D: 삭제)';

-- 12. 기존 테이블 DROP
DROP TABLE IF EXISTS nemplyrinfo CASCADE;
DROP TABLE IF EXISTS ngnrlmber CASCADE;
DROP TABLE IF EXISTS nentrprsmber CASCADE;
