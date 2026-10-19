-- 2026-10-19 사용자 승인("인터넷서비스안내는 쓰임이 없으면 퇴역") — 인터넷 서비스 안내(ISG) 관리 화면·API 를 걷으며 그 API 에만 묶여 있던
-- 기능 권한 SERVICE_CREATE·DELETE·READ·UPDATE 의 배정을 지운다. 데이터만 바꾼다. 구조 변경은 없다.
--
-- [무엇이 문제인가] SERVICE_* 넷은 /api/v1/admin/system/isg 연산 5개와 화면 /admin/system/isg 의 진입 권한이었다. 같은 변경이 그 화면·API·
-- 원장 항목(권한 원장·화면 권한·권한 묶음)을 걷으므로 배정을 남기면 권한 스냅샷이 원장에 없는 코드를 만나 fail-closed 로 실패해 그 그룹
-- 구성원의 인증이 막히고(AuthorizationSnapshotService), 권한 관리 화면이 그룹의 전체 배정을 저장할 때 '알 수 없는 기능 권한' 으로 거부한다
-- (V2_104·V2_124·V2_130 선례). 2026-10-19 OCI 읽기: 8행(ROLE_ADMIN·ROLE_SYSTEM × 4), tb_intrn_svc 0행, /admin/system/isg 를 가리키는 메뉴 없음.
-- 물리 테이블 tb_intrn_svc 와 그 표준 사전은 남긴다(표 삭제는 별도 스키마 승인). V2_99 스냅샷은 고치지 않는다.
--
-- ① 퇴역의 전제를 먼저 확인하고, 다르면 아무것도 지우지 않고 멈춘다(V2_134 와 같다). 도입 기관이 그 상태를 정리하거나 퇴역을 다시 판단한 뒤
--    다시 적용한다(authorization-cutover-runbook.md '인터넷 서비스 안내 퇴역(V2_135)').
--    · tb_intrn_svc 가 없다 — '쓰임이 없다' 는 전제를 확인할 대상이 없다.
--    · tb_intrn_svc 에 행이 있다 — 누군가 안내를 등록해 쓰고 있다. 화면을 걷으면 그 행을 보거나 고칠 길이 사라진다.
--    · 메뉴 행이 /admin/system/isg(또는 그 아래·쿼리)를 가리킨다 — 같은 릴리스가 그 라우트를 지우므로 적용 뒤 화면이 없는 메뉴가 된다.
--    · SERVICE_* 가 ROLE_ADMIN·ROLE_SYSTEM 의 기능 권한(OPERATION) 밖에 배정돼 있다 — 기관이 따로 내린 배정이다. 이 변경이 판정하지 않는다.
-- ② 배정이 이미 없으면(관리자가 화면에서 회수한 환경) 아무것도 하지 않는다. 그것이 이 변경이 만들려는 상태다.
-- ③ 지운 배정마다 같은 트랜잭션에서 변경 이력(REMOVE)을 남긴다(ADR-0016, V2_130 과 같은 열·값). 되돌리는 원본은 이 이력이다.
-- plcy_ver_no 는 이 변경을 반영한 권한 원장 버전(PermissionCodes.CATALOG_VERSION)이다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
    IF to_regclass('public.tb_intrn_svc') IS NULL THEN
        RAISE EXCEPTION 'V2_135: table tb_intrn_svc is missing — the retirement premise (no stored guidance) cannot be checked';
    END IF;
END
$$;

-- 판정과 반영 사이에 안내·메뉴·배정·이력이 바뀌지 않게 쓰기만 막는다(읽기는 계속된다). 잠금 순서는 앱과 같다(메뉴 → 권한).
LOCK TABLE tb_intrn_svc, tb_menu_info, tb_authrt_grnt_map, tb_authrt_chg_hstry IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_intrn_svc) THEN
        RAISE EXCEPTION 'V2_135: tb_intrn_svc has stored guidance rows — review them before retiring the screen';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_menu_info
                WHERE modern_route = '/admin/system/isg'
                   OR modern_route LIKE '/admin/system/isg/%'
                   OR modern_route LIKE '/admin/system/isg?%') THEN
        RAISE EXCEPTION 'V2_135: a menu row points at the retired route /admin/system/isg';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_authrt_grnt_map
                WHERE authrt_grnt_cd IN ('SERVICE_CREATE', 'SERVICE_DELETE', 'SERVICE_READ', 'SERVICE_UPDATE')
                  AND NOT (authrt_type_cd = 'OPERATION' AND authrt_cd IN ('ROLE_ADMIN', 'ROLE_SYSTEM'))) THEN
        RAISE EXCEPTION 'V2_135: SERVICE_* is granted outside the ROLE_ADMIN and ROLE_SYSTEM operation grants — review that grant before retiring it';
    END IF;
END
$$;

WITH removed AS (
    DELETE FROM tb_authrt_grnt_map
     WHERE authrt_type_cd = 'OPERATION'
       AND authrt_cd IN ('ROLE_ADMIN', 'ROLE_SYSTEM')
       AND authrt_grnt_cd IN ('SERVICE_CREATE', 'SERVICE_DELETE', 'SERVICE_READ', 'SERVICE_UPDATE')
    RETURNING authrt_cd, authrt_grnt_cd
)
INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,
    authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)
SELECT 'migration:2.135', 'df0b0b15c8a02001d8b874379264b7cda47b6443d336361d755fe27d4ba35adc',
       'GROUP_GRANT', 'REMOVE', authrt_cd, 'OPERATION', authrt_grnt_cd,
       'grant', authrt_grnt_cd, NULL, '2026-10-19 사용자 승인: 인터넷 서비스 안내 퇴역', 'SYSTEM', CURRENT_TIMESTAMP
  FROM removed;
