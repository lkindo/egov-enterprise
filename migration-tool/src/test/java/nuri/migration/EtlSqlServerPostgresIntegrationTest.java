package nuri.migration;

import nuri.migration.adapter.SqlServerSourceAdapter;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.jdbc.SourceReadStatements;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.state.RowChecksum;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Synthetic direct-engine rehearsal; public SQL Server COMMIT remains UNVERIFIED. */
class EtlSqlServerPostgresIntegrationTest extends SqlServerPostgresTestSupport {
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void sourceStatementOverridesFullBufferingWithForwardOnlyAdaptiveReads() throws Exception {
        String source = sourceTable("adaptive");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload nvarchar(max))");
        String expected = "본문🙂-adaptive";
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, ?)", expected);
        var config = sourceConfig();
        try (var connection = DriverManager.getConnection(config.url() + ";responseBuffering=full", config.username(), config.password());
             var statement = SourceReadStatements.prepare(connection, "SELECT payload FROM " + source)) {
            assertThat(statement.getFetchSize()).isEqualTo(1);
            assertThat(statement.getResultSetType()).isEqualTo(ResultSet.TYPE_FORWARD_ONLY);
            assertThat(statement.getResultSetConcurrency()).isEqualTo(ResultSet.CONCUR_READ_ONLY);
            assertThat(statement.getClass().getMethod("getResponseBuffering").invoke(statement)).isEqualTo("adaptive");
            try (var rows = statement.executeQuery()) {
                assertThat(rows.next()).isTrue();
                assertThat(expected.equals(JdbcLobReader.read(rows, 1, true))).isTrue();
                assertThat(rows.next()).isFalse();
            }
        }
    }

    @Test
    void maxRowsLimitsTheServerResultAndItsSameBatchRowcount() throws Exception {
        String source = sourceTable("server_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload varchar(20))");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,'row-1'),(2,'row-2'),(3,'row-3'),(4,'row-4'),"
                + "(5,'row-5'),(6,'row-6'),(7,'row-7'),(8,'row-8'),(9,'row-9'),(10,'row-10')");
        assertThat(sourceJdbc().queryForObject("SELECT count(*) FROM " + source, Long.class)).isEqualTo(10);
        try (var connection = sourceConnection();
             var statement = SourceReadStatements.prepare(connection,
                     "SELECT id FROM " + source + " ORDER BY id; SELECT @@ROWCOUNT AS source_rows")) {
            assertThat(statement.getFetchSize()).isEqualTo(1);
            assertThat(statement.getResultSetType()).isEqualTo(ResultSet.TYPE_FORWARD_ONLY);
            assertThat(statement.getResultSetConcurrency()).isEqualTo(ResultSet.CONCUR_READ_ONLY);
            statement.setMaxRows(2);
            assertThat(statement.execute()).isTrue();
            int observed = 0;
            try (var rows = statement.getResultSet()) {
                while (rows.next()) observed++;
            }
            assertThat(observed).isEqualTo(2);
            // A new Statement would reset SET ROWCOUNT and overwrite @@ROWCOUNT. Read it in this same batch.
            assertThat(statement.getMoreResults()).isTrue();
            try (var rows = statement.getResultSet()) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt("source_rows")).isEqualTo(2);
                assertThat(rows.next()).isFalse();
            }
            assertThat(statement.getMoreResults()).isFalse();
        }
    }

    @Test
    void scalarLoadResumesTheRejectedFiveHundredFirstRowAndDetectsTargetTampering() throws Exception {
        String source = sourceTable("resume");
        String target = targetTable("resume");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload varchar(200))");
        try (var connection = sourceConnection(); var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (?,?)")) {
            for (int id = 1; id <= 1001; id++) {
                insert.setLong(1, id);
                insert.setString(2, "original-" + id);
                insert.addBatch();
            }
            assertThat(insert.executeBatch()).hasSize(1001);
        }
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text, CHECK (id<>501 OR payload='fixed'))");
        var spec = mapping(source, target, "sqlserver-scalar-recovery", null);
        assertDryRun(spec, 1001);
        var failed = execute(spec, MigrationMode.COMMIT);
        assertThat(failed).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(1001);
            assertThat(result.written()).isEqualTo(1000);
            assertThat(result.errors()).hasSize(1);
        });
        assertThat(rowCount(target)).isEqualTo(1000);
        assertThat(checkpoints(spec.run().runId())).isEqualTo(1000);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target + " WHERE id=501", Long.class)).isZero();
        assertThat(verifier.verify(spec, failed, targetJdbc()).ok()).isFalse();
        sourceJdbc().update("UPDATE " + source + " SET payload='fixed' WHERE id=501");
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1001);
        assertThat(targetJdbc().queryForList("SELECT payload FROM " + target + " ORDER BY id", String.class))
                .isEqualTo(sourceJdbc().queryForList("SELECT payload FROM " + source + " ORDER BY id", String.class));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1001);
        targetJdbc().update("UPDATE " + target + " SET payload='tampered' WHERE id=1");
        assertThat(verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    @Test
    void sixteenMiBVarbinaryMaxPreservesEveryByteNullEmptyAndDetectsLastByteChange() throws Exception {
        String source = sourceTable("binary");
        String target = targetTable("binary");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload varbinary(max))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload bytea)");
        byte[] original = new byte[16 * 1024 * 1024];
        for (int index = 0; index < original.length; index++) original[index] = (byte) (index * 31 + index / 251);
        try (var connection = sourceConnection(); var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (1,?)")) {
            insert.setBinaryStream(1, new ByteArrayInputStream(original), original.length);
            assertThat(insert.executeUpdate()).isEqualTo(1);
        }
        assertThat(Arrays.equals(original, sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", byte[].class))).isTrue();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2,NULL),(3,0x)");
        var spec = mapping(source, target, "sqlserver-max-binary", null);
        long largeObjectsBefore = largeObjects();
        assertDryRun(spec, 3);
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        byte[] loaded = targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", byte[].class);
        assertThat(Arrays.equals(original, loaded)).isTrue();
        assertThat(hash(loaded)).isEqualTo(hash(original));
        assertNullAndEmpty(target, "octet_length");
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        targetJdbc().update("UPDATE " + target + " SET payload=set_byte(payload,octet_length(payload)-1,?) WHERE id=1",
                (original[original.length - 1] ^ 1) & 0xff);
        assertTampered(spec);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void elevenMiBUtf8NvarcharMaxPreservesFullUnicodeNullEmptyAndDetectsLastCharacterChange() throws Exception {
        String source = sourceTable("unicode");
        String target = targetTable("unicode");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload nvarchar(max))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        String original = "본문🙂-".repeat(1_048_576);
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,REPLICATE(CAST(? AS nvarchar(max)),?))", "본문🙂-", 1_048_576);
        assertThat(original.equals(sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", String.class))).isTrue();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2,NULL),(3,N'')");
        var spec = mapping(source, target, "sqlserver-max-unicode", null);
        long largeObjectsBefore = largeObjects();
        assertDryRun(spec, 3);
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        String loaded = targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class);
        assertThat(original.equals(loaded)).isTrue();
        assertThat(hash(loaded.getBytes(StandardCharsets.UTF_8))).isEqualTo(hash(original.getBytes(StandardCharsets.UTF_8)));
        assertNullAndEmpty(target, "length");
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        targetJdbc().update("UPDATE " + target + " SET payload=left(payload,char_length(payload)-1)||'!' WHERE id=1");
        assertTampered(spec);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void oversizedVarbinaryMaxIsRejectedWithoutRowsOrCheckpoints() {
        String source = sourceTable("binary_limit");
        String target = targetTable("binary_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload varbinary(max))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload bytea)");
        long length = JdbcLobReader.MAX_BLOB_BYTES + 1L;
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,CONVERT(varbinary(max),REPLICATE(CAST('a' AS varchar(max)),?)))", length);
        assertThat(sourceJdbc().queryForObject("SELECT DATALENGTH(payload) FROM " + source, Long.class)).isEqualTo(length);
        assertSizeRejected(mapping(source, target, "sqlserver-binary-limit", null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"nvarchar(max)", "varchar(max)"})
    void oversizedMaxTextIsRejectedWithoutRowsOrCheckpoints(String type) {
        String source = sourceTable("text_limit");
        String target = targetTable("text_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload " + type + ")");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        long length = JdbcLobReader.MAX_CLOB_CHARACTERS + 1L;
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,REPLICATE(CAST('a' AS " + type + "),?))", length);
        int width = type.startsWith("n") ? 2 : 1;
        assertThat(sourceJdbc().queryForObject("SELECT DATALENGTH(payload) FROM " + source, Long.class)).isEqualTo(length * width);
        assertSizeRejected(mapping(source, target, "sqlserver-text-limit", null));
    }

    @Test
    void mixedMaxFieldBatchFailureKeepsDetachedValuesAndResumesOnlyRejectedRow() throws Exception {
        String source = sourceTable("retry");
        String target = targetTable("retry");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, body varbinary(max), payload nvarchar(max))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, body bytea, payload text, CHECK(id<>2 OR left(payload,5)='fixed'))");
        byte[] binary = new byte[512 * 1024];
        for (int index = 0; index < binary.length; index++) binary[index] = (byte) (index * 31);
        String text = "본문🙂-".repeat(16_384);
        try (var connection = sourceConnection(); var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (?,?,?)")) {
            for (int id = 1; id <= 3; id++) {
                insert.setLong(1, id);
                insert.setBytes(2, binary);
                insert.setNString(3, text);
                assertThat(insert.executeUpdate()).isEqualTo(1);
            }
        }
        var table = new MappingSpec.TableMapping(source, target, null, "id", "id", List.of(
                column("id", "long", null), column("body", null, null), column("payload", null, null)), null);
        var spec = spec(table, "sqlserver-max-retry");
        var failed = execute(spec, MigrationMode.COMMIT);
        assertThat(failed.getFirst().written()).isEqualTo(2);
        assertThat(failed.getFirst().errors()).hasSize(1);
        assertThat(checkpoints(spec.run().runId())).isEqualTo(2);
        assertThat(verifier.verify(spec, failed, targetJdbc()).ok()).isFalse();
        assertThat(targetJdbc().queryForList("SELECT id FROM " + target + " ORDER BY id", Long.class)).containsExactly(1L, 3L);
        sourceJdbc().update("UPDATE " + source + " SET payload=CONCAT(N'fixed',payload) WHERE id=2");
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        for (int id = 1; id <= 3; id++) {
            assertThat(Arrays.equals(binary, targetJdbc().queryForObject("SELECT body FROM " + target + " WHERE id=?", byte[].class, id))).isTrue();
            assertThat((id == 2 ? "fixed" + text : text).equals(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=?", String.class, id))).isTrue();
        }
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
    }

    @Test
    void maxTextTransformationCheckpointsTheTransformedBody() {
        String source = sourceTable("trim");
        String target = targetTable("trim");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload nvarchar(max))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        String original = "  본문🙂-trim  ";
        String expected = original.trim();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,?)", original);
        var table = new MappingSpec.TableMapping(source, target, null, "id", "id", List.of(
                column("id", "long", null), column("payload", null, "trim")), null);
        var spec = spec(table, "sqlserver-max-transform");
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1);
        assertThat(expected.equals(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class))).isTrue();
        var columns = EtlExecutor.canonicalTargetColumns(table);
        assertThat(targetJdbc().queryForObject("SELECT row_checksum FROM migration_control.tb_migration_checkpoint WHERE run_id=? AND source_key='1'",
                String.class, spec.run().runId())).isEqualTo(RowChecksum.calculate(columns, Map.of("id", 1L, "payload", expected)))
                .isNotEqualTo(RowChecksum.calculate(columns, Map.of("id", 1L, "payload", original)));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1);
    }

    @ParameterizedTest
    @ValueSource(strings = {"binary", "unicode", "ascii"})
    void exactMaxFieldLimitIsAcceptedAndCompleteContentSurvives(String kind) throws Exception {
        boolean binary = kind.equals("binary");
        String type = binary ? "varbinary(max)" : kind.equals("unicode") ? "nvarchar(max)" : "varchar(max)";
        String source = sourceTable("exact_limit");
        String target = targetTable("exact_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY,payload " + type + ")");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY,payload " + (binary ? "bytea" : "text") + ")");
        int length = binary ? JdbcLobReader.MAX_BLOB_BYTES : JdbcLobReader.MAX_CLOB_CHARACTERS;
        String expression = binary ? "CONVERT(varbinary(max),REPLICATE(CAST('a' AS varchar(max)),?))"
                : "REPLICATE(CAST('a' AS " + type + "),?)";
        sourceJdbc().update("INSERT INTO " + source + " VALUES(1," + expression + ")", length);
        assertThat(sourceJdbc().queryForObject("SELECT DATALENGTH(payload) FROM " + source, Long.class))
                .isEqualTo((long) length * (kind.equals("unicode") ? 2 : 1));
        var spec = mapping(source, target, "sqlserver-exact-limit", null);
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1);
        if (binary) {
            byte[] expected = new byte[length];
            Arrays.fill(expected, (byte) 'a');
            byte[] loaded = targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", byte[].class);
            assertThat(Arrays.equals(expected, loaded)).isTrue();
            assertThat(hash(loaded)).isEqualTo(hash(expected));
        } else {
            assertThat("a".repeat(length).equals(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class))).isTrue();
        }
    }

    @Test
    void oversizedMaxOrderValueAtPageLookaheadIsRejectedBeforeCommittingThePreviousPage() {
        String source = sourceTable("order_limit");
        String target = targetTable("order_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY,sort_value nvarchar(max),payload varbinary(max))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY,sort_value text,payload bytea)");
        long oversizedCharacters = JdbcLobReader.MAX_CLOB_CHARACTERS + 1L;
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,N'a',CONVERT(varbinary(max),REPLICATE(CAST('p' AS varchar(max)),?))),"
                + "(2,REPLICATE(CAST(N'b' AS nvarchar(max)),?),0x)", JdbcLobReader.PAGE_BYTES, oversizedCharacters);
        assertThat(sourceJdbc().queryForObject("SELECT DATALENGTH(payload) FROM " + source + " WHERE id=1", Long.class))
                .isEqualTo(JdbcLobReader.PAGE_BYTES);
        assertThat(sourceJdbc().queryForObject("SELECT DATALENGTH(sort_value) FROM " + source + " WHERE id=2", Long.class))
                .isEqualTo(2L * oversizedCharacters);
        var table = new MappingSpec.TableMapping(source, target, null, null, List.of("sort_value", "id"), "id", List.of(
                column("id", "long", null), column("sort_value", "text", null), column("payload", null, null)), null);
        var spec = spec(table, "sqlserver-max-order-lookahead-rejected");

        // Row 1 fills the retained page budget. Looking ahead at row 2 must enforce the same MAX guard
        // before row 1 is submitted for target writes and its durable checkpoint is committed.
        var results = execute(spec, MigrationMode.COMMIT);
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.written()).isZero();
            assertThat(result.errors()).singleElement().asString().contains("LOB_SIZE_LIMIT_EXCEEDED");
        });
        assertThat(rowCount(target)).isZero();
        assertThat(checkpoints(spec.run().runId())).isZero();
        assertThat(verifier.verify(spec, results, targetJdbc()).ok()).isFalse();
    }

    private void assertDryRun(MappingSpec spec, long rows) {
        assertThat(execute(spec, MigrationMode.DRY_RUN)).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(rows);
            assertThat(result.transformed()).isEqualTo(rows);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).isEmpty();
        });
        assertThat(rowCount(spec.tables().getFirst().target())).isZero();
    }

    private void assertNullAndEmpty(String target, String lengthFunction) {
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL FROM " + target + " WHERE id=2", Boolean.class)).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT " + lengthFunction + "(payload) FROM " + target + " WHERE id=3", Integer.class)).isZero();
    }

    private void assertTampered(MappingSpec spec) {
        var report = verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc());
        assertThat(report.ok()).isFalse();
        assertThat(report.toSummary()).contains("checksum");
        assertThat(checkpoints(spec.run().runId())).isEqualTo(3);
    }

    private void assertSizeRejected(MappingSpec spec) {
        var results = execute(spec, MigrationMode.COMMIT);
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.written()).isZero();
            assertThat(result.errors()).singleElement().asString().contains("LOB_SIZE_LIMIT_EXCEEDED");
        });
        assertThat(rowCount(spec.tables().getFirst().target())).isZero();
        assertThat(checkpoints(spec.run().runId())).isZero();
        assertThat(verifier.verify(spec, results, targetJdbc()).ok()).isFalse();
    }

    static List<EtlExecutor.TableResult> execute(MappingSpec spec, MigrationMode mode) {
        return new EtlExecutor(new SourceIntrospector(), new TransformerRegistry()).execute(spec, mode,
                sourceJdbc(), targetJdbc(), new SqlServerSourceAdapter().sourceReadSessionPolicy(), true);
    }

    static long checkpoints(String run) {
        return targetJdbc().queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint WHERE run_id=?", Long.class, run);
    }

    static void assertSuccessfulLoad(MappingSpec spec, List<EtlExecutor.TableResult> results, long count) {
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(count);
            assertThat(result.transformed()).isEqualTo(count);
            assertThat(result.written()).isEqualTo(count);
            assertThat(result.errors()).isEmpty();
        });
        var report = new MigrationVerifier().verify(spec, results, targetJdbc());
        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(checkpoints(spec.run().runId())).isEqualTo(count);
    }

    private static MappingSpec mapping(String source, String target, String run, String payloadType) {
        return spec(new MappingSpec.TableMapping(source, target, null, "id", "id", List.of(
                column("id", "long", null), column("payload", payloadType, null)), null), run);
    }

    private static MappingSpec.ColumnMapping column(String name, String type, String transform) {
        return new MappingSpec.ColumnMapping(name, name, transform, type, null, null, null);
    }

    private static MappingSpec spec(MappingSpec.TableMapping table, String run) {
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(), new MappingSpec.RunContext(run, "synthetic-sqlserver-source"));
    }

    private static String hash(byte[] value) throws Exception { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value)); }
    private long rowCount(String table) { return targetJdbc().queryForObject("SELECT count(*) FROM " + table, Long.class); }
    private long largeObjects() { return targetJdbc().queryForObject("SELECT count(*) FROM pg_largeobject_metadata", Long.class); }
    private static String sourceTable(String scenario) { return "dbo." + uniqueName(scenario); }
    private static String targetTable(String scenario) { return "public." + uniqueName(scenario); }
    private static String uniqueName(String scenario) { return "tb_sqlserver_etl_" + scenario + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8); }
}
