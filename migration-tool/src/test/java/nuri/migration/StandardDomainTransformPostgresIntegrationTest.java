package nuri.migration;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.domain.DomainViolation;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.Nullify;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.TargetStandardValidator;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 표준 도메인 변환기가 실제 PostgreSQL 에 쓰는 값과 verify 의 checksum 이 맞는지 본다(ADR-0029 L3a-1).
 *
 * <p>live 대상 계약은 승인 workflow 와 같은 fingerprinter 로 읽고, 정적 검증기를 그 계약으로 돌린다. 두 번째 시험은
 * 검증기가 막는 조합(날짜 값을 timestamp 컬럼에)을 실행기에 바로 넘겨, 막지 않으면 DB 는 받지만 verify 가 되읽은 값과
 * checksum 을 맞추지 못한다는 것을 재현한다 — 차단의 근거다.
 */
@Testcontainers
class StandardDomainTransformPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    private final TransformerRegistry transformers = new TransformerRegistry();
    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), transformers);
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void everyDomainTransformerCommitsValuesThatVerifyAgainstTheTarget() throws Exception {
        Fixture fixture = fixture("std");
        fixture.source().execute("CREATE TABLE " + fixture.sourceTable() + " (ID varchar(10) PRIMARY KEY,"
                + " END_YMD varchar(10), END_TRUNC timestamp, REG_TEXT varchar(19), OPEN_TM varchar(6),"
                + " USE_AT boolean, BGN_DE varchar(10), CHG_TEXT varchar(19), REG_DE date, LAST_DT timestamp)");
        fixture.source().update("INSERT INTO " + fixture.sourceTable() + " VALUES ('r1', '2024-01-31',"
                + " TIMESTAMP '2024-01-31 23:59:59', '2024-01-31 12:34:56', '093000', TRUE, '20240131',"
                + " '2024-01-31 12:34:56', DATE '2024-01-31', TIMESTAMP '2024-01-31 23:59:59')");
        fixture.source().update("INSERT INTO " + fixture.sourceTable() + " VALUES ('r2', '99991231',"
                + " TIMESTAMP '2024-02-29 08:00:00', '20240229080000', '235959', FALSE, '2024/02/29',"
                + " '20240229080000', DATE '2024-02-29', TIMESTAMP '2024-02-29 00:00:00')");
        fixture.source().update("INSERT INTO " + fixture.sourceTable() + " (ID) VALUES ('r3')");
        fixture.target().execute("CREATE TABLE " + fixture.targetTable() + " (id varchar(20) PRIMARY KEY,"
                + " end_ymd varchar(8), end_trunc_ymd varchar(8), reg_dt14 varchar(14), open_tm varchar(6),"
                + " use_yn varchar(1), bgn_de date, chg_dt timestamp, reg_dt timestamp, last_de date)");
        MappingSpec spec = fixture.spec(List.of(
                new ColumnMapping("ID", "id", null, null, null, null, null),
                new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null,
                        List.of(new Nullify(DomainViolation.PLACEHOLDER_DATE, 1L))),
                transformed("END_TRUNC", "end_trunc_ymd", "ymd8-truncate"),
                transformed("REG_TEXT", "reg_dt14", "ymdhms14"),
                transformed("OPEN_TM", "open_tm", "hms6"),
                transformed("USE_AT", "use_yn", "yn"),
                transformed("BGN_DE", "bgn_de", "date-text"),
                transformed("CHG_TEXT", "chg_dt", "timestamp-text"),
                transformed("REG_DE", "reg_dt", "timestamp-from-date"),
                transformed("LAST_DT", "last_de", "date-truncate")));
        CatalogSnapshot inventory = inventory(fixture.sourceTable(), Map.of(
                "ID", Types.VARCHAR, "END_YMD", Types.VARCHAR, "END_TRUNC", Types.TIMESTAMP,
                "REG_TEXT", Types.VARCHAR, "OPEN_TM", Types.VARCHAR, "USE_AT", Types.BOOLEAN,
                "BGN_DE", Types.VARCHAR, "CHG_TEXT", Types.VARCHAR, "REG_DE", Types.DATE, "LAST_DT", Types.TIMESTAMP));

        assertThat(standardErrors(spec, fixture, inventory)).as("live 대상 계약으로 본 정적 검증").isEmpty();

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.read()).isEqualTo(3);
            assertThat(result.written()).isEqualTo(3);
            assertThat(result.nullified()).containsExactly(Map.entry("end_ymd", 1L));
        });
        assertThat(row(fixture, "r1")).containsExactly("20240131", "20240131", "20240131123456", "093000", "Y",
                "2024-01-31", "2024-01-31 12:34:56", "2024-01-31 00:00:00", "2024-01-31");
        assertThat(row(fixture, "r2")).containsExactly(null, "20240229", "20240229080000", "235959", "N",
                "2024-02-29", "2024-02-29 08:00:00", "2024-02-29 00:00:00", "2024-02-29");
        assertThat(row(fixture, "r3")).containsOnlyNulls();
        MigrationReport report = verifier.verify(spec, results, fixture.target());
        assertThat(report.ok()).as(report.toSummary()).isTrue();
    }

    @Test
    void aDateWrittenIntoATimestampColumnLoadsButFailsVerificationWhichIsWhyTheValidatorBlocksIt() throws Exception {
        Fixture fixture = fixture("lifted");
        fixture.source().execute("CREATE TABLE " + fixture.sourceTable()
                + " (ID varchar(10) PRIMARY KEY, BGN_DE varchar(10))");
        fixture.source().update("INSERT INTO " + fixture.sourceTable() + " VALUES ('r1', '20240131')");
        fixture.target().execute("CREATE TABLE " + fixture.targetTable()
                + " (id varchar(20) PRIMARY KEY, bgn_dt timestamp)");
        CatalogSnapshot inventory = inventory(fixture.sourceTable(),
                Map.of("ID", Types.VARCHAR, "BGN_DE", Types.VARCHAR));
        MappingSpec dateIntoTimestamp = fixture.spec(List.of(
                new ColumnMapping("ID", "id", null, null, null, null, null),
                transformed("BGN_DE", "bgn_dt", "date-text")));
        MappingSpec declared = fixture.spec(List.of(
                new ColumnMapping("ID", "id", null, null, null, null, null),
                transformed("BGN_DE", "bgn_dt", "timestamp-from-date")));

        assertThat(standardErrors(dateIntoTimestamp, fixture, inventory)).containsExactly(
                "값 타입이 타깃과 맞지 않습니다: " + fixture.targetTable() + ".bgn_dt — 값 DATE, 물리 컬럼 timestamp"
                        + " without time zone — 날짜를 그날 00:00 일시로 쓰려면 transform: timestamp-from-date 를"
                        + " 선언하세요");
        assertThat(standardErrors(declared, fixture, inventory)).isEmpty();

        // 차단을 걷어 낸 경우: PostgreSQL 은 date 를 timestamp 로 받아 적재는 성공한다.
        List<EtlExecutor.TableResult> lifted = executor.execute(dateIntoTimestamp, MigrationMode.COMMIT);
        assertThat(lifted).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.written()).isEqualTo(1);
        });
        assertThat(fixture.target().queryForObject("SELECT bgn_dt::text FROM " + fixture.targetTable(), String.class))
                .isEqualTo("2024-01-31 00:00:00");
        // 그러나 checkpoint 는 LocalDate(2024-01-31)로, verify 는 되읽은 Timestamp(2024-01-31 00:00:00.0)로 checksum 을
        // 만들어 맞지 않는다.
        MigrationReport report = verifier.verify(dateIntoTimestamp, lifted, fixture.target());
        assertThat(report.ok()).isFalse();
        assertThat(report.tables()).singleElement().satisfies(table ->
                assertThat(table.note()).contains("run scoped checksum 불일치"));

        // 같은 값을 timestamp-from-date 로 밝히면 그날 00:00 일시가 되어 checksum 이 맞는다.
        fixture.target().execute("TRUNCATE " + fixture.targetTable());
        Fixture rerun = fixture.withRun("run_" + UUID.randomUUID());
        MappingSpec declaredRerun = rerun.spec(declared.tables().getFirst().columns());
        List<EtlExecutor.TableResult> results = executor.execute(declaredRerun, MigrationMode.COMMIT);
        assertThat(results.getFirst().errors()).isEmpty();
        MigrationReport declaredReport = verifier.verify(declaredRerun, results, rerun.target());
        assertThat(declaredReport.ok()).as(declaredReport.toSummary()).isTrue();
    }

    private List<String> standardErrors(MappingSpec spec, Fixture fixture, CatalogSnapshot inventory)
            throws Exception {
        DriverManagerDataSource dataSource = dataSource(fixture.targetConfig());
        try (Connection connection = dataSource.getConnection()) {
            TargetSchemaFingerprint target = new PostgresTargetSchemaFingerprinter()
                    .fingerprintBound(connection, spec, Set.of("public"));
            return new TargetStandardValidator(transformers::isBuiltin).validate(spec, target, inventory).errors();
        }
    }

    private static List<String> row(Fixture fixture, String id) {
        return fixture.target().queryForObject("SELECT end_ymd, end_trunc_ymd, reg_dt14, open_tm, use_yn,"
                + " bgn_de::text, chg_dt::text, reg_dt::text, last_de::text FROM " + fixture.targetTable()
                + " WHERE id = ?", (result, index) -> {
                    List<String> values = new ArrayList<>();
                    for (int column = 1; column <= 9; column++) {
                        values.add(result.getString(column));
                    }
                    return values;
                }, id);
    }

    private static ColumnMapping transformed(String source, String target, String transform) {
        return new ColumnMapping(source, target, transform, null, null, null, null);
    }

    /** H2 소스 표의 승인 inventory — 검증기가 읽는 jdbcType 선언만 둔다. */
    private static CatalogSnapshot inventory(String table, Map<String, Integer> columns) {
        List<CatalogObject> objects = new ArrayList<>();
        objects.add(new CatalogObject(ObjectKind.TABLE, "db", "PUBLIC", table, false, null, null, List.of(), Map.of()));
        for (Map.Entry<String, Integer> column : new LinkedHashMap<>(columns).entrySet()) {
            objects.add(new CatalogObject(ObjectKind.COLUMN, "db", "PUBLIC", table + "." + column.getKey(), false,
                    null, null, List.of(new ObjectReference(ObjectKind.TABLE, "db", "PUBLIC", table)),
                    Map.of("parentTable", table, "originalName", column.getKey(),
                            "jdbcType", Integer.toString(column.getValue()), "size", "19", "scale", "0")));
        }
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-15T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("H2", "2", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "PUBLIC", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    private static Fixture fixture(String prefix) {
        String suffix = prefix + "_" + SEQUENCE.incrementAndGet();
        DbConfig source = new DbConfig("jdbc:h2:mem:std_" + suffix + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
        DbConfig target = new DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                POSTGRES.getDriverClassName(), "disposable-postgres-target");
        return new Fixture(source, target, "LEGACY_" + suffix.toUpperCase(java.util.Locale.ROOT),
                "public.tb_" + suffix, "run_" + UUID.randomUUID());
    }

    private static DriverManagerDataSource dataSource(DbConfig config) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                config.url(), config.username(), config.password());
        dataSource.setDriverClassName(config.driver());
        return dataSource;
    }

    private record Fixture(DbConfig sourceConfig, DbConfig targetConfig, String sourceTable, String targetTable,
                           String runId) {

        JdbcTemplate source() {
            return new JdbcTemplate(dataSource(sourceConfig));
        }

        JdbcTemplate target() {
            return new JdbcTemplate(dataSource(targetConfig));
        }

        Fixture withRun(String run) {
            return new Fixture(sourceConfig, targetConfig, sourceTable, targetTable, run);
        }

        MappingSpec spec(List<ColumnMapping> columns) {
            TableMapping table = new TableMapping(sourceTable, targetTable, null, "ID", "id", columns, null);
            return new MappingSpec(sourceConfig, targetConfig, List.of(table), Map.of(),
                    new RunContext(runId, sourceConfig.url()));
        }
    }
}
