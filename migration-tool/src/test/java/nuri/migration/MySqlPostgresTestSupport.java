package nuri.migration;

import nuri.migration.adapter.MySqlSourceAdapter;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Disposable synthetic databases; source JDBC driver stays outside the deployment JAR. */
@Testcontainers
abstract class MySqlPostgresTestSupport {
    @Container
    protected static final MySQLContainer<?> MYSQL = new MySQLContainer<>(DockerImageName.parse(
            "mysql@sha256:85b9bf2e29cf836ecb8c2a15a935d4ba0c606631dff1dd79531a11983c638f2a")
            .asCompatibleSubstituteFor("mysql"))
            .withDatabaseName("migration_fixture")
            .withUsername("migration_fixture_reader")
            .withPassword(UUID.randomUUID().toString())
            .withCommand("--max-allowed-packet=67108864", "--character-set-server=utf8mb4",
                    "--collation-server=utf8mb4_0900_ai_ci")
            .withUrlParam("databaseTerm", "SCHEMA")
            .withUrlParam("useCursorFetch", "true")
            .withUrlParam("defaultFetchSize", "1");
    @Container
    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withPassword(UUID.randomUUID().toString());

    @BeforeAll
    static void recordDatabaseVersions() throws Exception {
        try (var source = MYSQL.createConnection(""); var target = POSTGRES.createConnection("")) {
            var original = source.getMetaData();
            var destination = target.getMetaData();
            System.out.printf("MySQL rehearsal: %s %s; JDBC %s; target %s %s%n",
                    original.getDatabaseProductName(), original.getDatabaseProductVersion(), original.getDriverVersion(),
                    destination.getDatabaseProductName(), destination.getDatabaseProductVersion());
        }
    }

    @BeforeEach
    void resetDisposableFixtures() {
        var source = sourceJdbc();
        for (String table : source.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE'",
                String.class, MYSQL.getDatabaseName())) {
            source.execute("DROP TABLE " + SourceIntrospector.ident(table));
        }
        targetJdbc().execute("DROP SCHEMA IF EXISTS public CASCADE");
        targetJdbc().execute("CREATE SCHEMA public");
        targetJdbc().execute("DROP SCHEMA IF EXISTS migration_control CASCADE");
    }

    protected static MappingSpec.DbConfig sourceConfig() {
        return new MappingSpec.DbConfig(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword(),
                "com.mysql.cj.jdbc.Driver", "disposable-mysql-source");
    }

    protected static MappingSpec.DbConfig targetConfig() {
        return new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                "org.postgresql.Driver", "disposable-postgres-target");
    }

    protected static JdbcTemplate sourceJdbc() { return jdbc(sourceConfig()); }
    protected static JdbcTemplate targetJdbc() { return jdbc(targetConfig()); }

    private static JdbcTemplate jdbc(MappingSpec.DbConfig config) {
        var source = new DriverManagerDataSource(config.url(), config.username(), config.password());
        source.setDriverClassName(config.driver());
        return new JdbcTemplate(source);
    }

    protected static MappingSpec mapping(String source, String target, String runId, String payloadType) {
        var table = new MappingSpec.TableMapping(source, target, null, "id", "id", List.of(
                new MappingSpec.ColumnMapping("id", "id", null, "long", null, null, null),
                new MappingSpec.ColumnMapping("payload", "payload", null, payloadType, null, null, null)), null);
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext(runId, "synthetic-mysql-source"));
    }

    protected static List<EtlExecutor.TableResult> execute(MappingSpec mapping, MigrationMode mode) {
        return new EtlExecutor(new SourceIntrospector(), new TransformerRegistry()).execute(
                mapping, mode, sourceJdbc(), targetJdbc(), new MySqlSourceAdapter().sourceReadSessionPolicy(), true);
    }

    protected static long checkpoints(String runId) {
        return targetJdbc().queryForObject(
                "SELECT count(*) FROM migration_control.tb_migration_checkpoint WHERE run_id=?", Long.class, runId);
    }

    protected static void assertSuccessfulLoad(MappingSpec mapping, List<EtlExecutor.TableResult> results, long count) {
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(count);
            assertThat(result.transformed()).isEqualTo(count);
            assertThat(result.written()).isEqualTo(count);
            assertThat(result.errors()).isEmpty();
        });
        var report = new MigrationVerifier().verify(mapping, results, targetJdbc());
        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(checkpoints(mapping.run().runId())).isEqualTo(count);
    }
}
