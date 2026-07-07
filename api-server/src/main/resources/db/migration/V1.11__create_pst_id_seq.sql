-- linter:disable-file
-- V1.11: pst_id 시퀀스 생성 (게시물 ID 발번용)
-- ※ 원본 마이그레이션 파일 유실 → 2026-07-07 공유 OCI DB 실객체(pst_id_seq)에서 복원.
--    DB 적용 이력(installed_rank 13, installed_on 2026-07-05)과 정합. IF NOT EXISTS 로 무해.
CREATE SEQUENCE IF NOT EXISTS pst_id_seq
    START WITH 1
    INCREMENT BY 1;
