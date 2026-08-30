-- =====================================================================
-- V2_85: 권한 할당·역할 계층 → 권한 마스터 참조 무결성 확장
-- =====================================================================
-- 삭제된 권한 코드를 자식 행이 계속 보유하면 같은 코드를 재생성했을 때 과거 권한이
-- 조용히 되살아난다. 권한 의미를 자동 회수하는 CASCADE 대신 NO ACTION을 사용한다.
-- 기존 운영 고아는 인가 데이터이므로 자동 삭제하지 않는다. FK는 NOT VALID로 먼저
-- 추가해 신규 쓰기를 즉시 보호하고, 고아가 없는 관계만 같은 실행에서 검증한다.

DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = 'fk_tb_user_authrt_map_tb_authrt_info'
  ) THEN
    ALTER TABLE tb_user_authrt_map
      ADD CONSTRAINT fk_tb_user_authrt_map_tb_authrt_info
      FOREIGN KEY (authrt_id) REFERENCES tb_authrt_info (authrt_cd) NOT VALID;
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = 'fk_tb_role_hierarchy_tb_authrt_info_higher'
  ) THEN
    ALTER TABLE tb_role_hierarchy
      ADD CONSTRAINT fk_tb_role_hierarchy_tb_authrt_info_higher
      FOREIGN KEY (higher_authrt) REFERENCES tb_authrt_info (authrt_cd) NOT VALID;
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = 'fk_tb_role_hierarchy_tb_authrt_info_lower'
  ) THEN
    ALTER TABLE tb_role_hierarchy
      ADD CONSTRAINT fk_tb_role_hierarchy_tb_authrt_info_lower
      FOREIGN KEY (lower_authrt) REFERENCES tb_authrt_info (authrt_cd) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_tb_user_authrt_map_authrt_id
  ON tb_user_authrt_map (authrt_id);
CREATE INDEX IF NOT EXISTS ix_tb_role_hierarchy_lower_authrt
  ON tb_role_hierarchy (lower_authrt);

DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1
        FROM tb_user_authrt_map child
       WHERE NOT EXISTS (
           SELECT 1 FROM tb_authrt_info parent
            WHERE parent.authrt_cd = child.authrt_id
       )
  ) THEN
    ALTER TABLE tb_user_authrt_map
      VALIDATE CONSTRAINT fk_tb_user_authrt_map_tb_authrt_info;
  END IF;

  IF NOT EXISTS (
      SELECT 1
        FROM tb_role_hierarchy child
       WHERE NOT EXISTS (
           SELECT 1 FROM tb_authrt_info parent
            WHERE parent.authrt_cd = child.higher_authrt
       )
  ) THEN
    ALTER TABLE tb_role_hierarchy
      VALIDATE CONSTRAINT fk_tb_role_hierarchy_tb_authrt_info_higher;
  END IF;

  IF NOT EXISTS (
      SELECT 1
        FROM tb_role_hierarchy child
       WHERE NOT EXISTS (
           SELECT 1 FROM tb_authrt_info parent
            WHERE parent.authrt_cd = child.lower_authrt
       )
  ) THEN
    ALTER TABLE tb_role_hierarchy
      VALIDATE CONSTRAINT fk_tb_role_hierarchy_tb_authrt_info_lower;
  END IF;
END $$;
