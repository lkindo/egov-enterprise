-- MANUAL RELEASE CUTOVER ONLY. Not a Flyway startup migration.
-- Stop every old/new writer, verify the approved backup restore and effective-policy comparison,
-- then bind the three evidence settings described in authorization-cutover-runbook.md.
-- A single DO statement makes all checks, six drops and the audit insert atomic even in autocommit.
-- Do not use CASCADE: an unexpected dependency must roll back the complete contract.
DO $authorization_contract$
DECLARE
    evidence text := current_setting('app.authorization_cutover_evidence',true);
    backup_digest text := current_setting('app.authorization_backup_sha256',true);
    catalog_version text := current_setting('app.authorization_catalog_version',true);
    legacy_name text;
    source_count bigint;
    snapshot_count bigint;
    snapshot_diff boolean;
BEGIN
    IF coalesce(evidence,'') !~ '^[0-9a-f]{64}$'
       OR coalesce(backup_digest,'') !~ '^[0-9a-f]{64}$'
       OR coalesce(catalog_version,'') !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Authorization cutover requires approved evidence, restored backup and catalog SHA-256';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version='2.98' AND success)
       OR NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version='2.99' AND success) THEN
        RAISE EXCEPTION 'Authorization cutover requires successful V2_98 expansion and V2_99 operation seed';
    END IF;

    PERFORM set_config('lock_timeout','5s',true);
    LOCK TABLE tb_user_authrt_map,tb_authrt_role_map,tb_menu_crt_dtl,tb_role_prgrm_map,
               tb_role_hierarchy,tb_role_info,tb_authrt_info,tb_authrt_user_map,tb_authrt_grnt_map,
               tb_authrt_chg_hstry,tb_menu_info,tb_prgrm_lst,tb_user_info IN ACCESS EXCLUSIVE MODE NOWAIT;

    -- A new application must not have accepted writes before this barrier is crossed.
    IF EXISTS (SELECT 1 FROM tb_authrt_chg_hstry WHERE chg_type_cd <> 'MIGRATE') THEN
        RAISE EXCEPTION 'New authorization writes already exist: review cutover and rollback compatibility';
    END IF;
    IF EXISTS (
        (SELECT scrty_dcsn_trgt_id,authrt_id,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt FROM tb_user_authrt_map
         EXCEPT
         SELECT scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt FROM tb_authrt_user_map)
        UNION ALL
        (SELECT scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt FROM tb_authrt_user_map
         EXCEPT
         SELECT scrty_dcsn_trgt_id,authrt_id,mbr_type_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt FROM tb_user_authrt_map)
    ) THEN
        RAISE EXCEPTION 'Authorization membership drift after expansion; resynchronize and revalidate before cutover';
    END IF;
    IF EXISTS (
        (SELECT authrt_cd,menu_sn::text,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt FROM tb_menu_crt_dtl
         EXCEPT
         SELECT authrt_cd,authrt_grnt_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt
         FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION')
        UNION ALL
        (SELECT authrt_cd,authrt_grnt_cd,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt
         FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION'
         EXCEPT
         SELECT authrt_cd,menu_sn::text,frst_rgtr_id,crt_dt,last_mdfr_id,mdfcn_dt FROM tb_menu_crt_dtl)
    ) THEN
        RAISE EXCEPTION 'Navigation grant drift after expansion; resynchronize and revalidate before cutover';
    END IF;
    -- Retain and compare complete legacy rows, including mapng_crt_id and audit columns.
    IF EXISTS (
        SELECT to_jsonb(legacy) FROM tb_user_authrt_map legacy
        EXCEPT SELECT chg_bfr_cn::jsonb FROM tb_authrt_chg_hstry
         WHERE dmnd_idntfr IN ('migration:2.98','bootstrap:framework','bootstrap:dev') AND chg_artcl_nm='legacy_membership'
    ) OR (SELECT count(*) FROM tb_user_authrt_map) <>
         (SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr IN ('migration:2.98','bootstrap:framework','bootstrap:dev') AND chg_artcl_nm='legacy_membership') THEN
        RAISE EXCEPTION 'Legacy membership snapshot mismatch';
    END IF;
    IF EXISTS (
        SELECT to_jsonb(legacy) FROM tb_menu_crt_dtl legacy
        EXCEPT SELECT chg_bfr_cn::jsonb FROM tb_authrt_chg_hstry
         WHERE dmnd_idntfr='migration:2.98' AND chg_artcl_nm='legacy_menu_mapping'
    ) OR (SELECT count(*) FROM tb_menu_crt_dtl) <>
         (SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr='migration:2.98' AND chg_artcl_nm='legacy_menu_mapping') THEN
        RAISE EXCEPTION 'Legacy menu mapping snapshot mismatch';
    END IF;

    FOREACH legacy_name IN ARRAY ARRAY['tb_role_info','tb_authrt_role_map','tb_role_prgrm_map','tb_role_hierarchy']
    LOOP
        EXECUTE format('SELECT count(*) FROM %I',legacy_name) INTO source_count;
        SELECT count(*) INTO snapshot_count FROM tb_authrt_chg_hstry
         WHERE dmnd_idntfr='migration:2.99' AND plcy_ver_no=catalog_version
           AND chg_artcl_nm='legacy_policy:' || legacy_name;
        EXECUTE format('SELECT EXISTS (SELECT to_jsonb(legacy) FROM %I legacy EXCEPT '
            'SELECT chg_bfr_cn::jsonb FROM tb_authrt_chg_hstry '
            'WHERE dmnd_idntfr=''migration:2.99'' AND plcy_ver_no=$1 AND chg_artcl_nm=$2)',legacy_name)
            INTO snapshot_diff USING catalog_version,'legacy_policy:' || legacy_name;
        IF source_count <> snapshot_count OR snapshot_diff THEN
            RAISE EXCEPTION 'Legacy policy changed after reviewed seed: %',legacy_name;
        END IF;
    END LOOP;

    SELECT count(*) INTO source_count FROM (
        SELECT DISTINCT program.prgrm_file_nm,program.url FROM tb_prgrm_lst program
        JOIN tb_role_prgrm_map mapping USING(prgrm_file_nm)
    ) legacy;
    SELECT count(*) INTO snapshot_count FROM tb_authrt_chg_hstry
     WHERE dmnd_idntfr='migration:2.99' AND plcy_ver_no=catalog_version
       AND chg_artcl_nm='legacy_policy:program_url';
    IF source_count <> snapshot_count OR EXISTS (
        SELECT to_jsonb(legacy) FROM (
            SELECT DISTINCT program.prgrm_file_nm,program.url FROM tb_prgrm_lst program
            JOIN tb_role_prgrm_map mapping USING(prgrm_file_nm)
        ) legacy
        EXCEPT SELECT chg_bfr_cn::jsonb FROM tb_authrt_chg_hstry
         WHERE dmnd_idntfr='migration:2.99' AND plcy_ver_no=catalog_version
           AND chg_artcl_nm='legacy_policy:program_url'
    ) THEN
        RAISE EXCEPTION 'Legacy program URL changed after reviewed seed';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION')
       OR (SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION') <>
          (SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr='migration:2.99'
            AND plcy_ver_no=catalog_version AND chg_type_cd='MIGRATE' AND chg_trgt_type_cd='GROUP_GRANT'
            AND authrt_type_cd='OPERATION')
       OR EXISTS (
           SELECT authrt_cd,authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION'
           EXCEPT SELECT authrt_cd,authrt_grnt_cd FROM tb_authrt_chg_hstry
            WHERE dmnd_idntfr='migration:2.99' AND plcy_ver_no=catalog_version
              AND chg_type_cd='MIGRATE' AND chg_trgt_type_cd='GROUP_GRANT' AND authrt_type_cd='OPERATION'
       ) THEN
        RAISE EXCEPTION 'Operation grants differ from the reviewed catalog seed and audit';
    END IF;

    DROP TABLE tb_menu_crt_dtl;
    DROP TABLE tb_user_authrt_map;
    DROP TABLE tb_authrt_role_map;
    DROP TABLE tb_role_prgrm_map;
    DROP TABLE tb_role_hierarchy;
    DROP TABLE tb_role_info;

    INSERT INTO tb_authrt_chg_hstry
        (dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,chg_artcl_nm,
         chg_bfr_cn,chg_aftr_cn,chg_rsn,frst_rgtr_id,crt_dt)
    VALUES ('contract:' || substr(evidence,1,32),catalog_version,'GROUP','UPDATE','ROLE_ADMIN',
        'legacy_authorization_contract',
        'tb_user_authrt_map,tb_authrt_role_map,tb_menu_crt_dtl,tb_role_prgrm_map,tb_role_hierarchy,tb_role_info',
        'tb_authrt_info,tb_authrt_user_map,tb_authrt_grnt_map,tb_authrt_chg_hstry',
        'evidence_sha256=' || evidence || ';restored_backup_sha256=' || backup_digest,'SYSTEM',CURRENT_TIMESTAMP);
END $authorization_contract$;
