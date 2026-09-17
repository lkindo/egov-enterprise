-- =====================================================================
-- V2_102: 앱 검사에만 의존하던 참조 4축을 물리 FK로 보강
-- =====================================================================
-- 부서 소속·부서 계층·행정구역 계층·게시판 커뮤니티 귀속은 서비스 가드만 막고 DB 는 막지
-- 않았다. 직접 DML·이관·가드 결함이면 존재하지 않는 부모를 가리키는 행이 조용히 남는다.
-- 앱 쪽 쓰기 가드는 DEC-OPS-105 로 닫았고, 이 마이그레이션은 그 가드를 우회한 경로의 최종
-- 방어선이다. V2_26 이 tb_ognz_info.up_ognz_id 에 "FK 를 걸지 않는다" 고 적은 방침은 앱 가드가
-- 없던 시점의 판단이며, 이 마이그레이션이 그 부분만 대체한다(DEC-OPS-106).
--
-- ⚠ [선행 조건] 빈 문자열을 NULL 로 정규화한다.
--   화면은 "부모 없음" 을 빈 문자열로 보낸다 — 사용자 등록 폼의 <option value="">소속 없음</option>,
--   행정구역 등록 폼의 upAdmdstCd 기본값이 그렇다. 빈 문자열은 NULL 이 아니므로 FK 가 그것을
--   **거부한다** — 정규화 없이 FK 만 걸면 소속 없는 사용자 등록과 최상위 행정구역 등록이
--   그 순간부터 실패한다. V2_26 이 이미 "NULL 이면 최상위" 를 컬럼 주석으로 못박았으므로,
--   이 정규화는 새 계약이 아니라 쓰기 경로를 문서화된 계약에 맞추는 것이다.
--   같은 변경의 서비스 정규화(UserService·DeptManageService·AdministCodeService)가 신규 쓰기를 막고,
--   아래 UPDATE 는 이미 들어간 값을 정리한다. 의미가 같은 값의 표현만 바꾸므로 정보 손실이 없다.
--
-- ⚠ tb_bbs_master.tmplt_id 는 **의도적으로 제외한다**. 이름과 달리 템플릿 원장 참조가 아니라
--   프런트 레이아웃 분기 키로 쓰이고 있다 — 게시판 생성 마법사가 보내는 값은 하드코딩 상수이며
--   tb_tmplt_info 에 행을 넣는 생산 코드가 저장소에 0건이다. R__seed_demo.sql 스스로 "tmplt_id
--   일부는 라이브에서도 dangling" 이라 적는다. FK 를 걸면 게시판 생성이 전면 중단된다.
--   그 컬럼의 의미를 정하는 것이 먼저다.
--
-- 삭제 동작은 V2_85 와 같은 이유로 NO ACTION 이다. CASCADE 는 부모를 지우는 것만으로 자식
-- 데이터를 조용히 없앤다. 차단은 서비스 가드가 먼저 사용자 문구로 말하고, FK 는 최종 방어선이다.
--
-- 도입처의 기존 고아를 자동 삭제하지 않는다. FK 는 NOT VALID 로 먼저 추가해 신규 쓰기를 즉시
-- 보호하고, 그 환경에 고아가 없을 때만 같은 실행에서 검증한다. 데이터가 더러운 환경에서도
-- 배포가 실패하지 않으면서 새 쓰기는 모두 막힌다.

-- 1) "부모 없음" 의 표현을 NULL 하나로 모은다. 대상은 빈 문자열 행뿐이다.
UPDATE tb_user_info  SET ognz_id      = NULL WHERE ognz_id      = '';
UPDATE tb_ognz_info  SET up_ognz_id   = NULL WHERE up_ognz_id   = '';
UPDATE tb_admdst_cd  SET up_admdst_cd = NULL WHERE up_admdst_cd = '';

-- 2) FK 를 NOT VALID 로 추가해 신규 쓰기부터 즉시 보호한다.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_user_info_tb_ognz_info') THEN
    ALTER TABLE tb_user_info
      ADD CONSTRAINT fk_tb_user_info_tb_ognz_info
      FOREIGN KEY (ognz_id) REFERENCES tb_ognz_info (ognz_id) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_ognz_info_up_ognz_id') THEN
    ALTER TABLE tb_ognz_info
      ADD CONSTRAINT fk_tb_ognz_info_up_ognz_id
      FOREIGN KEY (up_ognz_id) REFERENCES tb_ognz_info (ognz_id) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_admdst_cd_up_admdst_cd') THEN
    ALTER TABLE tb_admdst_cd
      ADD CONSTRAINT fk_tb_admdst_cd_up_admdst_cd
      FOREIGN KEY (up_admdst_cd) REFERENCES tb_admdst_cd (admdst_cd) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_bbs_master_tb_cmnty_info') THEN
    ALTER TABLE tb_bbs_master
      ADD CONSTRAINT fk_tb_bbs_master_tb_cmnty_info
      FOREIGN KEY (cmnty_sn) REFERENCES tb_cmnty_info (cmnty_sn) NOT VALID;
  END IF;
END $$;

-- 3) 부모를 지우거나 참조를 세는 질의가 자식 전량을 훑지 않도록 인덱스를 둔다.
--    tb_ognz_info.up_ognz_id 의 인덱스는 V2_26 이 이미 만들었다.
CREATE INDEX IF NOT EXISTS ix_tb_user_info_ognz_id ON tb_user_info (ognz_id);
CREATE INDEX IF NOT EXISTS ix_tb_admdst_cd_up_admdst_cd ON tb_admdst_cd (up_admdst_cd);
CREATE INDEX IF NOT EXISTS ix_tb_bbs_master_cmnty_sn ON tb_bbs_master (cmnty_sn);

-- 4) 고아가 없는 관계만 이 환경에서 검증한다. NULL 은 FK 대상이 아니다.
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM tb_user_info child
       WHERE child.ognz_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM tb_ognz_info parent WHERE parent.ognz_id = child.ognz_id)
  ) THEN
    ALTER TABLE tb_user_info VALIDATE CONSTRAINT fk_tb_user_info_tb_ognz_info;
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM tb_ognz_info child
       WHERE child.up_ognz_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM tb_ognz_info parent WHERE parent.ognz_id = child.up_ognz_id)
  ) THEN
    ALTER TABLE tb_ognz_info VALIDATE CONSTRAINT fk_tb_ognz_info_up_ognz_id;
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM tb_admdst_cd child
       WHERE child.up_admdst_cd IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM tb_admdst_cd parent WHERE parent.admdst_cd = child.up_admdst_cd)
  ) THEN
    ALTER TABLE tb_admdst_cd VALIDATE CONSTRAINT fk_tb_admdst_cd_up_admdst_cd;
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM tb_bbs_master child
       WHERE child.cmnty_sn IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM tb_cmnty_info parent WHERE parent.cmnty_sn = child.cmnty_sn)
  ) THEN
    ALTER TABLE tb_bbs_master VALIDATE CONSTRAINT fk_tb_bbs_master_tb_cmnty_info;
  END IF;
END $$;
