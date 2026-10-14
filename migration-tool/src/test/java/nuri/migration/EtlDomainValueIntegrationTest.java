package nuri.migration;

import nuri.migration.domain.DomainValueRejected;
import nuri.migration.domain.DomainViolation;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.Nullify;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 표준 도메인 위반과 nullify 정제의 실행 경로(ADR-0029 L3a-1, H2). 비문자 type 의 공백은 더 이상 조용히 NULL 이 되지 않고,
 * 도메인 변환기의 거부는 위반 코드로 멈추며, mapping 이 nullify 로 밝힌 위반만 상한 안에서 NULL 로 바뀐다.
 */
class EtlDomainValueIntegrationTest {

    private static final AtomicInteger SEQ = new AtomicInteger();
    private static final String STOPPED = " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다";

    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void blankIntoANonTextTypeStopsWithABlankViolationInsteadOfLoadingNull() {
        Fixture fixture = fixture("5", "  ", "7");
        MappingSpec spec = fixture.spec(qty(List.of()));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        // 종전에는 TypeConverter 가 공백을 NULL 로 바꿔 3행 모두 적재했다.
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).containsExactly("행 변환 실패(LEGACY_ITEM, column=qty, row=2): "
                    + "ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(BLANK)" + STOPPED);
            assertThat(result.nullified()).isEmpty();
        });
        assertThat(count(fixture.target(), "tb_item")).isZero();
        assertThat(count(fixture.target(), "migration_control.tb_migration_checkpoint")).isZero();
    }

    @Test
    void controlCharactersOnlyIntoANonTextTypeAreAFormatViolationThatNullifyCannotClean() {
        // 레거시 C 프로그램의 NUL 채움. trim 하면 비지만 공백이 아니다 — 프로파일러·추정기·도메인 변환기는 형식 위반으로 본다.
        Fixture fixture = fixture("5", "\u0000", "7");
        MappingSpec spec = fixture.spec(qty(List.of(new Nullify(DomainViolation.BLANK, 10L))));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).containsExactly("행 변환 실패(LEGACY_ITEM, column=qty, row=2): "
                    + "ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(FORMAT)" + STOPPED);
            assertThat(result.nullified()).as("BLANK 상한을 쓰지 않는다").isEmpty();
        });
        assertThat(count(fixture.target(), "tb_item")).isZero();
    }

    @Test
    void builtinDateAndTimestampParseFailuresNameTheFormatReasonWithoutTheValue() {
        for (String transform : List.of("date", "timestamp")) {
            Fixture fixture = fixture("5", "6", "7");
            jdbc(fixture.source).update("UPDATE LEGACY_ITEM SET END_YMD = '2024/1/31'");
            ColumnMapping parsed = new ColumnMapping("END_YMD", "end_ymd", transform, null, null, null, null);

            List<EtlExecutor.TableResult> results = executor.execute(fixture.spec(parsed), MigrationMode.COMMIT);

            // 격리 어휘는 이 사유로 형식 위반을 가린다. 사용자 변환기의 실패는 사유 없이 남는다(아래).
            assertThat(results.getFirst().errors()).as(transform).containsExactly(
                    "행 변환 실패(LEGACY_ITEM, column=end_ymd, row=1): ROW_TRANSFORM_FAILED:TRANSFORM_FAILED(FORMAT)"
                            + STOPPED);
            assertThat(results.getFirst().errors().getFirst()).doesNotContain("2024/1/31", "2024-01-31");
        }
        Fixture fixture = fixture("5", "6", "7");
        TransformerRegistry registry = new TransformerRegistry();
        registry.register("date", "test:date:v1", "0".repeat(64), value -> {
            throw new IllegalStateException("custom date failed");
        });
        ColumnMapping overridden = new ColumnMapping("END_YMD", "end_ymd", "date", null, null, null, null);

        assertThat(new EtlExecutor(new SourceIntrospector(), registry).execute(fixture.spec(overridden),
                MigrationMode.COMMIT).getFirst().errors())
                .as("같은 이름을 덮어쓴 사용자 변환기의 실패는 사유 없이 남는다").containsExactly(
                        "행 변환 실패(LEGACY_ITEM, column=end_ymd, row=1): ROW_TRANSFORM_FAILED:TRANSFORM_FAILED" + STOPPED);
    }

    @Test
    void textTypesStillKeepBlankStrings() {
        Fixture fixture = fixture("5", "6", "7");
        jdbc(fixture.source).update("UPDATE LEGACY_ITEM SET MEMO = '   ' WHERE ITEM_ID = 'i2'");
        MappingSpec spec = fixture.spec(qty(List.of()));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results.getFirst().errors()).isEmpty();
        assertThat(fixture.target().queryForObject("SELECT memo FROM tb_item WHERE item_id = 'i2'", String.class))
                .isEqualTo("   ");
    }

    @Test
    void nullifyBlankLoadsNullAndCountsRowsPerColumn() {
        Fixture fixture = fixture("", "6", " ");
        MappingSpec spec = fixture.spec(qty(List.of(new Nullify(DomainViolation.BLANK, 2L))));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.nullified()).containsExactly(Map.entry("qty", 2L));
            assertThat(result.written()).isEqualTo(3);
        });
        assertThat(fixture.target().queryForList("SELECT qty FROM tb_item ORDER BY item_id", Integer.class))
                .containsExactly(null, 6, null);
        assertThat(verifier.verify(spec, results, fixture.target()).overall())
                .isEqualTo(MigrationReport.Status.PASS);
    }

    @Test
    void nullifyCapExceededRollsBackTheChunkAndStopsTheRun() {
        Fixture fixture = fixture("", "", "  ");
        MappingSpec spec = fixture.spec(qty(List.of(new Nullify(DomainViolation.BLANK, 2L))));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).containsExactly(
                    "행 변환 실패(LEGACY_ITEM, column=qty, row=3): ROW_TRANSFORM_FAILED:NULLIFY_CAP_EXCEEDED(BLANK)"
                            + STOPPED);
            assertThat(result.nullified()).as("상한을 넘긴 행은 세지 않는다 — 집계는 상한을 넘지 않는다")
                    .containsExactly(Map.entry("qty", 2L));
        });
        // 상한 안의 앞 두 행도 같은 chunk 라 쓰지 않는다.
        assertThat(count(fixture.target(), "tb_item")).isZero();
        assertThat(fixture.target().queryForObject(
                "SELECT run_stts_cd FROM migration_control.tb_migration_run", String.class)).isEqualTo("FAILED");
    }

    @Test
    void domainTransformerViolationNamesTheCodeWithoutTheValue() {
        Fixture fixture = fixture("5", "6", "7");
        jdbc(fixture.source).update("UPDATE LEGACY_ITEM SET END_YMD = '99991231' WHERE ITEM_ID = 'i2'");
        MappingSpec spec = fixture.spec(endYmd(List.of()));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results.getFirst().errors()).containsExactly("행 변환 실패(LEGACY_ITEM, column=end_ymd, row=2): "
                + "ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(PLACEHOLDER_DATE)" + STOPPED);
        assertThat(results.getFirst().errors().getFirst()).doesNotContain("99991231", "9999");
        assertThat(count(fixture.target(), "tb_item")).isZero();
    }

    @Test
    void nullifyPlaceholderDateIsCountedTheSameInDryRunAndCommit() {
        Fixture fixture = fixture("5", "6", "7");
        jdbc(fixture.source).update("UPDATE LEGACY_ITEM SET END_YMD = '9999-12-31' WHERE ITEM_ID = 'i3'");
        MappingSpec spec = fixture.spec(endYmd(List.of(new Nullify(DomainViolation.PLACEHOLDER_DATE, 1L))));
        MappingSpec dryRun = new MappingSpec(spec.source(), null, spec.tables(), spec.codemaps());

        EtlExecutor.TableResult predicted = executor.execute(dryRun, MigrationMode.DRY_RUN).getFirst();
        EtlExecutor.TableResult committed = executor.execute(spec, MigrationMode.COMMIT).getFirst();

        assertThat(predicted.errors()).isEmpty();
        assertThat(predicted.nullified()).containsExactly(Map.entry("end_ymd", 1L));
        assertThat(committed.errors()).isEmpty();
        assertThat(committed.nullified()).isEqualTo(predicted.nullified());
        assertThat(fixture.target().queryForList("SELECT end_ymd FROM tb_item ORDER BY item_id", String.class))
                .containsExactly("20240131", "20240131", null);
    }

    @Test
    void aCustomTransformerCannotForgeADomainViolationToGetNullified() {
        Fixture fixture = fixture("5", "6", "7");
        TransformerRegistry registry = new TransformerRegistry();
        registry.register("forge", "test:forge:v1", "0".repeat(64), value -> {
            throw new DomainValueRejected(DomainViolation.BLANK);
        });
        EtlExecutor forging = new EtlExecutor(new SourceIntrospector(), registry);
        ColumnMapping forged = new ColumnMapping("QTY", "qty", "forge", "integer", null, null, null, null,
                List.of(new Nullify(DomainViolation.BLANK, 10L)));

        List<EtlExecutor.TableResult> results = forging.execute(fixture.spec(forged), MigrationMode.COMMIT);

        assertThat(results.getFirst().errors()).containsExactly(
                "행 변환 실패(LEGACY_ITEM, column=qty, row=1): ROW_TRANSFORM_FAILED:TRANSFORM_FAILED" + STOPPED);
        assertThat(results.getFirst().nullified()).isEmpty();
    }

    @Test
    void invalidNullifyDeclarationsStopBeforeAnyConnectionIsOpened() {
        Fixture fixture = fixture("5", "6", "7");
        assertThatThrownBy(() -> executor.execute(
                fixture.spec(qty(List.of(new Nullify(DomainViolation.INVALID_DATE, 1L)))), MigrationMode.COMMIT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("LEGACY_ITEM.qty: nullify 는 BLANK·PLACEHOLDER_DATE 위반에만 선언할 수 있습니다");
        assertThatThrownBy(() -> executor.execute(
                fixture.spec(qty(List.of(new Nullify(DomainViolation.BLANK, 0L)))), MigrationMode.DRY_RUN))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("LEGACY_ITEM.qty: nullify maxRows 는 1 이상이어야 합니다");
        assertThatThrownBy(() -> executor.execute(
                fixture.spec(qty(Arrays.asList(new Nullify(DomainViolation.BLANK, null)))), MigrationMode.COMMIT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("LEGACY_ITEM.qty: nullify maxRows 는 1 이상이어야 합니다");
        assertThatThrownBy(() -> executor.execute(fixture.spec(qty(List.of(new Nullify(DomainViolation.BLANK, 1L),
                new Nullify(DomainViolation.BLANK, 5L)))), MigrationMode.COMMIT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("LEGACY_ITEM.qty: nullify 에 같은 위반을 두 번 선언할 수 없습니다");
        // 실행 상태를 만들기 전에 멈췄다.
        assertThat(fixture.target().queryForObject("SELECT count(*) FROM information_schema.schemata"
                + " WHERE schema_name = 'MIGRATION_CONTROL'", Integer.class)).isZero();
    }

    // ── fixtures ──────────────────────────────────────────────────────────

    private static ColumnMapping qty(List<Nullify> nullify) {
        return new ColumnMapping("QTY", "qty", null, "integer", null, null, null, null, nullify);
    }

    private static ColumnMapping endYmd(List<Nullify> nullify) {
        return new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null, nullify);
    }

    private record Fixture(DbConfig source, DbConfig targetConfig) {

        JdbcTemplate target() {
            return jdbc(targetConfig);
        }

        MappingSpec spec(ColumnMapping column) {
            List<ColumnMapping> columns = new ArrayList<>(List.of(
                    new ColumnMapping("ITEM_ID", "item_id", null, null, null, null, null),
                    new ColumnMapping("MEMO", "memo", null, "varchar", null, null, null)));
            columns.add(column);
            if (!"end_ymd".equals(column.target())) {
                columns.add(new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null));
            }
            if (!"qty".equals(column.target())) {
                columns.add(new ColumnMapping("QTY", "qty", null, "integer", null, null, null));
            }
            TableMapping item = new TableMapping("LEGACY_ITEM", "tb_item", null, "ITEM_ID", "item_id",
                    columns, null);
            return new MappingSpec(source, targetConfig, List.of(item), Map.of(),
                    new RunContext("domain-value-" + SEQ.get(), "legacy-erp"));
        }
    }

    private static Fixture fixture(String... quantities) {
        String tag = "dv" + SEQ.incrementAndGet();
        DbConfig source = h2Config(tag + "src");
        DbConfig target = h2Config(tag + "tgt");
        JdbcTemplate src = jdbc(source);
        src.execute("CREATE TABLE LEGACY_ITEM (ITEM_ID varchar(20), QTY varchar(10), MEMO varchar(20),"
                + " END_YMD varchar(10))");
        for (int i = 0; i < quantities.length; i++) {
            src.update("INSERT INTO LEGACY_ITEM VALUES (?, ?, ?, ?)", "i" + (i + 1), quantities[i], "m" + i,
                    "2024-01-31");
        }
        jdbc(target).execute("CREATE TABLE tb_item (item_id varchar(20) PRIMARY KEY, qty integer,"
                + " memo varchar(20), end_ymd varchar(8))");
        return new Fixture(source, target);
    }

    private static DbConfig h2Config(String name) {
        return new DbConfig("jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
    }

    private static JdbcTemplate jdbc(DbConfig cfg) {
        DriverManagerDataSource ds = new DriverManagerDataSource(cfg.url(), cfg.username(), cfg.password());
        ds.setDriverClassName(cfg.driver());
        return new JdbcTemplate(ds);
    }

    private static int count(JdbcTemplate jt, String table) {
        Integer c = jt.queryForObject("SELECT count(*) FROM " + table, Integer.class);
        return c == null ? 0 : c;
    }
}
