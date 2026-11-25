-- V2_156: 사용자 표(tb_user_info)에 편집 버전 컬럼을 더한다(2026-11-25 사용자 승인, DEC-OPS-432 ④).
--
-- 종전에는 두 관리자가(또는 관리자와 본인이) 같은 사용자를 열고 차례로 저장하면 늦은 저장이 앞 저장을 알림 없이 덮었다
-- (2026-11-25 품질 평가). V2_155 의 마스터 6표와 달리 JPA @Version 이 아니다 — 이 표는 로그인 실패 횟수·잠금·세션차수·
-- 마지막 로그인 같은 보안 상태를 행 잠금·조건부 UPDATE 로 자주 쓰므로, 모든 쓰기에 버전 대조를 걸면 로그인과 관리 작업이
-- 서로 409 를 낸다. 그래서 이름·연락처·소속 같은 프로필을 고치는 경로(관리자 수정·본인 수정)만 읽은 버전을 대조하고
-- 올린다(UserService.updateUser — 누락 400, 다르면 409). 부서 일괄 이동(moveUsersToDept)도 소속 칸을 바꾸므로 버전만 올린다.
--
-- [무중단·호환성] Expand 전용이다. PostgreSQL 11+ 의 상수 DEFAULT 0 추가는 테이블 재작성 없이 메타데이터로 즉시 반영되고,
--   이전 앱은 이 컬럼을 읽지도 쓰지도 않는다. 정수형 기술 컬럼 예외(DEC-OPS-378·V2_133·V2_149·V2_155 선례).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE tb_user_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_user_info ADD CONSTRAINT ck_tb_user_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_user_info.version IS '프로필 편집 버전 (관리자·본인 프로필 수정 때만 오른다)';
