package nuri.migration;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Records MAX-type JDBC behavior before selecting any SQL Server load streaming policy. */
class SqlServerMetadataIntegrationTest extends SqlServerPostgresTestSupport {
    @Test
    void recordsJdbcNamespacesMaxTypesAndClassesAgainstThePhysicalFixture() throws Exception {
        String name = "tb_sqlserver_metadata_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String table = "dbo." + name;
        sourceJdbc().execute("CREATE TABLE " + table + " (id bigint PRIMARY KEY, binary_payload varbinary(max),"
                + " text_payload nvarchar(max), varchar_payload varchar(max), amount decimal(38,9),"
                + " fixed_binary binary(8), occurred_at datetime2(6), date_value date,"
                + " uuid_value uniqueidentifier, flag bit)");
        byte[] binary = {0, (byte) 0xff};
        String text = "본문🙂-";
        String varchar = "synthetic-ascii";
        BigDecimal amount = new BigDecimal("12345678901234567890123456789.123456789");
        LocalDate date = LocalDate.of(2024, 2, 29);
        LocalDateTime time = LocalDateTime.of(2026, 9, 16, 12, 34, 56, 123456000);
        String uuid = "123e4567-e89b-12d3-a456-426614174000";
        try (var connection = sourceConnection();
             var insert = connection.prepareStatement("INSERT INTO " + table + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            insert.setLong(1, 1);
            insert.setBytes(2, binary);
            insert.setNString(3, text);
            insert.setString(4, varchar);
            insert.setBigDecimal(5, amount);
            insert.setBytes(6, new byte[]{1, 2});
            insert.setTimestamp(7, java.sql.Timestamp.valueOf(time));
            insert.setDate(8, java.sql.Date.valueOf(date));
            insert.setString(9, uuid);
            insert.setBoolean(10, true);
            assertThat(insert.executeUpdate()).isEqualTo(1);
        }
        Map<String, Integer> types = new LinkedHashMap<>();
        Map<String, Integer> precisions = Map.of("id", 19, "binary_payload", Integer.MAX_VALUE,
                "text_payload", 1_073_741_823, "varchar_payload", Integer.MAX_VALUE, "amount", 38,
                "fixed_binary", 8, "occurred_at", 26, "date_value", 10, "uuid_value", 36, "flag", 1);
        Map<String, Class<?>> classes = Map.of("id", Long.class, "binary_payload", byte[].class,
                "text_payload", String.class, "varchar_payload", String.class, "amount", BigDecimal.class,
                "fixed_binary", byte[].class, "occurred_at", java.sql.Timestamp.class,
                "date_value", java.sql.Date.class, "uuid_value", String.class, "flag", Boolean.class);
        Map<String, Integer> scales = Map.of("amount", 9, "occurred_at", 6);
        try (var connection = sourceConnection()) {
            var metadata = connection.getMetaData();
            assertThat(metadata.getDatabaseProductName()).isEqualTo("Microsoft SQL Server");
            assertThat(metadata.getDatabaseProductVersion()).isEqualTo("16.00.4295");
            assertThat(metadata.getDriverName()).isEqualTo("Microsoft JDBC Driver 13.6 for SQL Server");
            assertThat(metadata.getDriverVersion()).isEqualTo("13.6.0.0");
            assertThat(connection.getCatalog()).isEqualTo(SOURCE_DATABASE);
            assertThat(connection.getSchema()).isEqualTo("dbo");
            assertThat(metadata.getCatalogTerm()).isEqualTo("database");
            assertThat(metadata.getSchemaTerm()).isEqualTo("schema");
            System.out.printf("SQL Server namespace probe: catalogMatchesFixture=%s; schema=%s; catalogTerm=%s; schemaTerm=%s%n",
                    SOURCE_DATABASE.equals(connection.getCatalog()), connection.getSchema(),
                    metadata.getCatalogTerm(), metadata.getSchemaTerm());
            String escape = metadata.getSearchStringEscape();
            String tablePattern = name.replace(escape, escape + escape)
                    .replace("_", escape + "_").replace("%", escape + "%");
            try (var columns = metadata.getColumns(SOURCE_DATABASE, "dbo", tablePattern, "%")) {
                while (columns.next()) {
                    // Retain JDBC's left-to-right metadata read order, including the namespace header.
                    String catalog = columns.getString("TABLE_CAT");
                    String schema = columns.getString("TABLE_SCHEM");
                    String actualTable = columns.getString("TABLE_NAME");
                    String column = columns.getString("COLUMN_NAME");
                    int jdbcType = columns.getInt("DATA_TYPE");
                    String nativeType = columns.getString("TYPE_NAME");
                    long size = columns.getLong("COLUMN_SIZE");
                    int scale = columns.getInt("DECIMAL_DIGITS");
                    assertThat(catalog).isEqualTo(SOURCE_DATABASE);
                    assertThat(schema).isEqualTo("dbo");
                    assertThat(actualTable).isEqualTo(name);
                    assertThat(types.put(column, jdbcType)).isNull();
                    long expectedSize = column.equals("text_payload") ? Integer.MAX_VALUE : precisions.get(column);
                    assertThat(size).isEqualTo(expectedSize);
                    assertThat(scale).isEqualTo(scales.getOrDefault(column, 0));
                    System.out.printf("SQL Server JDBC column: name=%s; type=%s; jdbcType=%d; size=%d; scale=%d; catalogMatches=%s; schema=%s%n",
                            column, nativeType, jdbcType, size, scale, SOURCE_DATABASE.equals(catalog), schema);
                }
            }
            assertThat(types).hasSize(10).containsKeys("id", "binary_payload", "text_payload", "varchar_payload",
                    "amount", "fixed_binary", "occurred_at", "date_value", "uuid_value", "flag")
                    .containsEntry("id", Types.BIGINT).containsEntry("amount", Types.DECIMAL)
                    .containsEntry("fixed_binary", Types.BINARY).containsEntry("occurred_at", Types.TIMESTAMP)
                    .containsEntry("date_value", Types.DATE).containsEntry("flag", Types.BIT)
                    .containsEntry("binary_payload", Types.VARBINARY).containsEntry("text_payload", Types.NVARCHAR)
                    .containsEntry("varchar_payload", Types.VARCHAR).containsEntry("uuid_value", Types.CHAR);
            // Connector/J-style LONG codes do not identify these SQL Server MAX fields.
            try (var statement = connection.createStatement();
                 var rows = statement.executeQuery("SELECT * FROM " + table + " WHERE id=1")) {
                assertThat(rows.next()).isTrue();
                var resultMetadata = rows.getMetaData();
                assertThat(resultMetadata.getColumnCount()).isEqualTo(10);
                Map<String, Object> values = new LinkedHashMap<>();
                for (int index = 1; index <= resultMetadata.getColumnCount(); index++) {
                    Object value = rows.getObject(index);
                    assertThat(value != null).isTrue();
                    String column = resultMetadata.getColumnName(index);
                    values.put(column, value);
                    assertThat(value.getClass()).isEqualTo(classes.get(column));
                    assertThat(resultMetadata.getColumnType(index)).isEqualTo(types.get(column));
                    assertThat(resultMetadata.getPrecision(index)).isEqualTo(precisions.get(column));
                    assertThat(resultMetadata.getScale(index)).isEqualTo(scales.getOrDefault(column, 0));
                    System.out.printf("SQL Server JDBC value class: column=%s; class=%s; jdbcType=%d; nativeType=%s; precision=%d; scale=%d; signed=%s%n",
                            resultMetadata.getColumnName(index), value.getClass().getName(), resultMetadata.getColumnType(index),
                            resultMetadata.getColumnTypeName(index), resultMetadata.getPrecision(index),
                            resultMetadata.getScale(index), resultMetadata.isSigned(index));
                }
                // Adaptive buffering need not support revisiting an earlier ResultSet column.
                assertThat(Long.valueOf(1).equals(values.get("id"))).isTrue();
                assertThat(values.get("binary_payload") instanceof byte[] bytes && Arrays.equals(binary, bytes)).isTrue();
                assertThat(text.equals(values.get("text_payload"))).isTrue();
                assertThat(varchar.equals(values.get("varchar_payload"))).isTrue();
                assertThat(amount.equals(values.get("amount"))).isTrue();
                assertThat(values.get("fixed_binary") instanceof byte[] bytes
                        && Arrays.equals(new byte[]{1, 2, 0, 0, 0, 0, 0, 0}, bytes)).isTrue();
                assertThat(values.get("occurred_at") instanceof java.sql.Timestamp timestamp
                        && timestamp.toLocalDateTime().equals(time)).isTrue();
                assertThat(values.get("date_value") instanceof java.sql.Date value
                        && value.toLocalDate().equals(date)).isTrue();
                assertThat(values.get("uuid_value") instanceof String value && uuid.equalsIgnoreCase(value)).isTrue();
                assertThat(Boolean.TRUE.equals(values.get("flag"))).isTrue();
                assertThat(rows.next()).isFalse();
            }
        }
        List<Map<String, Object>> physical = sourceJdbc().queryForList("SELECT c.name AS column_name,"
                + " t.name AS type_name, c.max_length, c.precision, c.scale, c.is_nullable, c.is_identity"
                + " FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id"
                + " WHERE c.object_id=OBJECT_ID(?) ORDER BY c.column_id", table);
        assertThat(physical).hasSize(10);
        Map<String, Map<String, Object>> byColumn = new LinkedHashMap<>();
        for (var column : physical) {
            byColumn.put((String) column.get("column_name"), column);
            System.out.printf("SQL Server physical column: name=%s; type=%s; maxLength=%s; precision=%s; scale=%s; nullable=%s; identity=%s%n",
                    column.get("column_name"), column.get("type_name"), column.get("max_length"),
                    column.get("precision"), column.get("scale"), column.get("is_nullable"), column.get("is_identity"));
        }
        assertThat(physical).extracting(column -> column.get("type_name"))
                .containsExactly("bigint", "varbinary", "nvarchar", "varchar", "decimal", "binary",
                        "datetime2", "date", "uniqueidentifier", "bit");
        for (String column : List.of("binary_payload", "text_payload", "varchar_payload")) {
            assertThat(((Number) byColumn.get(column).get("max_length")).intValue()).isEqualTo(-1);
        }
        assertThat(((Number) byColumn.get("amount").get("precision")).intValue()).isEqualTo(38);
        assertThat(((Number) byColumn.get("amount").get("scale")).intValue()).isEqualTo(9);
        assertThat(((Number) byColumn.get("occurred_at").get("scale")).intValue()).isEqualTo(6);
        assertThat(((Number) byColumn.get("fixed_binary").get("max_length")).intValue()).isEqualTo(8);
    }
}
