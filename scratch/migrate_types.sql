BEGIN;

-- 1. BigInt 타입으로 변경 (ID 및 대용량 숫자)
ALTER TABLE nbbs ALTER COLUMN ntt_id TYPE bigint USING ntt_id::bigint;
ALTER TABLE nstsfdg ALTER COLUMN stsfdg_no TYPE bigint USING stsfdg_no::bigint;
ALTER TABLE nstsfdg ALTER COLUMN ntt_id TYPE bigint USING ntt_id::bigint;
ALTER TABLE nscrap ALTER COLUMN ntt_id TYPE bigint USING ntt_id::bigint;

-- nmenuinfo 및 nmenucreatdtls (FK 관계 처리)
ALTER TABLE nmenucreatdtls DROP CONSTRAINT IF EXISTS nmenucreatdtls_menu_no_fkey;
ALTER TABLE nmenuinfo DROP CONSTRAINT IF EXISTS nmenuinfo_upper_menu_no_fkey;

ALTER TABLE nmenuinfo ALTER COLUMN menu_no TYPE bigint USING menu_no::bigint, ALTER COLUMN upper_menu_no TYPE bigint USING upper_menu_no::bigint;
ALTER TABLE nmenucreatdtls ALTER COLUMN menu_no TYPE bigint USING menu_no::bigint;

ALTER TABLE nmenucreatdtls ADD CONSTRAINT nmenucreatdtls_menu_no_fkey FOREIGN KEY (menu_no) REFERENCES nmenuinfo(menu_no);
ALTER TABLE nmenuinfo ADD CONSTRAINT nmenuinfo_upper_menu_no_fkey FOREIGN KEY (upper_menu_no) REFERENCES nmenuinfo(menu_no);

ALTER TABLE nfiledetail ALTER COLUMN file_size TYPE bigint USING file_size::bigint;
ALTER TABLE nqustnriem ALTER COLUMN iem_sn TYPE bigint USING iem_sn::bigint;
ALTER TABLE nqustnrqesitm ALTER COLUMN qestn_sn TYPE bigint USING qestn_sn::bigint;
ALTER TABLE neventinfo ALTER COLUMN svc_use_nmpr_co TYPE bigint USING svc_use_nmpr_co::bigint;
ALTER TABLE ninsttcoderecptnlog ALTER COLUMN opert_sn TYPE bigint USING opert_sn::bigint;
ALTER TABLE sbbssummary ALTER COLUMN creat_co TYPE bigint USING creat_co::bigint, ALTER COLUMN tot_rdcnt TYPE bigint USING tot_rdcnt::bigint;
ALTER TABLE susersummary ALTER COLUMN user_co TYPE bigint USING user_co::bigint;
ALTER TABLE sweblogsummary ALTER COLUMN rdcnt TYPE bigint USING rdcnt::bigint;
ALTER TABLE ssyslogsummary ALTER COLUMN creat_co TYPE bigint USING creat_co::bigint, 
                           ALTER COLUMN updt_co TYPE bigint USING updt_co::bigint,
                           ALTER COLUMN rdcnt TYPE bigint USING rdcnt::bigint,
                           ALTER COLUMN delete_co TYPE bigint USING delete_co::bigint,
                           ALTER COLUMN outpt_co TYPE bigint USING outpt_co::bigint,
                           ALTER COLUMN error_co TYPE bigint USING error_co::bigint;

-- 2. Integer 타입으로 변경 (일반 숫자 및 순서)
ALTER TABLE nstsfdg ALTER COLUMN stsfdg TYPE integer USING stsfdg::integer;
ALTER TABLE nfiledetail ALTER COLUMN file_sn TYPE integer USING file_sn::integer;
ALTER TABLE ninsttcode ALTER COLUMN sort_ordr TYPE integer USING sort_ordr::integer;
ALTER TABLE ninsttcoderecptnlog ALTER COLUMN sort_ordr TYPE integer USING sort_ordr::integer;
ALTER TABLE nuserlog ALTER COLUMN creat_co TYPE integer USING creat_co::integer;
ALTER TABLE nuserlog ALTER COLUMN updt_co TYPE integer USING updt_co::integer;
ALTER TABLE nuserlog ALTER COLUMN rdcnt TYPE integer USING rdcnt::integer;
ALTER TABLE nuserlog ALTER COLUMN delete_co TYPE integer USING delete_co::integer;
ALTER TABLE nuserlog ALTER COLUMN outpt_co TYPE integer USING outpt_co::integer;
ALTER TABLE nuserlog ALTER COLUMN error_co TYPE integer USING error_co::integer;
ALTER TABLE nmenuinfo ALTER COLUMN menu_ordr TYPE integer USING menu_ordr::integer;
ALTER TABLE nqustnrqesitm ALTER COLUMN mxmm_choise_co TYPE integer USING mxmm_choise_co::integer;

COMMIT;
