-- 2026-10-23 ADR-0040 A1(같은 날 사용자 일괄 승인 — 메뉴 표시명 데이터 변경 포함). 데이터만 바꾼다. 구조 변경은 없다.
-- 다시 실행해도 결과가 같다.
--
-- 게시판 마스터 화면(/admin/community/boards/master)의 메뉴 이름을 '통합 게시판 마스터 콘솔' 에서 '게시판 관리' 로 바꾼다.
-- 이 화면은 게시판을 찾고 설정·사용 여부를 고치는 입구이고, 다음 배치에서 고른 게시판의 운영 화면으로 이어진다
-- (설계서 §5.1). 경로와 이름이 모두 시드 값 그대로인 행만 바꾸고, 관리자가 이미 다른 이름으로 바꾼 메뉴는 건드리지 않는다.
-- 경로와 메뉴 번호는 그대로다. 2026-10-23 OCI 읽기: 9030140 한 행.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

UPDATE tb_menu_info
   SET menu_nm = '게시판 관리',
       last_mdfr_id = 'SYSTEM',
       mdfcn_dt = CURRENT_TIMESTAMP
 WHERE modern_route = '/admin/community/boards/master'
   AND menu_nm = '통합 게시판 마스터 콘솔';
