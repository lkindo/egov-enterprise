package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.state.RowChecksum;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static nuri.migration.EtlSqlServerPostgresIntegrationTest.assertSuccessfulLoad;
import static nuri.migration.EtlSqlServerPostgresIntegrationTest.checkpoints;
import static nuri.migration.EtlSqlServerPostgresIntegrationTest.execute;
import static org.assertj.core.api.Assertions.assertThat;

/** Tests a bounded SQL Server value surface against actual JDBC and physical column metadata. */
class SqlServerValueTypesIntegrationTest extends SqlServerPostgresTestSupport {
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void decimalPrecisionScaleAndSignedBigintBoundsPreserveWholeValuesAndChecksums() throws Exception {
        String name = uniqueName("numeric");
        String source = "dbo." + name;
        String target = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY,amount decimal(38,9),payload bigint)");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY,amount numeric(38,9),payload bigint)");
        BigDecimal amount = new BigDecimal("12345678901234567890123456789.123456789");
        BigDecimal negative = new BigDecimal("-99999999999999999999999999999.999999999");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,?,?),(2,?,?),(3,NULL,NULL)", amount, Long.MAX_VALUE, negative, Long.MIN_VALUE);
        assertColumnType(name, "amount", Types.DECIMAL, 38, 9);
        assertColumnType(name, "payload", Types.BIGINT, 19, 0);
        assertPhysicalPrecision(name, "amount", 38, 9);
        var spec = spec(source, target, "sqlserver-numeric-values", List.of(
                column("id", "long"), column("amount", "decimal"), column("payload", "long")));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        assertThat(amount.equals(targetJdbc().queryForObject("SELECT amount FROM " + target + " WHERE id=1", BigDecimal.class))).isTrue();
        assertThat(negative.equals(targetJdbc().queryForObject("SELECT amount FROM " + target + " WHERE id=2", BigDecimal.class))).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", Long.class)).isEqualTo(Long.MAX_VALUE);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=2", Long.class)).isEqualTo(Long.MIN_VALUE);
        assertThat(targetJdbc().queryForObject("SELECT amount IS NULL AND payload IS NULL FROM " + target + " WHERE id=3", Boolean.class)).isTrue();
        assertCheckpoint(spec, 1, Map.of("id", 1L, "amount", amount, "payload", Long.MAX_VALUE));
        assertCheckpoint(spec, 2, Map.of("id", 2L, "amount", negative, "payload", Long.MIN_VALUE));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 3);
        targetJdbc().update("UPDATE " + target + " SET amount=amount+0.000000001 WHERE id=1");
        assertThat(verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    @Test
    void decimalOutsideLongRangeOrWithFractionIsRejectedBeforeRowsAndCheckpoints() {
        String name = uniqueName("long_rejected");
        String source = "dbo." + name;
        String target = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY,payload decimal(38,9))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY,payload bigint)");
        BigDecimal overflow = new BigDecimal("9223372036854775808.000000000");
        BigDecimal fractional = new BigDecimal("1.000000001");
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,?),(2,?)", overflow, fractional);
        var spec = spec(source, target, "sqlserver-long-values-rejected", List.of(column("id", "long"), column("payload", "long")));
        var results = execute(spec, MigrationMode.COMMIT);
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(2);
            assertThat(result.written()).isZero();
            assertThat(result.errors()).hasSize(2).allSatisfy(error -> assertThat(error)
                    .contains("ROW_TRANSFORM_FAILED").doesNotContain(overflow.toPlainString(), fractional.toPlainString()));
        });
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target, Long.class)).isZero();
        assertThat(checkpoints(spec.run().runId())).isZero();
        assertThat(verifier.verify(spec, results, targetJdbc()).ok()).isFalse();
    }

    @Test
    void dateAndDatetime2MicrosecondsPreserveWholeValuesAndChecksums() throws Exception {
        String name = uniqueName("temporal");
        String source = "dbo." + name;
        String target = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY,payload date,occurred_at datetime2(6))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY,payload date,occurred_at timestamp(6) without time zone)");
        LocalDate date = LocalDate.of(2024, 2, 29);
        LocalDateTime time = LocalDateTime.of(2026, 9, 16, 12, 34, 56, 123456000);
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,?,?),(2,NULL,NULL)", java.sql.Date.valueOf(date), java.sql.Timestamp.valueOf(time));
        assertColumnType(name, "payload", Types.DATE, 10, 0);
        assertColumnType(name, "occurred_at", Types.TIMESTAMP, 26, 6);
        assertThat(sourceJdbc().queryForObject("SELECT c.scale FROM sys.columns c WHERE c.object_id=OBJECT_ID(?) AND c.name='occurred_at'",
                Integer.class, source)).isEqualTo(6);
        assertThat(sourceJdbc().queryForObject("SELECT payload FROM " + source + " WHERE id=1", java.sql.Date.class).toLocalDate().equals(date)).isTrue();
        assertThat(sourceJdbc().queryForObject("SELECT occurred_at FROM " + source + " WHERE id=1", java.sql.Timestamp.class).toLocalDateTime().equals(time)).isTrue();
        var spec = spec(source, target, "sqlserver-temporal-values", List.of(column("id", "long"), column("payload", "date"), column("occurred_at", "timestamp")));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 2);
        assertThat(targetJdbc().queryForObject("SELECT payload FROM " + target + " WHERE id=1", java.sql.Date.class).toLocalDate().equals(date)).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT occurred_at FROM " + target + " WHERE id=1", java.sql.Timestamp.class).toLocalDateTime().equals(time)).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL AND occurred_at IS NULL FROM " + target + " WHERE id=2", Boolean.class)).isTrue();
        assertCheckpoint(spec, 1, Map.of("id", 1L, "payload", date, "occurred_at", time));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 2);
        targetJdbc().update("UPDATE " + target + " SET occurred_at=occurred_at+interval '1 microsecond' WHERE id=1");
        assertThat(verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    @Test
    void fixedBinaryGuidBitAndVarcharPaddingPreserveActualJdbcValues() throws Exception {
        String name = uniqueName("fixed");
        String source = "dbo." + name;
        String target = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + source + " (id bigint PRIMARY KEY,payload binary(8),uuid_value uniqueidentifier,flag bit,padded varchar(12))");
        targetJdbc().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY,payload bytea,uuid_value text,flag boolean,padded text)");
        String uuid = "123e4567-e89b-12d3-a456-426614174000";
        String padded = "  ascii  ";
        sourceJdbc().update("INSERT INTO " + source + " VALUES (1,0x0102,?,1,?),(2,NULL,NULL,NULL,NULL)", uuid, padded);
        assertColumnType(name, "payload", Types.BINARY, 8, 0);
        assertColumnType(name, "uuid_value", Types.CHAR, 36, 0);
        assertColumnType(name, "flag", Types.BIT, 1, 0);
        var expected = sourceJdbc().queryForMap("SELECT id,payload,uuid_value,flag,padded FROM " + source + " WHERE id=1");
        assertThat(Arrays.equals(new byte[]{1, 2, 0, 0, 0, 0, 0, 0}, (byte[]) expected.get("payload"))).isTrue();
        assertThat(expected.get("uuid_value") instanceof String value && uuid.equalsIgnoreCase(value)).isTrue();
        assertThat(Boolean.TRUE.equals(expected.get("flag"))).isTrue();
        assertThat(padded.equals(expected.get("padded"))).isTrue();
        var spec = spec(source, target, "sqlserver-fixed-values", List.of(column("id", "long"), column("payload", null),
                column("uuid_value", "text"), column("flag", "boolean"), column("padded", "text")));
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 2);
        var actual = targetJdbc().queryForMap("SELECT id,payload,uuid_value,flag,padded FROM " + target + " WHERE id=1");
        assertThat(Arrays.equals((byte[]) expected.get("payload"), (byte[]) actual.get("payload"))).isTrue();
        assertThat(expected.get("uuid_value").equals(actual.get("uuid_value"))).isTrue();
        assertThat(expected.get("flag").equals(actual.get("flag"))).isTrue();
        assertThat(expected.get("padded").equals(actual.get("padded"))).isTrue();
        assertThat(targetJdbc().queryForObject("SELECT payload IS NULL AND uuid_value IS NULL AND flag IS NULL AND padded IS NULL FROM " + target + " WHERE id=2", Boolean.class)).isTrue();
        assertCheckpoint(spec, 1, expected);
        assertSuccessfulLoad(spec, execute(spec, MigrationMode.COMMIT), 2);
        targetJdbc().update("UPDATE " + target + " SET payload=set_byte(payload,7,1) WHERE id=1");
        assertThat(verifier.verify(spec, execute(spec, MigrationMode.COMMIT), targetJdbc()).ok()).isFalse();
    }

    private void assertColumnType(String table, String column, int type, int precision, int scale) throws Exception {
        try (var connection = sourceConnection(); var columns = connection.getMetaData().getColumns(SOURCE_DATABASE, "dbo", table, column)) {
            assertThat(columns.next()).isTrue();
            assertThat(columns.getInt("DATA_TYPE")).isEqualTo(type);
            assertThat(columns.getInt("COLUMN_SIZE")).isEqualTo(precision);
            assertThat(columns.getInt("DECIMAL_DIGITS")).isEqualTo(scale);
            assertThat(columns.next()).isFalse();
        }
    }

    private void assertPhysicalPrecision(String table, String column, int precision, int scale) {
        var physical = sourceJdbc().queryForMap("SELECT c.precision,c.scale FROM sys.columns c WHERE c.object_id=OBJECT_ID(?) AND c.name=?", "dbo." + table, column);
        assertThat(((Number) physical.get("precision")).intValue()).isEqualTo(precision);
        assertThat(((Number) physical.get("scale")).intValue()).isEqualTo(scale);
    }

    private void assertCheckpoint(MappingSpec spec, long id, Map<String, ?> expected) {
        List<String> columns = EtlExecutor.canonicalTargetColumns(spec.tables().getFirst());
        String recorded = targetJdbc().queryForObject("SELECT row_checksum FROM migration_control.tb_migration_checkpoint WHERE run_id=? AND source_key=?",
                String.class, spec.run().runId(), Long.toString(id));
        assertThat(recorded).isEqualTo(RowChecksum.calculate(columns, expected));
        assertThat(RowChecksum.calculate(columns, targetJdbc().queryForMap("SELECT " + String.join(",", columns) + " FROM " + spec.tables().getFirst().target() + " WHERE id=?", id))).isEqualTo(recorded);
    }

    private static MappingSpec.ColumnMapping column(String name, String type) { return new MappingSpec.ColumnMapping(name, name, null, type, null, null, null); }
    private static MappingSpec spec(String source, String target, String run, List<MappingSpec.ColumnMapping> columns) {
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(new MappingSpec.TableMapping(source, target, null, "id", "id", columns, null)), Map.of(),
                new MappingSpec.RunContext(run, "synthetic-sqlserver-values"));
    }
    private static String uniqueName(String scenario) { return "tb_sqlserver_type_" + scenario + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8); }
}
