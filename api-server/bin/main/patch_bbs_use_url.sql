-- 게시판사용정보 메뉴 URL 수정 패치
-- URL이 '#'으로 설정되어 있어서 404 오류 발생하는 문제 수정

UPDATE nprogrmlist 
SET url = '/cop/com/selectBBSUseInfs.do' 
WHERE progrm_file_nm = 'selectBBSUseInfs' AND url = '#';
