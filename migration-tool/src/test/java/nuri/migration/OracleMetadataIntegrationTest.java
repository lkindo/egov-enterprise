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

import java.math.BigDecimal;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.NClob;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Synthetic physical metadata and engine value evidence; public Oracle commit remains unqualified. */
class OracleMetadataIntegrationTest extends OraclePostgresTestSupport {
    private static final BigDecimal AMOUNT = new BigDecimal("12345678901234567890123456789.123456789");
    private static final BigDecimal INTEGER_MAX = new BigDecimal("99999999999999999999999999999999999999");
    private static final LocalDateTime DATE_TIME = LocalDateTime.of(2026, 9, 16, 12, 34, 56);
    private static final LocalDateTime TIMESTAMP_TIME = DATE_TIME.withNano(123456000);
    private static final OffsetDateTime ZONED_TIME = OffsetDateTime.parse("2026-09-16T12:34:56.123456+09:00");
    private static final byte[] RAW_VALUE = {0, 1, 2, 3, 4, 5, (byte) 0x80, (byte) 0xff};
    private static final String TEXT = "국문🙂-national";
    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void measuresNamespacesJdbcTypesAndValuesAgainstOraclePhysicalColumns() throws Exception {
        String table = name("META");
        sourceJdbc().execute("CREATE TABLE " + table + " (ID NUMBER(19) PRIMARY KEY, AMOUNT NUMBER(38,9),"
                + " INTEGER_VALUE NUMBER(38,0), RAW_VALUE RAW(8), DATE_VALUE DATE, TIME_VALUE TIMESTAMP(6),"
                + " ZONED_VALUE TIMESTAMP(6) WITH TIME ZONE, FLOAT_VALUE BINARY_FLOAT, DOUBLE_VALUE BINARY_DOUBLE,"
                + " BINARY_PAYLOAD BLOB, TEXT_PAYLOAD CLOB, NATIONAL_PAYLOAD NCLOB)");
        try (var connection = ORACLE.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + table + " VALUES (1, ?, ?, ?,"
                     + " TO_DATE('2026-09-16 12:34:56','YYYY-MM-DD HH24:MI:SS'),"
                     + " TIMESTAMP '2026-09-16 12:34:56.123456',"
                     + " TO_TIMESTAMP_TZ('2026-09-16 12:34:56.123456 +09:00','YYYY-MM-DD HH24:MI:SS.FF6 TZH:TZM'),"
                     + " TO_BINARY_FLOAT(1.25), TO_BINARY_DOUBLE(-2.5), ?, TO_CLOB(?), TO_NCLOB(?))")) {
            insert.setBigDecimal(1, AMOUNT);
            insert.setBigDecimal(2, INTEGER_MAX);
            insert.setBytes(3, RAW_VALUE);
            insert.setBytes(4, RAW_VALUE);
            insert.setString(5, TEXT);
            insert.setNString(6, TEXT);
            assertThat(insert.executeUpdate()).isEqualTo(1);
        }
        sourceJdbc().update("INSERT INTO " + table + " (ID) VALUES (2)");
        sourceJdbc().update("INSERT INTO " + table
                + " (ID, BINARY_PAYLOAD, TEXT_PAYLOAD, NATIONAL_PAYLOAD) VALUES (3, EMPTY_BLOB(), EMPTY_CLOB(), TO_NCLOB(EMPTY_CLOB()))");
        Map<String, Integer> types = new LinkedHashMap<>();
        Map<String, Integer> sizes = new LinkedHashMap<>();
        Map<String, Integer> scales = new LinkedHashMap<>();
        try (var connection = ORACLE.createConnection("")) {
            var metadata = connection.getMetaData();
            assertThat(metadata.getDatabaseProductName()).isEqualTo("Oracle");
            String selected19c = System.getenv("MIGRATION_ORACLE19C_IMAGE");
            if (selected19c != null && !selected19c.isBlank()) {
                assertThat(metadata.getDatabaseMajorVersion()).isEqualTo(19);
            }
            assertThat(connection.getCatalog()).isNull();
            String schema = connection.getSchema();
            assertThat(schema).isEqualTo(ORACLE.getUsername().toUpperCase(Locale.ROOT));
            assertThat(sourceJdbc().queryForObject("SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') FROM DUAL", String.class))
                    .isEqualTo(schema);
            try (var columns = metadata.getColumns(null, escapedPattern(schema, metadata.getSearchStringEscape()),
                    escapedPattern(table, metadata.getSearchStringEscape()), "%")) {
                while (columns.next()) {
                    String catalog = columns.getString("TABLE_CAT");
                    String owner = columns.getString("TABLE_SCHEM");
                    String actualTable = columns.getString("TABLE_NAME");
                    String column = columns.getString("COLUMN_NAME");
                    int type = columns.getInt("DATA_TYPE");
                    String nativeType = columns.getString("TYPE_NAME");
                    int size = columns.getInt("COLUMN_SIZE");
                    int scale = columns.getInt("DECIMAL_DIGITS");
                    int nullable = columns.getInt("NULLABLE");
                    assertThat(catalog).isNull();
                    assertThat(owner).isEqualTo(schema);
                    assertThat(actualTable).isEqualTo(table);
                    assertThat(types.put(column, type)).isNull();
                    sizes.put(column, size);
                    scales.put(column, scale);
                    assertThat(nullable).isEqualTo(column.equals("ID") ? 0 : 1);
                    System.out.printf("Oracle JDBC metadata: column=%s; nativeType=%s; jdbcType=%d; size=%d; scale=%d; nullable=%d%n",
                            column, nativeType, type, size, scale, nullable);
                }
            }
            assertThat(types).hasSize(12).containsEntry("ID", Types.NUMERIC).containsEntry("AMOUNT", Types.NUMERIC)
                    .containsEntry("INTEGER_VALUE", Types.NUMERIC).containsEntry("RAW_VALUE", Types.VARBINARY)
                    .containsEntry("DATE_VALUE", Types.TIMESTAMP).containsEntry("TIME_VALUE", Types.TIMESTAMP)
                    .containsEntry("ZONED_VALUE", -101).containsEntry("FLOAT_VALUE", 100).containsEntry("DOUBLE_VALUE", 101)
                    .containsEntry("BINARY_PAYLOAD", Types.BLOB).containsEntry("TEXT_PAYLOAD", Types.CLOB)
                    .containsEntry("NATIONAL_PAYLOAD", Types.NCLOB);
            assertThat(sizes).containsEntry("AMOUNT", 38).containsEntry("INTEGER_VALUE", 38).containsEntry("RAW_VALUE", 8);
            assertThat(scales).containsEntry("AMOUNT", 9).containsEntry("INTEGER_VALUE", 0)
                    .containsEntry("TIME_VALUE", 6).containsEntry("ZONED_VALUE", 6);
            try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT * FROM " + table + " ORDER BY ID")) {
                assertThat(rows.next()).isTrue();
                var resultMetadata = rows.getMetaData();
                assertThat(resultMetadata.getColumnCount()).isEqualTo(12);
                Map<String, Object> values = new LinkedHashMap<>();
                for (int index = 1; index <= resultMetadata.getColumnCount(); index++) {
                    String column = resultMetadata.getColumnName(index);
                    Object value = rows.getObject(index);
                    assertThat(value).isNotNull();
                    assertThat(resultMetadata.getColumnType(index)).isEqualTo(types.get(column));
                    if (column.equals("BINARY_PAYLOAD")) assertThat(value).isInstanceOf(Blob.class);
                    if (column.equals("TEXT_PAYLOAD")) assertThat(value).isInstanceOf(Clob.class);
                    if (column.equals("NATIONAL_PAYLOAD")) assertThat(value).isInstanceOf(NClob.class);
                    values.put(column, JdbcLobReader.detach(value));
                    System.out.printf("Oracle JDBC value representation: column=%s; class=%s; jdbcType=%d; precision=%d; scale=%d%n",
                            column, value.getClass().getName(), resultMetadata.getColumnType(index),
                            resultMetadata.getPrecision(index), resultMetadata.getScale(index));
                }
                assertThat(values.get("AMOUNT")).isEqualTo(AMOUNT);
                assertThat(values.get("INTEGER_VALUE")).isEqualTo(INTEGER_MAX);
                assertThat((byte[]) values.get("RAW_VALUE")).containsExactly(RAW_VALUE);
                assertThat(values.get("DATE_VALUE")).isEqualTo(Timestamp.valueOf(DATE_TIME));
                assertThat(values.get("TIME_VALUE").getClass().getName()).isEqualTo("oracle.sql.TIMESTAMP");
                assertThat(values.get("TIME_VALUE").toString()).isEqualTo(Timestamp.valueOf(TIMESTAMP_TIME).toString());
                assertThat(values.get("FLOAT_VALUE")).isEqualTo(1.25f);
                assertThat(values.get("DOUBLE_VALUE")).isEqualTo(-2.5d);
                assertThat((byte[]) values.get("BINARY_PAYLOAD")).containsExactly(RAW_VALUE);
                assertThat(values.get("TEXT_PAYLOAD")).isEqualTo(TEXT);
                assertThat(values.get("NATIONAL_PAYLOAD")).isEqualTo(TEXT);
                assertThat(rows.next()).isTrue();
                assertThat(rows.getLong(1)).isEqualTo(2);
                for (int index = 2; index <= resultMetadata.getColumnCount(); index++) {
                    assertThat(JdbcLobReader.read(rows, index)).isNull();
                }
                assertThat(rows.next()).isTrue();
                assertThat(rows.getLong(1)).isEqualTo(3);
                for (int index = 2; index <= 9; index++) assertThat(rows.getObject(index)).isNull();
                assertThat((byte[]) JdbcLobReader.read(rows, 10)).isEmpty();
                assertThat(JdbcLobReader.read(rows, 11)).isEqualTo("");
                assertThat(JdbcLobReader.read(rows, 12)).isEqualTo("");
                assertThat(rows.next()).isFalse();
            }
            try (var statement = connection.createStatement();
                 var rows = statement.executeQuery("SELECT TIME_VALUE, ZONED_VALUE FROM " + table + " WHERE ID=1")) {
                assertThat(rows.next()).isTrue();
                Timestamp timestamp = rows.getTimestamp(1);
                OffsetDateTime zoned = rows.getObject(2, OffsetDateTime.class);
                // Typed JDBC reading measures microseconds and the offset independently of native Oracle objects.
                assertThat(timestamp.toLocalDateTime()).isEqualTo(TIMESTAMP_TIME);
                assertThat(timestamp.getNanos()).isEqualTo(123456000);
                assertThat(zoned).isEqualTo(ZONED_TIME);
                assertThat(rows.next()).isFalse();
            }
        }
        List<Map<String, Object>> physical = sourceJdbc().queryForList("SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH,"
                + " DATA_PRECISION, DATA_SCALE, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME=? ORDER BY COLUMN_ID", table);
        assertThat(physical).hasSize(12);
        Map<String, Map<String, Object>> physicalByColumn = new LinkedHashMap<>();
        for (var column : physical) {
            physicalByColumn.put((String) column.get("COLUMN_NAME"), column);
            assertThat(column.get("NULLABLE")).isEqualTo(column.get("COLUMN_NAME").equals("ID") ? "N" : "Y");
        }
        assertThat(((Number) physicalByColumn.get("AMOUNT").get("DATA_PRECISION")).intValue()).isEqualTo(38);
        assertThat(((Number) physicalByColumn.get("AMOUNT").get("DATA_SCALE")).intValue()).isEqualTo(9);
        assertThat(((Number) physicalByColumn.get("INTEGER_VALUE").get("DATA_PRECISION")).intValue()).isEqualTo(38);
        assertThat(((Number) physicalByColumn.get("INTEGER_VALUE").get("DATA_SCALE")).intValue()).isZero();
        assertThat(((Number) physicalByColumn.get("RAW_VALUE").get("DATA_LENGTH")).intValue()).isEqualTo(8);
        assertThat(physicalByColumn.get("DATE_VALUE").get("DATA_TYPE")).isEqualTo("DATE");
        assertThat(physicalByColumn.get("TIME_VALUE").get("DATA_TYPE")).isEqualTo("TIMESTAMP(6)");
        assertThat(physicalByColumn.get("ZONED_VALUE").get("DATA_TYPE")).isEqualTo("TIMESTAMP(6) WITH TIME ZONE");
        assertThat(physicalByColumn.get("FLOAT_VALUE").get("DATA_TYPE")).isEqualTo("BINARY_FLOAT");
        assertThat(physicalByColumn.get("DOUBLE_VALUE").get("DATA_TYPE")).isEqualTo("BINARY_DOUBLE");
        assertThat(physicalByColumn.get("BINARY_PAYLOAD").get("DATA_TYPE")).isEqualTo("BLOB");
        assertThat(physicalByColumn.get("TEXT_PAYLOAD").get("DATA_TYPE")).isEqualTo("CLOB");
        assertThat(physicalByColumn.get("NATIONAL_PAYLOAD").get("DATA_TYPE")).isEqualTo("NCLOB");
    }

    @Test
    void completeNumericRawDateAndTimestampValuesLoadResumeAndDetectLastDecimalDigitTampering() {
        String source = name("VALUE");
        String target = "public." + source.toLowerCase(Locale.ROOT);
        sourceJdbc().execute("CREATE TABLE " + source + " (ID NUMBER(19) PRIMARY KEY, AMOUNT NUMBER(38,9),"
                + " INTEGER_VALUE NUMBER(38,0), RAW_VALUE RAW(8), DATE_VALUE DATE, TIME_VALUE TIMESTAMP(6),"
                + " FLOAT_VALUE BINARY_FLOAT, DOUBLE_VALUE BINARY_DOUBLE)");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, amount numeric(38,9),"
                + " integer_value numeric(38,0), raw_value bytea, date_value timestamp(0) without time zone,"
                + " time_value timestamp(6) without time zone, float_value real, double_value double precision)");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, ?, ?, ?,"
                        + " TO_DATE('2026-09-16 12:34:56','YYYY-MM-DD HH24:MI:SS'),"
                        + " TIMESTAMP '2026-09-16 12:34:56.123456', TO_BINARY_FLOAT(1.25), TO_BINARY_DOUBLE(-2.5))",
                AMOUNT, INTEGER_MAX, RAW_VALUE);
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2, ?, ?, ?,"
                        + " TO_DATE('2026-09-16 12:34:56','YYYY-MM-DD HH24:MI:SS'),"
                        + " TIMESTAMP '2026-09-16 12:34:56.123456', TO_BINARY_FLOAT(-1.25), TO_BINARY_DOUBLE(2.5))",
                AMOUNT.negate(), INTEGER_MAX.negate(), RAW_VALUE);
        sourceJdbc().update("INSERT INTO " + source + " (ID) VALUES (3)");
        var mapping = mapping(source, target, List.of(column("ID", "long"), column("AMOUNT", "decimal"),
                column("INTEGER_VALUE", "numeric"), column("RAW_VALUE", null), column("DATE_VALUE", "timestamp"),
                column("TIME_VALUE", "timestamp"), column("FLOAT_VALUE", null), column("DOUBLE_VALUE", null)));
        assertThat(execute(mapping, MigrationMode.DRY_RUN)).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(3);
            assertThat(result.transformed()).isEqualTo(3);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).isEmpty();
        });
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target, Long.class)).isZero();
        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 3);
        for (long id = 1; id <= 2; id++) {
            Map<String, Object> expected = expectedScalarRow(id);
            assertThat(targetJdbc().queryForObject("SELECT amount FROM " + target + " WHERE id=?", BigDecimal.class, id))
                    .isEqualTo(expected.get("amount"));
            assertThat(targetJdbc().queryForObject("SELECT integer_value FROM " + target + " WHERE id=?", BigDecimal.class, id))
                    .isEqualTo(expected.get("integer_value"));
            assertThat(targetJdbc().queryForObject("SELECT raw_value FROM " + target + " WHERE id=?", byte[].class, id))
                    .containsExactly(RAW_VALUE);
            assertThat(targetJdbc().queryForObject("SELECT date_value FROM " + target + " WHERE id=?", Timestamp.class, id))
                    .isEqualTo(Timestamp.valueOf(DATE_TIME));
            assertThat(targetJdbc().queryForObject("SELECT time_value FROM " + target + " WHERE id=?", Timestamp.class, id))
                    .isEqualTo(Timestamp.valueOf(TIMESTAMP_TIME));
            assertThat(targetJdbc().queryForObject("SELECT float_value FROM " + target + " WHERE id=?", Float.class, id))
                    .isEqualTo(expected.get("float_value"));
            assertThat(targetJdbc().queryForObject("SELECT double_value FROM " + target + " WHERE id=?", Double.class, id))
                    .isEqualTo(expected.get("double_value"));
            assertCheckpoint(mapping, id, expected);
        }
        assertThat(targetJdbc().queryForObject("SELECT amount IS NULL AND integer_value IS NULL AND raw_value IS NULL"
                + " AND date_value IS NULL AND time_value IS NULL AND float_value IS NULL AND double_value IS NULL FROM "
                + target + " WHERE id=3", Boolean.class)).isTrue();
        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 3);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target, Long.class)).isEqualTo(3);
        targetJdbc().update("UPDATE " + target + " SET amount=amount+0.000000001 WHERE id=1");
        assertThat(verifier.verify(mapping, execute(mapping, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    @Test
    void nationalClobContentsNullAndEmptyLoadAsTextAndChecksumsDetectLastCharacterTampering() throws Exception {
        String source = name("NCLOB");
        String target = "public." + source.toLowerCase(Locale.ROOT);
        String payload = TEXT.repeat(4096);
        sourceJdbc().execute("CREATE TABLE " + source + " (ID NUMBER(19) PRIMARY KEY, PAYLOAD NCLOB)");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        try (var connection = ORACLE.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (1, TO_NCLOB(?))")) {
            insert.setNString(1, TEXT);
            assertThat(insert.executeUpdate()).isEqualTo(1);
        }
        for (int index = 0; index < 12; index++) sourceJdbc().update("UPDATE " + source + " SET PAYLOAD=PAYLOAD || PAYLOAD WHERE ID=1");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2, NULL)");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (3, TO_NCLOB(EMPTY_CLOB()))");
        try (var connection = ORACLE.createConnection(""); var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT PAYLOAD FROM " + source + " WHERE ID=1")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getMetaData().getColumnType(1)).isEqualTo(Types.NCLOB);
            Object value = rows.getObject(1);
            assertThat(value).isInstanceOf(NClob.class);
            assertThat(JdbcLobReader.detach(value)).isEqualTo(payload);
            assertThat(rows.next()).isFalse();
        }
        var mapping = mapping(source, target, List.of(column("ID", "long"), column("PAYLOAD", "text")));
        long largeObjectsBefore = targetJdbc().queryForObject("SELECT count(*) FROM pg_largeobject_metadata", Long.class);
        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 3);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class)).isEqualTo(payload);
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL FROM " + target + " WHERE id=2", Boolean.class)).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=3", String.class)).isEqualTo("");
        assertCheckpoint(mapping, 1, Map.of("id", 1L, "payload", payload));
        assertSuccessfulLoad(mapping, execute(mapping, MigrationMode.COMMIT), 3);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target, Long.class)).isEqualTo(3);
        targetJdbc().update("UPDATE " + target + " SET payload=left(payload,char_length(payload)-1) || '!' WHERE id=1");
        assertThat(verifier.verify(mapping, execute(mapping, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM pg_largeobject_metadata", Long.class)).isEqualTo(largeObjectsBefore);
    }

    @Test
    void nativeZonedTimestampCannotSilentlyDiscardItsOffsetThroughTheLocalTimestampMapping() {
        String source = name("TZ");
        String target = "public." + source.toLowerCase(Locale.ROOT);
        sourceJdbc().execute("CREATE TABLE " + source + " (ID NUMBER(19) PRIMARY KEY, PAYLOAD TIMESTAMP(6) WITH TIME ZONE)");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,"
                + " TO_TIMESTAMP_TZ('2026-09-16 12:34:56.123456 +09:00','YYYY-MM-DD HH24:MI:SS.FF6 TZH:TZM'))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload timestamp(6) without time zone)");
        var mapping = mapping(source, target, List.of(column("ID", "long"), column("PAYLOAD", "timestamp")));
        var results = execute(mapping, MigrationMode.COMMIT);
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(1);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).singleElement().asString().contains("ROW_TRANSFORM_FAILED")
                    .doesNotContain("2026-09-16", "+09:00");
        });
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target, Long.class)).isZero();
        assertThat(checkpoints(mapping)).isZero();
        assertThat(verifier.verify(mapping, results, targetJdbc()).ok()).isFalse();
    }

    private static Map<String, Object> expectedScalarRow(long id) {
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("id", id);
        expected.put("amount", id == 1 ? AMOUNT : AMOUNT.negate());
        expected.put("integer_value", id == 1 ? INTEGER_MAX : INTEGER_MAX.negate());
        expected.put("raw_value", RAW_VALUE);
        expected.put("date_value", Timestamp.valueOf(DATE_TIME));
        expected.put("time_value", Timestamp.valueOf(TIMESTAMP_TIME));
        expected.put("float_value", id == 1 ? 1.25f : -1.25f);
        expected.put("double_value", id == 1 ? -2.5d : 2.5d);
        return expected;
    }

    private List<EtlExecutor.TableResult> execute(MappingSpec mapping, MigrationMode mode) {
        return executor.execute(mapping, mode, sourceJdbc(), targetJdbc(),
                new OracleSourceAdapter().sourceReadSessionPolicy(), true);
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
        assertThat(checkpoints(mapping)).isEqualTo(rows);
    }

    private void assertCheckpoint(MappingSpec mapping, long sourceKey, Map<String, Object> expected) {
        String checksum = targetJdbc().queryForObject("SELECT row_checksum FROM migration_control.tb_migration_checkpoint"
                        + " WHERE run_id=? AND source_namespace=? AND source_table=? AND source_key=?", String.class,
                mapping.run().runId(), mapping.run().sourceNamespace(),
                mapping.tables().getFirst().source().toLowerCase(Locale.ROOT), Long.toString(sourceKey));
        assertThat(checksum).isEqualTo(RowChecksum.calculate(EtlExecutor.canonicalTargetColumns(mapping.tables().getFirst()), expected));
    }

    private long checkpoints(MappingSpec mapping) {
        return targetJdbc().queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint WHERE run_id=?", Long.class,
                mapping.run().runId());
    }

    private static MappingSpec mapping(String source, String target, List<MappingSpec.ColumnMapping> columns) {
        var table = new MappingSpec.TableMapping(source, target, null, "ID", "id", columns, null);
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext("oracle-values-" + UUID.randomUUID(), "synthetic-oracle-source"));
    }

    private static MappingSpec.ColumnMapping column(String source, String type) {
        return new MappingSpec.ColumnMapping(source, source.toLowerCase(Locale.ROOT), null, type, null, null, null);
    }

    private static String escapedPattern(String value, String escape) {
        return value.replace(escape, escape + escape).replace("_", escape + "_").replace("%", escape + "%");
    }

    private static String name(String purpose) {
        return "TB_ORA_" + purpose + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }
}
