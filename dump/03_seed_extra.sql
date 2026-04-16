
-- Seed data for Satisfaction (nstsfdg)
INSERT INTO nstsfdg (stsfdg_no, ntt_id, bbs_id, stsfdg, stsfdg_cn, wrter_id, wrter_nm, frst_regist_pnttm, use_at, frst_register_id)
SELECT 
    i, 
    1, 
    'BBSMSTR_AAAAAAAAAAAA', 
    (random() * 4 + 1)::int, 
    'Satisfactory Performance', 
    'webmaster', 
    'Admin', 
    NOW() - (i || ' hours')::interval,
    'Y',
    'webmaster'
FROM generate_series(1, 20) i;

-- Seed data for System Log (nsyslog)
INSERT INTO nsyslog (
    requst_id, job_se_code, instt_code, occrrnc_de, rqester_ip, rqester_id, 
    trget_menu_nm, svc_nm, method_nm, process_se_code, process_co, process_time, 
    rspns_code, error_se, frst_register_id, frst_regist_pnttm
)
SELECT 
    substring('REQ_SYS_' || i || '_' || md5(random()::text) from 1 for 20),
    'ADM',
    'INST001',
    NOW() - (i || ' hours')::interval,
    '127.0.0.1',
    'webmaster',
    CASE WHEN i % 3 = 0 THEN 'User Manage' WHEN i % 3 = 1 THEN 'Board Manage' ELSE 'System Audit' END,
    'AdminService',
    'process',
    '00' || (i % 3),
    1,
    '100',
    '200',
    'N',
    'webmaster',
    NOW() - (i || ' hours')::interval
FROM generate_series(1, 30) i;

-- Seed data for Web Log (nweblog)
INSERT INTO nweblog (
    requst_id, occrrnc_de, url, rqester_id, rqester_ip, frst_register_id, frst_regist_pnttm
)
SELECT 
    substring('REQ_WEB_' || i || '_' || md5(random()::text) from 1 for 20),
    NOW() - (i || ' hours')::interval,
    '/admin/dashboard',
    'webmaster',
    '127.0.0.1',
    'webmaster',
    NOW() - (i || ' hours')::interval
FROM generate_series(1, 30) i;

-- Seed data for Login Log (nloginlog)
INSERT INTO nloginlog (
    log_id, conect_id, conect_ip, conect_mthd, error_occrrnc_at, creat_dt
)
SELECT 
    substring('LOG_' || i || '_' || md5(random()::text) from 1 for 20),
    'webmaster',
    '127.0.0.1',
    'LGIN',
    'N',
    NOW() - (i || ' hours')::interval
FROM generate_series(1, 20) i;
