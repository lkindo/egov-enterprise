-- 조직(부서) 계층 구조 지원 컬럼 신설
--
-- [배경]
-- 프론트에 dnd-kit 기반 조직도 트리 UI 와 '구조 동기화' 버튼이 있었으나, 이를 뒷받침하는
-- 백엔드 엔드포인트(PUT /departments/batch-hierarchy)도 물리 컬럼도 존재하지 않는 팬텀이었다.
-- frontend/src/lib/utils/treeUtils.ts 는 주석으로 "실제 DB에 upperOgnzId가 없을 경우를 대비해 ...
-- 시뮬레이션할 수도 있음" 이라 자백하고 @ts-ignore 로 없는 필드를 읽고 있었다.
-- 그 결과 트리는 항상 전부 루트(평면)로 렌더되고 저장 버튼은 404 를 받았다.
-- 계층을 실제로 지원하기로 결정(사용자 승인)하여 물리 컬럼을 신설한다.
--
-- [명명 근거] DB 헌법 제2조에 따라 meta_standard_words 를 실조회해 대표 약어(rprs_yn='Y')를 확인했다.
--   상위 → UP, 정렬 → SORT, 조직 → OGNZ
-- 기존 물리 선례와도 일치한다: tb_menu_info.up_menu_sn, tb_admdst_cd.up_admdst_cd,
--   tb_bbs_item.up_pst_id, 그리고 5개 테이블의 sort_ordr.
--
-- [무결성 방침] up_ognz_id 는 자기참조지만 FK 제약을 걸지 않는다.
--   tb_user_info.ognz_id 역시 FK 가 없고(User 엔티티가 ConstraintMode.NO_CONSTRAINT 로 선언),
--   순환 참조·자기참조 방어는 애플리케이션 레이어(DeptManageService)에서 수행한다.
--   기존 1행(기본조직 ORGNZT_0000000000000)은 up_ognz_id=NULL 즉 최상위(루트)로 남는다.
--
-- [멱등성] IF NOT EXISTS 로 재적용 시 무해하게 통과한다.

ALTER TABLE tb_ognz_info ADD COLUMN IF NOT EXISTS up_ognz_id character varying(20);
ALTER TABLE tb_ognz_info ADD COLUMN IF NOT EXISTS sort_ordr integer DEFAULT 0;

COMMENT ON COLUMN tb_ognz_info.up_ognz_id IS '상위조직ID (up_ognz_id) — NULL 이면 최상위(루트)';
COMMENT ON COLUMN tb_ognz_info.sort_ordr IS '정렬순서 (sort_ordr) — 동일 상위 내 표시 순서';

-- 상위 조직 기준 자식 조회를 위한 인덱스 (명명 규칙: ix_<table>_<column>)
CREATE INDEX IF NOT EXISTS ix_tb_ognz_info_up_ognz_id ON tb_ognz_info (up_ognz_id);
