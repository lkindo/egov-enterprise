-- =====================================================================
-- dev/local/e2e 전용 알려진 자격증명 (운영 flyway locations 에 포함되지 않음)
-- =====================================================================
-- [W0-02] 알려진 비밀번호를 포함하므로 이 파일은 classpath:db/migration 이 아니라
--   classpath:db/seed-dev 에 있다. 적재되는 곳은 다음뿐이다:
--     · application-dev.yml / application-local.yml / application-e2e.yml 의 spring.flyway.locations
--     · docker-compose.yml 의 SPRING_FLYWAY_LOCATIONS 기본값(개발·CI E2E 스택)
--   운영 오버레이(docker-compose.prod.yml)는 locations 를 db/migration 단독으로 되돌린다.
--
-- 비밀번호: 1 (bcrypt) — frontend/e2e/test-credentials.ts 와 결속된다.
--
-- ⚠ 파일명의 'zz' 접두는 필수다. Flyway 는 repeatable 마이그레이션을 description 알파벳 순으로
--   적용하므로, webmaster 행을 만드는 'seed framework' 보다 뒤에 와야 아래 UPDATE 가 대상 행을 찾는다.
--   (순서가 어긋나면 UPDATE 가 0행이 되어 dev 로그인이 조용히 깨진다 — 빈 DB 부팅 로그로 실측 확인할 것.)

-- 관리자: 운영 sentinel('{disabled}...')을 개발용 알려진 비밀번호로 덮어쓴다.
UPDATE tb_user_info
   SET pswd = '{bcrypt}$2a$10$C3g3CUhTf4f0xG1jJ1LYh.zoesF5XjPevWU2Yg8i24.eoiD4uhYxu'
 WHERE esntl_id = 'USRCNFRM_00000000001';

-- 일반 사용자 TEST1
--   E2E 의 auth.setup.ts 는 관리자(webmaster)와 일반 사용자(TEST1) 두 세션을 만든다.
--   공유 OCI DB 에는 TEST1 이 누적돼 있어 로컬은 통과했지만 신규 DB(CI 컨테이너)에서는 401 로 실패했다
--   (2026-07-26 CI 실측: "Backend unreachable for TEST1 (401)"). 빈 DB 에서도 성립하도록 명시 시드한다.
DO $$
DECLARE
    created_user integer;
    legacy_row jsonb;
    target_row jsonb;
BEGIN
INSERT INTO tb_user_info
  (esntl_id, user_id, user_nm, user_type_cd, pswd, user_stts_cd, sbscrb_ymd)
VALUES
  ('USRCNFRM_00000000002', 'TEST1', 'E2E 일반사용자', 'EMP',
   '{bcrypt}$2a$10$C3g3CUhTf4f0xG1jJ1LYh.zoesF5XjPevWU2Yg8i24.eoiD4uhYxu', 'P',
   to_char(CURRENT_DATE, 'YYYYMMDD'))
ON CONFLICT (esntl_id) DO NOTHING;
    GET DIAGNOSTICS created_user = ROW_COUNT;

    IF to_regclass('public.tb_authrt_user_map') IS NULL THEN
        -- 과거 Flyway target 검증은 당시 단일 배정 모델을 유지한다.
        INSERT INTO tb_user_authrt_map(scrty_dcsn_trgt_id,authrt_id,mbr_type_cd,crt_dt)
        VALUES ('USRCNFRM_00000000002','ROLE_USER','USR',CURRENT_TIMESTAMP)
        ON CONFLICT (scrty_dcsn_trgt_id) DO NOTHING;
    ELSIF created_user > 0 THEN
        -- 삭제/회수 이력이 있는 계정은 repeatable 재실행으로 권한을 되살리지 않는다.
        IF EXISTS (SELECT 1 FROM tb_authrt_chg_hstry WHERE scrty_dcsn_trgt_id='USRCNFRM_00000000002') THEN
            RETURN;
        END IF;
        INSERT INTO tb_authrt_user_map
            (scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
        VALUES ('USRCNFRM_00000000002','ROLE_USER','USR','SYSTEM',CURRENT_TIMESTAMP,'SYSTEM',CURRENT_TIMESTAMP);
        SELECT to_jsonb(target) INTO target_row FROM tb_authrt_user_map target
         WHERE scrty_dcsn_trgt_id='USRCNFRM_00000000002' AND authrt_cd='ROLE_USER';
        IF to_regclass('public.tb_user_authrt_map') IS NOT NULL THEN
            INSERT INTO tb_user_authrt_map
                (scrty_dcsn_trgt_id,authrt_id,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt)
            VALUES ('USRCNFRM_00000000002','ROLE_USER','USR','SYSTEM',CURRENT_TIMESTAMP,'SYSTEM',CURRENT_TIMESTAMP);
            SELECT to_jsonb(legacy) INTO legacy_row FROM tb_user_authrt_map legacy
             WHERE scrty_dcsn_trgt_id='USRCNFRM_00000000002';
        END IF;
        INSERT INTO tb_authrt_chg_hstry
            (dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,scrty_dcsn_trgt_id,
             chg_artcl_nm,chg_bfr_cn,chg_aftr_cn,chg_rsn,frst_rgtr_id,crt_dt)
        VALUES ('bootstrap:dev','bootstrap:dev','USER_GROUP','MIGRATE','ROLE_USER','USRCNFRM_00000000002',
            CASE WHEN legacy_row IS NULL THEN 'membership' ELSE 'legacy_membership' END,
            legacy_row::text,target_row::text,'이번 실행에서 새로 만든 bootstrap 계정의 명시 배정; 기존 배정은 재부여하지 않음',
            'SYSTEM',CURRENT_TIMESTAMP);
    END IF;
END $$;

-- 이미 존재하는 TEST1(공유 DB 누적분)의 비밀번호도 개발용으로 정렬한다.
UPDATE tb_user_info
   SET pswd = '{bcrypt}$2a$10$C3g3CUhTf4f0xG1jJ1LYh.zoesF5XjPevWU2Yg8i24.eoiD4uhYxu'
 WHERE esntl_id = 'USRCNFRM_00000000002';
