package nuri.migration.schema;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class MigrationRuntimeSchemaIsolationTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    @Test
    void runtimeObjectsAreCreatedOnlyInTheDedicatedControlSchema() {
        JdbcTemplate target = h2();
        target.execute("CREATE TABLE public.tb_application_probe (id bigint primary key)");

        new MigrationSchemaManager().migrateAndValidate(target);

        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_KEY_MAP")).isEqualTo(1);
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_RUN")).isEqualTo(1);
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_CHECKPOINT")).isEqualTo(1);
        assertThat(tableCount(target, "MIGRATION_CONTROL", "TB_MIGRATION_SCHEMA_HISTORY")).isEqualTo(1);
        assertThat(tableCount(target, "PUBLIC", "TB_MIGRATION_KEY_MAP")).isZero();
        assertThat(tableCount(target, "PUBLIC", "TB_APPLICATION_PROBE")).isEqualTo(1);
    }

    private static int tableCount(JdbcTemplate jdbc, String schema, String table) {
        Integer value = jdbc.queryForObject(
                "SELECT count(*) FROM information_schema.tables "
                        + "WHERE upper(table_schema)=? AND upper(table_name)=?",
                Integer.class, schema, table);
        return value == null ? 0 : value;
    }

    private static JdbcTemplate h2() {
        String name = "runtime_schema_" + SEQUENCE.incrementAndGet();
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:" + name + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        dataSource.setDriverClassName("org.h2.Driver");
        return new JdbcTemplate(dataSource);
    }
}
