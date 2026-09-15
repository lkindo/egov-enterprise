package nuri.migration;

import nuri.migration.model.MappingSpec;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.oracle.OracleContainer;

import java.time.Duration;
import java.util.UUID;

/** Disposable synthetic databases only; no application or deployment credentials. */
@Testcontainers
abstract class OraclePostgresTestSupport {
    @Container
    protected static final OracleContainer ORACLE = new OracleContainer("gvenzl/oracle-free:23-slim-faststart")
            .withUsername("migration_fixture_reader")
            .withPassword(UUID.randomUUID().toString())
            // A bounded cold-start allowance; the Oracle ready condition and JDBC probe remain required.
            .withStartupTimeout(Duration.ofMinutes(5));
    @Container
    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withPassword(UUID.randomUUID().toString());

    @BeforeAll
    static void recordDatabaseVersions() throws Exception {
        try (var source = ORACLE.createConnection(""); var target = POSTGRES.createConnection("")) {
            var original = source.getMetaData();
            var destination = target.getMetaData();
            System.out.printf("Oracle rehearsal: %s %s; JDBC %s; target %s %s%n",
                    original.getDatabaseProductName(), original.getDatabaseProductVersion(), original.getDriverVersion(),
                    destination.getDatabaseProductName(), destination.getDatabaseProductVersion());
        }
    }

    protected static MappingSpec.DbConfig sourceConfig() {
        return new MappingSpec.DbConfig(ORACLE.getJdbcUrl(), ORACLE.getUsername(), ORACLE.getPassword(),
                "oracle.jdbc.OracleDriver", "disposable-oracle-source");
    }

    protected static MappingSpec.DbConfig targetConfig() {
        return new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                "org.postgresql.Driver", "disposable-postgres-target");
    }

    protected static JdbcTemplate sourceJdbc() {
        var config = sourceConfig();
        return new JdbcTemplate(new DriverManagerDataSource(config.url(), config.username(), config.password()));
    }

    protected static JdbcTemplate targetJdbc() {
        var config = targetConfig();
        return new JdbcTemplate(new DriverManagerDataSource(config.url(), config.username(), config.password()));
    }
}
