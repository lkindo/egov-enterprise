-- V2_158: V2_156 이 NOT VALID 로 더한 사용자 편집 버전 CHECK(ck_tb_user_info_version)를 기존 행까지 검증한다(2026-11-25).
--
-- V2_156 은 ADD COLUMN 의 ACCESS EXCLUSIVE 잠금을 쥔 트랜잭션이라, 거기서 기존 행을 검증하면 사용자 표가 클수록 로그인·조회가
-- 그 시간만큼 기다린다. 이 마이그레이션은 별도 트랜잭션에서 VALIDATE CONSTRAINT 만 한다 — SHARE UPDATE EXCLUSIVE 잠금이라 읽기·쓰기를
-- 막지 않는다(V2_6→V2_9 선례). 기존 행은 모두 DEFAULT 0 이라 실패할 값이 없다. 이미 검증됐거나 제약이 없으면 건너뛴다(멱등).
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint
               WHERE conname = 'ck_tb_user_info_version' AND conrelid = 'tb_user_info'::regclass AND NOT convalidated) THEN
        EXECUTE 'ALTER TABLE tb_user_info VALIDATE CONSTRAINT ck_tb_user_info_version';
    END IF;
END $$;
