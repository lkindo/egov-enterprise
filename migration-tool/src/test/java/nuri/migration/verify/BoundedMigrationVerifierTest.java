package nuri.migration.verify;

import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.state.MigrationStateStore;
import nuri.migration.state.RowChecksum;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.CleanupMode;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class BoundedMigrationVerifierTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");
    @TempDir(cleanup = CleanupMode.ON_SUCCESS) Path directory;

    @Test
    void scopedVerificationDoesNotRetainTheWholeCheckpointPopulation() throws Exception {
        String classpath = System.getProperty("migration.drill.classpath");
        assertThat(classpath).isNotBlank();
        Path arguments = directory.resolve("bounded-verifier.args");
        Path log = directory.resolve("bounded-verifier.log");
        var jdbc = new JdbcTemplate(new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        new MigrationSchemaManager().migrateAndValidate(jdbc);
        try (var state = new MigrationStateStore(new RunContext("verify-run", "verify-source"))) { state.initialize(jdbc); }
        jdbc.execute("CREATE TABLE tb_target (id VARCHAR(256) PRIMARY KEY)");
        Files.writeString(arguments, "-cp\n\"" + classpath.replace('\\', '/') + "\"\n"
                + Worker.class.getName() + "\n");
        String executable = System.getProperty("os.name").startsWith("Windows") ? "java.exe" : "java";
        var builder = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", executable).toString(),
                "-Xmx64m", "@" + arguments);
        builder.environment().put("DRILL_JDBC_URL", POSTGRES.getJdbcUrl());
        builder.environment().put("DRILL_DB_USERNAME", POSTGRES.getUsername());
        builder.environment().put("DRILL_DB_PASSWORD", POSTGRES.getPassword());
        Process worker = builder.redirectErrorStream(true).redirectOutput(log.toFile()).start();
        try {
            // Keep the 64MiB/data invariant while allowing slower CI PostgreSQL storage.
            assertThat(worker.waitFor(360, TimeUnit.SECONDS)).withFailMessage("bounded verifier terminates: %s", Files.readString(log)).isTrue();
            assertThat(worker.exitValue()).withFailMessage("Verifier worker failed: %s", Files.readString(log)).isZero();
            assertThat(Files.readString(log)).contains("BOUNDED_VERIFIER_PASS");
        } finally {
            if (worker.isAlive()) worker.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
        }
    }

    public static final class Worker {
        private static final int ROWS = 120_000;
        public static void main(String[] ignored) {
            var jdbc = new JdbcTemplate(new DriverManagerDataSource(System.getenv("DRILL_JDBC_URL"),
                    System.getenv("DRILL_DB_USERNAME"), System.getenv("DRILL_DB_PASSWORD")));
            jdbc.execute((ConnectionCallback<Void>) connection -> {
                connection.setAutoCommit(false);
                try (var rows = connection.prepareStatement("INSERT INTO tb_target VALUES (?)");
                     var checkpoints = connection.prepareStatement("INSERT INTO migration_control.tb_migration_checkpoint"
                             + " (run_id, source_namespace, source_table, mapping_id, source_key, target_table, target_key, row_checksum)"
                             + " VALUES ('verify-run', 'verify-source', 'legacy', '', ?, 'tb_target', ?, ?)")) {
                    for (int i = 0; i < ROWS; i++) {
                        String key = "key-" + i + "-" + "x".repeat(200);
                        rows.setString(1, key);
                        rows.addBatch();
                        checkpoints.setString(1, key);
                        checkpoints.setString(2, key);
                        checkpoints.setString(3, RowChecksum.calculate(List.of("id"), Map.of("id", key)));
                        checkpoints.addBatch();
                        if ((i + 1) % 500 == 0) {
                            rows.executeBatch(); checkpoints.executeBatch(); connection.commit();
                        }
                    }
                } finally { connection.setAutoCommit(true); }
                return null;
            });
            System.out.println("VERIFY_CHECKPOINT_PHASE");
            var table = new TableMapping("legacy", "tb_target", null, "legacy_key", List.of(), "id",
                    List.of(new ColumnMapping("legacy_key", "id", null, "text", null, null, null)), null);
            var spec = new MappingSpec(null, null, List.of(table), Map.of(), new RunContext("verify-run", "verify-source"));
            var result = new TableResult("legacy", "tb_target", ROWS, ROWS, ROWS, List.of());
            var report = new MigrationVerifier().verify(spec, List.of(result), jdbc);
            if (!report.ok() || report.tables().getFirst().targetRows() != ROWS) throw new AssertionError(report);
            System.out.println("BOUNDED_VERIFIER_PASS");
        }
    }
}
