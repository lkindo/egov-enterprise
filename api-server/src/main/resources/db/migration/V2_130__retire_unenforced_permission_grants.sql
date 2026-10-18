-- 2026-10-18 집행 지점 없는 권한 퇴역(ADR-0034) — 비공식결재(ISM) API 를 걷으며 그 API 에만 묶여 있던 기능 권한
-- INFORMAL_* 10개와, 쓰기 경로가 없어 집행 지점이 없던 기관코드 쓰기 권한 INST_CODE_CREATE·UPDATE·DELETE 를 원장에서 뺀다.
-- 데이터만 바꾼다. 구조 변경은 없다. 다시 실행해도 결과가 같다.
--
-- ① INFORMAL_*(APPROVE·APPR_ADMIN·CREATE·CREATE_ALL·DELETE·DELETE_ALL·READ·READ_ALL·UPDATE·UPDATE_ALL)는
--    /api/v1/informal-sanctions 와 별칭 /api/v1/admin/system/ism 의 진입 권한이었다. 결재 화면(/approvals)은 같은
--    InformalSanctionService 를 APPROVAL_* 권한의 결재 API 로 부르고, 화면 별칭 /admin/system/ism 은 /approvals 로 보낸다.
--    그래서 이 배정을 지워도 결재 화면에서 할 수 있는 일은 바뀌지 않는다. APPROVAL_* 를 묵시로 주지 않는다(H3).
--    2026-10-18 OCI 읽기: 25행(ROLE_ADMIN 10, ROLE_SYSTEM 10, ROLE_USER 5).
-- ② INST_CODE_CREATE·UPDATE·DELETE 는 2026-10-07 기관코드 원장 쓰기 경로를 걷은 뒤 어느 연산도 요구하지 않았다
--    (GAP-CODE-001). 조회(INST_CODE_READ)와 수신 반영(INST_CODE_IMPORT)은 그대로 둔다.
--    2026-10-18 OCI 읽기: 6행(ROLE_ADMIN·ROLE_SYSTEM × 3).
-- ③ 남기면 권한 스냅샷이 원장에 없는 코드를 만나 fail-closed 로 실패해 그 그룹 구성원의 인증이 막히고
--    (AuthorizationSnapshotService), 권한 관리 화면이 그룹의 전체 배정을 저장할 때 '알 수 없는 기능 권한' 으로 거부한다
--    (V2_104·V2_124 선례). 지운 배정마다 같은 트랜잭션에서 변경 이력(REMOVE)을 남긴다(ADR-0016). V2_99 스냅샷은 고치지 않는다.
-- plcy_ver_no 는 이 변경을 반영한 권한 원장 버전(PermissionCodes.CATALOG_VERSION)이다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 지우는 동안 배정·이력이 바뀌지 않게 쓰기만 막는다(읽기는 계속된다). V2_124 와 같은 순서(배정 → 이력)로 잠근다.
LOCK TABLE tb_authrt_grnt_map, tb_authrt_chg_hstry IN SHARE ROW EXCLUSIVE MODE;

WITH removed AS (
    DELETE FROM tb_authrt_grnt_map
     WHERE authrt_type_cd = 'OPERATION'
       AND authrt_grnt_cd IN ('INFORMAL_APPROVE', 'INFORMAL_APPR_ADMIN', 'INFORMAL_CREATE', 'INFORMAL_CREATE_ALL',
                              'INFORMAL_DELETE', 'INFORMAL_DELETE_ALL', 'INFORMAL_READ', 'INFORMAL_READ_ALL',
                              'INFORMAL_UPDATE', 'INFORMAL_UPDATE_ALL')
    RETURNING authrt_cd, authrt_grnt_cd
)
INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,
    authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)
SELECT 'migration:2.130', '844153f6fe17e8912bc3c08f40ce272ef89730d03380be04b0cd4f8254f868aa',
       'GROUP_GRANT', 'REMOVE', authrt_cd, 'OPERATION', authrt_grnt_cd,
       'grant', authrt_grnt_cd, NULL, 'DEC-OPS-348: 비공식결재 API 퇴역', 'SYSTEM', CURRENT_TIMESTAMP
  FROM removed;

WITH removed AS (
    DELETE FROM tb_authrt_grnt_map
     WHERE authrt_type_cd = 'OPERATION'
       AND authrt_grnt_cd IN ('INST_CODE_CREATE', 'INST_CODE_DELETE', 'INST_CODE_UPDATE')
    RETURNING authrt_cd, authrt_grnt_cd
)
INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,
    authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)
SELECT 'migration:2.130', '844153f6fe17e8912bc3c08f40ce272ef89730d03380be04b0cd4f8254f868aa',
       'GROUP_GRANT', 'REMOVE', authrt_cd, 'OPERATION', authrt_grnt_cd,
       'grant', authrt_grnt_cd, NULL, 'DEC-OPS-349: 집행 지점 없는 기관코드 쓰기 권한 퇴역', 'SYSTEM', CURRENT_TIMESTAMP
  FROM removed;
