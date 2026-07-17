-- V2_21: 쪽지 수신 사본 파티별 논리삭제 컬럼 (note-rcptn 정책 A)
-- 배경: tb_note_sndng.del_yn 는 기존재(발신함 소프트삭제)하나 tb_note_rcptn 엔 삭제 플래그가 없어
--       발신자 물리삭제가 fk_tb_note_rcptn_tb_note_sndng 에 걸리는 잠복 결함이 있었다. 파티별 논리삭제로
--       전환해 한쪽 삭제가 상대 이력을 소멸시키지 않게 하고(DB 헌법 제8조 3항), 양측 삭제 완료 시 물리 수거한다.
-- 명명: meta_standard_terms DEL_YN(여부C1) + tb_note_sndng.del_yn 선례.
-- 멱등 3경로: IF NOT EXISTS 로 fresh/재생/재실행 안전. 타입 변경 없어 USING 타입가드 불요.
-- ZeroDowntime: ADD COLUMN + DEFAULT 는 PG17 메타데이터 연산(비차단), 린터 차단 패턴(ALTER TYPE/RENAME/DROP) 미해당.
-- 데이터: 기존 14행 전량 E2E 가비지(13행 rcvr_id NULL 실측) → DEFAULT 'N' 일괄, backfill 논점 없음.
ALTER TABLE tb_note_rcptn ADD COLUMN IF NOT EXISTS del_yn varchar(1) DEFAULT 'N' NOT NULL;
COMMENT ON COLUMN tb_note_rcptn.del_yn IS '삭제여부 (del_yn)';
