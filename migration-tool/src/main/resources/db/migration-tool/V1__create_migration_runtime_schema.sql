CREATE TABLE IF NOT EXISTS migration_control.tb_migration_key_map (
    run_id varchar(128) NOT NULL,
    source_namespace varchar(128) NOT NULL,
    source_table varchar(128) NOT NULL,
    legacy_key varchar(256) NOT NULL,
    new_key varchar(256) NOT NULL,
    CONSTRAINT pk_tb_migration_key_map
        PRIMARY KEY (run_id, source_namespace, source_table, legacy_key)
);

CREATE TABLE IF NOT EXISTS migration_control.tb_migration_run (
    run_id varchar(128) NOT NULL,
    source_namespace varchar(128) NOT NULL,
    run_stts_cd varchar(20) NOT NULL,
    frst_reg_dt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_mdfcn_dt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_tb_migration_run PRIMARY KEY (run_id, source_namespace)
);

CREATE TABLE IF NOT EXISTS migration_control.tb_migration_checkpoint (
    run_id varchar(128) NOT NULL,
    source_namespace varchar(128) NOT NULL,
    source_table varchar(128) NOT NULL,
    source_key varchar(256) NOT NULL,
    target_table varchar(128) NOT NULL,
    target_key varchar(256) NOT NULL,
    row_checksum varchar(64) NOT NULL,
    frst_reg_dt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_tb_migration_checkpoint
        PRIMARY KEY (run_id, source_namespace, source_table, source_key)
);

CREATE INDEX IF NOT EXISTS ix_migration_checkpoint_target
    ON migration_control.tb_migration_checkpoint (run_id, source_namespace, source_table, target_key);
