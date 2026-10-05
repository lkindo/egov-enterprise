-- 2026-10-05 사용자 승인("이번만 내 승인하에 규칙을 무시하고 내가 명령한 작업을 진행해") — 프로그램 원장 참조 퇴역의
-- Contract(GAP-PROGRAM-001 종료). 구조를 지운다. 템플릿 프로젝트라 선행 Expand(V2_126·앱의 매핑 해제)와 같은 릴리스에
-- 싣는다 — 무중단 관측 기간(7일) 규칙의 이번 한 건 예외이며 ZDM 린터의 사용자 승인 예외 목록이 그 사실을 고정한다
-- (DEC-OPS-233). 운영 중인 도입 기관은 이 예외를 승계하지 않는다: 앱을 먼저 배포하고 관측한 뒤 적용한다.
--
-- ① 가드: 빈 테이블 tb_indv_pg_conts(마이페이지 콘텐츠, DEC-OPS-070 으로 화면·API·엔티티를 걷음)에 행이 있으면 멈춘다
--    (ADR-0012 블로그 퇴역 선례 — 데이터가 있는 환경은 지우지 않는다). 2026-10-05 OCI 읽기: 0행.
-- ② tb_menu_info.prgrm_file_nm 의 외래 키와 컬럼을 지운다. 앱은 V2_126 과 함께 그 컬럼을 매핑하지 않는다. 남은 값은
--    레거시 파일명이며 쓰는 곳이 없다(경로는 V2_126 이 modern_route 에 채웠다).
-- ③ 프로그램 원장 tb_prgrm_lst 를 지운다. 앱은 2026-10-04(DEC-OPS-224) 이후 읽지 않는다. 구 매핑 표 tb_role_prgrm_map 은
--    인가 Contract 가 이미 지웠다 — 남아 있는 DB 면 그 외래 키 때문에 이 문장이 실패하고 전체가 롤백된다(CASCADE 없음).
--    2026-10-05 OCI 읽기: 0행(V2_119).
-- ④ tb_indv_pg_conts 를 지운다(소유 identity sequence 도 함께 사라진다).
-- 되돌리는 원본은 적용 직전 백업이다(authorization-cutover-runbook.md 의 V2_126·V2_127 절).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE tb_menu_info, tb_prgrm_lst, tb_indv_pg_conts IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_indv_pg_conts) THEN
        RAISE EXCEPTION 'tb_indv_pg_conts has rows; the personal page contents table is dropped only when empty'
            USING HINT = 'Back up and remove the rows first. See docs/04-operations/authorization-cutover-runbook.md, section V2_126, V2_127.';
    END IF;
END $$;

ALTER TABLE tb_menu_info DROP CONSTRAINT IF EXISTS fk_tb_menu_info_tb_prgrm_lst;
ALTER TABLE tb_menu_info DROP COLUMN prgrm_file_nm; -- linter:ignore ZDM-2026-0041 DEC-OPS-233: 앱이 매핑하지 않는 레거시 연결 프로그램 컬럼 폐기
DROP TABLE tb_prgrm_lst; -- linter:ignore ZDM-2026-0042 DEC-OPS-233: 앱이 읽지 않는 프로그램 원장 폐기
DROP TABLE tb_indv_pg_conts; -- linter:ignore ZDM-2026-0043 DEC-OPS-233: 쓰는 코드가 없는 빈 마이페이지 콘텐츠 테이블 폐기
