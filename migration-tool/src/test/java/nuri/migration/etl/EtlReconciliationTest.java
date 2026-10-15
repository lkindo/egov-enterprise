package nuri.migration.etl;

import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.archive.ArchiveRun;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.postgres.TargetStandardSnapshot;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.CodeTranslator;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.ColumnCheck;
import nuri.migration.verify.ColumnReplay;
import nuri.migration.verify.CoverageReason;
import nuri.migration.verify.ReconciliationPlan;
import nuri.migration.verify.ReconciliationPlanner;
import nuri.migration.verify.ReconciliationRun;
import nuri.migration.verify.SourceAggregates;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * [ADR-0029 L4 D2·D7] 실행기의 대사 수집 — 같은 원천 읽기 세션의 집계 문장(묶음마다 하나, 실패하면 COUNT 전용으로 물러나고 그것도
 * 실패하면 읽기 전에 멈춤)과, 쓰기 재시도가 codemap 결과를 두 번 세지 않는다는 규칙.
 */
class EtlReconciliationTest {

    private static final AtomicInteger SEQ = new AtomicInteger();
    private static final SourceReadSessionPolicy POLICY =
            SourceReadSessionPolicy.repeatableRead(EvidenceLevel.UNVERIFIED, "test");
    private static final TransformerRegistry TRANSFORMERS = new TransformerRegistry();
    private static final MappingSpec.CodeMap STATUS = MappingSpec.CodeMap.of(Map.of("A", "ACT", "D", "DEL"));

    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), TRANSFORMERS);

    @Test
    @DisplayName("같은 소스·where 의 분할 매핑은 집계 문장 하나를 나눠 쓰고, 그 결과는 대사 홀더에만 남는다")
    void splitMappingsShareOneAggregateStatement() {
        DbConfig source = seededSource();
        List<String> statements = new ArrayList<>();
        TableMapping first = mapping("PUBLIC.tb_item_a", "a");
        TableMapping second = mapping("PUBLIC.tb_item_b", "b");
        MappingSpec spec = new MappingSpec(source, null, List.of(first, second), Map.of("stts", STATUS));
        ReconciliationRun run = run(spec);

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.DRY_RUN,
                new JdbcTemplate(recording(jdbc(source).getDataSource(), statements)), null, POLICY, true, Map.of(),
                ArchiveRun.counting(), false, run);

        assertThat(results).allSatisfy(result -> assertThat(result.errors()).isEmpty());
        assertThat(statements.stream().filter(sql -> sql.startsWith("SELECT COUNT(*)")).toList())
                .as("묶음마다 문장 하나").singleElement().asString()
                .contains("COUNT(amt)", "SUM(CAST(amt AS DECIMAL(38,0)))", "MIN(amt)", "MAX(amt)");
        ReconciliationPlan plan = run.plan();
        SourceAggregates aggregates = run.source(plan.mapping("LEGACY_ITEM#a").aggregateGroup());
        assertThat(aggregates).isSameAs(run.source(plan.mapping("LEGACY_ITEM#b").aggregateGroup()));
        assertThat(aggregates.rows()).isEqualTo(3);
        assertThat(aggregates.nonNull("amt")).isEqualTo(2);
        assertThat(aggregates.sum("amt")).isEqualByComparingTo("30");
        assertThat(run.table("LEGACY_ITEM#a").codeKinds("stts_cd"))
                .containsEntry(CodeTranslator.Translation.Kind.MAPPED, 3L);
    }

    @Test
    @DisplayName("비활성 대사는 집계 문장을 보내지 않는다")
    void anInactiveRunSendsNoAggregate() {
        DbConfig source = seededSource();
        List<String> statements = new ArrayList<>();
        MappingSpec spec = new MappingSpec(source, null, List.of(mapping("tb_item_a", "a")), Map.of("stts", STATUS));

        executor.execute(spec, MigrationMode.DRY_RUN, new JdbcTemplate(recording(jdbc(source).getDataSource(),
                statements)), null, POLICY, true, Map.of(), ArchiveRun.counting(), false, ReconciliationRun.none());

        assertThat(statements).noneMatch(sql -> sql.startsWith("SELECT COUNT(*)"));
    }

    @Test
    @DisplayName("집계 문장이 실패하면 COUNT 전용으로 물러나 합·최소·최대만 판정하지 않는다")
    void aFailedAggregateFallsBackToCounts() {
        DbConfig source = seededSource();
        MappingSpec spec = new MappingSpec(source, null, List.of(mapping("tb_item_a", null)), Map.of("stts", STATUS));
        // 문자 컬럼을 정확 수치로 계획해 합의 캐스트가 실행 중에 실패하게 한다.
        ColumnCheck name = new ColumnCheck("nm", "name", new ColumnCheck.SourceColumnType(Types.BIGINT, "int8", 19L, 0),
                ColumnCheck.Aggregate.NUM, true, false, null, false, null, null, false, null, List.of());
        ReconciliationRun run = run(spec, name);

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.DRY_RUN, jdbc(source), null,
                POLICY, true, Map.of(), ArchiveRun.counting(), false, run);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.read()).isEqualTo(3);
        });
        SourceAggregates aggregates = run.source(run.plan().mappings().getFirst().aggregateGroup());
        assertThat(aggregates.rows()).isEqualTo(3);
        assertThat(aggregates.nonNull("name")).isEqualTo(3);
        assertThat(aggregates.sum("name")).isNull();
        assertThat(aggregates.aggregateGap("name")).isEqualTo(CoverageReason.SOURCE_AGGREGATE_FAILED);
    }

    @Test
    @DisplayName("COUNT 전용 문장도 실패하면 행을 읽지 않고 멈춘다")
    void aFailedCountStopsBeforeReading() {
        DbConfig source = seededSource();
        MappingSpec spec = new MappingSpec(source, null, List.of(mapping("tb_item_a", null)), Map.of("stts", STATUS));
        ColumnCheck absent = new ColumnCheck("absent", "absent_col", null, ColumnCheck.Aggregate.NONE, true, false,
                null, false, null, null, false, null, List.of());
        ReconciliationRun run = run(spec, absent);

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.DRY_RUN, jdbc(source), null,
                POLICY, true, Map.of(), ArchiveRun.counting(), false, run);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).containsExactly("이관 실패(LEGACY_ITEM): SOURCE_AGGREGATE_FAILED");
            assertThat(result.read()).isZero();
        });
        assertThat(run.source(run.plan().mappings().getFirst().aggregateGroup())).isNull();
    }

    @Test
    @DisplayName("쓰기 재시도의 재변환은 codemap 결과를 두 번 세지 않는다")
    void theWriteRetryDoesNotCountCodesTwice() {
        DbConfig source = seededSource();
        DbConfig target = h2("tgt");
        jdbc(target).execute("CREATE TABLE tb_item_a (item_id int PRIMARY KEY, nm varchar(20), amt bigint,"
                + " stts_cd varchar(10))");
        MappingSpec spec = new MappingSpec(source, target, List.of(mapping("tb_item_a", null)), Map.of("stts", STATUS),
                new RunContext("reconcile-retry", "legacy"));
        ReconciliationRun run = run(spec);
        AtomicBoolean failed = new AtomicBoolean();

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT, jdbc(source),
                new JdbcTemplate(failingFirstBatch(jdbc(target).getDataSource(), failed)), POLICY, true, Map.of(),
                ArchiveRun.counting(), false, run);

        assertThat(failed).as("batch 가 한 번 실패해 행마다 다시 썼다").isTrue();
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.written()).isEqualTo(3);
        });
        assertThat(run.table("LEGACY_ITEM").codeKinds("stts_cd"))
                .containsExactly(Map.entry(CodeTranslator.Translation.Kind.MAPPED, 3L));
        assertThat(run.replicationRoleOrigin()).as("PostgreSQL 대상이 아니면 확인하지 않는다").isNull();
    }

    private static ReconciliationRun run(MappingSpec spec, ColumnCheck... extra) {
        ReconciliationPlan planned = ReconciliationPlanner.plan(spec, inventory(), contracts(), List.of(), TRANSFORMERS);
        if (extra.length > 0) {
            ReconciliationPlan.MappingPlan only = planned.mappings().getFirst();
            planned = new ReconciliationPlan(true, List.of(new ReconciliationPlan.MappingPlan(only.label(),
                    only.source(), only.mappingId(), only.where(), only.target(), List.of(extra),
                    only.targetPrimaryKey(), only.preservedKey(), only.isolates(), only.generatedIdentity())),
                    List.of(), null, List.of(), List.of());
        }
        return ReconciliationRun.of(planned, new ColumnReplay(TRANSFORMERS, spec.codemaps()), null);
    }

    private static TableMapping mapping(String target, String id) {
        return new TableMapping("LEGACY_ITEM", target, null, "ITEM_ID", List.of(), "item_id", List.of(
                new ColumnMapping("ITEM_ID", "item_id", null, null, null, null, null),
                new ColumnMapping("NAME", "nm", null, null, null, null, null),
                new ColumnMapping("AMT", "amt", null, null, null, null, null),
                new ColumnMapping("STTS", "stts_cd", null, null, "stts", null, null)), null, null, List.of(), id,
                List.of());
    }

    private static DbConfig seededSource() {
        DbConfig source = h2("src");
        JdbcTemplate jdbc = jdbc(source);
        jdbc.execute("CREATE TABLE LEGACY_ITEM (ITEM_ID int, NAME varchar(20), AMT bigint, STTS varchar(2))");
        jdbc.update("INSERT INTO LEGACY_ITEM VALUES (1, 'a', 10, 'A'), (2, 'b', 20, 'D'), (3, 'c', NULL, 'A')");
        return source;
    }

    /** 대상 계약 — 정확 수치 컬럼의 합·최소·최대는 대상 계약을 읽은 계획만 잰다. */
    private static TargetSchemaFingerprint contracts() {
        List<TargetStandardSnapshot.TableContract> tables = new ArrayList<>();
        for (String name : List.of("tb_item_a", "tb_item_b")) {
            tables.add(new TargetStandardSnapshot.TableContract("PUBLIC", name,
                    TargetStandardSnapshot.ContractStatus.READ, TargetStandardSnapshot.StandardStatus.ABSENT, List.of(
                    contract("item_id", 1, "integer"), contract("nm", 2, "character varying"),
                    contract("amt", 3, "bigint"), contract("stts_cd", 4, "character varying"))));
        }
        return new TargetSchemaFingerprint(1, "H2", "2", "d", List.of(),
                new TargetStandardSnapshot(TargetStandardSnapshot.CURRENT_SCHEMA_VERSION, tables));
    }

    private static TargetStandardSnapshot.ColumnContract contract(String name, int ordinal, String type) {
        return new TargetStandardSnapshot.ColumnContract(name, ordinal, type, null, null, null, true, false, null,
                false, null);
    }

    private static CatalogSnapshot inventory() {
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-15T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("H2", "2", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "PUBLIC", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), List.of(
                new CatalogObject(ObjectKind.TABLE, "db", "PUBLIC", "LEGACY_ITEM", false, null, null, List.of(),
                        Map.of()),
                column("ITEM_ID", Types.INTEGER, 1), column("NAME", Types.VARCHAR, 2),
                column("AMT", Types.BIGINT, 3), column("STTS", Types.VARCHAR, 4)), List.of());
    }

    private static CatalogObject column(String name, int jdbcType, int ordinal) {
        return new CatalogObject(ObjectKind.COLUMN, "db", "PUBLIC", "LEGACY_ITEM." + name, false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "PUBLIC", "LEGACY_ITEM")),
                Map.of("parentTable", "LEGACY_ITEM", "originalName", name, "jdbcType", Integer.toString(jdbcType),
                        "nativeType", "x", "size", "19", "scale", "0", "ordinal", Integer.toString(ordinal)));
    }

    private static DbConfig h2(String role) {
        return new DbConfig("jdbc:h2:mem:reconcile" + SEQ.incrementAndGet() + role + ";DB_CLOSE_DELAY=-1", "sa", "",
                "org.h2.Driver");
    }

    private static JdbcTemplate jdbc(DbConfig config) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(config.url(), config.username(),
                config.password());
        dataSource.setDriverClassName(config.driver());
        return new JdbcTemplate(dataSource);
    }

    /** 원천 연결이 준비한 문장을 기록한다. */
    private static DataSource recording(DataSource delegate, List<String> statements) {
        return new DelegatingDataSource(delegate) {
            @Override
            public Connection getConnection() throws SQLException {
                Connection connection = super.getConnection();
                return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(),
                        new Class<?>[]{Connection.class}, (proxy, method, args) -> {
                            if (method.getName().equals("prepareStatement") && args != null
                                    && args[0] instanceof String sql) {
                                statements.add(sql);
                            }
                            return invoke(connection, method, args);
                        });
            }
        };
    }

    /** 대상 표 INSERT 의 첫 batch 만 실패시킨다 — 실행기가 같은 chunk 를 행마다 다시 쓰게 한다. */
    private static DataSource failingFirstBatch(DataSource delegate, AtomicBoolean failed) {
        return new DelegatingDataSource(delegate) {
            @Override
            public Connection getConnection() throws SQLException {
                Connection connection = super.getConnection();
                return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(),
                        new Class<?>[]{Connection.class}, (proxy, method, args) -> {
                            Object result = invoke(connection, method, args);
                            if (method.getName().equals("prepareStatement") && args != null
                                    && args[0] instanceof String sql && sql.startsWith("INSERT INTO tb_item_a ")) {
                                PreparedStatement statement = (PreparedStatement) result;
                                return Proxy.newProxyInstance(PreparedStatement.class.getClassLoader(),
                                        new Class<?>[]{PreparedStatement.class}, (inner, call, values) -> {
                                            if (call.getName().equals("executeBatch") && failed.compareAndSet(false,
                                                    true)) {
                                                throw new SQLException("forced batch failure", "40001");
                                            }
                                            return invoke(statement, call, values);
                                        });
                            }
                            return result;
                        });
            }
        };
    }

    private static Object invoke(Object target, java.lang.reflect.Method method, Object[] args) throws Throwable {
        try {
            return method.invoke(target, args);
        } catch (InvocationTargetException failure) {
            throw failure.getCause();
        }
    }
}
