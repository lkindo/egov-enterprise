package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.CleanupMode;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/** A killed JVM, independent restart, binary/text payloads, and committed checkpoint reconciliation. */
@Testcontainers
class EtlCrashRecoveryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");
    @TempDir(cleanup = CleanupMode.ON_SUCCESS) Path directory;
    private static final int ROWS = 1501;

    @Test
    void killedProcessRollsBackItsOpenChunkAndFreshProcessResumesLargePayloads() throws Exception {
        var jdbc = new JdbcTemplate(new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        jdbc.execute("CREATE TABLE public.legacy_crash (id bigint PRIMARY KEY, payload text, binary_payload bytea)");
        jdbc.execute("INSERT INTO public.legacy_crash SELECT n, repeat('본문-🙂-' || n, "
                + "CASE WHEN n % 499 = 1 THEN 100000 WHEN n <= 500 THEN 100 ELSE 1000 END), "
                + "decode(repeat(md5(n::text), CASE WHEN n % 499 = 1 THEN 65536 WHEN n <= 500 THEN 128 ELSE 1024 END), 'hex') "
                + "FROM generate_series(1,1501) n");
        jdbc.execute("CREATE TABLE public.tb_crash (id bigint PRIMARY KEY, payload text, binary_payload bytea)");
        jdbc.execute("""
                CREATE FUNCTION public.wait_for_crash_drill() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                  IF NEW.id > 500 THEN PERFORM pg_advisory_xact_lock(918273); END IF;
                  RETURN NEW;
                END $$
                """);
        jdbc.execute("CREATE TRIGGER crash_drill_barrier BEFORE INSERT ON public.tb_crash FOR EACH ROW EXECUTE FUNCTION public.wait_for_crash_drill()");
        assertThat(jdbc.queryForObject("SELECT max(octet_length(binary_payload)) FROM public.legacy_crash", Integer.class)).isEqualTo(1_048_576);
        assertThat(jdbc.queryForObject("SELECT sum(octet_length(payload) + octet_length(binary_payload)) FROM public.legacy_crash", Long.class)).isGreaterThan(30_000_000L);
        // Java retains two bytes per UTF-16 unit; every emoji adds one supplementary unit to SQL length().
        assertThat(jdbc.queryForObject("SELECT sum(64 + octet_length(binary_payload) "
                        + "+ 2 * (2 * length(payload) - length(replace(payload, '🙂', '')))) "
                        + "FROM public.legacy_crash WHERE id <= 500", Long.class))
                .as("The original 500-row crash boundary must precede the byte-budget boundary")
                .isLessThan(JdbcLobReader.PAGE_BYTES);

        try (var lock = POSTGRES.createConnection(""); var statement = lock.createStatement()) {
            statement.execute("SELECT pg_advisory_lock(918273)");
            Process worker = startWorker("interrupted");
            try {
                await("interrupted checkpoint=500").atMost(Duration.ofSeconds(45)).until(() -> {
                    if (!worker.isAlive()) {
                        throw new AssertionError("PostgreSQL crash worker stopped before the barrier: phase=interrupted, exit="
                                + worker.exitValue() + ", expectedCheckpoint=500");
                    }
                    try {
                        return jdbc.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint", Long.class) == 500
                                && jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE application_name='migration-crash-worker' AND wait_event='advisory'", Long.class) > 0;
                    } catch (org.springframework.dao.DataAccessException notInitialized) { return false; }
                });
                worker.destroyForcibly();
                assertThat(worker.waitFor(15, TimeUnit.SECONDS)).isTrue();
                assertThat(worker.exitValue()).isNotZero();
                // Terminate only this disposable worker's sessions so blocked DB work cannot outlive the killed client.
                jdbc.queryForList("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name='migration-crash-worker' AND datname=current_database()");
                assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_crash", Long.class)).isEqualTo(500);
                assertThat(jdbc.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint", Long.class)).isEqualTo(500);
            } finally {
                try {
                    if (worker.isAlive()) worker.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
                } finally {
                    statement.execute("SELECT pg_advisory_unlock(918273)");
                    printWorkerStages("interrupted");
                }
            }
        }

        assertWorkerExit("resumed", 0);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_crash", Long.class)).isEqualTo(ROWS);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint", Long.class)).isEqualTo(ROWS);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.legacy_crash s JOIN public.tb_crash t USING (id) "
                + "WHERE s.payload IS DISTINCT FROM t.payload OR s.binary_payload IS DISTINCT FROM t.binary_payload", Long.class)).isZero();
        assertWorkerExit("repeated", 0);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_crash", Long.class)).isEqualTo(ROWS);
        jdbc.execute("UPDATE public.tb_crash SET binary_payload=decode('00','hex') WHERE id=1");
        assertWorkerExit("tampered", 2);
    }

    private Process startWorker(String phase) throws Exception {
        String classpath = System.getProperty("migration.drill.classpath");
        assertThat(classpath).as("The Gradle test or PIT task must supply the drill classpath").isNotBlank();
        Path arguments = directory.resolve(phase + ".args");
        Files.writeString(arguments, "-cp\n\"" + classpath.replace('\\', '/') + "\"\n"
                + Worker.class.getName() + "\n");
        String executable = System.getProperty("os.name").startsWith("Windows") ? "java.exe" : "java";
        var builder = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", executable).toString(),
                "-Xmx128m", "@" + arguments);
        builder.environment().put("DRILL_JDBC_URL", POSTGRES.getJdbcUrl()
                + (POSTGRES.getJdbcUrl().contains("?") ? "&" : "?") + "ApplicationName=migration-crash-worker");
        builder.environment().put("DRILL_DB_USERNAME", POSTGRES.getUsername());
        builder.environment().put("DRILL_DB_PASSWORD", POSTGRES.getPassword());
        builder.redirectErrorStream(true).redirectOutput(directory.resolve(phase + ".log").toFile());
        return builder.start();
    }

    private void assertWorkerExit(String phase, int expected) throws Exception {
        Process worker = startWorker(phase);
        try {
            assertThat(worker.waitFor(90, TimeUnit.SECONDS))
                    .as("Worker completes within 90 seconds: phase=%s, log=%s.log", phase, phase).isTrue();
            assertThat(worker.exitValue())
                    .as("Worker exit: phase=%s, log=%s.log", phase, phase).isEqualTo(expected);
        } finally {
            try {
                if (worker.isAlive()) worker.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
            } finally {
                printWorkerStages(phase);
            }
        }
    }

    private void printWorkerStages(String phase) throws java.io.IOException {
        // Stage records are ASCII; the rest of a child console log may use the Windows locale.
        try (var lines = Files.lines(directory.resolve(phase + ".log"), StandardCharsets.ISO_8859_1)) {
            lines.filter(line -> line.startsWith("PostgreSQL migration drill stage="))
                    .forEach(line -> System.out.println("phase=" + phase + " " + line));
        }
    }

    public static final class Worker {
        public static void main(String[] args) {
            long started = System.nanoTime();
            String stage = "SETUP";
            recordStage(stage, "START", started, "maxHeapMiB=" + Runtime.getRuntime().maxMemory() / (1024 * 1024));
            try {
                var endpoint = new MappingSpec.DbConfig(System.getenv("DRILL_JDBC_URL"), System.getenv("DRILL_DB_USERNAME"),
                        System.getenv("DRILL_DB_PASSWORD"), "org.postgresql.Driver");
                var table = new MappingSpec.TableMapping("public.legacy_crash", "public.tb_crash", null, "id", "id",
                        List.of(column("id"), column("payload"), column("binary_payload")), null);
                var mapping = new MappingSpec(endpoint, endpoint, List.of(table), Map.of(),
                        new MappingSpec.RunContext("crash-lob-drill", "synthetic-source"));
                var jdbc = new JdbcTemplate(new DriverManagerDataSource(endpoint.url(), endpoint.username(), endpoint.password()));
                recordStage(stage, "END", started, "result=READY");
                stage = "EXECUTE";
                recordStage(stage, "START", started, "");
                var results = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry()).execute(mapping, MigrationMode.COMMIT);
                for (var result : results) {
                    if (!result.errors().isEmpty()) {
                        System.err.println("PostgreSQL migration drill errors=" + result.errors());
                    }
                }
                recordStage(stage, "END", started,
                        "read=" + results.stream().mapToLong(EtlExecutor.TableResult::read).sum()
                                + " transformed=" + results.stream().mapToLong(EtlExecutor.TableResult::transformed).sum()
                                + " written=" + results.stream().mapToLong(EtlExecutor.TableResult::written).sum()
                                + " errors=" + results.stream().mapToLong(result -> result.errors().size()).sum());
                stage = "VERIFY";
                recordStage(stage, "START", started, "");
                var report = new MigrationVerifier().verify(mapping, results, jdbc);
                recordStage(stage, "END", started, "result=" + report.overall());
                System.out.println(report.toSummary());
                System.exit(report.ok() ? 0 : 2);
            } catch (OutOfMemoryError failure) {
                recordStage(stage, "FAILED", started, "category=HEAP_EXHAUSTED");
                System.exit(4);
            } catch (Exception failure) {
                // No raw connection/row values in the process log.
                recordStage(stage, "FAILED", started, "category=" + failure.getClass().getName());
                System.exit(3);
            }
        }

        private static void recordStage(String stage, String event, long started, String outcome) {
            System.out.println("PostgreSQL migration drill stage=" + stage + " event=" + event
                    + " elapsedMs=" + TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started)
                    + (outcome.isEmpty() ? "" : " " + outcome));
        }

        private static MappingSpec.ColumnMapping column(String name) {
            return new MappingSpec.ColumnMapping(name, name, null, null, null, null, null);
        }
    }
}
