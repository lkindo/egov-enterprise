-- DEC-OPS-173(DIP B5 F9): 게시판의 댓글·만족도 설정을 이 버전부터 실제로 집행한다.
--
-- ans_yn(댓글 사용)·stsfdg_yn(만족도 조사 사용)은 지금까지 저장될 뿐 읽는 코드가 없어, 값과 무관하게 모든 게시판이
-- 댓글과 만족도를 받았다(기존 게시판은 대부분 기본값 N 이다 — 2026-09-27 OCI 읽기: 6개 전부 N, 그중 한 게시판에 댓글 45건).
-- 집행을 켜는 순간 기존 게시판의 댓글이 막히지 않도록, 두 값을 지금의 실제 동작(받음)인 Y 로 맞춘다.
-- 관리자는 게시판 설정에서 끌 수 있다. 행을 지우거나 다른 값을 지어내지 않는다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

UPDATE tb_bbs_master
   SET ans_yn = 'Y', stsfdg_yn = 'Y'
 WHERE ans_yn IS DISTINCT FROM 'Y' OR stsfdg_yn IS DISTINCT FROM 'Y';

UPDATE tb_bbs_master_optn
   SET ans_yn = 'Y', stsfdg_yn = 'Y'
 WHERE ans_yn IS DISTINCT FROM 'Y' OR stsfdg_yn IS DISTINCT FROM 'Y';
