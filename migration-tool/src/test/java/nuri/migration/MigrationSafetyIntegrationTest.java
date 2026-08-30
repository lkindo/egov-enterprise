package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MigrationSafetyIntegrationTest {

    private static final AtomicInteger SEQ = new AtomicInteger();
    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void commitWithoutExplicitSourceOrderKeyFailsClosedBeforeWriting() {
        DbPair db = databases("missing_order");
        jdbc(db.source()).execute("CREATE TABLE LEGACY_NODE (NODE_ID varchar(20), PARENT_ID varchar(20), NODE_NM varchar(50))");
        jdbc(db.target()).execute("CREATE TABLE tb_node (node_id varchar(40) PRIMARY KEY, parent_id varchar(40), node_nm varchar(50))");
        TableMapping table = new TableMapping("LEGACY_NODE", "tb_node", null, null, null,
                nodeColumns(), new IdStrategy("node_id", "NOD", "NODE_ID"));
        MappingSpec spec = new MappingSpec(db.source(), db.target(), List.of(table), Map.of(),
                new RunContext("run-1", "legacy-crm"));

        assertThatThrownBy(() -> executor.execute(spec, MigrationMode.COMMIT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("orderBy", "LEGACY_NODE");
        assertThat(count(jdbc(db.target()), "tb_node")).isZero();
    }

    @Test
    void selfReferencePreMintsAllKeysBeforeFkTranslationEvenWhenChildIsReadFirst() {
        DbPair db = databases("self_ref");
        JdbcTemplate source = jdbc(db.source());
        source.execute("CREATE TABLE LEGACY_NODE (NODE_ID varchar(20), PARENT_ID varchar(20), NODE_NM varchar(50))");
        source.update("INSERT INTO LEGACY_NODE VALUES ('01-child', '99-parent', 'child')");
        source.update("INSERT INTO LEGACY_NODE VALUES ('99-parent', NULL, 'parent')");
        JdbcTemplate target = jdbc(db.target());
        target.execute("CREATE TABLE tb_node (node_id varchar(40) PRIMARY KEY, parent_id varchar(40), node_nm varchar(50))");
        MappingSpec spec = spec(db, "self-ref-run", "legacy-crm");

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.written()).isEqualTo(2);
        });
        String parent = target.queryForObject("SELECT node_id FROM tb_node WHERE node_nm='parent'", String.class);
        assertThat(target.queryForObject("SELECT parent_id FROM tb_node WHERE node_nm='child'", String.class))
                .isEqualTo(parent);
    }

    @Test
    void durableCheckpointResumesWithoutDuplicateWritesAndKeepsRunNamespaceScoped() {
        DbPair db = databases("resume");
        JdbcTemplate source = jdbc(db.source());
        source.execute("CREATE TABLE LEGACY_NODE (NODE_ID varchar(20), PARENT_ID varchar(20), NODE_NM varchar(50))");
        source.update("INSERT INTO LEGACY_NODE VALUES ('01', NULL, 'one')");
        source.update("INSERT INTO LEGACY_NODE VALUES ('02', '01', 'two')");
        JdbcTemplate target = jdbc(db.target());
        target.execute("CREATE TABLE tb_node (node_id varchar(40) PRIMARY KEY, parent_id varchar(40), node_nm varchar(50))");
        MappingSpec spec = spec(db, "resume-run", "legacy-crm");

        List<EtlExecutor.TableResult> first = executor.execute(spec, MigrationMode.COMMIT);
        List<EtlExecutor.TableResult> resumed = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(first).singleElement().satisfies(r -> assertThat(r.errors()).isEmpty());
        assertThat(resumed).singleElement().satisfies(r -> {
            assertThat(r.read()).isEqualTo(2);
            assertThat(r.transformed()).isEqualTo(2);
            assertThat(r.written()).isEqualTo(2);
            assertThat(r.errors()).isEmpty();
        });
        assertThat(count(target, "tb_node")).isEqualTo(2);
        assertThat(target.queryForObject("SELECT count(*) FROM tb_migration_checkpoint WHERE run_id=? AND source_namespace=?",
                Long.class, "resume-run", "legacy-crm")).isEqualTo(2L);
    }

    @Test
    void sameRunIdFromDifferentSourceNamespacesDoesNotShareKeysOrCheckpoints() {
        DbPair db = databases("namespace");
        JdbcTemplate source = jdbc(db.source());
        source.execute("CREATE TABLE LEGACY_NODE (NODE_ID varchar(20), PARENT_ID varchar(20), NODE_NM varchar(50))");
        source.update("INSERT INTO LEGACY_NODE VALUES ('01', NULL, 'one')");
        JdbcTemplate target = jdbc(db.target());
        target.execute("CREATE TABLE tb_node (node_id varchar(40) PRIMARY KEY, parent_id varchar(40), node_nm varchar(50))");

        executor.execute(spec(db, "shared-run", "source-a"), MigrationMode.COMMIT);
        executor.execute(spec(db, "shared-run", "source-b"), MigrationMode.COMMIT);

        assertThat(count(target, "tb_node")).isEqualTo(2);
        assertThat(target.queryForObject("SELECT count(*) FROM tb_migration_checkpoint "
                + "WHERE run_id='shared-run' AND source_namespace='source-a'", Long.class)).isEqualTo(1L);
        assertThat(target.queryForObject("SELECT count(*) FROM tb_migration_checkpoint "
                + "WHERE run_id='shared-run' AND source_namespace='source-b'", Long.class)).isEqualTo(1L);
        assertThat(target.queryForList("SELECT new_key FROM tb_migration_key_map WHERE run_id='shared-run'",
                String.class)).doesNotHaveDuplicates();
    }

    @Test
    void failedRowCanBeFixedAndRetriedFromTheDurableCheckpoint() {
        DbPair db = databases("retry");
        JdbcTemplate source = jdbc(db.source());
        source.execute("CREATE TABLE LEGACY_NODE (NODE_ID varchar(20), PARENT_ID varchar(20), NODE_NM varchar(50))");
        source.update("INSERT INTO LEGACY_NODE VALUES ('01', NULL, 'one')");
        source.update("INSERT INTO LEGACY_NODE VALUES ('02', NULL, NULL)");
        JdbcTemplate target = jdbc(db.target());
        target.execute("CREATE TABLE tb_node (node_id varchar(40) PRIMARY KEY, parent_id varchar(40), node_nm varchar(50) NOT NULL)");
        MappingSpec spec = spec(db, "retry-run", "legacy-crm");

        List<EtlExecutor.TableResult> failed = executor.execute(spec, MigrationMode.COMMIT);
        source.update("UPDATE LEGACY_NODE SET NODE_NM='two' WHERE NODE_ID='02'");
        List<EtlExecutor.TableResult> retried = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(failed).singleElement().satisfies(r -> {
            assertThat(r.written()).isEqualTo(1);
            assertThat(r.errors()).isNotEmpty();
        });
        assertThat(retried).singleElement().satisfies(r -> {
            assertThat(r.written()).isEqualTo(2);
            assertThat(r.errors()).isEmpty();
        });
        assertThat(count(target, "tb_node")).isEqualTo(2);
    }

    @Test
    void verifierFailsOnScopedTargetContentMismatchEvenWhenCountsMatch() {
        DbPair db = databases("checksum");
        JdbcTemplate source = jdbc(db.source());
        source.execute("CREATE TABLE LEGACY_NODE (NODE_ID varchar(20), PARENT_ID varchar(20), NODE_NM varchar(50))");
        source.update("INSERT INTO LEGACY_NODE VALUES ('01', NULL, 'original')");
        JdbcTemplate target = jdbc(db.target());
        target.execute("CREATE TABLE tb_node (node_id varchar(40) PRIMARY KEY, parent_id varchar(40), node_nm varchar(50))");
        MappingSpec spec = spec(db, "checksum-run", "legacy-crm");
        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);
        target.update("UPDATE tb_node SET node_nm='tampered'");

        MigrationReport report = verifier.verify(spec, results, target);

        assertThat(report.overall()).isEqualTo(MigrationReport.Status.FAIL);
        assertThat(report.tables()).anySatisfy(table -> assertThat(table.note()).contains("checksum", "불일치"));
    }

    @Test
    void compositeSourceIdentityMigratesAcrossMultipleKeysetPages() {
        DbPair db = databases("composite_page");
        JdbcTemplate source = jdbc(db.source());
        source.execute("CREATE TABLE LEGACY_ITEM ("
                + "TENANT_ID varchar(20), ITEM_SEQ int, ROW_ID varchar(30), ITEM_NM varchar(50))");
        List<Object[]> rows = new ArrayList<>();
        for (int i = 0; i < 503; i++) {
            String tenant = i % 2 == 0 ? "B" : "A";
            rows.add(new Object[]{tenant, i, "row-" + i, "item-" + i});
        }
        source.batchUpdate("INSERT INTO LEGACY_ITEM VALUES (?, ?, ?, ?)", rows);
        JdbcTemplate target = jdbc(db.target());
        target.execute("CREATE TABLE tb_item (item_id varchar(40) PRIMARY KEY, "
                + "tenant_id varchar(20), item_seq int, item_nm varchar(50))");
        TableMapping table = new TableMapping("LEGACY_ITEM", "tb_item", null, null,
                List.of("TENANT_ID", "ITEM_SEQ"), null, List.of(
                new ColumnMapping("TENANT_ID", "tenant_id", null, null, null, null, null),
                new ColumnMapping("ITEM_SEQ", "item_seq", null, "int", null, null, null),
                new ColumnMapping("ITEM_NM", "item_nm", null, null, null, null, null)),
                new IdStrategy("item_id", "ITM", "ROW_ID"));
        MappingSpec spec = new MappingSpec(db.source(), db.target(), List.of(table), Map.of(),
                new RunContext("composite-run", "legacy-erp"));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(503);
            assertThat(result.written()).isEqualTo(503);
            assertThat(result.errors()).isEmpty();
        });
        assertThat(count(target, "tb_item")).isEqualTo(503);
        assertThat(count(target, "tb_migration_checkpoint")).isEqualTo(503);
    }

    @Test
    void verifierReadsScopedTargetsInOneBatchInsteadOfOneQueryPerRow() {
        DbPair db = databases("batch_verify");
        JdbcTemplate source = jdbc(db.source());
        source.execute("CREATE TABLE LEGACY_NODE (NODE_ID varchar(20), PARENT_ID varchar(20), NODE_NM varchar(50))");
        source.update("INSERT INTO LEGACY_NODE VALUES ('01', NULL, 'one')");
        source.update("INSERT INTO LEGACY_NODE VALUES ('02', NULL, 'two')");
        source.update("INSERT INTO LEGACY_NODE VALUES ('03', NULL, 'three')");
        JdbcTemplate target = jdbc(db.target());
        target.execute("CREATE TABLE tb_node (node_id varchar(40) PRIMARY KEY, parent_id varchar(40), node_nm varchar(50))");
        MappingSpec spec = spec(db, "batch-run", "legacy-crm");
        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);
        CountingJdbcTemplate counted = new CountingJdbcTemplate(target.getDataSource());

        MigrationReport report = verifier.verify(spec, results, counted);

        assertThat(report.overall()).isEqualTo(MigrationReport.Status.PASS);
        assertThat(counted.targetBatchReads).isEqualTo(1);
    }

    private static MappingSpec spec(DbPair db, String runId, String namespace) {
        TableMapping table = new TableMapping("LEGACY_NODE", "tb_node", null,
                "NODE_ID", null, nodeColumns(), new IdStrategy("node_id", "NOD", "NODE_ID"));
        return new MappingSpec(db.source(), db.target(), List.of(table), Map.of(),
                new RunContext(runId, namespace));
    }

    private static List<ColumnMapping> nodeColumns() {
        return List.of(
                new ColumnMapping("PARENT_ID", "parent_id", null, null, null, "LEGACY_NODE", null),
                new ColumnMapping("NODE_NM", "node_nm", null, null, null, null, null));
    }

    private static DbPair databases(String name) {
        int id = SEQ.incrementAndGet();
        return new DbPair(h2(name + "_src_" + id), h2(name + "_tgt_" + id));
    }

    private static DbConfig h2(String name) {
        return new DbConfig("jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
    }

    private static JdbcTemplate jdbc(DbConfig config) {
        DriverManagerDataSource ds = new DriverManagerDataSource(config.url(), config.username(), config.password());
        ds.setDriverClassName(config.driver());
        return new JdbcTemplate(ds);
    }

    private static long count(JdbcTemplate jdbc, String table) {
        Long value = jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
        return value == null ? 0 : value;
    }

    private record DbPair(DbConfig source, DbConfig target) {}

    private static final class CountingJdbcTemplate extends JdbcTemplate {
        private int targetBatchReads;

        private CountingJdbcTemplate(DataSource dataSource) {
            super(dataSource);
        }

        @Override
        public List<Map<String, Object>> queryForList(String sql, Object... args) {
            targetBatchReads++;
            return super.queryForList(sql, args);
        }
    }
}
