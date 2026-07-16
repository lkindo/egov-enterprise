-- =====================================================================
-- V2_13: 참조 컬럼 타입 정렬 + 파일참조 가비지 자가치유 (V2_14 FK 선행 조건)
-- =====================================================================
-- [linter 예외 사유] ALTER COLUMN TYPE 2건은 varchar(30)→varchar(20) 축소이나 두 컬럼 모두
--   non-null 값 0건 실측(2026-07-16, db-bridge)이라 무손실·즉시 완료된다.
--   (P4 하네스 보강으로 라인 단위 linter:ignore 가 동작하게 되어 disable-file 에서 전환)
-- 동반 코드 변경(동일 릴리스): Schedule.java @Column(length=20), User.java group_id @Column(length=20)

-- 1) 참조 컬럼 타입 정렬 — 부모 도메인(varchar 20)과 100% 일치 (헌법 제5조 3항)
ALTER TABLE tb_schdl_info ALTER COLUMN atch_file_id TYPE varchar(20); -- linter:ignore (값 0건 실측, 무손실 축소)
ALTER TABLE tb_user_info  ALTER COLUMN group_id     TYPE varchar(20); -- linter:ignore (값 0건 실측, 무손실 축소)

-- 2) 자가치유: tb_dta_use_stats 파일참조 가비지 행 정리 (라이브 실측 2행 — ATC_* 마스터 부재,
--    행 전체가 가비지·재생산 코드경로 없음. 백업 덤프 후 삭제, 태스크 기록 참조. 멱등)
DELETE FROM tb_dta_use_stats s
 WHERE s.atch_file_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM tb_file_master m WHERE m.atch_file_id = s.atch_file_id);
