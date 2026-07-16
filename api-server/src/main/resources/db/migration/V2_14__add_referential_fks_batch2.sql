-- =====================================================================
-- V2_14: 참조 무결성 FK 배치 확장 (P1) — FK 33건 + 자식 인덱스 37건
-- =====================================================================
-- 근거: docs/02-architecture/db-standardization-assessment.md §4 P1 + 관계군별 안전성 검증
--   (2026-07-16, 6개 관계군 병렬 감사: 고아 0·타입 정합·부모 삭제 플로우·기록 경로 전수 실측)
-- 동반 코드 변경(동일 릴리스 결속 — 부모 삭제 시 자식 선정리/참조 해제):
--   SurveyService(설문/문항/항목 연쇄), AuthorManageService(권한 매핑), GroupManageService(그룹 참조 해제),
--   MenuService(upMenuSn 0→null 정규화 + 자식 가드), OnlinePollService(투표결과), LoginPolicyManageService·
--   UserAbsenceServiceImpl(실존 검증), UserService·UserDeletionCleanupListener(사용자 삭제 정리 확장)
-- 패턴: V2_12 선례 — 존재검사 멱등 가드 + NOT VALID → 즉시 VALIDATE(전 테이블 소규모) + NO ACTION 일관.
--   예외 1건: 메뉴 자기참조 FK 는 DEFERRABLE INITIALLY DEFERRED (서브트리 일괄 삭제의 트랜잭션 내
--   삭제 순서 자유를 위해 커밋 시점 일괄 검증 — 계층 자기참조의 표준 처리).
-- 선행: V2_13(타입 정렬·가비지 정리)

-- ---------------------------------------------------------------
-- 1) FK 추가 (멱등 가드)
-- ---------------------------------------------------------------
DO $$
BEGIN
  -- [게시판]
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bbs_comment_tb_bbs_item') THEN
    ALTER TABLE tb_bbs_comment ADD CONSTRAINT fk_tb_bbs_comment_tb_bbs_item
      FOREIGN KEY (pst_id) REFERENCES tb_bbs_item (pst_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bbs_comment_tb_bbs_master') THEN
    ALTER TABLE tb_bbs_comment ADD CONSTRAINT fk_tb_bbs_comment_tb_bbs_master
      FOREIGN KEY (bbs_id) REFERENCES tb_bbs_master (bbs_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bbs_scrap_tb_bbs_item') THEN
    ALTER TABLE tb_bbs_scrap ADD CONSTRAINT fk_tb_bbs_scrap_tb_bbs_item
      FOREIGN KEY (pst_id) REFERENCES tb_bbs_item (pst_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_dgstfn_info_tb_bbs_item') THEN
    ALTER TABLE tb_dgstfn_info ADD CONSTRAINT fk_tb_dgstfn_info_tb_bbs_item
      FOREIGN KEY (pst_id) REFERENCES tb_bbs_item (pst_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_dgstfn_info_tb_bbs_master') THEN
    ALTER TABLE tb_dgstfn_info ADD CONSTRAINT fk_tb_dgstfn_info_tb_bbs_master
      FOREIGN KEY (bbs_id) REFERENCES tb_bbs_master (bbs_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bbs_use_info_tb_bbs_master') THEN
    ALTER TABLE tb_bbs_use_info ADD CONSTRAINT fk_tb_bbs_use_info_tb_bbs_master
      FOREIGN KEY (bbs_id) REFERENCES tb_bbs_master (bbs_id) NOT VALID;
  END IF;

  -- [첨부파일 → tb_file_master] 13건 (자식 컬럼 전부 nullable — NULL 통과)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bbs_item_tb_file_master') THEN
    ALTER TABLE tb_bbs_item ADD CONSTRAINT fk_tb_bbs_item_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bnr_info_tb_file_master') THEN
    ALTER TABLE tb_bnr_info ADD CONSTRAINT fk_tb_bnr_info_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_dept_task_info_tb_file_master') THEN
    ALTER TABLE tb_dept_task_info ADD CONSTRAINT fk_tb_dept_task_info_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_diary_info_tb_file_master') THEN
    ALTER TABLE tb_diary_info ADD CONSTRAINT fk_tb_diary_info_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_dscsn_list_tb_file_master') THEN
    ALTER TABLE tb_dscsn_list ADD CONSTRAINT fk_tb_dscsn_list_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_dta_use_stats_tb_file_master') THEN
    ALTER TABLE tb_dta_use_stats ADD CONSTRAINT fk_tb_dta_use_stats_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_email_dsptch_manage_tb_file_master') THEN
    ALTER TABLE tb_email_dsptch_manage ADD CONSTRAINT fk_tb_email_dsptch_manage_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_faq_info_tb_file_master') THEN
    ALTER TABLE tb_faq_info ADD CONSTRAINT fk_tb_faq_info_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_memo_rpt_info_tb_file_master') THEN
    ALTER TABLE tb_memo_rpt_info ADD CONSTRAINT fk_tb_memo_rpt_info_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_note_info_tb_file_master') THEN
    ALTER TABLE tb_note_info ADD CONSTRAINT fk_tb_note_info_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_rpt_info_tb_file_master') THEN
    ALTER TABLE tb_rpt_info ADD CONSTRAINT fk_tb_rpt_info_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_rward_manage_tb_file_master') THEN
    ALTER TABLE tb_rward_manage ADD CONSTRAINT fk_tb_rward_manage_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_schdl_info_tb_file_master') THEN
    ALTER TABLE tb_schdl_info ADD CONSTRAINT fk_tb_schdl_info_tb_file_master
      FOREIGN KEY (atch_file_id) REFERENCES tb_file_master (atch_file_id) NOT VALID;
  END IF;

  -- [설문] 비정규화 지름길 컬럼 보강 3 + 체인 밖 신규 보호 1
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_srvy_artcl_tb_srvy_info') THEN
    ALTER TABLE tb_srvy_artcl ADD CONSTRAINT fk_tb_srvy_artcl_tb_srvy_info
      FOREIGN KEY (srvy_id) REFERENCES tb_srvy_info (srvy_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_srvy_rslt_tb_srvy_qstn') THEN
    ALTER TABLE tb_srvy_rslt ADD CONSTRAINT fk_tb_srvy_rslt_tb_srvy_qstn
      FOREIGN KEY (srvy_qstn_id) REFERENCES tb_srvy_qstn (srvy_qstn_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_srvy_rslt_tb_srvy_info') THEN
    ALTER TABLE tb_srvy_rslt ADD CONSTRAINT fk_tb_srvy_rslt_tb_srvy_info
      FOREIGN KEY (srvy_id) REFERENCES tb_srvy_info (srvy_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_srvy_rspdnt_tb_srvy_info') THEN
    ALTER TABLE tb_srvy_rspdnt ADD CONSTRAINT fk_tb_srvy_rspdnt_tb_srvy_info
      FOREIGN KEY (srvy_id) REFERENCES tb_srvy_info (srvy_id) NOT VALID;
  END IF;

  -- [RBAC/메뉴/공통코드]
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_authrt_role_map_tb_authrt_info') THEN
    ALTER TABLE tb_authrt_role_map ADD CONSTRAINT fk_tb_authrt_role_map_tb_authrt_info
      FOREIGN KEY (authrt_cd) REFERENCES tb_authrt_info (authrt_cd) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_user_info_tb_authrt_group_info') THEN
    ALTER TABLE tb_user_info ADD CONSTRAINT fk_tb_user_info_tb_authrt_group_info
      FOREIGN KEY (group_id) REFERENCES tb_authrt_group_info (group_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_com_dtl_cd_tb_com_cd') THEN
    ALTER TABLE tb_com_dtl_cd ADD CONSTRAINT fk_tb_com_dtl_cd_tb_com_cd
      FOREIGN KEY (cd_id) REFERENCES tb_com_cd (cd_id) NOT VALID;
  END IF;
  -- 메뉴 자기참조: DEFERRABLE INITIALLY DEFERRED (서브트리 일괄 삭제 시 커밋 시점 일괄 검증)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_menu_info_tb_menu_info_up') THEN
    ALTER TABLE tb_menu_info ADD CONSTRAINT fk_tb_menu_info_tb_menu_info_up
      FOREIGN KEY (up_menu_sn) REFERENCES tb_menu_info (menu_sn) DEFERRABLE INITIALLY DEFERRED NOT VALID;
  END IF;

  -- [기타 도메인]
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_sms_rcptn_tb_sms_info') THEN
    ALTER TABLE tb_sms_rcptn ADD CONSTRAINT fk_tb_sms_rcptn_tb_sms_info
      FOREIGN KEY (sms_id) REFERENCES tb_sms_info (sms_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_blog_user_map_tb_blog_info') THEN
    ALTER TABLE tb_blog_user_map ADD CONSTRAINT fk_tb_blog_user_map_tb_blog_info
      FOREIGN KEY (blog_id) REFERENCES tb_blog_info (blog_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_blog_user_map_tb_user_info') THEN
    ALTER TABLE tb_blog_user_map ADD CONSTRAINT fk_tb_blog_user_map_tb_user_info
      FOREIGN KEY (user_id) REFERENCES tb_user_info (esntl_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_club_user_map_tb_cmnty_info') THEN
    ALTER TABLE tb_club_user_map ADD CONSTRAINT fk_tb_club_user_map_tb_cmnty_info
      FOREIGN KEY (cmnty_id) REFERENCES tb_cmnty_info (cmnty_id) NOT VALID;
  END IF;
  -- tb_login_policy 의 키는 loginId — uk_tb_user_info_user_id(UNIQUE) 대상 FK.
  -- ⚠ P2(사용자 참조 키 esntl_id 단일화) 이행 시 본 FK 재지정 필요 (키잉 고착 명시)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_login_policy_tb_user_info') THEN
    ALTER TABLE tb_login_policy ADD CONSTRAINT fk_tb_login_policy_tb_user_info
      FOREIGN KEY (user_id) REFERENCES tb_user_info (user_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_user_absn_tb_user_info') THEN
    ALTER TABLE tb_user_absn ADD CONSTRAINT fk_tb_user_absn_tb_user_info
      FOREIGN KEY (user_id) REFERENCES tb_user_info (esntl_id) NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 2) VALIDATE (전 대상 0~462행 실측 — 즉시 검증 무부담. 이미 VALID 면 no-op)
-- ---------------------------------------------------------------
ALTER TABLE tb_bbs_comment        VALIDATE CONSTRAINT fk_tb_bbs_comment_tb_bbs_item;
ALTER TABLE tb_bbs_comment        VALIDATE CONSTRAINT fk_tb_bbs_comment_tb_bbs_master;
ALTER TABLE tb_bbs_scrap          VALIDATE CONSTRAINT fk_tb_bbs_scrap_tb_bbs_item;
ALTER TABLE tb_dgstfn_info        VALIDATE CONSTRAINT fk_tb_dgstfn_info_tb_bbs_item;
ALTER TABLE tb_dgstfn_info        VALIDATE CONSTRAINT fk_tb_dgstfn_info_tb_bbs_master;
ALTER TABLE tb_bbs_use_info       VALIDATE CONSTRAINT fk_tb_bbs_use_info_tb_bbs_master;
ALTER TABLE tb_bbs_item           VALIDATE CONSTRAINT fk_tb_bbs_item_tb_file_master;
ALTER TABLE tb_bnr_info           VALIDATE CONSTRAINT fk_tb_bnr_info_tb_file_master;
ALTER TABLE tb_dept_task_info     VALIDATE CONSTRAINT fk_tb_dept_task_info_tb_file_master;
ALTER TABLE tb_diary_info         VALIDATE CONSTRAINT fk_tb_diary_info_tb_file_master;
ALTER TABLE tb_dscsn_list         VALIDATE CONSTRAINT fk_tb_dscsn_list_tb_file_master;
ALTER TABLE tb_dta_use_stats      VALIDATE CONSTRAINT fk_tb_dta_use_stats_tb_file_master;
ALTER TABLE tb_email_dsptch_manage VALIDATE CONSTRAINT fk_tb_email_dsptch_manage_tb_file_master;
ALTER TABLE tb_faq_info           VALIDATE CONSTRAINT fk_tb_faq_info_tb_file_master;
ALTER TABLE tb_memo_rpt_info      VALIDATE CONSTRAINT fk_tb_memo_rpt_info_tb_file_master;
ALTER TABLE tb_note_info          VALIDATE CONSTRAINT fk_tb_note_info_tb_file_master;
ALTER TABLE tb_rpt_info           VALIDATE CONSTRAINT fk_tb_rpt_info_tb_file_master;
ALTER TABLE tb_rward_manage       VALIDATE CONSTRAINT fk_tb_rward_manage_tb_file_master;
ALTER TABLE tb_schdl_info         VALIDATE CONSTRAINT fk_tb_schdl_info_tb_file_master;
ALTER TABLE tb_srvy_artcl         VALIDATE CONSTRAINT fk_tb_srvy_artcl_tb_srvy_info;
ALTER TABLE tb_srvy_rslt          VALIDATE CONSTRAINT fk_tb_srvy_rslt_tb_srvy_qstn;
ALTER TABLE tb_srvy_rslt          VALIDATE CONSTRAINT fk_tb_srvy_rslt_tb_srvy_info;
ALTER TABLE tb_srvy_rspdnt        VALIDATE CONSTRAINT fk_tb_srvy_rspdnt_tb_srvy_info;
ALTER TABLE tb_authrt_role_map    VALIDATE CONSTRAINT fk_tb_authrt_role_map_tb_authrt_info;
ALTER TABLE tb_user_info          VALIDATE CONSTRAINT fk_tb_user_info_tb_authrt_group_info;
ALTER TABLE tb_com_dtl_cd         VALIDATE CONSTRAINT fk_tb_com_dtl_cd_tb_com_cd;
ALTER TABLE tb_menu_info          VALIDATE CONSTRAINT fk_tb_menu_info_tb_menu_info_up;
ALTER TABLE tb_sms_rcptn          VALIDATE CONSTRAINT fk_tb_sms_rcptn_tb_sms_info;
ALTER TABLE tb_blog_user_map      VALIDATE CONSTRAINT fk_tb_blog_user_map_tb_blog_info;
ALTER TABLE tb_blog_user_map      VALIDATE CONSTRAINT fk_tb_blog_user_map_tb_user_info;
ALTER TABLE tb_club_user_map      VALIDATE CONSTRAINT fk_tb_club_user_map_tb_cmnty_info;
ALTER TABLE tb_login_policy       VALIDATE CONSTRAINT fk_tb_login_policy_tb_user_info;
ALTER TABLE tb_user_absn          VALIDATE CONSTRAINT fk_tb_user_absn_tb_user_info;

-- ---------------------------------------------------------------
-- 3) 신규 FK 자식측 커버링 인덱스 26건 (부모 DELETE 시 자식 풀스캔 방지)
--    미기재 관계는 기존 PK/UK 선두컬럼이 커버함을 실측 확인(감사 결과)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_tb_bbs_comment_pst_id            ON tb_bbs_comment (pst_id);
CREATE INDEX IF NOT EXISTS ix_tb_bbs_comment_bbs_id            ON tb_bbs_comment (bbs_id);
CREATE INDEX IF NOT EXISTS ix_tb_bbs_scrap_pst_id              ON tb_bbs_scrap (pst_id);
CREATE INDEX IF NOT EXISTS ix_tb_dgstfn_info_pst_id            ON tb_dgstfn_info (pst_id);
CREATE INDEX IF NOT EXISTS ix_tb_dgstfn_info_bbs_id            ON tb_dgstfn_info (bbs_id);
CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_atch_file_id         ON tb_bbs_item (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_bnr_info_atch_file_id         ON tb_bnr_info (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_dept_task_info_atch_file_id   ON tb_dept_task_info (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_diary_info_atch_file_id       ON tb_diary_info (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_dscsn_list_atch_file_id       ON tb_dscsn_list (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_dta_use_stats_atch_file_id    ON tb_dta_use_stats (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_email_dsptch_manage_atch_file_id ON tb_email_dsptch_manage (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_faq_info_atch_file_id         ON tb_faq_info (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_memo_rpt_info_atch_file_id    ON tb_memo_rpt_info (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_note_info_atch_file_id        ON tb_note_info (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_rpt_info_atch_file_id         ON tb_rpt_info (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_rward_manage_atch_file_id     ON tb_rward_manage (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_schdl_info_atch_file_id       ON tb_schdl_info (atch_file_id);
CREATE INDEX IF NOT EXISTS ix_tb_srvy_artcl_srvy_id            ON tb_srvy_artcl (srvy_id);
CREATE INDEX IF NOT EXISTS ix_tb_srvy_rslt_srvy_qstn_id        ON tb_srvy_rslt (srvy_qstn_id);
CREATE INDEX IF NOT EXISTS ix_tb_srvy_rslt_srvy_id             ON tb_srvy_rslt (srvy_id);
CREATE INDEX IF NOT EXISTS ix_tb_user_info_group_id            ON tb_user_info (group_id);
CREATE INDEX IF NOT EXISTS ix_tb_menu_info_up_menu_sn          ON tb_menu_info (up_menu_sn);
CREATE INDEX IF NOT EXISTS ix_tb_sms_rcptn_sms_id              ON tb_sms_rcptn (sms_id);
CREATE INDEX IF NOT EXISTS ix_tb_blog_user_map_user_id         ON tb_blog_user_map (user_id);
CREATE INDEX IF NOT EXISTS ix_tb_club_user_map_cmnty_id        ON tb_club_user_map (cmnty_id);

-- ---------------------------------------------------------------
-- 4) 기존 FK 자식측 인덱스 부재 11건 보강 (감사 MEDIUM 잔여 해소 — 재실측 완료)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_tb_cmnty_user_map_user_id        ON tb_cmnty_user_map (user_id);
CREATE INDEX IF NOT EXISTS ix_tb_note_rcptn_note_id            ON tb_note_rcptn (note_id);
CREATE INDEX IF NOT EXISTS ix_tb_note_rcptn_note_sndng_id      ON tb_note_rcptn (note_sndng_id);
CREATE INDEX IF NOT EXISTS ix_tb_note_sndng_note_id            ON tb_note_sndng (note_id);
CREATE INDEX IF NOT EXISTS ix_tb_onln_poll_artcl_poll_id       ON tb_onln_poll_artcl (poll_id);
CREATE INDEX IF NOT EXISTS ix_tb_onln_poll_rslt_poll_artcl_id  ON tb_onln_poll_rslt (poll_artcl_id);
CREATE INDEX IF NOT EXISTS ix_tb_role_prgrm_map_prgrm_file_nm  ON tb_role_prgrm_map (prgrm_file_nm);
CREATE INDEX IF NOT EXISTS ix_tb_srvy_artcl_srvy_qstn_id       ON tb_srvy_artcl (srvy_qstn_id);
CREATE INDEX IF NOT EXISTS ix_tb_srvy_qstn_srvy_id             ON tb_srvy_qstn (srvy_id);
CREATE INDEX IF NOT EXISTS ix_tb_srvy_rslt_srvy_artcl_id       ON tb_srvy_rslt (srvy_artcl_id);
CREATE INDEX IF NOT EXISTS ix_tb_user_log_dmnd_user_id         ON tb_user_log (dmnd_user_id);

-- 검증(참고): 적용 후 기대 상태 — FK 25→58 전부 convalidated / 인덱스 37건 존재 /
--   메뉴 자기참조 FK 만 condeferrable=true
