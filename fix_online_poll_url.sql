-- 온라인Poll관리 메뉴 URL 수정
-- 잘못된 URL: /uss/olp/opm/selectOnlinePollManageList.do
-- 올바른 URL: /uss/olp/opm/listOnlinePollManage.do

UPDATE nprogrmlist 
SET url = '/uss/olp/opm/listOnlinePollManage.do' 
WHERE progrm_file_nm = 'listOnlinePollManage' 
  AND url = '/uss/olp/opm/selectOnlinePollManageList.do';
