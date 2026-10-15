package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.LookupKey;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;

/**
 * [ADR-0029 L3d, DEC-OPS-320] 조회 조인을 실제 PostgreSQL 에서 적재·재개한다. 주문(BIGINT 키)이 고객(NUMERIC 키)을 같은 읽기
 * 세션에서 단일 키로 조회해 고객명을 옮긴다. 짝이 둘 이상이면(fan-out) 멈추고, 짝이 없으면 exactly_one 은 멈추며
 * at_most_one 은 NULL 을 넣되 상한까지만 받는다. COMMIT 은 조회 표의 키 유일성을 행을 읽기 전에 확인하고, 조회 값이
 * 바뀐 뒤 재개하면 checksum 대조로 멈춘다.
 */
@Testcontainers
class EtlLookupPostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
    private final MigrationVerifier verifier = new MigrationVerifier();

    /** 주 표 BIGINT 키 ↔ 조회 표 NUMERIC 키. where 가 고른 행만 조회하고 그 밖의 같은 키 행은 짝이 아니다. */
    @Test
    void ordersCopyTheirCustomerNameThroughALongToBigDecimalKey() {
        Fixture fixture = fixture("match", "lookup-match-run");
        fixture.customers("(1, '김가', 'Y'), (2, '이나', 'Y'), (2, '옛 이나', 'N')");
        fixture.orders("(10, 1, 1.50), (11, 2, 2.00), (12, 1, 3.25)");
        MappingSpec mapping = fixture.mapping(cust(LookupCardinality.EXACTLY_ONE, null));

        List<EtlExecutor.TableResult> results = executor.execute(mapping, MigrationMode.COMMIT);
        MigrationReport report = verifier.verify(mapping, results, fixture.jdbc());

        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.written()).isEqualTo(3);
            assertThat(result.mappingId()).isEqualTo("orders");
            assertThat(result.lookupMisses()).isEmpty();
        });
        assertThat(fixture.jdbc().queryForList("SELECT cust_nm FROM public.tb_match_order ORDER BY order_no",
                String.class)).containsExactly("김가", "이나", "김가");
    }

    /**
     * 같은 키의 조회 행이 둘이면 dry-run 은 그 행에서 멈추고(값 없이 위치만), COMMIT 은 행을 읽기 전에 키 유일성을 증명하지
     * 못해 아무것도 쓰지 않는다.
     */
    @Test
    void twoCustomersForOneKeyStopTheDryRunAtThatRowAndTheCommitBeforeAnyRead() {
        Fixture fixture = fixture("fanout", "lookup-fanout-run");
        fixture.customers("(1, '김가', 'Y'), (2, '이나', 'Y'), (2, '박다', 'Y')");
        fixture.orders("(10, 1, 1.00), (11, 2, 2.00), (12, 1, 3.00)");
        MappingSpec mapping = fixture.mapping(cust(LookupCardinality.EXACTLY_ONE, null));

        List<EtlExecutor.TableResult> dryRun = executor.execute(mapping, MigrationMode.DRY_RUN);

        assertThat(dryRun).singleElement().satisfies(result -> assertThat(result.errors()).singleElement().asString()
                .isEqualTo("행 변환 실패(public.legacy_fanout_orders#orders, column=cust, row=2):"
                        + " ROW_TRANSFORM_FAILED:LOOKUP_FANOUT — 이 chunk 는 기록하지 않고 적재를 멈췄습니다")
                .doesNotContain("이나", "박다"));

        List<EtlExecutor.TableResult> commit = executor.execute(mapping, MigrationMode.COMMIT);

        assertThat(commit).singleElement().satisfies(result -> {
            assertThat(result.errors()).containsExactly("이관 실패(public.legacy_fanout_orders#orders):"
                    + " LOOKUP_KEY_UNIQUENESS_UNPROVEN(cust) — 조회 표의 키가 유일하지 않거나 확인하지 못했습니다");
            assertThat(result.read()).isZero();
        });
        assertThat(fixture.count("SELECT count(*) FROM public.tb_fanout_order")).isZero();
    }

    @Test
    void anOrderWithoutItsCustomerStopsExactlyOneBeforeTheChunkIsWritten() {
        Fixture fixture = fixture("missing", "lookup-missing-run");
        fixture.customers("(1, '김가', 'Y')");
        fixture.orders("(10, 1, 1.00), (11, 7, 2.00), (12, NULL, 3.00)");
        MappingSpec mapping = fixture.mapping(cust(LookupCardinality.EXACTLY_ONE, null));

        List<EtlExecutor.TableResult> results = executor.execute(mapping, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).containsExactly("행 변환 실패(public.legacy_missing_orders#orders, column=cust,"
                    + " row=2): ROW_TRANSFORM_FAILED:LOOKUP_MISSING — 이 chunk 는 기록하지 않고 적재를 멈췄습니다");
            assertThat(result.written()).isZero();
        });
        assertThat(verifier.verify(mapping, results, fixture.jdbc()).ok()).isFalse();
        assertThat(fixture.count("SELECT count(*) FROM public.tb_missing_order")).isZero();
    }

    /** at_most_one 은 짝 없는 행(키 없음 포함)에 NULL 을 넣고 세며, 상한을 넘는 행에서 그 chunk 를 쓰지 않고 멈춘다. */
    @Test
    void atMostOneWritesNullUpToMaxMissingAndStopsPastIt() {
        Fixture fixture = fixture("optional", "lookup-optional-run");
        fixture.customers("(1, '김가', 'Y')");
        fixture.orders("(10, 1, 1.00), (11, 7, 2.00), (12, NULL, 3.00)");

        List<EtlExecutor.TableResult> capped = executor.execute(
                fixture.mapping(cust(LookupCardinality.AT_MOST_ONE, 1L)), MigrationMode.COMMIT);

        assertThat(capped).singleElement().satisfies(result -> {
            assertThat(result.errors()).containsExactly("행 변환 실패(public.legacy_optional_orders#orders, column=cust,"
                    + " row=3): ROW_TRANSFORM_FAILED:LOOKUP_MISSING_CAP_EXCEEDED — 이 chunk 는 기록하지 않고 적재를"
                    + " 멈췄습니다");
            assertThat(result.written()).isZero();
            assertThat(result.lookupMisses()).containsExactly(entry("cust", 1L));
        });
        assertThat(fixture.count("SELECT count(*) FROM public.tb_optional_order")).isZero();

        MappingSpec allowed = fixture.mapping(cust(LookupCardinality.AT_MOST_ONE, 2L));
        List<EtlExecutor.TableResult> results = executor.execute(allowed, MigrationMode.COMMIT);
        MigrationReport report = verifier.verify(allowed, results, fixture.jdbc());

        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.written()).isEqualTo(3);
            assertThat(result.lookupMisses()).containsExactly(entry("cust", 2L));
        });
        assertThat(fixture.jdbc().queryForList("SELECT cust_nm FROM public.tb_optional_order ORDER BY order_no",
                String.class)).containsExactly("김가", null, null);
    }

    /**
     * 첫 실행이 둘째 chunk 에서 멈춘 뒤 조회 표의 값이 바뀌면, 재개는 이미 쓴 행을 다시 조회해 대조하다 checksum 이 달라
     * 멈춘다 — 대상의 값과 다른 고객명을 조용히 섞지 않는다.
     */
    @Test
    void aCustomerChangedBetweenRunsStopsTheResumeAtTheChecksumComparison() {
        Fixture fixture = fixture("resume", "lookup-resume-run");
        fixture.customers("(1, '김가', 'Y'), (2, '이나', 'Y'), (3, '박다', 'Y')");
        fixture.jdbc().update("INSERT INTO public.legacy_resume_orders SELECT g, CASE WHEN g = 550 THEN 99"
                + " ELSE g % 3 + 1 END, 1.00 FROM generate_series(1, 600) g");
        MappingSpec mapping = fixture.mapping(cust(LookupCardinality.EXACTLY_ONE, null));

        List<EtlExecutor.TableResult> first = executor.execute(mapping, MigrationMode.COMMIT);

        assertThat(first).singleElement().satisfies(result -> {
            assertThat(result.errors()).singleElement().asString().contains("row=550", "LOOKUP_MISSING");
            assertThat(result.written()).isEqualTo(500);
        });

        fixture.jdbc().update("UPDATE public.legacy_resume_customer SET cust_nm = '김가나' WHERE cust_no = 1");
        fixture.customers("(99, '최라', 'Y')");
        List<EtlExecutor.TableResult> resumed = executor.execute(mapping, MigrationMode.COMMIT);

        assertThat(resumed).singleElement().satisfies(result -> assertThat(result.errors()).singleElement().asString()
                .startsWith("resume checkpoint/source checksum 불일치(public.legacy_resume_orders#orders, sourceDigest=")
                .doesNotContain("김가"));
        assertThat(fixture.count("SELECT count(*) FROM public.tb_resume_order")).isEqualTo(500);
        assertThat(fixture.count("SELECT count(*) FROM public.tb_resume_order WHERE cust_nm = '김가나'")).isZero();
    }

    /**
     * 대소문자를 무시하는 조회 키(ICU 비결정 collation) — 조회 표에는 'abc' 한 행뿐이고 한 chunk 에 'abc'·'ABC' 주문이 함께
     * 있다. 첫 조회는 'abc' 행 하나만 돌려주지만, 정확히 같은 글자의 짝이 없는 'ABC' 를 다시 물으면 DB 가 그 행을 찾는다 —
     * at_most_one 이라도 'ABC' 에 NULL 을 넣지 않고 chunk 를 쓰지 않은 채 멈춘다. 'ABC' 만 든 chunk 와 같은 판정이다.
     */
    @Test
    void aKeyThatOnlyTheDatabaseCollationMatchesStopsTheChunkWhicheverRowsShareIt() {
        jdbc().execute("CREATE COLLATION IF NOT EXISTS public.lookup_ci"
                + " (provider = icu, locale = 'und-u-ks-level2', deterministic = false)");
        Fixture fixture = fixture("collated", "lookup-collated-run", "varchar(10)",
                "varchar(10) COLLATE public.lookup_ci");
        fixture.customers("('abc', '김가', 'Y')");
        fixture.orders("(10, 'abc', 1.00), (11, 'ABC', 2.00)");
        assertThat(fixture.count("SELECT count(*) FROM public.legacy_collated_customer WHERE cust_no = 'ABC'"))
                .isEqualTo(1);

        List<EtlExecutor.TableResult> results = executor.execute(
                fixture.mapping(cust(LookupCardinality.AT_MOST_ONE, 5L)), MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).containsExactly("행 변환 실패(public.legacy_collated_orders#orders,"
                    + " column=cust, row=1): ROW_TRANSFORM_FAILED:LOOKUP_KEY_MISMATCH — 이 chunk 는 기록하지 않고 적재를"
                    + " 멈췄습니다");
            assertThat(result.written()).isZero();
            assertThat(result.lookupMisses()).isEmpty();
        });
        assertThat(fixture.count("SELECT count(*) FROM public.tb_collated_order")).isZero();
    }

    /** PostgreSQL 에서 빈 문자열은 키다 — 빈 문자열 키의 고객이 있으면 exactly_one 도 그 고객과 짝을 짓는다. */
    @Test
    void anEmptyStringKeyMatchesTheCustomerWhoseKeyIsEmpty() {
        Fixture fixture = fixture("empty_key", "lookup-empty-key-run", "varchar(10)", "varchar(10)");
        fixture.customers("('C1', '김가', 'Y'), ('', '빈키', 'Y')");
        fixture.orders("(10, 'C1', 1.00), (11, '', 2.00)");
        MappingSpec mapping = fixture.mapping(cust(LookupCardinality.EXACTLY_ONE, null));

        List<EtlExecutor.TableResult> results = executor.execute(mapping, MigrationMode.COMMIT);
        MigrationReport report = verifier.verify(mapping, results, fixture.jdbc());

        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(fixture.jdbc().queryForList("SELECT cust_nm FROM public.tb_empty_key_order ORDER BY order_no",
                String.class)).containsExactly("김가", "빈키");
    }

    /** 순서 키가 없는 조회 매핑은 dry-run 이라도 연결을 열기 전에 거부한다. id 가 없는 조회 매핑도 같다. */
    @Test
    void aLookupMappingWithoutAnOrderKeyOrAnIdIsRefusedBeforeConnecting() {
        Fixture fixture = fixture("unordered", "lookup-unordered-run");
        TableMapping declared = fixture.mapping(cust(LookupCardinality.EXACTLY_ONE, null)).tables().getFirst();
        TableMapping unordered = new TableMapping(declared.source(), declared.target(), null, null, List.of(),
                declared.targetKey(), declared.columns(), null, null, List.of(), "orders", declared.lookups());
        TableMapping anonymous = new TableMapping(declared.source(), declared.target(), null, "order_no", List.of(),
                declared.targetKey(), declared.columns(), null, null, List.of(), null, declared.lookups());

        assertThatThrownBy(() -> executor.execute(fixture.spec(unordered), MigrationMode.DRY_RUN))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("public.legacy_unordered_orders#orders: 조회 조인(lookups)에는 orderBy/orderByKeys 가"
                        + " 필수입니다 — 순서 없는 읽기는 결과를 연 채 조회 문장을 보낼 수 없습니다");
        assertThatThrownBy(() -> executor.execute(fixture.spec(anonymous), MigrationMode.DRY_RUN))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageStartingWith("public.legacy_unordered_orders: 조회 조인(lookups)을 쓰는 매핑에는 id 가");
    }

    private static Lookup cust(LookupCardinality cardinality, Long maxMissing) {
        return new Lookup("cust", null, "use_yn = 'Y'", new LookupKey("cust_no", "cust_no"), cardinality, maxMissing);
    }

    private Fixture fixture(String name, String runId) {
        return fixture(name, runId, "bigint", "numeric(12,0)");
    }

    /** 주 표 키와 조회 표 키의 컬럼 정의를 고른다. */
    private Fixture fixture(String name, String runId, String orderKey, String customerKey) {
        JdbcTemplate jdbc = jdbc();
        jdbc.execute("CREATE TABLE public.legacy_" + name + "_orders (order_no bigint PRIMARY KEY, cust_no " + orderKey
                + ", amt numeric(10,2))");
        jdbc.execute("CREATE TABLE public.legacy_" + name + "_customer (cust_no " + customerKey
                + ", cust_nm varchar(50), use_yn varchar(1))");
        jdbc.execute("CREATE TABLE public.tb_" + name + "_order (order_no bigint PRIMARY KEY, cust_nm varchar(50),"
                + " amt numeric(10,2))");
        return new Fixture(jdbc, name, runId);
    }

    private static JdbcTemplate jdbc() {
        return new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
    }

    private static MappingSpec.DbConfig endpoint() {
        return new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword(), "org.postgresql.Driver");
    }

    private record Fixture(JdbcTemplate jdbc, String name, String runId) {

        void customers(String values) {
            jdbc.update("INSERT INTO public.legacy_" + name + "_customer VALUES " + values);
        }

        void orders(String values) {
            jdbc.update("INSERT INTO public.legacy_" + name + "_orders VALUES " + values);
        }

        /** 주문을 주문번호 순으로 읽어 고객명을 조회한다. 조회 표 이름은 이 fixture 의 고객 표다. */
        MappingSpec mapping(Lookup lookup) {
            Lookup bound = new Lookup(lookup.alias(), "public.legacy_" + name + "_customer", lookup.where(),
                    lookup.key(), lookup.cardinality(), lookup.maxMissing());
            return spec(new TableMapping("public.legacy_" + name + "_orders", "public.tb_" + name + "_order", null,
                    "order_no", List.of(), "order_no",
                    List.of(new ColumnMapping("order_no", "order_no", null, null, null, null, null),
                            new ColumnMapping("amt", "amt", null, null, null, null, null),
                            new ColumnMapping("cust.cust_nm", "cust_nm", null, null, null, null, null)),
                    null, null, List.of(), "orders", List.of(bound)));
        }

        MappingSpec spec(TableMapping table) {
            return new MappingSpec(endpoint(), endpoint(), List.of(table), Map.of(),
                    new MappingSpec.RunContext(runId, "synthetic-source"));
        }

        long count(String sql) {
            Long value = jdbc.queryForObject(sql, Long.class);
            return value == null ? 0L : value;
        }
    }
}
