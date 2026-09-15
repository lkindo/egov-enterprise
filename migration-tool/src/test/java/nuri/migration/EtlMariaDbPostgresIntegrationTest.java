package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.jdbc.SourceReadStatements;
import nuri.migration.model.MappingSpec;
import nuri.migration.state.RowChecksum;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.sql.ResultSet;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Separate MariaDB driver/engine rehearsal; public COMMIT qualification is not implied. */
class EtlMariaDbPostgresIntegrationTest extends MariaDbPostgresTestSupport {
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void actualDriverUsesPositiveFetchSizeWithoutMysqlCursorUrlSettings() throws Exception {
        String source = sourceTable("fetch");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, '본문🙂-')");
        try (var connection = MARIADB.createConnection("");
             var statement = SourceReadStatements.prepare(connection, "SELECT payload FROM " + source)) {
            assertThat(statement.getFetchSize()).isEqualTo(1);
            assertThat(statement.getResultSetType()).isEqualTo(ResultSet.TYPE_FORWARD_ONLY);
            assertThat(statement.getResultSetConcurrency()).isEqualTo(ResultSet.CONCUR_READ_ONLY);
            try (var rows = statement.executeQuery()) {
                assertThat(rows.next()).isTrue();
                assertThat(JdbcLobReader.read(rows, 1)).isEqualTo("본문🙂-");
                assertThat(rows.next()).isFalse();
            }
        }
    }

    @Test
    void maxRowsLimitsRowsSentByTheServerInsteadOfDiscardingACompleteClientResult() throws Exception {
        String source = sourceTable("server_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload varchar(20)) ENGINE=InnoDB");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,'row-1'), (2,'row-2'), (3,'row-3'), (4,'row-4'),"
                + " (5,'row-5'), (6,'row-6'), (7,'row-7'), (8,'row-8'), (9,'row-9'), (10,'row-10')");
        // Use a different JDBC connection to establish physical fixture size without changing the measured session.
        assertThat(sourceJdbc().queryForObject("SELECT count(*) FROM " + source, Long.class)).isEqualTo(10);
        int limit = 2;
        try (Connection connection = MARIADB.createConnection("")) {
            RowsSentSample before = rowsSent(connection);
            // MariaDB restores the session status snapshot after SHOW; its own status row is not retained.
            assertThat(rowsSent(connection).sent()).isEqualTo(before.sent());
            int observedRows = 0;
            try (var statement = SourceReadStatements.prepare(connection, "SELECT id FROM " + source + " ORDER BY id")) {
                assertThat(statement.getFetchSize()).isEqualTo(1);
                assertThat(statement.getResultSetType()).isEqualTo(ResultSet.TYPE_FORWARD_ONLY);
                assertThat(statement.getResultSetConcurrency()).isEqualTo(ResultSet.CONCUR_READ_ONLY);
                statement.setMaxRows(limit);
                try (var rows = statement.executeQuery()) {
                    while (rows.next()) observedRows++;
                }
            }
            RowsSentSample after = rowsSent(connection);
            assertThat(observedRows).isEqualTo(limit);
            // The session counter delta contains this SELECT's server result, excluding the SHOW probes.
            long delta = after.sent() - before.sent();
            System.out.printf("MariaDB server row-limit rehearsal: selectedRows=%d; serverRowsSentDelta=%d; statusRows=%d%n",
                    observedRows, delta, before.returnedRows());
            assertThat(delta).isEqualTo(limit);
        }
    }

    @Test
    void scalarLoadPreservesOneThousandCommittedRowsResumesRejectedRowAndDetectsTampering() throws Exception {
        String source = sourceTable("resume");
        String target = targetTable("resume");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload varchar(200)) ENGINE=InnoDB");
        try (var connection = MARIADB.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (?, ?)")) {
            for (int id = 1; id <= 1001; id++) {
                insert.setLong(1, id);
                insert.setString(2, "original-" + id);
                insert.addBatch();
            }
            assertThat(insert.executeBatch()).hasSize(1001);
        }
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text, CHECK (id <> 501 OR payload='fixed'))");
        var spec = mapping(source, target, "mariadb-scalar-recovery", null);
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
        assertThat(rowCount(target)).isEqualTo(1000);
        assertThat(checkpoints(spec.run().runId())).isEqualTo(1000);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target + " WHERE id=501", Long.class)).isZero();
        assertThat(verifier.verify(spec, partial, targetJdbc()).ok()).isFalse();
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
    void sixteenMiBLongBlobPreservesCompleteBytesNullAndEmptyAndDetectsLastByteChange() throws Exception {
        String source = sourceTable("blob");
        String target = targetTable("blob");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longblob) ENGINE=InnoDB");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload bytea)");
        byte[] original = new byte[16 * 1024 * 1024];
        for (int index = 0; index < original.length; index++) original[index] = (byte) (index * 31 + index / 251);
        try (var connection = MARIADB.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (1, ?)")) {
            insert.setBinaryStream(1, new ByteArrayInputStream(original), original.length);
            assertThat(insert.executeUpdate()).isEqualTo(1);
        }
        assertThat(Arrays.equals(original, sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", byte[].class)))
                .as("complete MariaDB binary fixture survives upload").isTrue();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2, NULL), (3, X'')");
        var spec = mapping(source, target, "mariadb-longblob", null);
        long largeObjectsBefore = largeObjects();
        assertThat(execute(spec, MigrationMode.DRY_RUN)).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(3);
            assertThat(result.transformed()).isEqualTo(3);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).isEmpty();
        });
        assertThat(rowCount(target)).isZero();
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(Arrays.equals(original, targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", byte[].class)))
                .as("all 16 MiB of LONGBLOB reach bytea").isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL FROM " + target + " WHERE id=2", Boolean.class)).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT octet_length(payload) FROM " + target + " WHERE id=3", Integer.class)).isZero();
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(rowCount(target)).isEqualTo(3);
        targetJdbc().update("UPDATE " + target + " SET payload=set_byte(payload, octet_length(payload)-1, ?) WHERE id=1",
                (original[original.length - 1] ^ 1) & 0xff);
        var tampered = verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc());
        assertThat(tampered.ok()).isFalse();
        assertThat(tampered.toSummary()).contains("checksum");
        assertThat(checkpoints(spec.run().runId())).isEqualTo(3);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void elevenMiBUtf8LongTextPreservesCompleteUnicodeNullAndEmptyAndDetectsLastCharacterChange() {
        String source = sourceTable("text");
        String target = targetTable("text");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        String original = "본문🙂-".repeat(1_048_576);
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, REPEAT(?, ?))", "본문🙂-", 1_048_576);
        assertThat(original.equals(sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", String.class)))
                .as("complete Unicode fixture is checked before migration").isTrue();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2, NULL), (3, '')");
        var spec = mapping(source, target, "mariadb-longtext", null);
        long largeObjectsBefore = largeObjects();
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(original.equals(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class)))
                .as("all Unicode content reaches PostgreSQL text").isTrue();
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
    void oversizedLongBlobIsRejectedWithoutTargetRowsOrCheckpoints() {
        String source = sourceTable("blob_limit");
        String target = targetTable("blob_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longblob) ENGINE=InnoDB");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload bytea)");
        long length = JdbcLobReader.MAX_BLOB_BYTES + 1L;
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, REPEAT(X'00', ?))", length);
        assertThat(sourceJdbc().queryForObject("SELECT octet_length(payload) FROM " + source, Long.class)).isEqualTo(length);
        assertSizeRejected(mapping(source, target, "mariadb-blob-limit", null));
    }

    @Test
    void oversizedLongTextIsRejectedWithoutTargetRowsOrCheckpoints() {
        String source = sourceTable("text_limit");
        String target = targetTable("text_limit");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        long length = JdbcLobReader.MAX_CLOB_CHARACTERS + 1L;
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, REPEAT('a', ?))", length);
        assertThat(sourceJdbc().queryForObject("SELECT char_length(payload) FROM " + source, Long.class)).isEqualTo(length);
        assertSizeRejected(mapping(source, target, "mariadb-text-limit", null));
    }

    @Test
    void binaryAndTextBatchFailureRetainsDetachedValuesAndResumesOnlyRejectedRow() throws Exception {
        String source = sourceTable("lob_retry");
        String target = targetTable("lob_retry");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, body longblob, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, body bytea, payload text, CHECK (id <> 2 OR left(payload,5)='fixed'))");
        byte[] binary = new byte[512 * 1024];
        for (int index = 0; index < binary.length; index++) binary[index] = (byte) (index * 31);
        String text = "본문🙂-".repeat(16_384);
        try (var connection = MARIADB.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (?, ?, ?)")) {
            for (int id = 1; id <= 3; id++) {
                insert.setLong(1, id);
                insert.setBytes(2, binary);
                insert.setString(3, text);
                assertThat(insert.executeUpdate()).isEqualTo(1);
            }
        }
        var table = new MappingSpec.TableMapping(source, target, null, "id", "id", List.of(
                column("id", "long", null), column("body", null, null), column("payload", null, null)), null);
        var spec = spec(table, "mariadb-lob-retry");
        var failed = execute(spec, MigrationMode.COMMIT);
        assertThat(failed.getFirst().written()).isEqualTo(2);
        assertThat(failed.getFirst().errors()).hasSize(1);
        assertThat(checkpoints(spec.run().runId())).isEqualTo(2);
        assertThat(verifier.verify(spec, failed, targetJdbc()).ok()).isFalse();
        assertThat(targetJdbc().queryForList("SELECT id FROM " + target + " ORDER BY id", Long.class)).containsExactly(1L, 3L);
        sourceJdbc().update("UPDATE " + source + " SET payload=CONCAT('fixed', payload) WHERE id=2");
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        for (int id = 1; id <= 3; id++) {
            assertThat(Arrays.equals(binary, targetJdbc().queryForObject("SELECT body FROM " + target + " WHERE id=?", byte[].class, id))).isTrue();
            assertThat((id == 2 ? "fixed" + text : text).equals(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=?", String.class, id))).isTrue();
        }
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(rowCount(target)).isEqualTo(3);
    }

    @Test
    void longTextTransformationCheckpointsTheTransformedBody() {
        String source = sourceTable("trim");
        String target = targetTable("trim");
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload longtext) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        String original = "  본문🙂-trim  ";
        String expected = original.trim();
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, ?)", original);
        var table = new MappingSpec.TableMapping(source, target, null, "id", "id", List.of(
                column("id", "long", null), column("payload", null, "trim")), null);
        var spec = spec(table, "mariadb-text-transform");
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class)).isEqualTo(expected);
        var columns = EtlExecutor.canonicalTargetColumns(table);
        assertThat(targetJdbc().queryForObject("SELECT row_checksum FROM migration_control.tb_migration_checkpoint WHERE run_id=? AND source_key='1'",
                String.class, spec.run().runId()))
                .isEqualTo(RowChecksum.calculate(columns, Map.of("id", 1L, "payload", expected)))
                .isNotEqualTo(RowChecksum.calculate(columns, Map.of("id", 1L, "payload", original)));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 1);
        assertThat(rowCount(target)).isEqualTo(1);
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

    private long rowCount(String table) { return targetJdbc().queryForObject("SELECT count(*) FROM " + table, Long.class); }
    private long largeObjects() { return targetJdbc().queryForObject("SELECT count(*) FROM pg_largeobject_metadata", Long.class); }
    private static MappingSpec.ColumnMapping column(String name, String type, String transform) {
        return new MappingSpec.ColumnMapping(name, name, transform, type, null, null, null);
    }
    private static MappingSpec spec(MappingSpec.TableMapping table, String run) {
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext(run, "synthetic-mariadb-source"));
    }
    private static String sourceTable(String scenario) { return MARIADB.getDatabaseName() + "." + uniqueName(scenario); }
    private static String targetTable(String scenario) { return "public." + uniqueName(scenario); }
    private static String uniqueName(String scenario) {
        return "tb_etl_mariadb_" + scenario + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private static RowsSentSample rowsSent(Connection connection) throws SQLException {
        try (var statement = connection.createStatement();
             var rows = statement.executeQuery("SHOW SESSION STATUS LIKE 'Rows_sent'")) {
            assertThat(rows.next()).isTrue();
            long sent = rows.getLong(2);
            assertThat(rows.next()).isFalse();
            return new RowsSentSample(sent, 1);
        }
    }

    private record RowsSentSample(long sent, int returnedRows) { }
}
