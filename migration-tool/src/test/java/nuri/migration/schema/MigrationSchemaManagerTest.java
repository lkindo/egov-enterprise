package nuri.migration.schema;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MigrationSchemaManagerTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    @Test
    void versionedBootstrapCreatesAllRuntimeTablesAndDedicatedHistory() {
        JdbcTemplate target = h2("bootstrap");

        new MigrationSchemaManager().migrateAndValidate(target);
        new MigrationSchemaManager().migrateAndValidate(target);

        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_KEY_MAP")).isEqualTo(1);
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_RUN")).isEqualTo(1);
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_CHECKPOINT")).isEqualTo(1);
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_SCHEMA_HISTORY")).isEqualTo(1);
        assertThat(target.queryForObject(
                "SELECT count(*) FROM migration_control.\"tb_migration_schema_history\" "
                        + "WHERE \"version\"='1' AND \"success\"=true", Long.class))
                .isEqualTo(1L);
    }

    @Test
    void legacyThreeColumnKeyMapFailsBeforeFlywayOrAnyStateTableWrite() {
        JdbcTemplate target = h2("legacy");
        target.execute("CREATE TABLE tb_migration_key_map ("
                + "source_table varchar(128) NOT NULL, legacy_key varchar(256) NOT NULL, "
                + "new_key varchar(256) NOT NULL, PRIMARY KEY (source_table, legacy_key))");

        assertThatThrownBy(() -> new MigrationSchemaManager().migrateAndValidate(target))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("legacy 3-column", "run_id", "source_namespace");

        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_SCHEMA_HISTORY")).isZero();
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_RUN")).isZero();
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_CHECKPOINT")).isZero();
    }

    @Test
    void currentRuntimeTableOutsideControlSchemaFailsBeforeCreatingNewState() {
        JdbcTemplate target = h2("existing_current");
        target.execute("CREATE TABLE public.tb_migration_run ("
                + "run_id varchar(128) NOT NULL, source_namespace varchar(128) NOT NULL, "
                + "run_stts_cd varchar(20) NOT NULL, frst_reg_dt timestamp NOT NULL, "
                + "last_mdfcn_dt timestamp NOT NULL, PRIMARY KEY (run_id, source_namespace))");

        assertThatThrownBy(() -> new MigrationSchemaManager().migrateAndValidate(target))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PUBLIC.TB_MIGRATION_RUN", "migration_control", "전환");

        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_SCHEMA_HISTORY")).isZero();
        assertThat(tableCount(target, "PUBLIC", "TB_MIGRATION_RUN")).isEqualTo(1);
    }

    /**
     * [ADR-0029 L3c] 이전 도구가 남긴 V1 제어 스키마 — 확인 없이는 올리지 않고, 확인하면 기존 checkpoint 를 기본 매핑('')으로
     * 채운 채 PK 를 매핑 단위로 다시 만든다. 채운 뒤에는 mapping_id 를 빠뜨린 INSERT 가 실패한다.
     */
    @Test
    void existingV1ControlSchemaIsUpgradedOnlyWithAcknowledgementAndKeepsItsCheckpointsAsTheDefaultMapping() {
        JdbcTemplate target = h2("v1_upgrade");
        ControlSchemaFixtures.createV1(target, "MIGRATION_CONTROL");
        target.update("INSERT INTO migration_control.tb_migration_checkpoint (run_id, source_namespace, source_table,"
                + " source_key, target_table, target_key, row_checksum) VALUES ('run', 'ns', 'legacy_user', '1',"
                + " 'tb_user', 'U1', 'sum')");
        MigrationSchemaManager manager = new MigrationSchemaManager();

        assertThat(manager.inspect(target)).isEqualTo(new MigrationSchemaManager.ControlSchemaStatus("1", true));
        assertThatThrownBy(() -> manager.migrateAndValidate(target))
                .isInstanceOf(MigrationSchemaManager.ControlSchemaUpgradeRequired.class)
                .hasMessageContaining("버전 1", "--ack-control-schema-upgrade", "CONTROL_SCHEMA_UPGRADE_UNACKNOWLEDGED");
        assertThat(ControlSchemaFixtures.appliedVersion(target)).isEqualTo("1");
        assertThat(ControlSchemaFixtures.checkpointHasColumn(target, "mapping_id")).isFalse();

        manager.migrateAndValidate(target, true);

        assertThat(ControlSchemaFixtures.appliedVersion(target)).isEqualTo("2");
        assertThat(manager.inspect(target)).isEqualTo(new MigrationSchemaManager.ControlSchemaStatus("2", false));
        assertThat(target.queryForObject("SELECT mapping_id FROM migration_control.tb_migration_checkpoint"
                + " WHERE source_key='1'", String.class)).isEmpty();
        assertThat(target.queryForObject("SELECT row_checksum FROM migration_control.tb_migration_checkpoint"
                + " WHERE source_key='1'", String.class)).isEqualTo("sum");
        assertThat(ControlSchemaFixtures.checkpointPrimaryKey(target)).containsExactly(
                "run_id", "source_namespace", "source_table", "mapping_id", "source_key");
        // 같은 소스 키를 다른 매핑이 기록할 수 있다. mapping_id 를 빠뜨리면 DEFAULT 가 없어 실패한다.
        target.update("INSERT INTO migration_control.tb_migration_checkpoint (run_id, source_namespace, source_table,"
                + " mapping_id, source_key, target_table, target_key, row_checksum) VALUES ('run', 'ns', 'legacy_user',"
                + " 'detail', '1', 'tb_user_detail', 'U1', 'sum')");
        assertThatThrownBy(() -> target.update("INSERT INTO migration_control.tb_migration_checkpoint (run_id,"
                + " source_namespace, source_table, source_key, target_table, target_key, row_checksum) VALUES"
                + " ('run', 'ns', 'legacy_user', '2', 'tb_user', 'U2', 'sum')"))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
    }

    @Test
    void freshTargetIsCreatedAtTheCurrentVersionWithoutAcknowledgement() {
        JdbcTemplate target = h2("fresh");
        MigrationSchemaManager manager = new MigrationSchemaManager();

        assertThat(manager.inspect(target)).isEqualTo(new MigrationSchemaManager.ControlSchemaStatus(null, false));
        manager.migrateAndValidate(target);

        assertThat(manager.inspect(target)).isEqualTo(new MigrationSchemaManager.ControlSchemaStatus("2", false));
        assertThat(ControlSchemaFixtures.checkpointPrimaryKey(target)).contains("mapping_id");
    }

    /** 이력 없이 checkpoint 표만 있는 대상도 이미 있는 상태다 — 확인 없이 PK 를 다시 만들지 않는다. */
    @Test
    void checkpointTableWithoutHistoryAlsoNeedsAcknowledgement() {
        JdbcTemplate target = h2("no_history");
        target.execute("CREATE SCHEMA migration_control");
        target.execute("CREATE TABLE migration_control.tb_migration_checkpoint (run_id varchar(128) NOT NULL,"
                + " source_namespace varchar(128) NOT NULL, source_table varchar(128) NOT NULL,"
                + " source_key varchar(256) NOT NULL, target_table varchar(128) NOT NULL,"
                + " target_key varchar(256) NOT NULL, row_checksum varchar(64) NOT NULL,"
                + " frst_reg_dt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,"
                + " CONSTRAINT pk_tb_migration_checkpoint PRIMARY KEY (run_id, source_namespace, source_table, source_key))");

        assertThat(new MigrationSchemaManager().inspect(target).upgradeRequired()).isTrue();
        assertThatThrownBy(() -> new MigrationSchemaManager().migrateAndValidate(target))
                .isInstanceOf(MigrationSchemaManager.ControlSchemaUpgradeRequired.class)
                .hasMessageContaining("이력 없음");
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_SCHEMA_HISTORY")).isZero();
    }

    private static int tableCount(JdbcTemplate jdbc, String schema, String table) {
        Integer value = jdbc.queryForObject(
                "SELECT count(*) FROM information_schema.tables "
                        + "WHERE upper(table_schema)=? AND upper(table_name)=?",
                Integer.class, schema, table);
        return value == null ? 0 : value;
    }

    private static JdbcTemplate h2(String prefix) {
        String name = prefix + "_schema_" + SEQ.incrementAndGet();
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:" + name + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        dataSource.setDriverClassName("org.h2.Driver");
        return new JdbcTemplate(dataSource);
    }
}
