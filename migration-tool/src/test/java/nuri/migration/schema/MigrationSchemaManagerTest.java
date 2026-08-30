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
