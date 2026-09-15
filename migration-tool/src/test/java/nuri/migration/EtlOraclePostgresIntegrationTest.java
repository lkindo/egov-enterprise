package nuri.migration;

import nuri.migration.adapter.OracleSourceAdapter;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.state.RowChecksum;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.sql.Blob;
import java.sql.Clob;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Engine qualification below the CLI approval gate; this does not authorize Oracle workflow commit. */
class EtlOraclePostgresIntegrationTest extends OraclePostgresTestSupport {
    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void scalarLoadRollsBackFailedRowResumesAcrossPagesAndDetectsTargetTampering() {
        var source = sourceJdbc();
        var target = targetJdbc();
        source.execute("CREATE TABLE LEGACY_RESUME (ID NUMBER(19) PRIMARY KEY, PAYLOAD VARCHAR2(200 CHAR))");
        source.execute("INSERT INTO LEGACY_RESUME SELECT LEVEL, 'original-' || TO_CHAR(LEVEL) FROM DUAL CONNECT BY LEVEL <= 1001");
        target.execute("CREATE TABLE public.tb_oracle_resume (id bigint PRIMARY KEY, payload text, "
                + "CONSTRAINT ck_oracle_resume CHECK (id <> 501 OR payload = 'fixed'))");
        var mapping = mapping("LEGACY_RESUME", "public.tb_oracle_resume", "scalar-recovery", null);

        var dry = execute(mapping, MigrationMode.DRY_RUN);
        assertThat(dry).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(1001);
            assertThat(result.transformed()).isEqualTo(1001);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).isEmpty();
        });
        assertThat(target.queryForObject("SELECT count(*) FROM public.tb_oracle_resume", Long.class)).isZero();

        var partial = execute(mapping, MigrationMode.COMMIT);
        assertThat(verifier.verify(mapping, partial, target).ok()).isFalse();
        assertThat(partial.getFirst().errors()).isNotEmpty();
        // Per-row fallback rolls back ID 501 and commits all other rows, including the final page.
        long durable = target.queryForObject("SELECT count(*) FROM public.tb_oracle_resume", Long.class);
        assertThat(durable).isEqualTo(1000);
        assertThat(partial.getFirst().read()).isEqualTo(1001);
        assertThat(partial.getFirst().written()).isEqualTo(1000);
        assertThat(partial.getFirst().errors()).hasSize(1);
        assertThat(checkpoints("scalar-recovery")).isEqualTo(durable);
        assertThat(target.queryForObject("SELECT count(*) FROM public.tb_oracle_resume WHERE id=501", Long.class)).isZero();

        source.update("UPDATE LEGACY_RESUME SET PAYLOAD='fixed' WHERE ID=501");
        var resumed = execute(mapping, MigrationMode.COMMIT);
        var report = verifier.verify(mapping, resumed, target);
        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(target.queryForObject("SELECT count(*) FROM public.tb_oracle_resume", Long.class)).isEqualTo(1001);
        assertThat(checkpoints("scalar-recovery")).isEqualTo(1001);
        assertThat(target.queryForList("SELECT payload FROM public.tb_oracle_resume ORDER BY id", String.class))
                .isEqualTo(source.queryForList("SELECT PAYLOAD FROM LEGACY_RESUME ORDER BY ID", String.class));
        assertThat(verifier.verify(mapping, execute(mapping, MigrationMode.COMMIT), target).ok()).isTrue();
        assertThat(target.queryForObject("SELECT count(*) FROM public.tb_oracle_resume", Long.class)).isEqualTo(1001);
        target.update("UPDATE public.tb_oracle_resume SET payload='tampered' WHERE id=1");
        assertThat(verifier.verify(mapping, execute(mapping, MigrationMode.COMMIT), target).ok()).isFalse();
    }

    @Test
    void realLargeBlobLoadsAsByteaPreservesEmptyAndNullResumesAndDetectsLastByteTampering() throws Exception {
        sourceJdbc().execute("CREATE TABLE LEGACY_BLOB (ID NUMBER(19) PRIMARY KEY, PAYLOAD BLOB)");
        targetJdbc().execute("CREATE TABLE public.tb_oracle_blob (id bigint PRIMARY KEY, payload bytea)");
        byte[] payload = new byte[16 * 1024 * 1024];
        for (int i = 0; i < payload.length; i++) payload[i] = (byte) (i * 31 + i / 251);
        try (var connection = ORACLE.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO LEGACY_BLOB VALUES (?, ?)")) {
            insert.setLong(1, 1);
            insert.setBinaryStream(2, new ByteArrayInputStream(payload), payload.length);
            assertThat(insert.executeUpdate()).isEqualTo(1);
            try (var query = connection.createStatement(); var rows = query.executeQuery("SELECT PAYLOAD FROM LEGACY_BLOB")) {
                assertThat(rows.next()).isTrue();
                Blob blob = (Blob) rows.getObject(1);
                try {
                    assertThat(blob.length()).isEqualTo(payload.length);
                    try (var stream = blob.getBinaryStream()) {
                        assertThat(java.util.Arrays.equals(stream.readAllBytes(), payload))
                                .as("complete BLOB content survives fixture seeding").isTrue();
                    }
                } finally { blob.free(); }
            }
        }
        sourceJdbc().update("INSERT INTO LEGACY_BLOB VALUES (2, NULL)");
        sourceJdbc().update("INSERT INTO LEGACY_BLOB VALUES (3, EMPTY_BLOB())");
        var mapping = mapping("LEGACY_BLOB", "public.tb_oracle_blob", "blob-rehearsal", null);
        long largeObjectsBefore = largeObjects();
        var dry = execute(mapping, MigrationMode.DRY_RUN);
        assertThat(dry).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(3);
            assertThat(result.transformed()).isEqualTo(3);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).isEmpty();
        });
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM public.tb_oracle_blob", Long.class)).isZero();

        var results = execute(mapping, MigrationMode.COMMIT);
        assertSuccessfulLoad(mapping, results, 3);
        byte[] copied = targetJdbc().queryForObject("SELECT payload FROM public.tb_oracle_blob WHERE id=1", byte[].class);
        assertThat(java.util.Arrays.equals(copied, payload))
                .as("complete 16 MiB BLOB is stored in the mapped bytea column").isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL FROM public.tb_oracle_blob WHERE id=2", Boolean.class))
                .isTrue();
        assertThat(targetJdbc().queryForObject("SELECT octet_length(payload) FROM public.tb_oracle_blob WHERE id=3", Integer.class))
                .isZero();
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);

        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 3);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM public.tb_oracle_blob", Long.class)).isEqualTo(3);
        targetJdbc().update("UPDATE public.tb_oracle_blob SET payload=set_byte(payload, octet_length(payload)-1, ?) WHERE id=1",
                (payload[payload.length - 1] ^ 1) & 0xff);
        var tampered = verifier.verify(mapping, execute(mapping, MigrationMode.COMMIT), targetJdbc());
        assertThat(tampered.ok()).isFalse();
        assertThat(tampered.toSummary()).contains("checksum");
        assertThat(checkpoints("blob-rehearsal")).isEqualTo(3);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void oversizedRealOracleBlobFailsWithSizeReasonBeforeWritingAnyTargetRowOrCheckpoint() throws Exception {
        sourceJdbc().execute("CREATE TABLE LEGACY_BLOB_TOO_LARGE (ID NUMBER(19) PRIMARY KEY, PAYLOAD BLOB)");
        targetJdbc().execute("CREATE TABLE public.tb_oracle_blob_too_large (id bigint PRIMARY KEY, payload bytea)");
        long length = JdbcLobReader.MAX_BLOB_BYTES + 1L;
        // Generate bytes into the driver's upload buffer, without allocating a second oversized fixture array.
        try (var connection = ORACLE.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO LEGACY_BLOB_TOO_LARGE VALUES (1, ?)");
             InputStream zeros = new InputStream() {
                 private long remaining = length;

                 @Override
                 public int read() {
                     if (remaining == 0) return -1;
                     remaining--;
                     return 0;
                 }

                 @Override
                 public int read(byte[] bytes, int offset, int requested) {
                     java.util.Objects.checkFromIndexSize(offset, requested, bytes.length);
                     if (requested == 0) return 0;
                     if (remaining == 0) return -1;
                     int supplied = (int) Math.min(requested, remaining);
                     java.util.Arrays.fill(bytes, offset, offset + supplied, (byte) 0);
                     remaining -= supplied;
                     return supplied;
                 }
             }) {
            insert.setBinaryStream(1, zeros, length);
            assertThat(insert.executeUpdate()).isEqualTo(1);
        }
        assertThat(sourceJdbc().queryForObject(
                "SELECT DBMS_LOB.GETLENGTH(PAYLOAD) FROM LEGACY_BLOB_TOO_LARGE WHERE ID=1", Long.class))
                .isEqualTo(length);
        var mapping = mapping("LEGACY_BLOB_TOO_LARGE", "public.tb_oracle_blob_too_large", "blob-too-large", null);
        long largeObjectsBefore = largeObjects();

        var results = execute(mapping, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.written()).isZero();
            assertThat(result.errors()).singleElement().asString().contains("LOB_SIZE_LIMIT_EXCEEDED");
        });
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM public.tb_oracle_blob_too_large", Long.class))
                .isZero();
        assertThat(checkpoints("blob-too-large")).isZero();
        assertThat(verifier.verify(mapping, results, targetJdbc()).ok()).isFalse();
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void realLargeUnicodeClobLoadsAsTextPreservesEmptyAndNullResumesAndDetectsLastCharacterTampering() throws Exception {
        sourceJdbc().execute("CREATE TABLE LEGACY_CLOB (ID NUMBER(19) PRIMARY KEY, PAYLOAD CLOB)");
        targetJdbc().execute("CREATE TABLE public.tb_oracle_clob (id bigint PRIMARY KEY, payload text)");
        String payload = "본문🙂-".repeat(1_048_576);
        // Grow the synthetic LOB inside Oracle so fixture upload buffering cannot alter surrogate pairs.
        sourceJdbc().update("INSERT INTO LEGACY_CLOB VALUES (1, TO_CLOB(?))", "본문🙂-");
        for (int i = 0; i < 20; i++) sourceJdbc().update("UPDATE LEGACY_CLOB SET PAYLOAD=PAYLOAD || PAYLOAD WHERE ID=1");
        try (var connection = ORACLE.createConnection("")) {
            try (var query = connection.createStatement(); var rows = query.executeQuery("SELECT PAYLOAD FROM LEGACY_CLOB")) {
                assertThat(rows.next()).isTrue();
                Clob clob = (Clob) rows.getObject(1);
                try {
                    assertThat(clob.length()).isEqualTo(payload.length());
                    var copy = new java.io.StringWriter();
                    try (var reader = clob.getCharacterStream()) { reader.transferTo(copy); }
                    assertThat(copy.toString().equals(payload))
                            .as("complete Unicode CLOB content survives fixture seeding").isTrue();
                } finally { clob.free(); }
            }
        }
        sourceJdbc().update("INSERT INTO LEGACY_CLOB VALUES (2, NULL)");
        sourceJdbc().update("INSERT INTO LEGACY_CLOB VALUES (3, EMPTY_CLOB())");
        var mapping = mapping("LEGACY_CLOB", "public.tb_oracle_clob", "clob-rehearsal", null);
        long largeObjectsBefore = largeObjects();
        var results = execute(mapping, MigrationMode.COMMIT);
        assertSuccessfulLoad(mapping, results, 3);
        String copied = targetJdbc().queryForObject("SELECT payload FROM public.tb_oracle_clob WHERE id=1", String.class);
        assertThat(payload.equals(copied)).as("complete Unicode CLOB is stored in the mapped text column").isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL FROM public.tb_oracle_clob WHERE id=2", Boolean.class))
                .isTrue();
        assertThat(targetJdbc().queryForObject("SELECT length(payload) FROM public.tb_oracle_clob WHERE id=3", Integer.class))
                .isZero();
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);

        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 3);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM public.tb_oracle_clob", Long.class)).isEqualTo(3);
        targetJdbc().update("UPDATE public.tb_oracle_clob SET payload=left(payload, char_length(payload)-1) || '!' WHERE id=1");
        var tampered = verifier.verify(mapping, execute(mapping, MigrationMode.COMMIT), targetJdbc());
        assertThat(tampered.ok()).isFalse();
        assertThat(tampered.toSummary()).contains("checksum");
        assertThat(checkpoints("clob-rehearsal")).isEqualTo(3);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void lobBatchFailureRetriesDetachedContentsAndResumesOnlyTheRejectedRow() {
        sourceJdbc().execute("CREATE TABLE LEGACY_LOB_RETRY (ID NUMBER(19) PRIMARY KEY, BODY BLOB, PAYLOAD CLOB)");
        targetJdbc().execute("CREATE TABLE public.tb_oracle_lob_retry (id bigint PRIMARY KEY, body bytea, payload text, "
                + "CHECK (id <> 2 OR left(payload, 5) = 'fixed'))");
        byte[] binary = new byte[512 * 1024];
        for (int i = 0; i < binary.length; i++) binary[i] = (byte) (i * 31);
        String text = "본문🙂-".repeat(16_384);
        for (int id = 1; id <= 3; id++) {
            sourceJdbc().update("INSERT INTO LEGACY_LOB_RETRY VALUES (?, ?, TO_CLOB(?))", id, binary, "본문🙂-");
        }
        for (int i = 0; i < 14; i++) sourceJdbc().update("UPDATE LEGACY_LOB_RETRY SET PAYLOAD=PAYLOAD || PAYLOAD");
        var table = new MappingSpec.TableMapping("LEGACY_LOB_RETRY", "public.tb_oracle_lob_retry", null, "ID", "id", List.of(
                new MappingSpec.ColumnMapping("ID", "id", null, null, null, null, null),
                new MappingSpec.ColumnMapping("BODY", "body", null, null, null, null, null),
                new MappingSpec.ColumnMapping("PAYLOAD", "payload", null, "text", null, null, null)), null);
        var mapping = new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext("lob-retry", "synthetic-oracle-source"));
        long largeObjectsBefore = largeObjects();

        var failed = execute(mapping, MigrationMode.COMMIT);
        assertThat(failed.getFirst().written()).isEqualTo(2);
        assertThat(failed.getFirst().errors()).isNotEmpty();
        assertThat(checkpoints("lob-retry")).isEqualTo(2);
        assertThat(verifier.verify(mapping, failed, targetJdbc()).ok()).isFalse();
        assertThat(targetJdbc().queryForList("SELECT id FROM public.tb_oracle_lob_retry ORDER BY id", Long.class))
                .containsExactly(1L, 3L);
        sourceJdbc().update("UPDATE LEGACY_LOB_RETRY SET PAYLOAD=TO_CLOB('fixed') || PAYLOAD WHERE ID=2");

        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 3);
        for (int id = 1; id <= 3; id++) {
            assertThat(java.util.Arrays.equals(binary, targetJdbc().queryForObject(
                    "SELECT body FROM public.tb_oracle_lob_retry WHERE id=?", byte[].class, id))).isTrue();
            assertThat((id == 2 ? "fixed" + text : text).equals(targetJdbc().queryForObject(
                    "SELECT payload FROM public.tb_oracle_lob_retry WHERE id=?", String.class, id))).isTrue();
        }
        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 3);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    @Test
    void clobTransformationRunsOnContentsAndCheckpointsTheTransformedText() {
        sourceJdbc().execute("CREATE TABLE LEGACY_CLOB_TRIM (ID NUMBER(19) PRIMARY KEY, PAYLOAD CLOB)");
        targetJdbc().execute("CREATE TABLE public.tb_oracle_clob_trim (id bigint PRIMARY KEY, payload text)");
        String original = "  본문🙂-trim  ";
        String expected = original.trim();
        sourceJdbc().update("INSERT INTO LEGACY_CLOB_TRIM VALUES (1, TO_CLOB(?))", original);
        var mapping = mapping("LEGACY_CLOB_TRIM", "public.tb_oracle_clob_trim", "clob-transform", null, "trim");
        long largeObjectsBefore = largeObjects();

        var results = execute(mapping, MigrationMode.COMMIT);
        assertSuccessfulLoad(mapping, results, 1);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM public.tb_oracle_clob_trim WHERE id=1", String.class))
                .isEqualTo(expected);
        List<String> columns = EtlExecutor.canonicalTargetColumns(mapping.tables().getFirst());
        String actualChecksum = targetJdbc().queryForObject(
                "SELECT row_checksum FROM migration_control.tb_migration_checkpoint WHERE run_id=? AND source_key=?",
                String.class, "clob-transform", "1");
        assertThat(actualChecksum)
                .isEqualTo(RowChecksum.calculate(columns, Map.of("id", 1L, "payload", expected)))
                .isNotEqualTo(RowChecksum.calculate(columns, Map.of("id", 1L, "payload", original)));
        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 1);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM public.tb_oracle_clob_trim", Long.class)).isEqualTo(1);
        assertThat(largeObjects()).isEqualTo(largeObjectsBefore);
    }

    private void assertSuccessfulLoad(MappingSpec mapping, List<EtlExecutor.TableResult> results, long rows) {
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(rows);
            assertThat(result.transformed()).isEqualTo(rows);
            assertThat(result.written()).isEqualTo(rows);
            assertThat(result.errors()).isEmpty();
        });
        var report = verifier.verify(mapping, results, targetJdbc());
        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(checkpoints(mapping.run().runId())).isEqualTo(rows);
    }

    private long largeObjects() {
        return targetJdbc().queryForObject("SELECT count(*) FROM pg_largeobject_metadata", Long.class);
    }

    private List<EtlExecutor.TableResult> execute(MappingSpec mapping, MigrationMode mode) {
        return executor.execute(mapping, mode, sourceJdbc(), targetJdbc(),
                new OracleSourceAdapter().sourceReadSessionPolicy(), true);
    }

    private long checkpoints(String runId) {
        return targetJdbc().queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint WHERE run_id=?", Long.class, runId);
    }

    private static MappingSpec mapping(String source, String target, String runId, String payloadType) {
        return mapping(source, target, runId, payloadType, null);
    }

    private static MappingSpec mapping(String source, String target, String runId, String payloadType, String transform) {
        var table = new MappingSpec.TableMapping(source, target, null, "ID", "id", List.of(
                new MappingSpec.ColumnMapping("ID", "id", null, null, null, null, null),
                new MappingSpec.ColumnMapping("PAYLOAD", "payload", transform, payloadType, null, null, null)), null);
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext(runId, "synthetic-oracle-source"));
    }
}
