package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.state.RowChecksum;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Narrow value-type rehearsal for MySQL 8.4 fixtures; other MySQL type families remain unqualified. */
class MySqlValueTypesIntegrationTest extends MySqlPostgresTestSupport {
    private static final BigInteger UNSIGNED_BIGINT_MAX = new BigInteger("18446744073709551615");
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void decimalPrecisionAndUnsignedBigintMaximumArePreservedAsNumeric() throws Exception {
        String name = uniqueName("numeric");
        String source = MYSQL.getDatabaseName() + "." + name;
        String target = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + source
                + " (id bigint PRIMARY KEY, amount decimal(38,9), payload bigint unsigned) ENGINE=InnoDB");
        targetJdbc().execute("CREATE TABLE " + target
                + " (id bigint PRIMARY KEY, amount numeric(38,9), payload numeric(20,0))");
        BigDecimal amount = new BigDecimal("12345678901234567890123456789.123456789");
        BigDecimal negative = new BigDecimal("-99999999999999999999999999999.999999999");
        try (var connection = MYSQL.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO " + source + " VALUES (?, ?, ?)")) {
            insert.setLong(1, 1);
            insert.setBigDecimal(2, amount);
            insert.setBigDecimal(3, new BigDecimal(UNSIGNED_BIGINT_MAX));
            assertThat(insert.executeUpdate()).isEqualTo(1);
            insert.setLong(1, 2);
            insert.setBigDecimal(2, negative);
            insert.setBigDecimal(3, BigDecimal.ZERO);
            assertThat(insert.executeUpdate()).isEqualTo(1);
        }
        sourceJdbc().update("INSERT INTO " + source + " VALUES (3, NULL, NULL)");
        assertColumnType(name, "amount", Types.DECIMAL, 38, 9);
        assertColumnType(name, "payload", Types.BIGINT, 20, 0);
        try (var connection = MYSQL.createConnection("");
             var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT amount, payload FROM " + source + " WHERE id=1")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getObject("amount")).isInstanceOf(BigDecimal.class);
            assertThat(rows.getObject("payload")).isEqualTo(UNSIGNED_BIGINT_MAX).isInstanceOf(BigInteger.class);
            assertThat(rows.getMetaData().isSigned(2)).isFalse();
        }
        var spec = spec(source, target, "mysql-numeric-types", List.of(
                column("id", "long"), column("amount", "decimal"), column("payload", "numeric")));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(targetJdbc().queryForObject("SELECT amount FROM " + target + " WHERE id=1", BigDecimal.class)).isEqualTo(amount);
        assertThat(targetJdbc().queryForObject("SELECT amount FROM " + target + " WHERE id=2", BigDecimal.class)).isEqualTo(negative);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", BigDecimal.class))
                .isEqualByComparingTo(new BigDecimal(UNSIGNED_BIGINT_MAX));
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=2", BigDecimal.class))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(targetJdbc().queryForObject("SELECT amount IS NULL AND payload IS NULL FROM " + target + " WHERE id=3", Boolean.class))
                .isTrue();
        assertCheckpoint(spec, 1, Map.of("id", 1L, "amount", amount, "payload", new BigDecimal(UNSIGNED_BIGINT_MAX)));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        targetJdbc().update("UPDATE " + target + " SET amount=amount+0.000000001 WHERE id=1");
        assertThat(verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    @Test
    void unsignedBigintOutsideSignedLongRangeFailsBeforeAnyTargetRowOrCheckpoint() {
        String name = uniqueName("unsigned_limit");
        String source = MYSQL.getDatabaseName() + "." + name;
        String target = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY, payload bigint unsigned) ENGINE=InnoDB");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload bigint)");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, ?)", new BigDecimal(UNSIGNED_BIGINT_MAX));
        var spec = mapping(source, target, "mysql-unsigned-long-rejected", "long");

        var results = execute(spec, MigrationMode.COMMIT);
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(1);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).singleElement().asString().contains("ROW_TRANSFORM_FAILED")
                    .doesNotContain(UNSIGNED_BIGINT_MAX.toString());
        });
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target, Long.class)).isZero();
        assertThat(checkpoints(spec.run().runId())).isZero();
        assertThat(verifier.verify(spec, results, targetJdbc()).ok()).isFalse();
    }

    @Test
    void dateAndDatetimeMicrosecondsSurviveTypedMappingAndWholeRowChecksums() throws Exception {
        String name = uniqueName("temporal");
        String source = MYSQL.getDatabaseName() + "." + name;
        String target = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + source
                + " (id bigint PRIMARY KEY, payload date, occurred_at datetime(6)) ENGINE=InnoDB");
        targetJdbc().execute("CREATE TABLE " + target
                + " (id bigint PRIMARY KEY, payload date, occurred_at timestamp(6) without time zone)");
        LocalDate date = LocalDate.of(2024, 2, 29);
        LocalDateTime timestamp = LocalDateTime.of(2026, 9, 15, 12, 34, 56, 123456000);
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, ?, ?)", java.sql.Date.valueOf(date), java.sql.Timestamp.valueOf(timestamp));
        sourceJdbc().update("INSERT INTO " + source + " VALUES (2, NULL, NULL)");
        assertColumnType(name, "payload", Types.DATE, 10, 0);
        try (var connection = MYSQL.createConnection("");
             var columns = connection.getMetaData().getColumns(null, MYSQL.getDatabaseName(), name, "occurred_at")) {
            assertThat(columns.next()).isTrue();
            assertThat(columns.getInt("DATA_TYPE")).isEqualTo(Types.TIMESTAMP);
            // Connector/J's default metadata path reports zero for DATETIME(6).
            // Check the physical precision separately, then verify the complete loaded value below.
            assertThat(columns.getInt("DECIMAL_DIGITS")).isZero();
        }
        assertThat(sourceJdbc().queryForObject(
                "SELECT datetime_precision FROM information_schema.columns WHERE table_schema=?"
                        + " AND table_name=? AND column_name='occurred_at'", Integer.class,
                MYSQL.getDatabaseName(), name)).isEqualTo(6);
        assertThat(sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", java.sql.Date.class).toLocalDate())
                .isEqualTo(date);
        assertThat(sourceJdbc().queryForObject("SELECT occurred_at FROM " + source + " WHERE id=1", java.sql.Timestamp.class).toLocalDateTime())
                .isEqualTo(timestamp);
        var spec = spec(source, target, "mysql-temporal-types", List.of(
                column("id", "long"), column("payload", "date"), column("occurred_at", "timestamp")));

        var results = execute(spec, MigrationMode.COMMIT);
        assertThat(results.getFirst().written()).isEqualTo(2);
        assertThat(results.getFirst().errors()).isEmpty();
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", java.sql.Date.class).toLocalDate())
                .isEqualTo(date);
        assertThat(targetJdbc().queryForObject("SELECT occurred_at FROM " + target + " WHERE id=1", java.sql.Timestamp.class).toLocalDateTime())
                .isEqualTo(timestamp);
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL AND occurred_at IS NULL FROM " + target + " WHERE id=2", Boolean.class))
                .isTrue();
        assertCheckpoint(spec, 1, Map.of("id", 1L, "payload", date, "occurred_at", timestamp));
        assertSuccessfulLoad(spec, results, 2);
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 2);
        targetJdbc().update("UPDATE " + target + " SET occurred_at=occurred_at+interval '1 microsecond' WHERE id=1");
        assertThat(verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    @Test
    void fixedCharUnicodeLeadingSpacesAndMysqlTrailingPaddingSemanticsArePreserved() throws Exception {
        String name = uniqueName("char");
        String source = MYSQL.getDatabaseName() + "." + name;
        String target = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + source
                + " (id bigint PRIMARY KEY, payload char(12)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, payload text)");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1, ?), (2, ''), (3, NULL)", "  한글🙂  ");
        assertColumnType(name, "payload", Types.CHAR, 12, 0);
        // The CHAR value exposed by MySQL removes trailing padding; preserve that actual source value.
        String read = sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", String.class);
        assertThat(read).isEqualTo("  한글🙂");
        var spec = mapping(source, target, "mysql-char-types", null);
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", String.class)).isEqualTo(read);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=2", String.class)).isEmpty();
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL FROM " + target + " WHERE id=3", Boolean.class)).isTrue();
        assertCheckpoint(spec, 1, Map.of("id", 1L, "payload", read));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        targetJdbc().update("UPDATE " + target + " SET payload=payload || ' ' WHERE id=1");
        assertThat(verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    private void assertColumnType(String table, String column, int type, int precision, int scale) throws Exception {
        try (var connection = MYSQL.createConnection("");
             var columns = connection.getMetaData().getColumns(null, MYSQL.getDatabaseName(), table, column)) {
            assertThat(columns.next()).isTrue();
            assertThat(columns.getInt("DATA_TYPE")).isEqualTo(type);
            assertThat(columns.getInt("COLUMN_SIZE")).isEqualTo(precision);
            assertThat(columns.getInt("DECIMAL_DIGITS")).isEqualTo(scale);
            assertThat(columns.next()).isFalse();
        }
    }

    private void assertCheckpoint(MappingSpec spec, long id, Map<String, ?> expected) {
        List<String> columns = EtlExecutor.canonicalTargetColumns(spec.tables().getFirst());
        String recorded = targetJdbc().queryForObject(
                "SELECT row_checksum FROM migration_control.tb_migration_checkpoint WHERE run_id=? AND source_key=?",
                String.class, spec.run().runId(), Long.toString(id));
        assertThat(recorded).isEqualTo(RowChecksum.calculate(columns, expected));
        Map<String, Object> targetValues = new LinkedHashMap<>(targetJdbc().queryForMap(
                "SELECT " + String.join(",", columns) + " FROM " + spec.tables().getFirst().target() + " WHERE id=?", id));
        assertThat(RowChecksum.calculate(columns, targetValues)).isEqualTo(recorded);
    }

    private static MappingSpec.ColumnMapping column(String name, String type) {
        return new MappingSpec.ColumnMapping(name, name, null, type, null, null, null);
    }

    private static MappingSpec spec(String source, String target, String run, List<MappingSpec.ColumnMapping> columns) {
        var table = new MappingSpec.TableMapping(source, target, null, "id", "id", columns, null);
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext(run, "synthetic-mysql-value-types"));
    }

    private static String uniqueName(String scenario) {
        return "tb_mysql_type_" + scenario + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
