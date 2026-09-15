package nuri.migration;

import nuri.migration.adapter.SqlServerSourceAdapter;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.jdbc.SourceReadStatements;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.CleanupMode;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.Reader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/** Engine restart probe below the CLI approval gate; SQL Server workflow commit remains UNVERIFIED. */
class EtlSqlServerCrashRecoveryIntegrationTest extends SqlServerPostgresTestSupport {
    private static final int ROWS = 1001;
    private static final String RUN_ID = "sqlserver-process-crash-drill";
    private static final String SOURCE_NAMESPACE = "synthetic-sqlserver-crash-source";
    private static final String APPLICATION_NAME = "migration-sqlserver-crash-worker";
    private static final int FIRST_LOB_ID = 501;
    private static final int LAST_LOB_ID = 508;
    private static final int BLOB_BYTES = 8 * 1024 * 1024;
    private static final int CLOB_REPETITIONS = 1_048_576;
    private static final String CLOB_UNIT = "본문🙂-";
    // Hang guard for startup + source replay + 152 MiB target verification, not a throughput SLO.
    // Use the same allowance when waiting for durable LOB rows; the advisory lock determines the kill point.
    private static final int WORKER_COMPLETION_SECONDS = 180;
    @TempDir(cleanup = CleanupMode.ON_SUCCESS) Path directory;

    @Test
    void killedProcessesPreserveScalarAndLargeLobCheckpointsAndResumeWithin128MiB() throws Exception {
        var source = sourceJdbc();
        var target = targetJdbc();
        source.execute("CREATE TABLE dbo.tb_sqlserver_process_crash (id BIGINT PRIMARY KEY, payload NVARCHAR(200), "
                + "binary_payload VARBINARY(MAX), text_payload NVARCHAR(MAX))");
        try (var connection = sourceConnection();
             var insert = connection.prepareStatement("INSERT INTO dbo.tb_sqlserver_process_crash (id, payload) VALUES (?, ?)")) {
            for (int id = 1; id <= ROWS; id++) {
                insert.setInt(1, id);
                insert.setNString(2, "original-" + id);
                insert.addBatch();
            }
            assertThat(insert.executeBatch()).hasSize(ROWS);
        }
        LobEvidence lob = seedLargeLobs(source);
        target.execute("CREATE TABLE public.tb_sqlserver_process_crash (id bigint PRIMARY KEY, payload text, "
                + "binary_payload bytea, text_payload text)");
        installBarrier(target, 500);
        target.execute("CREATE TRIGGER sqlserver_crash_drill_barrier BEFORE INSERT ON public.tb_sqlserver_process_crash "
                + "FOR EACH ROW EXECUTE FUNCTION public.wait_for_sqlserver_crash_drill()");
        assertThat(source.queryForObject("SELECT count(*) FROM dbo.tb_sqlserver_process_crash", Long.class)).isEqualTo(ROWS);

        // First preserve the original 500-row scalar boundary, then interrupt after four durable LOB rows.
        interruptWorkerAtCheckpoint(target, "scalar-interrupted", 500);
        installBarrier(target, 504);
        interruptWorkerAtCheckpoint(target, "lob-interrupted", 504);
        assertLargeLobContents(target, lob, 504);

        assertWorkerExit("resumed", 0);
        assertCompleteCopy(source, target);
        assertLargeLobContents(target, lob, LAST_LOB_ID);
        assertWorkerExit("repeated", 0);
        assertCompleteCopy(source, target);
        assertLargeLobContents(target, lob, LAST_LOB_ID);

        target.update("UPDATE public.tb_sqlserver_process_crash SET binary_payload=set_byte(binary_payload, 1024, ?) WHERE id=?",
                (Byte.toUnsignedInt(blobByte(1024)) + 1) % 256, FIRST_LOB_ID);
        assertWorkerExit("blob-tampered", 2);
        assertThat(checkpoints(target)).isEqualTo(ROWS);
        target.update("UPDATE public.tb_sqlserver_process_crash SET binary_payload=set_byte(binary_payload, 1024, ?) WHERE id=?",
                Byte.toUnsignedInt(blobByte(1024)), FIRST_LOB_ID);
        target.update("UPDATE public.tb_sqlserver_process_crash SET text_payload='tampered' || substring(text_payload FROM 9) WHERE id=?",
                FIRST_LOB_ID);
        assertWorkerExit("clob-tampered", 2);
        assertThat(checkpoints(target)).isEqualTo(ROWS);
    }

    private static void installBarrier(JdbcTemplate target, int durableRows) {
        target.execute("""
                CREATE OR REPLACE FUNCTION public.wait_for_sqlserver_crash_drill() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                  IF NEW.id > %d THEN PERFORM pg_advisory_xact_lock(918277); END IF;
                  RETURN NEW;
                END $$
                """.formatted(durableRows));
    }

    private void interruptWorkerAtCheckpoint(JdbcTemplate target, String phase, int durableRows) throws Exception {
        // The synthetic source stays frozen across all independent worker processes.
        try (var lock = POSTGRES.createConnection(""); var statement = lock.createStatement()) {
            statement.execute("SELECT pg_advisory_lock(918277)");
            Process worker = startWorker(phase);
            long started = System.nanoTime();
            long[] lastObserved = {-1};
            boolean[] recordedMilestone = {false};
            try {
                await(phase + " checkpoint=" + durableRows)
                        .pollInterval(Duration.ofMillis(250))
                        .atMost(Duration.ofSeconds(WORKER_COMPLETION_SECONDS)).until(() -> {
                    if (!worker.isAlive()) {
                        throw new AssertionError("SQL Server crash worker stopped before the barrier: phase="
                                + phase + ", exit=" + worker.exitValue() + ", expectedCheckpoint=" + durableRows);
                    }
                    try {
                        long recorded = checkpoints(target);
                        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
                        assertThat(recorded).as("Barrier must prevent extra durable rows: phase=%s", phase)
                                .isLessThanOrEqualTo(durableRows);
                        if (recorded != lastObserved[0]) {
                            System.out.println("SQL Server migration drill phase=" + phase
                                    + " elapsedMs=" + elapsedMs
                                    + " checkpoints=" + recorded + " expected=" + durableRows);
                            lastObserved[0] = recorded;
                        }
                        boolean milestone = !recordedMilestone[0] && elapsedMs >= 45_000;
                        long waiting = recorded == durableRows || milestone
                                ? target.queryForObject("SELECT count(*) FROM pg_stat_activity "
                                        + "WHERE application_name=? AND datname=current_database() AND wait_event='advisory'",
                                        Long.class, APPLICATION_NAME) : 0;
                        if (milestone) {
                            System.out.println("SQL Server migration drill phase=" + phase
                                    + " event=45_SECOND_DIAGNOSTIC elapsedMs=" + elapsedMs
                                    + " checkpoints=" + recorded + " advisoryWaiters=" + waiting);
                            recordedMilestone[0] = true;
                        }
                        return recorded == durableRows && waiting > 0;
                    } catch (DataAccessException notInitialized) {
                        return false;
                    }
                });
                worker.destroyForcibly();
                assertThat(worker.waitFor(15, TimeUnit.SECONDS)).isTrue();
                assertThat(worker.exitValue()).isNotZero();
                terminateWorkerSessions(target);
                assertThat(target.queryForObject("SELECT count(*) FROM public.tb_sqlserver_process_crash", Long.class)).isEqualTo(durableRows);
                assertThat(target.queryForObject("SELECT max(id) FROM public.tb_sqlserver_process_crash", Long.class)).isEqualTo(durableRows);
                assertThat(checkpoints(target)).isEqualTo(durableRows);
            } finally {
                System.out.println("SQL Server migration drill phase=" + phase
                        + " lastObservedCheckpoints=" + lastObserved[0] + " workerAlive=" + worker.isAlive());
                try {
                    if (worker.isAlive()) worker.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
                } finally {
                    // Only this disposable worker's target sessions may outlive its killed client.
                    terminateWorkerSessions(target);
                    statement.execute("SELECT pg_advisory_unlock(918277)");
                }
            }
        }
    }

    private static LobEvidence seedLargeLobs(JdbcTemplate source) throws Exception {
        byte[] binary = new byte[BLOB_BYTES];
        for (int i = 0; i < binary.length; i++) binary[i] = blobByte(i);
        try (var connection = sourceConnection();
             var update = connection.prepareStatement("UPDATE dbo.tb_sqlserver_process_crash SET binary_payload=? WHERE id=?")) {
            for (int id = FIRST_LOB_ID; id <= LAST_LOB_ID; id++) {
                update.setBinaryStream(1, new ByteArrayInputStream(binary), binary.length);
                update.setInt(2, id);
                assertThat(update.executeUpdate()).isEqualTo(1);
            }
        }
        int lobRows = LAST_LOB_ID - FIRST_LOB_ID + 1;
        assertThat(source.update("UPDATE dbo.tb_sqlserver_process_crash SET text_payload=CAST(N'' AS NVARCHAR(MAX)) "
                + "WHERE id BETWEEN ? AND ?", FIRST_LOB_ID, LAST_LOB_ID)).isEqualTo(lobRows);
        // Append bounded national-character chunks; keep surrogate pairs together in each fixture upload.
        int repetitionsPerChunk = 16_384;
        assertThat(CLOB_REPETITIONS % repetitionsPerChunk).isZero();
        String textChunk = CLOB_UNIT.repeat(repetitionsPerChunk);
        try (var connection = sourceConnection();
             var append = connection.prepareStatement("UPDATE dbo.tb_sqlserver_process_crash "
                     + "SET text_payload.WRITE(?, NULL, 0) WHERE id BETWEEN ? AND ?")) {
            append.setNString(1, textChunk);
            append.setInt(2, FIRST_LOB_ID);
            append.setInt(3, LAST_LOB_ID);
            for (int chunk = 0; chunk < CLOB_REPETITIONS / repetitionsPerChunk; chunk++) {
                assertThat(append.executeUpdate()).isEqualTo(lobRows);
            }
        }
        long clobCharacters = (long) CLOB_UNIT.length() * CLOB_REPETITIONS;
        long clobUtf8Bytes = (long) CLOB_UNIT.getBytes(StandardCharsets.UTF_8).length * CLOB_REPETITIONS;
        assertThat(source.queryForObject("SELECT count(*) FROM dbo.tb_sqlserver_process_crash WHERE binary_payload IS NOT NULL "
                + "AND text_payload IS NOT NULL", Long.class)).isEqualTo(lobRows);
        assertThat(source.queryForObject("SELECT sum(DATALENGTH(binary_payload)) FROM dbo.tb_sqlserver_process_crash",
                Long.class)).isEqualTo((long) lobRows * BLOB_BYTES);
        // SQL Server NVARCHAR stores UTF-16: physical text is 10 MiB, PostgreSQL UTF-8 text is 11 MiB per row.
        assertThat(source.queryForObject("SELECT sum(DATALENGTH(text_payload)) FROM dbo.tb_sqlserver_process_crash",
                Long.class)).isEqualTo(lobRows * clobCharacters * 2);
        assertThat(lobRows * (BLOB_BYTES + clobCharacters * 2)).isEqualTo(144L * 1024 * 1024);
        assertThat(lobRows * (BLOB_BYTES + clobUtf8Bytes)).isEqualTo(152L * 1024 * 1024);
        LobEvidence expected = new LobEvidence(digestBinary(new ByteArrayInputStream(binary)),
                digestCharacters(new StringReader(CLOB_UNIT.repeat(CLOB_REPETITIONS))),
                clobCharacters, clobUtf8Bytes);
        assertSeededLobContents(expected);
        return expected;
    }

    private static void assertSeededLobContents(LobEvidence expected) throws Exception {
        try (var connection = sourceConnection();
             var statement = SourceReadStatements.prepare(connection,
                     "SELECT id, binary_payload, text_payload FROM dbo.tb_sqlserver_process_crash "
                             + "WHERE id BETWEEN ? AND ? ORDER BY id")) {
            statement.setInt(1, FIRST_LOB_ID);
            statement.setInt(2, LAST_LOB_ID);
            try (var rows = statement.executeQuery()) {
                for (int id = FIRST_LOB_ID; id <= LAST_LOB_ID; id++) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getInt(1)).isEqualTo(id);
                    // Adaptive streams must be consumed and closed before moving to the next column.
                    assertThat(digestBinary(rows.getBinaryStream(2))).isEqualTo(expected.binaryDigest());
                    assertThat(digestCharacters(rows.getCharacterStream(3))).isEqualTo(expected.characterDigest());
                }
                assertThat(rows.next()).isFalse();
            }
        }
    }

    private static void assertLargeLobContents(JdbcTemplate target, LobEvidence expected, int lastId) throws Exception {
        int lobRows = lastId - FIRST_LOB_ID + 1;
        assertThat(target.queryForObject("SELECT count(*) FROM public.tb_sqlserver_process_crash "
                + "WHERE binary_payload IS NOT NULL AND text_payload IS NOT NULL", Long.class)).isEqualTo(lobRows);
        assertThat(target.queryForObject("SELECT sum(octet_length(binary_payload) + octet_length(text_payload)) "
                + "FROM public.tb_sqlserver_process_crash", Long.class))
                .isEqualTo(lobRows * (BLOB_BYTES + expected.clobUtf8Bytes()));
        try (var source = sourceConnection(); var destination = POSTGRES.createConnection("")) {
            source.setReadOnly(true);
            source.setAutoCommit(false);
            destination.setReadOnly(true);
            destination.setAutoCommit(false);
            try (var original = SourceReadStatements.prepare(source, "SELECT id, binary_payload, text_payload FROM dbo.tb_sqlserver_process_crash "
                    + "WHERE id BETWEEN ? AND ? ORDER BY id");
                 var copied = destination.prepareStatement("SELECT id, binary_payload, text_payload FROM public.tb_sqlserver_process_crash "
                         + "WHERE id BETWEEN ? AND ? ORDER BY id", ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY)) {
                original.setFetchSize(1);
                copied.setFetchSize(1);
                original.setInt(1, FIRST_LOB_ID);
                original.setInt(2, lastId);
                copied.setInt(1, FIRST_LOB_ID);
                copied.setInt(2, lastId);
                try (var sourceRows = original.executeQuery(); var targetRows = copied.executeQuery()) {
                    for (int id = FIRST_LOB_ID; id <= lastId; id++) {
                        assertThat(sourceRows.next()).isTrue();
                        assertThat(targetRows.next()).isTrue();
                        assertThat(sourceRows.getInt(1)).isEqualTo(id);
                        assertThat(targetRows.getInt(1)).isEqualTo(id);
                        assertThat(digestBinary(sourceRows.getBinaryStream(2))).isEqualTo(expected.binaryDigest());
                        assertThat(digestCharacters(sourceRows.getCharacterStream(3))).isEqualTo(expected.characterDigest());
                        assertThat(digestBinary(targetRows.getBinaryStream(2))).isEqualTo(expected.binaryDigest());
                        assertThat(digestCharacters(targetRows.getCharacterStream(3))).isEqualTo(expected.characterDigest());
                    }
                    assertThat(sourceRows.next()).isFalse();
                    assertThat(targetRows.next()).isFalse();
                }
            } finally {
                try { source.rollback(); } finally { destination.rollback(); }
            }
        }
    }

    private static byte blobByte(int index) {
        return (byte) (index * 31 + index / 251);
    }

    private static String digestBinary(InputStream input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (input) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) digest.update(buffer, 0, read);
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static String digestCharacters(Reader input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (input) {
            char[] characters = new char[8192];
            byte[] bytes = new byte[characters.length * 2];
            int read;
            while ((read = input.read(characters)) != -1) {
                for (int i = 0; i < read; i++) {
                    // Hash UTF-16 units directly so supplementary characters may straddle read boundaries.
                    bytes[2 * i] = (byte) (characters[i] >>> 8);
                    bytes[2 * i + 1] = (byte) characters[i];
                }
                digest.update(bytes, 0, read * 2);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private record LobEvidence(String binaryDigest, String characterDigest,
                               long clobCharacters, long clobUtf8Bytes) {}

    private static void assertCompleteCopy(JdbcTemplate source, JdbcTemplate target) {
        var original = source.query("SELECT id, payload FROM dbo.tb_sqlserver_process_crash ORDER BY id",
                (row, index) -> new FixtureRow(row.getLong(1), row.getString(2)));
        var copied = target.query("SELECT id, payload FROM public.tb_sqlserver_process_crash ORDER BY id",
                (row, index) -> new FixtureRow(row.getLong(1), row.getString(2)));
        assertThat(copied).hasSize(ROWS).containsExactlyElementsOf(original);
        assertThat(target.queryForObject("SELECT count(DISTINCT id) FROM public.tb_sqlserver_process_crash", Long.class)).isEqualTo(ROWS);
        assertThat(checkpoints(target)).isEqualTo(ROWS);
        assertThat(target.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint "
                        + "WHERE run_id=? AND source_namespace=? AND source_table='dbo.tb_sqlserver_process_crash' "
                        + "AND target_table='public.tb_sqlserver_process_crash' AND source_key=target_key",
                Long.class, RUN_ID, SOURCE_NAMESPACE)).isEqualTo(ROWS);
    }

    private static long checkpoints(JdbcTemplate target) {
        return target.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint "
                + "WHERE run_id=? AND source_namespace=?", Long.class, RUN_ID, SOURCE_NAMESPACE);
    }

    private static void terminateWorkerSessions(JdbcTemplate target) {
        target.queryForList("SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                + "WHERE application_name=? AND datname=current_database()", APPLICATION_NAME);
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
        for (String inherited : List.of("CLASSPATH", "JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS")) {
            builder.environment().remove(inherited);
        }
        var source = sourceConfig();
        builder.environment().put("DRILL_SOURCE_JDBC_URL", source.url());
        builder.environment().put("DRILL_SOURCE_USERNAME", source.username());
        builder.environment().put("DRILL_SOURCE_PASSWORD", source.password());
        builder.environment().put("DRILL_TARGET_JDBC_URL", POSTGRES.getJdbcUrl()
                + (POSTGRES.getJdbcUrl().contains("?") ? "&" : "?") + "ApplicationName=" + APPLICATION_NAME);
        builder.environment().put("DRILL_TARGET_USERNAME", POSTGRES.getUsername());
        builder.environment().put("DRILL_TARGET_PASSWORD", POSTGRES.getPassword());
        builder.redirectErrorStream(true).redirectOutput(directory.resolve(phase + ".log").toFile());
        return builder.start();
    }

    private void assertWorkerExit(String phase, int expected) throws Exception {
        Process worker = startWorker(phase);
        try {
            assertThat(worker.waitFor(WORKER_COMPLETION_SECONDS, TimeUnit.SECONDS))
                    .as("Worker completes within %s seconds: phase=%s, log=%s.log",
                            WORKER_COMPLETION_SECONDS, phase, phase).isTrue();
            assertThat(worker.exitValue())
                    .as("Worker exit: phase=%s, log=%s.log", phase, phase).isEqualTo(expected);
        } finally {
            try {
                if (worker.isAlive()) worker.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
            } finally {
                terminateWorkerSessions(targetJdbc());
                // Stage records are ASCII; the rest of a child console log may use the Windows locale.
                try (var lines = Files.lines(directory.resolve(phase + ".log"), StandardCharsets.ISO_8859_1)) {
                    lines.filter(line -> line.startsWith("SQL Server migration drill stage="))
                            .forEach(line -> System.out.println("phase=" + phase + " " + line));
                }
            }
        }
    }

    private record FixtureRow(long id, String payload) {}

    public static final class Worker {
        public static void main(String[] args) {
            long started = System.nanoTime();
            String stage = "SETUP";
            recordStage(stage, "START", started, "maxHeapMiB=" + Runtime.getRuntime().maxMemory() / (1024 * 1024));
            try {
                if (Runtime.getRuntime().maxMemory() > 128L * 1024 * 1024) {
                    throw new IllegalStateException("SOURCE_HEAP_LIMIT_UNEXPECTED");
                }
                var source = new MappingSpec.DbConfig(System.getenv("DRILL_SOURCE_JDBC_URL"),
                        System.getenv("DRILL_SOURCE_USERNAME"), System.getenv("DRILL_SOURCE_PASSWORD"), "com.microsoft.sqlserver.jdbc.SQLServerDriver");
                var target = new MappingSpec.DbConfig(System.getenv("DRILL_TARGET_JDBC_URL"),
                        System.getenv("DRILL_TARGET_USERNAME"), System.getenv("DRILL_TARGET_PASSWORD"), "org.postgresql.Driver");
                var table = new MappingSpec.TableMapping("dbo.tb_sqlserver_process_crash", "public.tb_sqlserver_process_crash", null, "id", "id",
                        List.of(column("id", "id"), column("payload", "payload"),
                                column("binary_payload", "binary_payload"), column("text_payload", "text_payload")), null);
                var mapping = new MappingSpec(source, target, List.of(table), Map.of(),
                        new MappingSpec.RunContext(RUN_ID, SOURCE_NAMESPACE));
                var sourceJdbc = new JdbcTemplate(new DriverManagerDataSource(source.url(), source.username(), source.password()));
                var targetJdbc = new JdbcTemplate(new DriverManagerDataSource(target.url(), target.username(), target.password()));
                try (var connection = sourceJdbc.getDataSource().getConnection();
                     var statement = SourceReadStatements.prepare(connection,
                             "SELECT id, binary_payload, text_payload FROM dbo.tb_sqlserver_process_crash WHERE id=501")) {
                    if (statement.getFetchSize() != 1 || statement.getResultSetType() != ResultSet.TYPE_FORWARD_ONLY
                            || statement.getResultSetConcurrency() != ResultSet.CONCUR_READ_ONLY
                            || !"adaptive".equals(statement.getClass().getMethod("getResponseBuffering").invoke(statement))) {
                        throw new IllegalStateException("SOURCE_STREAMING_STATEMENT_UNEXPECTED");
                    }
                    try (var rows = statement.executeQuery()) {
                        if (!"com.microsoft.sqlserver.jdbc.SQLServerResultSet".equals(rows.getClass().getName())
                                || rows.getMetaData().getColumnType(2) != Types.VARBINARY
                                || rows.getMetaData().getColumnType(3) != Types.NVARCHAR
                                || !rows.next() || rows.getInt(1) != FIRST_LOB_ID) {
                            throw new IllegalStateException("SOURCE_STREAMING_RESULT_UNEXPECTED");
                        }
                    }
                }
                recordStage(stage, "STREAMING_PROBE", started, "fetchSize=1 responseBuffering=ADAPTIVE");
                recordStage(stage, "END", started, "result=READY");
                stage = "EXECUTE";
                recordStage(stage, "START", started, "");
                var results = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry()).execute(
                        mapping, MigrationMode.COMMIT, sourceJdbc, targetJdbc,
                        new SqlServerSourceAdapter().sourceReadSessionPolicy(), true);
                for (var result : results) {
                    if (!result.errors().isEmpty()) {
                        // Engine error categories already omit raw JDBC exceptions and row values.
                        System.err.println("SQL Server migration drill errors=" + result.errors());
                    }
                }
                recordStage(stage, "END", started,
                        "read=" + results.stream().mapToLong(EtlExecutor.TableResult::read).sum()
                                + " transformed=" + results.stream().mapToLong(EtlExecutor.TableResult::transformed).sum()
                                + " written=" + results.stream().mapToLong(EtlExecutor.TableResult::written).sum()
                                + " errors=" + results.stream().mapToLong(result -> result.errors().size()).sum());
                stage = "VERIFY";
                recordStage(stage, "START", started, "");
                var report = new MigrationVerifier().verify(mapping, results, targetJdbc);
                recordStage(stage, "END", started, "result=" + report.overall());
                System.out.println(report.toSummary());
                System.exit(report.ok() ? 0 : 2);
            } catch (OutOfMemoryError failure) {
                recordStage(stage, "FAILED", started, "category=HEAP_EXHAUSTED");
                System.exit(4);
            } catch (Exception failure) {
                // No raw connection or row values in the process log.
                recordStage(stage, "FAILED", started, "category=" + failure.getClass().getName());
                System.exit(3);
            }
        }

        private static void recordStage(String stage, String event, long started, String outcome) {
            System.out.println("SQL Server migration drill stage=" + stage + " event=" + event
                    + " elapsedMs=" + TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started)
                    + (outcome.isEmpty() ? "" : " " + outcome));
        }

        private static MappingSpec.ColumnMapping column(String source, String target) {
            return new MappingSpec.ColumnMapping(source, target, null, null, null, null, null);
        }
    }
}
