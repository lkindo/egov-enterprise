-- DEC-OPS-129: 네트워크 모니터링을 퇴역하며 권한 코드 NETWORK_READ·CREATE·UPDATE·DELETE 를 원장에서 걷는다.
-- 기존 DB 에 남은 기능 권한 배정을 지운다. 남기면 권한 관리 화면이 그룹의 전체 배정을 저장할 때
-- '알 수 없는 기능 권한' 으로 거부해 관리자 그룹 권한을 고칠 수 없게 된다.
-- 지운 배정마다 같은 트랜잭션에서 변경 이력(REMOVE)을 남긴다(ADR-0016). V2_99 스냅샷은 고치지 않는다.
-- plcy_ver_no 는 이 변경을 반영한 권한 원장 버전(PermissionCodes.CATALOG_VERSION)이다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE tb_authrt_grnt_map, tb_authrt_chg_hstry IN SHARE ROW EXCLUSIVE MODE;

WITH removed AS (
    DELETE FROM tb_authrt_grnt_map
     WHERE authrt_type_cd = 'OPERATION'
       AND authrt_grnt_cd IN ('NETWORK_CREATE', 'NETWORK_DELETE', 'NETWORK_READ', 'NETWORK_UPDATE')
    RETURNING authrt_cd, authrt_grnt_cd
)
INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,
    authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)
SELECT 'migration:2.104', '2018e2ac0b35aff500980778235a9f04da0b0ab77b40a882f18d7d54fa94153f',
       'GROUP_GRANT', 'REMOVE', authrt_cd, 'OPERATION', authrt_grnt_cd,
       'grant', authrt_grnt_cd, NULL, 'DEC-OPS-129: 네트워크 모니터링 퇴역', 'SYSTEM', CURRENT_TIMESTAMP
  FROM removed;
