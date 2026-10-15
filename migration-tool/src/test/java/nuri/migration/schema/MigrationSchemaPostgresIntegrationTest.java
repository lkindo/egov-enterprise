package nuri.migration.schema;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
class MigrationSchemaPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:17-alpine");

    private JdbcTemplate target;

    @BeforeEach
    void cleanControlSchema() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        dataSource.setDriverClassName(POSTGRES.getDriverClassName());
        target = new JdbcTemplate(dataSource);
        target.execute("DROP SCHEMA IF EXISTS migration_control CASCADE");
    }

    @Test
    void versionedBootstrapIsPostgresqlCompatible() {
        MigrationSchemaManager manager = new MigrationSchemaManager();
        assertThat(manager.inspect(target)).isEqualTo(new MigrationSchemaManager.ControlSchemaStatus(null, false));

        manager.migrateAndValidate(target);

        assertThat(target.queryForObject(
                "SELECT count(*) FROM information_schema.tables "
                        + "WHERE table_schema='migration_control' AND table_name LIKE 'tb_migration_%'",
                Long.class)).isEqualTo(4L);
        assertThat(target.queryForObject(
                "SELECT count(*) FROM migration_control.\"tb_migration_schema_history\" "
                        + "WHERE \"version\"='1' AND \"success\"=true", Long.class)).isEqualTo(1L);
        assertThat(ControlSchemaFixtures.appliedVersion(target)).isEqualTo("2");
        assertThat(manager.inspect(target)).isEqualTo(new MigrationSchemaManager.ControlSchemaStatus("2", false));
    }

    /**
     * [ADR-0029 L3c] V1 이력이 있는 대상은 확인 없이 올리지 않는다. 확인하면 한 트랜잭션 안에서 기존 checkpoint 를 기본
     * 매핑('')으로 채우고 PK·대상 키 색인을 매핑 단위로 다시 만든 뒤 DEFAULT 를 지운다.
     */
    @Test
    void v1RowsArePreservedAsTheDefaultMappingAndTheKeyIsRebuiltPerMapping() {
        ControlSchemaFixtures.createV1(target, "migration_control");
        target.update("INSERT INTO migration_control.tb_migration_checkpoint (run_id, source_namespace, source_table,"
                + " source_key, target_table, target_key, row_checksum) VALUES ('run', 'ns', 'legacy_user', '1',"
                + " 'tb_user', 'U1', 'sum')");
        MigrationSchemaManager manager = new MigrationSchemaManager();

        assertThatThrownBy(() -> manager.migrateAndValidate(target))
                .isInstanceOf(MigrationSchemaManager.ControlSchemaUpgradeRequired.class);
        assertThat(ControlSchemaFixtures.appliedVersion(target)).isEqualTo("1");
        assertThat(ControlSchemaFixtures.checkpointHasColumn(target, "mapping_id")).isFalse();

        manager.migrateAndValidate(target, true);

        assertThat(ControlSchemaFixtures.appliedVersion(target)).isEqualTo("2");
        assertThat(target.queryForObject("SELECT mapping_id FROM migration_control.tb_migration_checkpoint"
                + " WHERE source_key='1'", String.class)).isEmpty();
        assertThat(ControlSchemaFixtures.checkpointPrimaryKey(target)).containsExactly(
                "run_id", "source_namespace", "source_table", "mapping_id", "source_key");
        assertThat(target.queryForObject("SELECT column_default FROM information_schema.columns"
                + " WHERE table_schema='migration_control' AND table_name='tb_migration_checkpoint'"
                + " AND column_name='mapping_id'", String.class)).isNull();
        assertThat(target.queryForObject("SELECT indexdef FROM pg_indexes WHERE schemaname='migration_control'"
                + " AND indexname='ix_migration_checkpoint_target'", String.class))
                .contains("(run_id, source_namespace, source_table, mapping_id, target_key)");
        assertThatThrownBy(() -> target.update("INSERT INTO migration_control.tb_migration_checkpoint (run_id,"
                + " source_namespace, source_table, source_key, target_table, target_key, row_checksum) VALUES"
                + " ('run', 'ns', 'legacy_user', '2', 'tb_user', 'U2', 'sum')"))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("mapping_id");
    }
}
