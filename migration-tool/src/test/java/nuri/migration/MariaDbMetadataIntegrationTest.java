package nuri.migration;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Types;
import java.sql.DriverManager;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Measures the actual MariaDB/JDBC metadata before enabling any vendor-specific load capability. */
class MariaDbMetadataIntegrationTest extends MariaDbPostgresTestSupport {
    @ParameterizedTest
    @ValueSource(strings = {"CATALOG", "SCHEMA"})
    void recordsBothCatalogModesLongTypesAndPhysicalNumericAndTemporalPrecision(String mode) throws Exception {
        String name = "tb_mariadb_metadata_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String table = MARIADB.getDatabaseName() + "." + name;
        sourceJdbc().execute("CREATE TABLE " + table + " (id bigint PRIMARY KEY, binary_payload longblob,"
                + " text_payload longtext, amount decimal(38,9), unsigned_payload bigint unsigned,"
                + " date_value date, datetime_value datetime(6), char_value char(12))"
                + " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        sourceJdbc().update("INSERT INTO " + table + " VALUES (1, X'00FF', '본문🙂-', 1.123456789,"
                + " 18446744073709551615, '2024-02-29', '2026-09-15 12:34:56.123456', '  한글🙂  ')");
        assertThat(MARIADB.getJdbcUrl().contains("useCatalogTerm=SCHEMA")).isTrue();
        String url = MARIADB.getJdbcUrl().replace("useCatalogTerm=SCHEMA", "useCatalogTerm=" + mode);
        boolean schemaMode = mode.equals("SCHEMA");
        String expectedCatalog = schemaMode ? "def" : MARIADB.getDatabaseName();
        String expectedSchema = schemaMode ? MARIADB.getDatabaseName() : null;
        try (var connection = DriverManager.getConnection(url, MARIADB.getUsername(), MARIADB.getPassword())) {
            var metadata = connection.getMetaData();
            assertThat(metadata.getDatabaseProductName()).isEqualTo("MariaDB");
            assertThat(metadata.getDatabaseProductVersion()).isEqualTo("11.4.13-MariaDB-ubu2404");
            assertThat(metadata.getDriverVersion()).isEqualTo("3.5.10");
            assertThat(connection.getCatalog()).isEqualTo(expectedCatalog);
            assertThat(connection.getSchema()).isEqualTo(expectedSchema);
            System.out.printf("MariaDB catalog probe: mode=%s; catalogMatchesExpected=%s; schemaPresent=%s; catalogTerm=%s; schemaTerm=%s%n",
                    mode, expectedCatalog.equals(connection.getCatalog()), connection.getSchema() != null,
                    metadata.getCatalogTerm(), metadata.getSchemaTerm());
            Map<String, Integer> types = new LinkedHashMap<>();
            try (var columns = metadata.getColumns(expectedCatalog, expectedSchema, name, "%")) {
                while (columns.next()) {
                    String column = columns.getString("COLUMN_NAME");
                    int jdbcType = columns.getInt("DATA_TYPE");
                    types.put(column, jdbcType);
                    assertThat(columns.getString("TABLE_CAT")).isEqualTo(expectedCatalog);
                    assertThat(columns.getString("TABLE_SCHEM")).isEqualTo(expectedSchema);
                    System.out.printf("MariaDB JDBC column: mode=%s; name=%s; type=%s; jdbcType=%d; size=%d; scale=%d; catalogMatches=%s; schemaPresent=%s%n",
                            mode, column, columns.getString("TYPE_NAME"), jdbcType, columns.getLong("COLUMN_SIZE"),
                            columns.getInt("DECIMAL_DIGITS"), expectedCatalog.equals(columns.getString("TABLE_CAT")),
                            columns.getString("TABLE_SCHEM") != null);
                }
            }
            assertThat(types).containsExactlyInAnyOrderEntriesOf(Map.of("id", Types.BIGINT,
                    "binary_payload", Types.LONGVARBINARY, "text_payload", Types.LONGVARCHAR,
                    "amount", Types.DECIMAL, "unsigned_payload", Types.BIGINT,
                    "date_value", Types.DATE, "datetime_value", Types.TIMESTAMP, "char_value", Types.CHAR));
            try (var statement = connection.createStatement();
                 var rows = statement.executeQuery("SELECT binary_payload, text_payload, amount, unsigned_payload,"
                         + " datetime_value FROM " + table + " WHERE id=1")) {
                assertThat(rows.next()).isTrue();
                for (int index = 1; index <= rows.getMetaData().getColumnCount(); index++) {
                    Object value = rows.getObject(index);
                    System.out.printf("MariaDB JDBC value class: column=%s; class=%s; jdbcType=%d; signed=%s%n",
                            rows.getMetaData().getColumnName(index), value.getClass().getName(),
                            rows.getMetaData().getColumnType(index), rows.getMetaData().isSigned(index));
                }
                assertThat(rows.getObject("binary_payload")).isInstanceOf(byte[].class);
                assertThat(rows.getObject("text_payload")).isInstanceOf(String.class);
                assertThat(rows.getObject("amount")).isInstanceOf(BigDecimal.class);
                assertThat(rows.getObject("unsigned_payload")).isEqualTo(new BigInteger("18446744073709551615"));
                assertThat(rows.getObject("datetime_value")).isInstanceOf(java.sql.Timestamp.class);
            }
        }
        var physical = sourceJdbc().queryForList("SELECT column_name, data_type, column_type, numeric_precision,"
                + " numeric_scale, datetime_precision, character_maximum_length FROM information_schema.columns"
                + " WHERE table_schema=? AND table_name=? ORDER BY ordinal_position", MARIADB.getDatabaseName(), name);
        for (var column : physical) {
            System.out.printf("MariaDB physical column: name=%s; type=%s; precision=%s; scale=%s; datetimePrecision=%s; charLength=%s%n",
                    column.get("column_name"), column.get("column_type"), column.get("numeric_precision"),
                    column.get("numeric_scale"), column.get("datetime_precision"), column.get("character_maximum_length"));
        }
        assertThat(sourceJdbc().queryForObject("SELECT datetime_precision FROM information_schema.columns"
                + " WHERE table_schema=? AND table_name=? AND column_name='datetime_value'", Integer.class,
                MARIADB.getDatabaseName(), name)).isEqualTo(6);
        assertThat(sourceJdbc().queryForObject("SELECT numeric_scale FROM information_schema.columns"
                + " WHERE table_schema=? AND table_name=? AND column_name='amount'", Integer.class,
                MARIADB.getDatabaseName(), name)).isEqualTo(9);
    }
}
