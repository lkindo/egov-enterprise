-- Cubrid Schema for egov-enterprise
-- 모든 테이블 삭제 (순서 중요)
DROP TABLE IF EXISTS board;
DROP TABLE IF EXISTS board_master;
DROP TABLE IF EXISTS file_item;
DROP TABLE IF EXISTS file_group;
DROP TABLE IF EXISTS common_code;
DROP TABLE IF EXISTS users;

-- Users 테이블
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    user_nm VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_date DATETIME,
    modified_date DATETIME
);

-- Common Code 테이블
CREATE TABLE common_code (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code_group_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    code_nm VARCHAR(100) NOT NULL,
    code_dc VARCHAR(500),
    use_at CHAR(1) DEFAULT 'Y',
    created_date DATETIME,
    modified_date DATETIME,
    CONSTRAINT uk_common_code UNIQUE (code_group_id, code)
);

-- Board Master 테이블
CREATE TABLE board_master (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bbs_id VARCHAR(50) NOT NULL UNIQUE,
    bbs_nm VARCHAR(200) NOT NULL,
    bbs_dc VARCHAR(1000),
    bbs_ty_code VARCHAR(50),
    reply_posbl_at CHAR(1) DEFAULT 'N',
    file_atch_posbl_at CHAR(1) DEFAULT 'N',
    atch_posbl_file_number INT DEFAULT 0,
    use_at CHAR(1) DEFAULT 'Y',
    created_date DATETIME,
    modified_date DATETIME
);

-- Board 테이블
CREATE TABLE board (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bbs_master_id BIGINT NOT NULL,
    ntt_sj VARCHAR(1200) NOT NULL,
    ntt_cn CLOB NOT NULL,
    ntce_bgnde VARCHAR(20),
    ntce_endde VARCHAR(20),
    inqire_co INT DEFAULT 0,
    use_at CHAR(1) DEFAULT 'Y',
    author_id BIGINT,
    ntcr_nm VARCHAR(100),
    password VARCHAR(255),
    atch_file_id VARCHAR(50),
    created_date DATETIME,
    modified_date DATETIME,
    CONSTRAINT fk_board_master FOREIGN KEY (bbs_master_id) REFERENCES board_master(id),
    CONSTRAINT fk_board_author FOREIGN KEY (author_id) REFERENCES users(id)
);

-- File Group 테이블
CREATE TABLE file_group (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    atch_file_id VARCHAR(50) NOT NULL UNIQUE,
    created_date DATETIME,
    modified_date DATETIME
);

-- File Item 테이블
CREATE TABLE file_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_group_id BIGINT NOT NULL,
    orignl_file_nm VARCHAR(500) NOT NULL,
    stre_file_nm VARCHAR(500) NOT NULL,
    file_extsn VARCHAR(50),
    file_cn CLOB,
    file_size BIGINT DEFAULT 0,
    stre_path_nm VARCHAR(500),
    created_date DATETIME,
    modified_date DATETIME,
    CONSTRAINT fk_file_group FOREIGN KEY (file_group_id) REFERENCES file_group(id)
);

-- Initial Data
INSERT INTO users (user_id, password, user_nm, role, created_date) 
VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', 'Administrator', 'ROLE_ADMIN', SYSDATETIME);
