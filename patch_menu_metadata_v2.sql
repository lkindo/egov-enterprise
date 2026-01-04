-- 메뉴 및 프로그램 정합성 패치 (v2)
BEGIN;

-- 1. 경로 수정
UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '/cmm/sym/ccm/' WHERE PROGRM_FILE_NM = 'EgovCcmCmmnClCodeList';
UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '/cmm/sym/ccm/' WHERE PROGRM_FILE_NM = 'EgovCcmCmmnCodeList';
UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '/cmm/sym/ccm/' WHERE PROGRM_FILE_NM = 'EgovCcmCmmnDetailCodeList';
UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '/cmm/sym/zip/' WHERE PROGRM_FILE_NM = 'EgovCcmZipList';
UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '/cmm/uss/umt/' WHERE PROGRM_FILE_NM = 'EgovUserManage';

-- 2. 파일명 수정
-- 파일명 불일치 수정: EgovAuthorGroupList -> EgovAuthorGroupManage
UPDATE NMENUINFO SET PROGRM_FILE_NM = 'EgovAuthorGroupManage' WHERE PROGRM_FILE_NM = 'EgovAuthorGroupList';
UPDATE NPROGRMLIST SET PROGRM_FILE_NM = 'EgovAuthorGroupManage' WHERE PROGRM_FILE_NM = 'EgovAuthorGroupList';
-- 파일명 불일치 수정: EgovAuthorList -> EgovAuthorManage
UPDATE NMENUINFO SET PROGRM_FILE_NM = 'EgovAuthorManage' WHERE PROGRM_FILE_NM = 'EgovAuthorList';
UPDATE NPROGRMLIST SET PROGRM_FILE_NM = 'EgovAuthorManage' WHERE PROGRM_FILE_NM = 'EgovAuthorList';
-- 파일명 불일치 수정: EgovGroupList -> EgovGroupManage
UPDATE NMENUINFO SET PROGRM_FILE_NM = 'EgovGroupManage' WHERE PROGRM_FILE_NM = 'EgovGroupList';
UPDATE NPROGRMLIST SET PROGRM_FILE_NM = 'EgovGroupManage' WHERE PROGRM_FILE_NM = 'EgovGroupList';
-- 파일명 불일치 수정: EgovMenuCreatManageSelect -> EgovMenuCreat
UPDATE NMENUINFO SET PROGRM_FILE_NM = 'EgovMenuCreat' WHERE PROGRM_FILE_NM = 'EgovMenuCreatManageSelect';
UPDATE NPROGRMLIST SET PROGRM_FILE_NM = 'EgovMenuCreat' WHERE PROGRM_FILE_NM = 'EgovMenuCreatManageSelect';
-- 파일명 불일치 수정: EgovMenuManageSelect -> EgovMenuManage
UPDATE NMENUINFO SET PROGRM_FILE_NM = 'EgovMenuManage' WHERE PROGRM_FILE_NM = 'EgovMenuManageSelect';
UPDATE NPROGRMLIST SET PROGRM_FILE_NM = 'EgovMenuManage' WHERE PROGRM_FILE_NM = 'EgovMenuManageSelect';
-- 파일명 불일치 수정: EgovProgramListManageSelect -> EgovProgramListManage
UPDATE NMENUINFO SET PROGRM_FILE_NM = 'EgovProgramListManage' WHERE PROGRM_FILE_NM = 'EgovProgramListManageSelect';
UPDATE NPROGRMLIST SET PROGRM_FILE_NM = 'EgovProgramListManage' WHERE PROGRM_FILE_NM = 'EgovProgramListManageSelect';
-- 파일명 불일치 수정: EgovRoleList -> EgovRoleManage
UPDATE NMENUINFO SET PROGRM_FILE_NM = 'EgovRoleManage' WHERE PROGRM_FILE_NM = 'EgovRoleList';
UPDATE NPROGRMLIST SET PROGRM_FILE_NM = 'EgovRoleManage' WHERE PROGRM_FILE_NM = 'EgovRoleList';

COMMIT;
