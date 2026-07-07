-- linter:disable-file
-- V1.12: tb_menu_info 소프트삭제(del_yn) 부분 인덱스 추가
-- ※ 원본 마이그레이션 파일 유실 → 2026-07-07 공유 OCI DB 실객체(idx_tb_menu_info_del_yn)에서 복원.
--    DB 적용 이력(installed_rank 14, installed_on 2026-07-05)과 정합. IF NOT EXISTS 로 무해.
CREATE INDEX IF NOT EXISTS idx_tb_menu_info_del_yn
    ON tb_menu_info USING btree (up_menu_sn, menu_ordr)
    WHERE (del_yn = 'N');
