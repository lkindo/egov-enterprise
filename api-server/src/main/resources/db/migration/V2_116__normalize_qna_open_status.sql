-- 2026-10-01 결정 20(사용자 승인): Q&A 의 '답변 대기' 상태 값을 OPEN 하나로 맞춘다.
--
-- 엔티티 기본값은 OPEN 인데 Q&A 등록 화면은 QA01 을 보내, 같은 '답변 대기' 가 두 값으로 저장됐다.
-- 2026-10-01 OCI 읽기: QA01 12건(Q&A 게시판 한 곳), OPEN 366건. 해결은 SOLVED 하나뿐이다.
-- 값이 둘이면 '미해결만' 조건을 하나의 등치로 걸 수 없다. 등록 경로도 같은 변경에서 OPEN 으로 바꾼다.
-- 다른 상태 값과 행·다른 컬럼은 건드리지 않는다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

UPDATE tb_bbs_item
   SET qna_stts_cd = 'OPEN'
 WHERE qna_stts_cd = 'QA01';
