-- [ADR-0029 L3c, DEC-OPS-319] checkpoint 를 매핑 단위로 기록한다. 한 소스 표를 여러 대상으로 나눈 매핑은 같은 소스 키를
-- 매핑마다 따로 기록하고 따로 재개한다. keymap 은 소스 표 단위 그대로다(소스마다 keymap 을 만드는 매핑은 하나).
-- 기존 행은 기본 매핑('')으로 채운다. 채운 뒤 DEFAULT 를 지워 mapping_id 를 빠뜨린 INSERT 가 바로 실패하게 한다.
-- V1 이 만든 이름과 다른 PK 를 가진 표면 DROP CONSTRAINT 가 실패해 적용이 멈춘다(fail-closed).
-- 이미 있는 제어 스키마를 이 버전으로 올리는 적재는 --ack-control-schema-upgrade 없이는 시작하지 않는다.
ALTER TABLE migration_control.tb_migration_checkpoint
    ADD COLUMN mapping_id varchar(128) NOT NULL DEFAULT '';

ALTER TABLE migration_control.tb_migration_checkpoint
    DROP CONSTRAINT pk_tb_migration_checkpoint;

ALTER TABLE migration_control.tb_migration_checkpoint
    ADD CONSTRAINT pk_tb_migration_checkpoint
        PRIMARY KEY (run_id, source_namespace, source_table, mapping_id, source_key);

ALTER TABLE migration_control.tb_migration_checkpoint
    ALTER COLUMN mapping_id DROP DEFAULT;

DROP INDEX IF EXISTS migration_control.ix_migration_checkpoint_target;

CREATE INDEX ix_migration_checkpoint_target
    ON migration_control.tb_migration_checkpoint (run_id, source_namespace, source_table, mapping_id, target_key);
