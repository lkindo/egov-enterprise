-- V2_25: 샘플 도메인 물리 테이블 완전 제거 (재사용 base = 커널 + board + 통신4종만 유지)
--
-- ⚠⚠⚠ [템플릿 브랜치 전용 — 신규(FRESH) 데이터베이스 대상] ⚠⚠⚠
--   이 마이그레이션은 template/reusable-base 브랜치의 "깨끗한 base" 실현물이다. 샘플 20+ 도메인을
--   코드/라우트와 함께 물리 스키마에서도 제거한다(사용자 결정 ③ "테이블까지 완전 제거").
--   ▶ 공유 데모 OCI DB 에 절대 적용하지 말 것 — main(데모) 브랜치의 샘플 데이터가 파괴된다.
--     (본 브랜치는 V2_2 시드 개편으로 checksum 이 의도적으로 분기되어, 기존 이력이 있는 DB 에는
--      Flyway validate 가 실패하도록 펜싱돼 있다. 신규 DB 에서만 전체 체인이 클린 적용된다.)
--
-- [무중단 예외] DROP TABLE 은 ZeroDowntimeMigrationLinter 금지 대상이나, 본 파일은 "샘플 제거"라는
--   릴리스 성격상 의도된 파괴 DDL 이므로 각 라인에 '-- linter:ignore' 로 명시 예외 처리한다.
-- [안전] IF EXISTS + CASCADE: 대상 부재 시 무시, 삭제 도메인 내부/외래 참조(delete→keep FK)는 함께 소멸.
--   유지 테이블(tb_bbs_master/_item/_comment/_scrap, tb_dgstfn_info, tb_tmplt_info[=BoardTemplate],
--   tb_note_*, tb_user_*, tb_menu_*, tb_com_*, tb_file_*, tb_org*/dept/group/program/login/auth/role,
--   tb_stmp_info, tb_indv_pg_conts) 은 대상에서 제외.

-- image
DROP TABLE IF EXISTS tb_main_image CASCADE; -- linter:ignore
-- stats
DROP TABLE IF EXISTS tb_rptp_stats CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_dta_use_stats CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_bbs_stats CASCADE; -- linter:ignore
-- banner / popup
DROP TABLE IF EXISTS tb_bnr_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_popup_info CASCADE; -- linter:ignore
-- community
DROP TABLE IF EXISTS tb_cmnty_user_map CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_club_user_map CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_club_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_cmnty_info CASCADE; -- linter:ignore
-- survey
DROP TABLE IF EXISTS tb_srvy_rslt CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_srvy_rspdnt CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_srvy_artcl CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_srvy_qstn CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_srvy_tmplt CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_srvy_info CASCADE; -- linter:ignore
-- poll
DROP TABLE IF EXISTS tb_onln_poll_rslt CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_onln_poll_artcl CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_onln_poll_manage CASCADE; -- linter:ignore
-- consult
DROP TABLE IF EXISTS tb_dscsn_list CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_dscsn_manage CASCADE; -- linter:ignore
-- calendar / schedule
DROP TABLE IF EXISTS tb_hldy_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_schdl_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_diary_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_memo_todo_info CASCADE; -- linter:ignore
-- addressbook
DROP TABLE IF EXISTS tb_adbk_manage CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_adbk_info CASCADE; -- linter:ignore
-- faq / help
DROP TABLE IF EXISTS tb_faq_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_hlp_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_onln_mnl_info CASCADE; -- linter:ignore
-- blog
DROP TABLE IF EXISTS tb_blog_user_map CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_blog_info CASCADE; -- linter:ignore
-- reward / operation / report / memoreport / informalsanction / isg
DROP TABLE IF EXISTS tb_rward_manage CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_extrl_hr_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_event_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_rpt_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_memo_rpt_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_ifml_atrz_info CASCADE; -- linter:ignore
DROP TABLE IF EXISTS tb_intrn_svc CASCADE; -- linter:ignore

-- 삭제된 샘플 라우트를 가리키는 메뉴(tb_menu_info) 항목 정리 — 신규 설치 시 내비게이션 404 방지.
-- tb_menu_info(=커널) 자체는 유지하고 삭제 도메인 라우트 행만 제거. 유지 라우트(/admin/community/boards*,
-- /admin/system/comments, /admin/collaboration/scraps·mail*, /smart-toolkit/dept-job, /admin/work-hub[리다이렉트],
-- /admin/uss/ion/sms, /note, /search, /admin/user·security·system·workspace·notifications 등)는 보존.
DELETE FROM tb_menu_info WHERE modern_route LIKE '/admin/survey%';
DELETE FROM tb_menu_info WHERE modern_route LIKE '/admin/stats%';
DELETE FROM tb_menu_info WHERE modern_route LIKE '/admin/operation%';
DELETE FROM tb_menu_info WHERE modern_route LIKE '/admin/sanctn%';
DELETE FROM tb_menu_info WHERE modern_route LIKE '/admin/help/faq%';
DELETE FROM tb_menu_info WHERE modern_route = '/admin/workflow';
DELETE FROM tb_menu_info WHERE modern_route = '/admin/uss/olh/online-manual';
DELETE FROM tb_menu_info WHERE modern_route = '/admin/collaboration/address-book';
DELETE FROM tb_menu_info WHERE modern_route = '/admin/community/templates';
DELETE FROM tb_menu_info WHERE modern_route = '/admin/system/banner';
DELETE FROM tb_menu_info WHERE modern_route = '/admin/system/hpcm';
DELETE FROM tb_menu_info WHERE modern_route = '/smart-toolkit/schedule';
DELETE FROM tb_menu_info WHERE modern_route = '/smart-toolkit/work-report';
DELETE FROM tb_menu_info WHERE modern_route = '/survey';
