-- DEC-OPS-178(GAP-BOARD-001 종료, 사용자 승인 2026-09-27): 폐기된 게시글 비밀번호 값을 비운다.
--
-- tb_bbs_item.pswd 는 게시글 비밀번호 확인 경로가 없는 폐기 필드다. 작성 화면이 모든 글에 평문 '1' 을 채워 보냈고,
-- DEC-OPS-174 에서 새 저장을 멈췄다(등록은 NULL, 수정은 기존 값 유지). 이 값을 읽는 코드는 없다.
-- 2026-09-27 OCI 읽기: 378건 중 199건에 값이 있고 모두 '1'(서로 다른 값 1개, 최대 길이 1)이다.
-- 게시글 행과 다른 컬럼은 건드리지 않는다. 컬럼 제거는 스키마 계약 변경이라 이 버전의 범위가 아니다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

UPDATE tb_bbs_item
   SET pswd = NULL
 WHERE pswd IS NOT NULL;
