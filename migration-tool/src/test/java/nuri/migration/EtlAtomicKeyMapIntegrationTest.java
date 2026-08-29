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
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class EtlAtomicKeyMapIntegrationTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());

    @Test
    void keyMapInsertFailureRollsBackTheDataInsertFromTheSameTransaction() {
        DbPair databases = databases("keymap_fail");
        JdbcTemplate source = jdbc(databases.source());
        source.execute("CREATE TABLE LEGACY_ITEM (ITEM_ID varchar(20), ITEM_NM varchar(50))");
        source.update("INSERT INTO LEGACY_ITEM VALUES ('item-1', 'valid')");

        JdbcTemplate target = jdbc(databases.target());
        target.execute("CREATE TABLE tb_item (item_id varchar(20) PRIMARY KEY, item_nm varchar(50))");
        target.execute("CREATE TABLE tb_migration_key_map ("
                + "run_id varchar(128) NOT NULL, source_namespace varchar(128) NOT NULL, "
                + "source_table varchar(128) NOT NULL, legacy_key varchar(256) NOT NULL, "
                + "new_key varchar(256) NOT NULL CHECK (length(new_key) <= 1), "
                + "PRIMARY KEY (run_id, source_namespace, source_table, legacy_key))");

        List<EtlExecutor.TableResult> results = executor.execute(
                singleTableSpec(databases, "LEGACY_ITEM", "tb_item", "ITEM_ID", "item_id", "ITEM_NM", "item_nm"),
                MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.written()).isZero();
            assertThat(result.errors()).anySatisfy(error -> assertThat(error).contains("keymap"));
        });
        assertThat(count(target, "tb_item")).isZero();
        assertThat(count(target, "tb_migration_key_map")).isZero();
    }

    @Test
    void failedDataRowKeepsNeitherDataNorKeyMapAndCannotFeedAChildFk() {
        DbPair databases = databases("row_fail");
        JdbcTemplate source = jdbc(databases.source());
        source.execute("CREATE TABLE LEGACY_ITEM (ITEM_ID varchar(20), ITEM_NM varchar(50))");
        source.update("INSERT INTO LEGACY_ITEM VALUES ('good', 'valid')");
        source.update("INSERT INTO LEGACY_ITEM VALUES ('bad', NULL)");
        source.execute("CREATE TABLE LEGACY_CHILD (CHILD_ID varchar(20), ITEM_ID varchar(20))");
        source.update("INSERT INTO LEGACY_CHILD VALUES ('child-1', 'bad')");

        JdbcTemplate target = jdbc(databases.target());
        target.execute("CREATE TABLE tb_item (item_id varchar(20) PRIMARY KEY, item_nm varchar(50) NOT NULL)");
        target.execute("CREATE TABLE tb_child (child_id varchar(20) PRIMARY KEY, item_id varchar(20))");

        TableMapping parent = new TableMapping("LEGACY_ITEM", "tb_item", null,
                "ITEM_ID", null,
                List.of(new ColumnMapping("ITEM_NM", "item_nm", null, null, null, null, null)),
                new IdStrategy("item_id", "ITM", "ITEM_ID"));
        TableMapping child = new TableMapping("LEGACY_CHILD", "tb_child", null,
                "CHILD_ID", null,
                List.of(new ColumnMapping("ITEM_ID", "item_id", null, null, null, "LEGACY_ITEM", null)),
                new IdStrategy("child_id", "CHD", "CHILD_ID"));
        MappingSpec spec = new MappingSpec(
                databases.source(), databases.target(), List.of(child, parent), Map.of(),
                runContext(databases));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        EtlExecutor.TableResult parentResult = resultFor(results, "LEGACY_ITEM");
        EtlExecutor.TableResult childResult = resultFor(results, "LEGACY_CHILD");
        assertThat(parentResult.written()).isEqualTo(1L);
        assertThat(parentResult.errors()).isNotEmpty();
        assertThat(childResult.written()).isZero();
        assertThat(childResult.errors()).anySatisfy(error -> assertThat(error).contains("FK 고아"));
        assertThat(count(target, "tb_item")).isEqualTo(1L);
        assertThat(count(target, "tb_child")).isZero();
        assertThat(target.queryForList(
                "SELECT legacy_key FROM tb_migration_key_map ORDER BY legacy_key", String.class))
                .containsExactly("good");
    }

    @Test
    void rerunResumesThePersistedKeyIdentityWithoutDuplicateData() {
        DbPair databases = databases("rerun");
        JdbcTemplate source = jdbc(databases.source());
        source.execute("CREATE TABLE LEGACY_ITEM (ITEM_ID varchar(20), ITEM_NM varchar(50))");
        source.update("INSERT INTO LEGACY_ITEM VALUES ('item-1', 'valid')");
        JdbcTemplate target = jdbc(databases.target());
        target.execute("CREATE TABLE tb_item (item_id varchar(20) PRIMARY KEY, item_nm varchar(50))");
        MappingSpec spec = singleTableSpec(
                databases, "LEGACY_ITEM", "tb_item", "ITEM_ID", "item_id", "ITEM_NM", "item_nm");

        List<EtlExecutor.TableResult> first = executor.execute(spec, MigrationMode.COMMIT);
        String firstId = target.queryForObject("SELECT item_id FROM tb_item", String.class);
        String firstMappedId = target.queryForObject(
                "SELECT new_key FROM tb_migration_key_map WHERE legacy_key = 'item-1'", String.class);

        List<EtlExecutor.TableResult> rerun = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(first).singleElement().satisfies(result -> assertThat(result.errors()).isEmpty());
        assertThat(rerun).singleElement().satisfies(result -> {
            assertThat(result.written()).isEqualTo(1L);
            assertThat(result.errors()).isEmpty();
        });
        assertThat(count(target, "tb_item")).isEqualTo(1L);
        assertThat(count(target, "tb_migration_key_map")).isEqualTo(1L);
        assertThat(target.queryForObject("SELECT item_id FROM tb_item", String.class)).isEqualTo(firstId);
        assertThat(target.queryForObject(
                "SELECT new_key FROM tb_migration_key_map WHERE legacy_key = 'item-1'", String.class))
                .isEqualTo(firstMappedId)
                .isEqualTo(firstId);
    }

    private static MappingSpec singleTableSpec(DbPair databases, String sourceTable, String targetTable,
                                               String sourceId, String targetId,
                                               String sourceValue, String targetValue) {
        TableMapping table = new TableMapping(sourceTable, targetTable, null,
                sourceId, null,
                List.of(new ColumnMapping(sourceValue, targetValue, null, null, null, null, null)),
                new IdStrategy(targetId, "ITM", sourceId));
        return new MappingSpec(databases.source(), databases.target(), List.of(table), Map.of(),
                runContext(databases));
    }

    private static RunContext runContext(DbPair databases) {
        return new RunContext("atomic-run", databases.source().url());
    }

    private static EtlExecutor.TableResult resultFor(List<EtlExecutor.TableResult> results, String sourceTable) {
        return results.stream()
                .filter(result -> result.sourceTable().equals(sourceTable))
                .findFirst()
                .orElseThrow();
    }

    private static DbPair databases(String prefix) {
        int sequence = SEQ.incrementAndGet();
        return new DbPair(h2(prefix + "_source_" + sequence), h2(prefix + "_target_" + sequence));
    }

    private static DbConfig h2(String name) {
        return new DbConfig("jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
    }

    private static JdbcTemplate jdbc(DbConfig config) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                config.url(), config.username(), config.password());
        dataSource.setDriverClassName(config.driver());
        return new JdbcTemplate(dataSource);
    }

    private static long count(JdbcTemplate jdbc, String table) {
        Long count = jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
        return count == null ? 0L : count;
    }

    private record DbPair(DbConfig source, DbConfig target) {}
}
