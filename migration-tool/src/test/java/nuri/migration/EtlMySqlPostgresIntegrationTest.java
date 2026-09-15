package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.model.MappingSpec;
import nuri.migration.state.RowChecksum;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Direct engine rehearsal; it does not qualify the public MySQL workflow for COMMIT. */
class EtlMySqlPostgresIntegrationTest extends MySqlPostgresTestSupport {
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void actualDriverUsesEnabledCursorAndStreamsWhenCursorSettingsAreDisabled() throws Exception {
        String table = sourceTable("fetch");
        sourceJdbc().execute("CREATE TABLE " + table + " (id bigint PRIMARY KEY, payload longtext) ENGINE=InnoDB");
        sourceJdbc().update("INSERT INTO " + table + " VALUES (1, '본문🙂-')");
        String sql = "SELECT payload FROM " + table;
        try (var connection = MYSQL.createConnection("");
             var statement = nuri.migration.jdbc.SourceReadStatements.prepare(connection, sql)) {
            assertThat(statement.getFetchSize()).isEqualTo(1);
            try (var rows = statement.executeQuery()) {
                assertThat(rows.next()).isTrue();
                assertThat(nuri.migration.jdbc.JdbcLobReader.read(rows, 1)).isEqualTo("본문🙂-");
                assertThat(rows.next()).isFalse();
            }
        }
        String withoutCursor = MYSQL.getJdbcUrl().replace("useCursorFetch=true", "useCursorFetch=false");
        assertThat(withoutCursor).isNotEqualTo(MYSQL.getJdbcUrl());
        try (var connection = java.sql.DriverManager.getConnection(withoutCursor, MYSQL.getUsername(), MYSQL.getPassword());
             var statement = nuri.migration.jdbc.SourceReadStatements.prepare(connection, sql)) {
            assertThat(statement.getFetchSize()).isEqualTo(Integer.MIN_VALUE);
            try (var rows = statement.executeQuery()) {
                assertThat(rows.next()).isTrue();
                assertThat(nuri.migration.jdbc.JdbcLobReader.read(rows, 1)).isEqualTo("본문🙂-");
                assertThat(rows.next()).isFalse();
            }
        }
    }

    @Test
    void scalarLoadRollsBackFailedRowResumesAcrossPagesAndDetectsTargetTampering() throws Exception {
        String source = sourceTable("resume");
        String target = targetTable("resume");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload varchar(200)) ENGINE=InnoDB");
        try (var connection = MYSQL.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (?, ?)")) {
            for (int id = 1; id <= 1001; id++) {
                insert.setLong(1, id);
                insert.setString(2, "original-" + id);
                insert.addBatch();
            }
            assertThat(insert.executeBatch()).hasSize(1001);
        }
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text, "
                + "CHECK (id <> 501 OR payload = 'fixed'))");
        String run = "mysql-scalar-recovery";
        var spec = mapping(source, target, run, null);

        assertThat(execute(spec, MigrationMode.DRY_RUN)).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(1001);
            assertThat(result.transformed()).isEqualTo(1001);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).isEmpty();
        });
        assertThat(rowCount(target)).isZero();

        var partial = execute(spec, MigrationMode.COMMIT);
        assertThat(partial).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(1001);
            assertThat(result.written()).isEqualTo(1000);
            assertThat(result.errors()).hasSize(1);
        });
        assertThat(verifier.verify(spec, partial, targetJdbc()).ok()).isFalse();
        assertThat(rowCount(target)).isEqualTo(1000);
        assertThat(checkpoints(run)).isEqualTo(1000);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target + " WHERE id=501", Long.class)).isZero();

        sourceJdbc().update("UPDATE " + source + " SET payload='fixed' WHERE id=501");
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1001);
        assertThat(targetJdbc().queryForList("SELECT payload FROM " + target + " ORDER BY id", String.class))
                .isEqualTo(sourceJdbc().queryForList("SELECT payload FROM " + source + " ORDER BY id", String.class));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1001);
        assertThat(rowCount(target)).isEqualTo(1001);
        targetJdbc().update("UPDATE " + target + " SET payload='tampered' WHERE id=1");
        assertThat(verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    @Test
    void realLargeLongBlobPreservesFullContentsEmptyAndNullAndDetectsLastByteTampering() throws Exception {
        String source = sourceTable("blob");
        String target = targetTable("blob");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longblob) ENGINE=InnoDB");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload bytea)");
        byte[] payload = new byte[16 * 1024 * 1024];
        for (int i = 0; i < payload.length; i++) payload[i] = (byte) (i * 31 + i / 251);
        try (var connection = MYSQL.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (1, ?)")) {
            insert.setBinaryStream(1, new ByteArrayInputStream(payload), payload.length);
            assertThat(insert.executeUpdate()).isEqualTo(1);
        }
        assertThat(Arrays.equals(sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", byte[].class), payload))
                .as("complete LONGBLOB content survives fixture upload").isTrue();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2, NULL), (3, X'')");
        var spec = mapping(source, target, "mysql-blob-rehearsal", null);
        long largeObjectsBefore = largeObjects();

        assertThat(execute(spec, MigrationMode.DRY_RUN)).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(3);
            assertThat(result.transformed()).isEqualTo(3);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).isEmpty();
        });
        assertThat(rowCount(target)).isZero();
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(Arrays.equals(payload, targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", byte[].class)))
                .as("all 16 MiB of LONGBLOB are copied to bytea").isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL FROM " + target + " WHERE id=2", Boolean.class)).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT octet_length(payload) FROM " + target + " WHERE id=3", Integer.class)).isZero();
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(rowCount(target)).isEqualTo(3);
        targetJdbc().update("UPDATE " + target + " SET payload=set_byte(payload, octet_length(payload)-1, ?) WHERE id=1",
                (payload[payload.length - 1] ^ 1) & 0xff);
        var tampered = verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc());
        assertThat(tampered.ok()).isFalse();
        assertThat(tampered.toSummary()).contains("checksum");
        assertThat(checkpoints(spec.run().runId())).isEqualTo(3);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void realLargeUnicodeLongTextPreservesContentsEmptyAndNullAndDetectsLastCharacterTampering() throws Exception {
        String source = sourceTable("text");
        String target = targetTable("text");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        String payload = "본문🙂-".repeat(1_048_576);
        // The first long character-stream fixture upload failed the complete source-content assertion.
        // Seed on the server, then keep the complete source-content assertion before testing the reader.
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, REPEAT(?, ?))", "본문🙂-", 1_048_576);
        assertThat(payload.equals(sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", String.class)))
                .as("complete supplementary Unicode content survives fixture upload").isTrue();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2, NULL), (3, '')");
        var spec = mapping(source, target, "mysql-text-rehearsal", null);
        long largeObjectsBefore = largeObjects();

        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(payload.equals(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class)))
                .as("complete 11 MiB UTF-8 LONGTEXT is copied to text").isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL FROM " + target + " WHERE id=2", Boolean.class)).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT length(payload) FROM " + target + " WHERE id=3", Integer.class)).isZero();
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(rowCount(target)).isEqualTo(3);
        targetJdbc().update("UPDATE " + target + " SET payload=left(payload, char_length(payload)-1) || '!' WHERE id=1");
        var tampered = verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc());
        assertThat(tampered.ok()).isFalse();
        assertThat(tampered.toSummary()).contains("checksum");
        assertThat(checkpoints(spec.run().runId())).isEqualTo(3);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void oversizedLongBlobIsRejectedBeforeWritingAnyRowOrCheckpoint() {
        String source = sourceTable("blob_limit");
        String target = targetTable("blob_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longblob) ENGINE=InnoDB");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload bytea)");
        long size = JdbcLobReader.MAX_BLOB_BYTES + 1L;
        // Build the fixture on the disposable server, without an oversized Java upload array.
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, REPEAT(X'00', ?))", size);
        assertThat(sourceJdbc().queryForObject("SELECT octet_length(payload) FROM " + source, Long.class)).isEqualTo(size);
        assertSizeRejected(mapping(source, target, "mysql-blob-too-large", null));
    }

    @Test
    void oversizedLongTextIsRejectedBeforeWritingAnyRowOrCheckpoint() {
        String source = sourceTable("text_limit");
        String target = targetTable("text_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        long size = JdbcLobReader.MAX_CLOB_CHARACTERS + 1L;
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, REPEAT('a', ?))", size);
        assertThat(sourceJdbc().queryForObject("SELECT char_length(payload) FROM " + source, Long.class)).isEqualTo(size);
        assertSizeRejected(mapping(source, target, "mysql-text-too-large", null));
    }

    @Test
    void longFieldBatchFailureRetriesCompleteContentsAndResumesOnlyRejectedRow() throws Exception {
        String source = sourceTable("lob_retry");
        String target = targetTable("lob_retry");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, body longblob, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, body bytea, payload text, "
                + "CHECK (id <> 2 OR left(payload, 5) = 'fixed'))");
        byte[] binary = new byte[512 * 1024];
        for (int i = 0; i < binary.length; i++) binary[i] = (byte) (i * 31);
        String text = "본문🙂-".repeat(16_384);
        try (var connection = MYSQL.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (?, ?, ?)")) {
            for (int id = 1; id <= 3; id++) {
                insert.setLong(1, id);
                insert.setBytes(2, binary);
                insert.setString(3, text);
                assertThat(insert.executeUpdate()).isEqualTo(1);
            }
        }
        var table = new MappingSpec.TableMapping(source, target, null, "id", "id", List.of(
                new MappingSpec.ColumnMapping("id", "id", null, null, null, null, null),
                new MappingSpec.ColumnMapping("body", "body", null, null, null, null, null),
                new MappingSpec.ColumnMapping("payload", "payload", null, null, null, null, null)), null);
        var spec = new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext("mysql-lob-retry", "synthetic-mysql-source"));
        var failed = execute(spec, MigrationMode.COMMIT);
        assertThat(failed.getFirst().written()).isEqualTo(2);
        assertThat(failed.getFirst().errors()).hasSize(1);
        assertThat(checkpoints(spec.run().runId())).isEqualTo(2);
        assertThat(verifier.verify(spec, failed, targetJdbc()).ok()).isFalse();
        assertThat(targetJdbc().queryForList("SELECT id FROM " + target + " ORDER BY id", Long.class)).containsExactly(1L, 3L);
        sourceJdbc().update("UPDATE " + source + " SET payload=CONCAT('fixed', payload) WHERE id=2");

        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        for (int id = 1; id <= 3; id++) {
            assertThat(Arrays.equals(binary, targetJdbc().queryForObject("SELECT body FROM " + target + " WHERE id=?", byte[].class, id)))
                    .isTrue();
            assertThat((id == 2 ? "fixed" + text : text).equals(targetJdbc().queryForObject(
                    "SELECT payload FROM " + target + " WHERE id=?", String.class, id))).isTrue();
        }
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(rowCount(target)).isEqualTo(3);
    }

    @Test
    void longTextTransformationCheckpointsTransformedContents() {
        String source = sourceTable("text_trim");
        String target = targetTable("text_trim");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        String original = "  본문🙂-trim  ";
        String expected = original.trim();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, ?)", original);
        var table = new MappingSpec.TableMapping(source, target, null, "id", "id", List.of(
                new MappingSpec.ColumnMapping("id", "id", null, null, null, null, null),
                new MappingSpec.ColumnMapping("payload", "payload", "trim", null, null, null, null)), null);
        var spec = new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext("mysql-text-transform", "synthetic-mysql-source"));

        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class)).isEqualTo(expected);
        var columns = EtlExecutor.canonicalTargetColumns(table);
        assertThat(targetJdbc().queryForObject(
                "SELECT row_checksum FROM migration_control.tb_migration_checkpoint WHERE run_id=? AND source_key='1'",
                String.class, spec.run().runId()))
                .isEqualTo(RowChecksum.calculate(columns, Map.of("id", 1L, "payload", expected)))
                .isNotEqualTo(RowChecksum.calculate(columns, Map.of("id", 1L, "payload", original)));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1);
        assertThat(rowCount(target)).isEqualTo(1);
    }

    private void assertSizeRejected(MappingSpec spec) {
        long largeObjectsBefore = largeObjects();
        var results = execute(spec, MigrationMode.COMMIT);
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.written()).isZero();
            assertThat(result.errors()).singleElement().asString().contains("LOB_SIZE_LIMIT_EXCEEDED");
        });
        assertThat(rowCount(spec.tables().getFirst().target())).isZero();
        assertThat(checkpoints(spec.run().runId())).isZero();
        assertThat(verifier.verify(spec, results, targetJdbc()).ok()).isFalse();
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    private long rowCount(String table) {
        return targetJdbc().queryForObject("SELECT count(*) FROM " + table, Long.class);
    }

    private long largeObjects() {
        return targetJdbc().queryForObject("SELECT count(*) FROM pg_largeobject_metadata", Long.class);
    }

    private static String sourceTable(String suffix) {
        return "migration_fixture.tb_etl_mysql_" + suffix + "_" + uniqueSuffix();
    }

    private static String targetTable(String suffix) {
        return "public.tb_etl_mysql_" + suffix + "_" + uniqueSuffix();
    }

    private static String uniqueSuffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
