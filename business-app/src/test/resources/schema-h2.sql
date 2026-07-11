CREATE TABLE IF NOT EXISTS ecopseq (
    table_name VARCHAR(20) NOT NULL,
    next_id DECIMAL(30,0) NOT NULL,
    PRIMARY KEY (table_name)
);

-- 초기값 설정 (이미 존재하는 경우 무시)
MERGE INTO ecopseq KEY (table_name) VALUES ('ids', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('ADBK_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('ADBKUSER_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('NOTE_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('NOTE_TRNSMIT_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('NOTE_RECPTN_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('EVENT_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('EVENT_CMPGN_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('RWARD_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('ANNVRSRY_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('CTSNN_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('RESTDE_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('SYS_LOG_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('LOGIN_LOG_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('WEB_LOG_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('TRSMRCV_LOG_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('USRCNFRM_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('CMMNTY_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('MENU_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('TROBL_ID', 1);
MERGE INTO ecopseq KEY (table_name) VALUES ('REPRT_STATS_ID', 1);
