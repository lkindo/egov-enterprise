-- V2_23: 간부일정(LSM) 死도메인 제거 (leader b) — 사용자 개별 승인 후 시행
-- 근거(전 계층 사망 실측): tb_leader_schdl 0행·tb_leader_stts 0행·인바운드 FK 0, 부모 생성경로 코드·시드 전무,
--   FE 필드명 계약 파손+죽은 등록버튼, E2E 렌더 가시성만. V2_16 tb_club_*·tb_leader_schdl_dtl 0행 DROP 선례와 동형.
--   저장소 목적(신규 SI 베이스 프레임워크)상 파손 쇼케이스는 파생 프로젝트마다 반복될 삭제비용.
-- 멱등 3경로: DROP IF EXISTS + DELETE 는 재실행 무해. V2_2/V2_11 원본 시드는 체크섬 보존 위해 불수정
--   (fresh 경로에서 INSERT → V2_23 DELETE 순으로 정합).

DROP TABLE IF EXISTS tb_leader_schdl; -- linter:ignore (0행·인바운드/아웃바운드 FK 0 실측, V2_16 tb_leader_schdl_dtl 선례)
DROP TABLE IF EXISTS tb_leader_stts;  -- linter:ignore (0행·생성 API 부재 사경화 실측)

-- LSM 메뉴/프로그램 시드 정리 (원본 시드 파일은 불수정, 여기서 삭제)
DELETE FROM tb_role_prgrm_map WHERE prgrm_file_nm IN ('ADMIN_LSM_ALL', 'ADMIN_LSM_ALIAS');
DELETE FROM tb_prgrm_lst      WHERE prgrm_file_nm IN ('ADMIN_LSM_ALL', 'ADMIN_LSM_ALIAS');
-- 메뉴-권한 매핑(자식) 선삭제 후 메뉴 삭제 (fk_tb_menu_crt_dtl_tb_menu_info)
DELETE FROM tb_menu_crt_dtl   WHERE menu_sn = '9030300';
DELETE FROM tb_menu_info      WHERE menu_sn = '9030300' AND modern_route = '/admin/system/lsm';
