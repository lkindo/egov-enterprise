-- BoardRepository.getNextPstId() 가 SELECT nextval('pst_id_seq') 를 호출하는데 이 시퀀스가
-- 실제 스키마에 존재하지 않아, 게시글 작성(BoardService.createPost)이 prod 에서 항상 실패(42P01)했다.
-- 기존 pst_id 는 소수의 작은 정수(예: 1843)와 currentTimeMillis 기반 13자리 값이 섞여 있으므로,
-- 두 대역과 모두 충돌하지 않도록 100000 에서 시작한다(4자리 위, 13자리 timestamp 아래).
CREATE SEQUENCE IF NOT EXISTS pst_id_seq START WITH 100000 INCREMENT BY 1;
