package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class EtlTypedIdentitySafetyIntegrationTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    private final EtlExecutor executor = new EtlExecutor(
            new SourceIntrospector(), new TransformerRegistry());

    @Test
    void typedIdentityCannotHideANonUniqueOrderTupleAtThePageBoundary() {
        DbConfig sourceConfig = h2("typed_order_source");
        DbConfig targetConfig = h2("typed_order_target");
        JdbcTemplate source = jdbc(sourceConfig);
        JdbcTemplate target = jdbc(targetConfig);
        source.execute("CREATE TABLE LEGACY_PAGE (ID bigint PRIMARY KEY, GROUP_ID bigint NOT NULL, "
                + "PAYLOAD varchar(20))");
        for (long id = 1; id <= 501; id++) {
            source.update("INSERT INTO LEGACY_PAGE VALUES (?, 1, 'value')", id);
        }
        target.execute("CREATE TABLE tb_page (id bigint PRIMARY KEY, payload varchar(20))");

        TableMapping table = new TableMapping(
                "LEGACY_PAGE", "tb_page", null, null, List.of("GROUP_ID"), null,
                List.of(new ColumnMapping(
                        "PAYLOAD", "payload", null, null, null, null, null)),
                null,
                identity(TargetIdentityPolicy.PRESERVE,
                        List.of(integer("ID")), List.of(integer("id"))),
                List.of());
        MappingSpec spec = new MappingSpec(
                sourceConfig, targetConfig, List.of(table), Map.of(),
                new RunContext("typed-order-run", sourceConfig.url()));

        EtlExecutor.TableResult result = executor.execute(spec, MigrationMode.COMMIT).getFirst();

        assertThat(result.errors()).isNotEmpty()
                .allSatisfy(error -> assertThat(error).doesNotContain("500", "501", "tk1:"));
        assertThat(result.written()).isZero();
        assertThat(target.queryForObject("SELECT count(*) FROM tb_page", Long.class)).isZero();
    }

    @Test
    void databaseComparatorDefinesOrderTupleUniquenessBeforeTargetWrite() {
        DbConfig sourceConfig = h2IgnoreCase("db_comparator_source");
        DbConfig targetConfig = h2("db_comparator_target");
        JdbcTemplate source = jdbc(sourceConfig);
        JdbcTemplate target = jdbc(targetConfig);
        source.execute("CREATE TABLE LEGACY_CASE_ORDER (ID bigint PRIMARY KEY, "
                + "ORDER_CODE varchar(20) NOT NULL, PAYLOAD varchar(20))");
        source.update("INSERT INTO LEGACY_CASE_ORDER VALUES (1, 'alpha', 'one')");
        source.update("INSERT INTO LEGACY_CASE_ORDER VALUES (2, 'ALPHA', 'two')");
        target.execute("CREATE TABLE tb_case_order (id bigint PRIMARY KEY, payload varchar(20))");

        TableMapping table = caseOrderTable("LEGACY_CASE_ORDER", "tb_case_order", null);
        MappingSpec spec = new MappingSpec(
                sourceConfig, targetConfig, List.of(table), Map.of(),
                new RunContext("db-comparator-run", sourceConfig.url()));

        EtlExecutor.TableResult result = executor.execute(spec, MigrationMode.COMMIT).getFirst();

        assertThat(result.errors()).isNotEmpty()
                .allSatisfy(error -> assertThat(error)
                        .doesNotContain("alpha", "ALPHA", "1", "2", "tk1:"));
        assertThat(result.written()).isZero();
        assertThat(target.queryForObject("SELECT count(*) FROM tb_case_order", Long.class)).isZero();
    }

    @Test
    void databaseOrderUniquenessPreflightUsesTheLoadWherePredicate() {
        DbConfig sourceConfig = h2IgnoreCase("db_comparator_where_source");
        DbConfig targetConfig = h2("db_comparator_where_target");
        JdbcTemplate source = jdbc(sourceConfig);
        JdbcTemplate target = jdbc(targetConfig);
        source.execute("CREATE TABLE LEGACY_FILTERED_ORDER (ID bigint PRIMARY KEY, "
                + "ORDER_CODE varchar(20) NOT NULL, ACTIVE_YN char(1) NOT NULL, "
                + "PAYLOAD varchar(20))");
        source.update("INSERT INTO LEGACY_FILTERED_ORDER VALUES (1, 'alpha', 'Y', 'included')");
        source.update("INSERT INTO LEGACY_FILTERED_ORDER VALUES (2, 'ALPHA', 'N', 'excluded')");
        target.execute("CREATE TABLE tb_filtered_order (id bigint PRIMARY KEY, payload varchar(20))");

        TableMapping table = caseOrderTable(
                "LEGACY_FILTERED_ORDER", "tb_filtered_order", "ACTIVE_YN='Y'");
        MappingSpec spec = new MappingSpec(
                sourceConfig, targetConfig, List.of(table), Map.of(),
                new RunContext("db-comparator-where-run", sourceConfig.url()));

        EtlExecutor.TableResult result = executor.execute(spec, MigrationMode.COMMIT).getFirst();

        assertThat(result.errors()).isEmpty();
        assertThat(result.written()).isEqualTo(1L);
        assertThat(target.queryForList("SELECT payload FROM tb_filtered_order", String.class))
                .containsExactly("included");
    }

    @Test
    void allOrderTuplePreflightsFinishBeforeAnyTargetOrControlWrite() {
        DbConfig sourceConfig = h2IgnoreCase("all_order_preflight_source");
        DbConfig targetConfig = h2("all_order_preflight_target");
        JdbcTemplate source = jdbc(sourceConfig);
        JdbcTemplate target = jdbc(targetConfig);
        source.execute("CREATE TABLE LEGACY_FIRST_ORDER (ID bigint PRIMARY KEY, "
                + "ORDER_CODE varchar(20) NOT NULL, PAYLOAD varchar(20))");
        source.execute("CREATE TABLE LEGACY_SECOND_ORDER (ID bigint PRIMARY KEY, "
                + "ORDER_CODE varchar(20) NOT NULL, PAYLOAD varchar(20))");
        source.update("INSERT INTO LEGACY_FIRST_ORDER VALUES (1, 'unique', 'first')");
        source.update("INSERT INTO LEGACY_SECOND_ORDER VALUES (2, 'alpha', 'second-a')");
        source.update("INSERT INTO LEGACY_SECOND_ORDER VALUES (3, 'ALPHA', 'second-b')");
        target.execute("CREATE TABLE tb_first_order (id bigint PRIMARY KEY, payload varchar(20))");
        target.execute("CREATE TABLE tb_second_order (id bigint PRIMARY KEY, payload varchar(20))");

        TableMapping first = caseOrderTable(
                "LEGACY_FIRST_ORDER", "tb_first_order", null);
        TableMapping second = caseOrderTable(
                "LEGACY_SECOND_ORDER", "tb_second_order", null);
        MappingSpec spec = new MappingSpec(
                sourceConfig, targetConfig, List.of(first, second), Map.of(),
                new RunContext("all-order-preflight-run", sourceConfig.url()));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).anySatisfy(result -> assertThat(result.errors()).isNotEmpty());
        assertThat(target.queryForObject("SELECT count(*) FROM tb_first_order", Long.class)).isZero();
        assertThat(target.queryForObject("SELECT count(*) FROM tb_second_order", Long.class)).isZero();
        assertThat(target.queryForObject(
                "SELECT count(*) FROM INFORMATION_SCHEMA.TABLES "
                        + "WHERE UPPER(TABLE_SCHEMA)='MIGRATION_CONTROL'", Long.class))
                .as("preflight failure must not create checkpoint/keymap/run control tables")
                .isZero();
    }

    @Test
    void remapIdentityCanBeProducedByItsCompositeForeignKey() {
        DbConfig sourceConfig = h2("remap_fk_source");
        JdbcTemplate source = jdbc(sourceConfig);
        source.execute("CREATE TABLE LEGACY_PARENT (PARENT_ID bigint PRIMARY KEY)");
        source.execute("CREATE TABLE LEGACY_CHILD (PARENT_ID bigint PRIMARY KEY)");
        source.update("INSERT INTO LEGACY_PARENT VALUES (7)");
        source.update("INSERT INTO LEGACY_CHILD VALUES (7)");

        TableMapping parent = new TableMapping(
                "LEGACY_PARENT", "tb_parent", null, null, List.of(), null,
                List.of(), null,
                identity(TargetIdentityPolicy.PRESERVE,
                        List.of(integer("PARENT_ID")), List.of(integer("parent_id"))),
                List.of());
        CompositeForeignKey parentReference = new CompositeForeignKey(
                parent.source(), List.of(integer("PARENT_ID")), List.of(integer("parent_ref")));
        TableMapping child = new TableMapping(
                "LEGACY_CHILD", "tb_child", null, null, List.of(), null,
                List.of(), null,
                identity(TargetIdentityPolicy.REMAP,
                        List.of(integer("PARENT_ID")), List.of(integer("parent_ref"))),
                List.of(parentReference));
        MappingSpec spec = new MappingSpec(
                sourceConfig, null, List.of(child, parent), Map.of());

        EtlExecutor.TableResult result = resultFor(
                executor.execute(spec, MigrationMode.DRY_RUN), child.source());

        assertThat(result.transformed()).isEqualTo(1L);
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void allNullCompositeForeignKeyIsOptionalButPartialNullFailsClosed() {
        DbConfig sourceConfig = h2("nullable_fk_source");
        JdbcTemplate source = jdbc(sourceConfig);
        source.execute("CREATE TABLE LEGACY_PARENT (TENANT_ID varchar(20), PARENT_ID bigint, "
                + "PRIMARY KEY (TENANT_ID, PARENT_ID))");
        source.execute("CREATE TABLE LEGACY_CHILD (CHILD_ID bigint PRIMARY KEY, "
                + "PARENT_TENANT varchar(20), PARENT_ID bigint)");
        source.update("INSERT INTO LEGACY_PARENT VALUES ('TENANT-A', 1)");
        source.update("INSERT INTO LEGACY_CHILD VALUES (10, NULL, NULL)");
        source.update("INSERT INTO LEGACY_CHILD VALUES (11, 'TENANT-A', NULL)");

        List<IdentityComponentSpec> parentSource = List.of(
                text("TENANT_ID"), integer("PARENT_ID"));
        List<IdentityComponentSpec> parentTarget = List.of(
                text("tenant_id"), integer("parent_id"));
        TableMapping parent = new TableMapping(
                "LEGACY_PARENT", "tb_parent", null, null, List.of(), null,
                List.of(), null,
                identity(TargetIdentityPolicy.PRESERVE, parentSource, parentTarget),
                List.of());
        CompositeForeignKey parentReference = new CompositeForeignKey(
                parent.source(),
                List.of(text("PARENT_TENANT"), integer("PARENT_ID")),
                List.of(text("parent_tenant"), integer("parent_id")));
        TableMapping child = new TableMapping(
                "LEGACY_CHILD", "tb_child", null, null, List.of(), null,
                List.of(), null,
                identity(TargetIdentityPolicy.PRESERVE,
                        List.of(integer("CHILD_ID")), List.of(integer("child_id"))),
                List.of(parentReference));
        MappingSpec spec = new MappingSpec(
                sourceConfig, null, List.of(child, parent), Map.of());

        EtlExecutor.TableResult result = resultFor(
                executor.execute(spec, MigrationMode.DRY_RUN), child.source());

        assertThat(result.read()).isEqualTo(2L);
        assertThat(result.transformed()).isEqualTo(1L);
        assertThat(result.errors()).singleElement().asString()
                .doesNotContain("TENANT-A", "11", "tk1:");
    }

    private static IdentityStrategy identity(
            TargetIdentityPolicy policy,
            List<IdentityComponentSpec> source,
            List<IdentityComponentSpec> target
    ) {
        return new IdentityStrategy(policy, source, target);
    }

    private static TableMapping caseOrderTable(String source, String target, String where) {
        return new TableMapping(
                source, target, where, null, List.of("ORDER_CODE"), null,
                List.of(new ColumnMapping(
                        "PAYLOAD", "payload", null, null, null, null, null)),
                null,
                identity(TargetIdentityPolicy.PRESERVE,
                        List.of(integer("ID")), List.of(integer("id"))),
                List.of());
    }

    private static IdentityComponentSpec integer(String column) {
        return new IdentityComponentSpec(column, IdentityValueType.SIGNED_INTEGER);
    }

    private static IdentityComponentSpec text(String column) {
        return new IdentityComponentSpec(column, IdentityValueType.TEXT);
    }

    private static EtlExecutor.TableResult resultFor(
            List<EtlExecutor.TableResult> results,
            String sourceTable
    ) {
        return results.stream()
                .filter(result -> result.sourceTable().equals(sourceTable))
                .findFirst()
                .orElseThrow();
    }

    private static DbConfig h2(String prefix) {
        String name = prefix + '_' + SEQUENCE.incrementAndGet();
        return new DbConfig(
                "jdbc:h2:mem:" + name + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "sa", "", "org.h2.Driver");
    }

    private static DbConfig h2IgnoreCase(String prefix) {
        String name = prefix + '_' + SEQUENCE.incrementAndGet();
        return new DbConfig(
                "jdbc:h2:mem:" + name + ";IGNORECASE=TRUE;DB_CLOSE_DELAY=-1",
                "sa", "", "org.h2.Driver");
    }

    private static JdbcTemplate jdbc(DbConfig config) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                config.url(), config.username(), config.password());
        dataSource.setDriverClassName(config.driver());
        return new JdbcTemplate(dataSource);
    }
}
