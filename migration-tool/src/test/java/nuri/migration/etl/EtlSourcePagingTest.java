package nuri.migration.etl;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class EtlSourcePagingTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    @Test
    void compositeKeysetPageUsesLexicographicSeekAndNeverOffset() {
        TableMapping table = new TableMapping(
                "LEGACY_ITEM", "tb_item", "ACTIVE_YN='Y'", null,
                List.of("TENANT_ID", "ITEM_SEQ"), null,
                List.of(new ColumnMapping("ITEM_NM", "item_nm", null, null, null, null, null)),
                new IdStrategy("item_id", "ITM", "ROW_ID"));

        String first = EtlExecutor.buildSourcePageSql(table, false);
        String next = EtlExecutor.buildSourcePageSql(table, true);

        assertThat(first)
                .startsWith("SELECT ITEM_NM, ROW_ID, TENANT_ID, ITEM_SEQ FROM LEGACY_ITEM")
                .contains("WHERE ACTIVE_YN='Y'", "ORDER BY TENANT_ID, ITEM_SEQ")
                .doesNotContain("SELECT *")
                .doesNotContainIgnoringCase("offset");
        assertThat(next).contains("ACTIVE_YN='Y'", "TENANT_ID > ?",
                        "TENANT_ID = ? AND ITEM_SEQ > ?", "ORDER BY TENANT_ID, ITEM_SEQ")
                .doesNotContain("SELECT *")
                .doesNotContainIgnoringCase("offset");
    }

    @Test
    void projectionIncludesEveryMappedIdentityForeignKeyAndOrderSourceExactlyOnce() {
        TableMapping table = new TableMapping(
                "LEGACY_CHILD", "tb_child", null, null,
                List.of("TENANT_ID", "ROW_SEQ"), null,
                List.of(
                        new ColumnMapping("VALUE", "value", null, null, null, null, null),
                        new ColumnMapping("TENANT_ID", "tenant_id", null, null, null, null, null),
                        new ColumnMapping(null, "audit_value", null, null, null, null, "SYSTEM")),
                null,
                new IdentityStrategy(
                        TargetIdentityPolicy.PRESERVE,
                        List.of(
                                new IdentityComponentSpec("TENANT_ID", IdentityValueType.TEXT),
                                new IdentityComponentSpec("ROW_SEQ", IdentityValueType.SIGNED_INTEGER)),
                        List.of(
                                new IdentityComponentSpec("tenant_id", IdentityValueType.TEXT),
                                new IdentityComponentSpec("row_seq", IdentityValueType.SIGNED_INTEGER))),
                List.of(new CompositeForeignKey(
                        "LEGACY_PARENT",
                        List.of(new IdentityComponentSpec("PARENT_ID", IdentityValueType.SIGNED_INTEGER)),
                        List.of(new IdentityComponentSpec("parent_id", IdentityValueType.SIGNED_INTEGER)))));

        assertThat(EtlExecutor.buildSourcePageSql(table, false))
                .startsWith("SELECT VALUE, TENANT_ID, ROW_SEQ, PARENT_ID FROM LEGACY_CHILD")
                .doesNotContain("TENANT_ID, TENANT_ID", "SELECT *");
    }

    @Test
    void constantOnlyDryRunUsesSafeRowMarkerInsteadOfWildcard() {
        TableMapping table = new TableMapping(
                "LEGACY_CONSTANT_ROWS", "tb_constant_rows", null,
                List.of(new ColumnMapping(null, "source_system", null, null, null, null, "LEGACY")),
                null);

        assertThat(EtlExecutor.buildSourcePageSql(table, false))
                .isEqualTo("SELECT 1 AS __migration_row__ FROM LEGACY_CONSTANT_ROWS");
    }

    @Test
    void byteBudgetSplitsLargeNativeValuesBeforeFiveHundredRowsWithoutLosingOrDuplicatingRows() {
        try (LargeFixture fixture = largeFixture()) {
            for (int id = 1; id <= 7; id++) {
                insertLargeRow(fixture.source(), id);
            }
            var executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
            var results = executor.execute(fixture.mapping(), MigrationMode.COMMIT, fixture.source(), fixture.target());

            assertThat(results).singleElement().satisfies(result -> {
                assertThat(result.read()).isEqualTo(7);
                assertThat(result.transformed()).isEqualTo(7);
                assertThat(result.written()).isEqualTo(7);
                assertThat(result.errors()).isEmpty();
            });
            // Each row retains just over 4 MiB: the 8 MiB budget produces pages of 2, 2, 2, 1.
            assertThat(fixture.pageSql()).hasSize(4);
            assertThat(fixture.pageFetchSizes()).containsExactly(1, 1, 1, 1);
            assertThat(fixture.pageSql().getFirst()).doesNotContain("ID > ?");
            assertThat(fixture.pageSql().subList(1, 4)).allSatisfy(sql -> assertThat(sql).contains("ID > ?"));
            assertThat(fixture.target().queryForList("SELECT id FROM tb_large ORDER BY id", Integer.class))
                    .containsExactly(1, 2, 3, 4, 5, 6, 7);
            for (int id = 1; id <= 7; id++) {
                Map<String, Object> copied = fixture.target().queryForMap(
                        "SELECT bin_data, text_data FROM tb_large WHERE id=?", id);
                assertThat(Arrays.equals((byte[]) copied.get("bin_data"), largeBinary(id)))
                        .as("complete binary content for row %d", id).isTrue();
                assertThat(largeText(id).equals(copied.get("text_data")))
                        .as("complete Unicode content for row %d", id).isTrue();
            }
            var report = new MigrationVerifier().verify(fixture.mapping(), results, fixture.target());
            assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();

            fixture.pageSql().clear();
            fixture.pageFetchSizes().clear();
            var resumed = executor.execute(fixture.mapping(), MigrationMode.COMMIT, fixture.source(), fixture.target());
            assertThat(resumed).singleElement().satisfies(result -> {
                assertThat(result.read()).isEqualTo(7);
                assertThat(result.written()).isEqualTo(7);
                assertThat(result.errors()).isEmpty();
            });
            assertThat(fixture.pageSql()).hasSize(4);
            assertThat(fixture.pageFetchSizes()).containsExactly(1, 1, 1, 1);
            assertThat(fixture.target().queryForObject("SELECT count(*) FROM tb_large", Long.class)).isEqualTo(7);
            assertThat(fixture.target().queryForObject(
                    "SELECT count(*) FROM migration_control.tb_migration_checkpoint", Long.class)).isEqualTo(7);
            assertThat(new MigrationVerifier().verify(fixture.mapping(), resumed, fixture.target()).ok()).isTrue();
        }
    }

    @Test
    void duplicateOrderAtAnEarlyByteBudgetBoundaryFailsBeforeProcessingThePage() {
        try (LargeFixture fixture = largeFixture()) {
            insertLargeRow(fixture.source(), 1);
            insertLargeRow(fixture.source(), 2);
            insertLargeRow(fixture.source(), 2);

            // DRY_RUN reaches the boundary guard directly; COMMIT also has an earlier uniqueness preflight.
            var results = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry()).execute(
                    fixture.mapping(), MigrationMode.DRY_RUN, fixture.source(), fixture.target());

            assertThat(results).singleElement().satisfies(result -> {
                assertThat(result.read()).isZero();
                assertThat(result.transformed()).isZero();
                assertThat(result.written()).isZero();
                assertThat(result.errors()).containsExactly("이관 실패(LEGACY_LARGE): SQL_EXECUTION_FAILED");
            });
            assertThat(fixture.pageSql()).hasSize(1);
            assertThat(fixture.pageFetchSizes()).containsExactly(1);
            assertThat(fixture.target().queryForObject("SELECT count(*) FROM tb_large", Long.class)).isZero();
        }
    }

    private static LargeFixture largeFixture() {
        int sequence = SEQUENCE.incrementAndGet();
        DbConfig sourceConfig = h2Config("large_page_source_" + sequence);
        DbConfig targetConfig = h2Config("large_page_target_" + sequence);
        List<String> pageSql = new ArrayList<>();
        List<Integer> pageFetchSizes = new ArrayList<>();
        DriverManagerDataSource sourceDataSource = new DriverManagerDataSource(
                sourceConfig.url(), sourceConfig.username(), sourceConfig.password()) {
            @Override
            public Connection getConnection() throws SQLException {
                Connection delegate = super.getConnection();
                return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(),
                        new Class<?>[]{Connection.class}, (proxy, method, arguments) -> {
                            try {
                                Object result = method.invoke(delegate, arguments);
                                if (method.getName().equals("prepareStatement") && arguments[0] instanceof String sql
                                        && sql.startsWith("SELECT ID, BIN_DATA, TEXT_DATA FROM LEGACY_LARGE")) {
                                    pageSql.add(sql);
                                    return observePageFetchSize((PreparedStatement) result, pageFetchSizes);
                                }
                                return result;
                            } catch (InvocationTargetException failure) {
                                throw failure.getCause();
                            }
                        });
            }
        };
        JdbcTemplate source = new JdbcTemplate(sourceDataSource);
        JdbcTemplate target = new JdbcTemplate(new DriverManagerDataSource(
                targetConfig.url(), targetConfig.username(), targetConfig.password()));
        source.execute("CREATE TABLE LEGACY_LARGE (ID bigint, BIN_DATA varbinary(4194304), TEXT_DATA varchar(1048576))");
        target.execute("CREATE TABLE tb_large (id bigint PRIMARY KEY, bin_data varbinary(4194304), text_data varchar(1048576))");
        TableMapping table = new TableMapping("LEGACY_LARGE", "tb_large", null, "ID", "id", List.of(
                new ColumnMapping("ID", "id", null, null, null, null, null),
                new ColumnMapping("BIN_DATA", "bin_data", null, null, null, null, null),
                new ColumnMapping("TEXT_DATA", "text_data", null, null, null, null, null)), null);
        MappingSpec mapping = new MappingSpec(sourceConfig, targetConfig, List.of(table), Map.of(),
                new MappingSpec.RunContext("large-pages-" + sequence, "synthetic-large-source"));
        return new LargeFixture(source, target, mapping, pageSql, pageFetchSizes);
    }

    private static PreparedStatement observePageFetchSize(PreparedStatement delegate, List<Integer> fetchSizes) {
        return (PreparedStatement) Proxy.newProxyInstance(PreparedStatement.class.getClassLoader(),
                new Class<?>[]{PreparedStatement.class}, (proxy, method, arguments) -> {
                    if (method.getName().equals("executeQuery")) {
                        fetchSizes.add(delegate.getFetchSize());
                    }
                    try {
                        return method.invoke(delegate, arguments);
                    } catch (InvocationTargetException failure) {
                        throw failure.getCause();
                    }
                });
    }

    private static DbConfig h2Config(String name) {
        return new DbConfig("jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
    }

    private static void insertLargeRow(JdbcTemplate source, int id) {
        source.update("INSERT INTO LEGACY_LARGE VALUES (?, ?, ?)", id, largeBinary(id), largeText(id));
    }

    private static byte[] largeBinary(int id) {
        byte[] bytes = new byte[3 * 1024 * 1024];
        Arrays.fill(bytes, (byte) id);
        bytes[bytes.length - 1] = (byte) (id + 31);
        return bytes;
    }

    private static String largeText(int id) {
        return "한".repeat(512 * 1024) + id;
    }

    private record LargeFixture(JdbcTemplate source, JdbcTemplate target, MappingSpec mapping,
                                List<String> pageSql, List<Integer> pageFetchSizes) implements AutoCloseable {
        @Override
        public void close() {
            try {
                source.execute("SHUTDOWN");
            } finally {
                target.execute("SHUTDOWN");
            }
        }
    }
}
