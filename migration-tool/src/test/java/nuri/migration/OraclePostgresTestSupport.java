package nuri.migration;

import nuri.migration.model.MappingSpec;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.JdbcDatabaseContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.oracle.OracleContainer;

import java.time.Duration;
import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Disposable synthetic databases only; no application or deployment credentials. */
@Testcontainers
abstract class OraclePostgresTestSupport {
    protected static final JdbcDatabaseContainer<?> ORACLE = oracleFixture();
    @Container
    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withPassword(UUID.randomUUID().toString());

    @BeforeAll
    static void recordDatabaseVersions() throws Exception {
        ORACLE.start();
        try (var source = ORACLE.createConnection(""); var target = POSTGRES.createConnection("")) {
            var original = source.getMetaData();
            var destination = target.getMetaData();
            if (ORACLE instanceof Oracle19cContainer oracle19c) {
                assertThat(original.getDatabaseProductName()).isEqualTo("Oracle");
                assertThat(original.getDatabaseMajorVersion()).isEqualTo(19);
                assertThat(original.getDatabaseProductVersion()).contains("Oracle Database 19c Enterprise Edition", Oracle19cContainer.EXPECTED_VERSION);
                assertThat(original.getDriverVersion()).isEqualTo("23.26.3.0.0");
                try (var admin = oracle19c.createAdminConnection(); var statement = admin.createStatement()) {
                    try (var rows = statement.executeQuery("SELECT VERSION_FULL FROM V$INSTANCE")) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.getString(1)).isEqualTo(Oracle19cContainer.EXPECTED_VERSION);
                        assertThat(rows.next()).isFalse();
                    }
                    try (var rows = statement.executeQuery("SELECT BANNER_FULL FROM V$VERSION WHERE BANNER_FULL LIKE 'Oracle Database%'")) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.getString(1)).contains("Oracle Database 19c Enterprise Edition");
                        assertThat(rows.next()).isFalse();
                    }
                    try (var rows = statement.executeQuery("SELECT CDB FROM V$DATABASE")) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.getString(1)).isEqualTo("YES");
                        assertThat(rows.next()).isFalse();
                    }
                }
                try (var statement = source.createStatement()) {
                    try (var rows = statement.executeQuery("SELECT SYS_CONTEXT('USERENV','CON_NAME') FROM DUAL")) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.getString(1)).isEqualTo(Oracle19cContainer.PDB_NAME);
                        assertThat(rows.next()).isFalse();
                    }
                    try (var rows = statement.executeQuery("SELECT VALUE FROM NLS_DATABASE_PARAMETERS WHERE PARAMETER='NLS_CHARACTERSET'")) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.getString(1)).isEqualTo("AL32UTF8");
                        assertThat(rows.next()).isFalse();
                    }
                    try (var rows = statement.executeQuery("SELECT ORACLE_MAINTAINED,COMMON FROM USER_USERS")) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.getString(1)).isEqualTo("N");
                        assertThat(rows.getString(2)).isEqualTo("NO");
                        assertThat(rows.next()).isFalse();
                    }
                    var privileges = new ArrayList<String>();
                    try (var rows = statement.executeQuery("SELECT PRIVILEGE FROM SESSION_PRIVS")) {
                        while (rows.next()) privileges.add(rows.getString(1));
                    }
                    assertThat(privileges).containsExactlyInAnyOrder("CREATE SESSION", "CREATE TABLE", "CREATE SEQUENCE", "UNLIMITED TABLESPACE");
                }
                System.out.printf("Oracle 19c fixture: version=%s; edition=Enterprise; pdb=%s; charset=AL32UTF8; localNonMaintained=true%n",
                        original.getDatabaseProductVersion(), Oracle19cContainer.PDB_NAME);
            }
            System.out.printf("Oracle rehearsal: %s %s; JDBC %s; target %s %s%n",
                    original.getDatabaseProductName(), original.getDatabaseProductVersion(), original.getDriverVersion(),
                    destination.getDatabaseProductName(), destination.getDatabaseProductVersion());
        }
    }

    @AfterAll
    static void stopOracleFreeFixture() {
        if (!(ORACLE instanceof Oracle19cContainer)) ORACLE.stop();
    }

    private static JdbcDatabaseContainer<?> oracleFixture() {
        String image = System.getenv("MIGRATION_ORACLE19C_IMAGE");
        if (image != null && !image.isBlank()) {
            var fixture = new Oracle19cContainer(image.trim());
            Runtime.getRuntime().addShutdownHook(new Thread(fixture::stop, "migration-oracle19c-fixture-stop"));
            return fixture;
        }
        return new OracleContainer("gvenzl/oracle-free:23-slim-faststart")
                .withUsername("migration_fixture_reader")
                .withPassword(UUID.randomUUID().toString())
                // Keep the default Oracle Free lifecycle and allowance unchanged.
                .withStartupTimeout(Duration.ofMinutes(5));
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
