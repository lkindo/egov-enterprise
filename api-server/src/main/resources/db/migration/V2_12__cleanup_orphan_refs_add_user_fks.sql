-- =====================================================================
-- V2_12: 고아행 정리 + 사용자/메뉴 참조 FK 추가 (P0 CRITICAL)
-- =====================================================================
-- 근거: docs/02-architecture/db-standardization-assessment.md §3 CRITICAL
--   - tb_user_authrt_map.scrty_dcsn_trgt_id 173/197(88%) 고아 (보안 인가 매핑)
--   - tb_bbs_item.user_id 180/377 레거시 placeholder 고아
--   - 기타 5개 관계 고아 217행 (menu_crt_dtl 18 · user_noti 138 · adbk 34 · comment 25 · rfsh_tk 2)
-- 결정(사용자 승인, 2026-07-16): 백업 덤프 후 DELETE / bbs_item은 webmaster 재귀속 /
--   FK는 NO ACTION 일관 + 앱(UserService.deleteUser) 종속 정리 동반 변경.
-- 백업: 삭제 전 전량 JSON 덤프 보존(총 390행 + 재귀속 전 상태 180행) — 태스크 기록 참조.
-- 멱등성: 전 구문 재실행 안전(존재 검사/조건 DML). V2_9 자가치유 선례 준수.
-- 주의: tb_user_authrt_map 은 mbr_type_cd 상 그룹 주체도 설계상 가능하나 실데이터 그룹 참조
--   0건 + 그룹 기록 코드 경로 부재로 tb_user_info(esntl_id) 단일 FK 를 채택. 그룹 인가를
--   도입하려면 본 FK 재설계(참조 컬럼 분리) 필요.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) 자가치유: 고아행 정리 (fresh DB 에서는 전부 0건 no-op)
-- ---------------------------------------------------------------
-- 1-1) 보안 인가 매핑: 존재하지 않는 주체(user/group) 참조 잔재
DELETE FROM tb_user_authrt_map m
 WHERE NOT EXISTS (SELECT 1 FROM tb_user_info u WHERE u.esntl_id = m.scrty_dcsn_trgt_id)
   AND NOT EXISTS (SELECT 1 FROM tb_authrt_group_info g WHERE g.group_id = m.scrty_dcsn_trgt_id);

-- 1-2) 메뉴-권한 매핑: 삭제된 메뉴 잔재
DELETE FROM tb_menu_crt_dtl d
 WHERE NOT EXISTS (SELECT 1 FROM tb_menu_info m WHERE m.menu_sn = d.menu_sn);

-- 1-3) 삭제된 사용자 잔재 (알림/주소록/댓글/리프레시토큰)
DELETE FROM tb_user_noti n
 WHERE n.rcvr_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM tb_user_info u WHERE u.esntl_id = n.rcvr_id);

DELETE FROM tb_adbk_manage a
 WHERE a.wrter_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM tb_user_info u WHERE u.esntl_id = a.wrter_id);

DELETE FROM tb_bbs_comment c
 WHERE c.wrter_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM tb_user_info u WHERE u.esntl_id = c.wrter_id);

DELETE FROM tb_auth_rfsh_tk t
 WHERE NOT EXISTS (SELECT 1 FROM tb_user_info u WHERE u.esntl_id = t.user_id)
   AND NOT EXISTS (SELECT 1 FROM tb_user_info u WHERE u.user_id  = t.user_id);

-- ---------------------------------------------------------------
-- 2) 레거시 placeholder 게시글 저자 재귀속 → webmaster (콘텐츠 보존 결정)
--    placeholder 는 시드 파일에 존재하지 않음(라이브 잔재) — 재생산 경로 없음 실측 확인
-- ---------------------------------------------------------------
UPDATE tb_bbs_item b
   SET user_id = 'USRCNFRM_00000000001'
 WHERE b.user_id IN ('USRCNFRM_99999999999', 'USRCNFRM_00000000000')
   AND EXISTS (SELECT 1 FROM tb_user_info u WHERE u.esntl_id = 'USRCNFRM_00000000001');

-- ---------------------------------------------------------------
-- 3) FK 추가 (헌법 제6조 명명, NO ACTION 일관, NOT VALID → 즉시 VALIDATE)
--    대상 테이블 전부 소규모(<21k행)라 동일 릴리스 내 VALIDATE 무부담
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_user_authrt_map_tb_user_info') THEN
    ALTER TABLE tb_user_authrt_map ADD CONSTRAINT fk_tb_user_authrt_map_tb_user_info
      FOREIGN KEY (scrty_dcsn_trgt_id) REFERENCES tb_user_info (esntl_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_menu_crt_dtl_tb_menu_info') THEN
    ALTER TABLE tb_menu_crt_dtl ADD CONSTRAINT fk_tb_menu_crt_dtl_tb_menu_info
      FOREIGN KEY (menu_sn) REFERENCES tb_menu_info (menu_sn) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_menu_crt_dtl_tb_authrt_info') THEN
    ALTER TABLE tb_menu_crt_dtl ADD CONSTRAINT fk_tb_menu_crt_dtl_tb_authrt_info
      FOREIGN KEY (authrt_cd) REFERENCES tb_authrt_info (authrt_cd) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bbs_item_tb_user_info') THEN
    ALTER TABLE tb_bbs_item ADD CONSTRAINT fk_tb_bbs_item_tb_user_info
      FOREIGN KEY (user_id) REFERENCES tb_user_info (esntl_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bbs_comment_tb_user_info') THEN
    ALTER TABLE tb_bbs_comment ADD CONSTRAINT fk_tb_bbs_comment_tb_user_info
      FOREIGN KEY (wrter_id) REFERENCES tb_user_info (esntl_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_adbk_manage_tb_user_info') THEN
    ALTER TABLE tb_adbk_manage ADD CONSTRAINT fk_tb_adbk_manage_tb_user_info
      FOREIGN KEY (wrter_id) REFERENCES tb_user_info (esntl_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_user_noti_tb_user_info') THEN
    ALTER TABLE tb_user_noti ADD CONSTRAINT fk_tb_user_noti_tb_user_info
      FOREIGN KEY (rcvr_id) REFERENCES tb_user_info (esntl_id) NOT VALID;
  END IF;
END $$;

ALTER TABLE tb_user_authrt_map VALIDATE CONSTRAINT fk_tb_user_authrt_map_tb_user_info;
ALTER TABLE tb_menu_crt_dtl    VALIDATE CONSTRAINT fk_tb_menu_crt_dtl_tb_menu_info;
ALTER TABLE tb_menu_crt_dtl    VALIDATE CONSTRAINT fk_tb_menu_crt_dtl_tb_authrt_info;
ALTER TABLE tb_bbs_item        VALIDATE CONSTRAINT fk_tb_bbs_item_tb_user_info;
ALTER TABLE tb_bbs_comment     VALIDATE CONSTRAINT fk_tb_bbs_comment_tb_user_info;
ALTER TABLE tb_adbk_manage     VALIDATE CONSTRAINT fk_tb_adbk_manage_tb_user_info;
ALTER TABLE tb_user_noti       VALIDATE CONSTRAINT fk_tb_user_noti_tb_user_info;

-- ---------------------------------------------------------------
-- 4) FK 자식측 커버링 인덱스 (감사 MEDIUM: 부모 DELETE 시 자식 풀스캔 방지)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_tb_user_authrt_map_scrty_dcsn_trgt_id ON tb_user_authrt_map (scrty_dcsn_trgt_id);
CREATE INDEX IF NOT EXISTS ix_tb_menu_crt_dtl_menu_sn               ON tb_menu_crt_dtl (menu_sn);
CREATE INDEX IF NOT EXISTS ix_tb_menu_crt_dtl_authrt_cd             ON tb_menu_crt_dtl (authrt_cd);
CREATE INDEX IF NOT EXISTS ix_tb_bbs_item_user_id                   ON tb_bbs_item (user_id);
CREATE INDEX IF NOT EXISTS ix_tb_bbs_comment_wrter_id               ON tb_bbs_comment (wrter_id);
CREATE INDEX IF NOT EXISTS ix_tb_adbk_manage_wrter_id               ON tb_adbk_manage (wrter_id);
CREATE INDEX IF NOT EXISTS ix_tb_user_noti_rcvr_id                  ON tb_user_noti (rcvr_id);

-- ---------------------------------------------------------------
-- 5) 부수 정합: V2_6 잔여 NOT VALID FK 5건 승격 (fresh-DB 카탈로그가 라이브와
--    갈라지는 감사 지적 해소 — 이미 VALID 인 라이브에서는 no-op)
-- ---------------------------------------------------------------
ALTER TABLE tb_bbs_item       VALIDATE CONSTRAINT fk_tb_bbs_item_tb_bbs_master;
ALTER TABLE tb_srvy_qstn      VALIDATE CONSTRAINT fk_tb_srvy_qstn_tb_srvy_info;
ALTER TABLE tb_srvy_artcl     VALIDATE CONSTRAINT fk_tb_srvy_artcl_tb_srvy_qstn;
ALTER TABLE tb_srvy_rslt      VALIDATE CONSTRAINT fk_tb_srvy_rslt_tb_srvy_artcl;
ALTER TABLE tb_cmnty_user_map VALIDATE CONSTRAINT fk_tb_cmnty_user_map_tb_cmnty_info;

-- 검증(참고): 본 파일 적용 후 기대 상태 —
--   고아행: 위 7개 관계 전부 0건 / 신규 FK 7건 convalidated=true / 인덱스 7건 존재
