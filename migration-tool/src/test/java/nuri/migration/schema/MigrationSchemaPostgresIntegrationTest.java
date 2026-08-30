package nuri.migration.schema;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class MigrationSchemaPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void versionedBootstrapIsPostgresqlCompatible() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        dataSource.setDriverClassName(POSTGRES.getDriverClassName());
        JdbcTemplate target = new JdbcTemplate(dataSource);

        new MigrationSchemaManager().migrateAndValidate(target);

        assertThat(target.queryForObject(
                "SELECT count(*) FROM information_schema.tables "
                        + "WHERE table_schema='migration_control' AND table_name LIKE 'tb_migration_%'",
                Long.class)).isEqualTo(4L);
        assertThat(target.queryForObject(
                "SELECT count(*) FROM migration_control.\"tb_migration_schema_history\" "
                        + "WHERE \"version\"='1' AND \"success\"=true", Long.class)).isEqualTo(1L);
    }
}
