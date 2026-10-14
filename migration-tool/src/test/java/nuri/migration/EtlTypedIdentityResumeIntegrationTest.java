package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EtlTypedIdentityResumeIntegrationTest {

    @Test
    void durableTypedCheckpointCannotHideAMissingKeymap() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        DbConfig source = h2Config("typed_resume_source_" + suffix);
        DbConfig target = h2Config("typed_resume_target_" + suffix);
        JdbcTemplate sourceJdbc = jdbc(source);
        JdbcTemplate targetJdbc = jdbc(target);
        sourceJdbc.execute("CREATE TABLE legacy_item (ID bigint PRIMARY KEY, PAYLOAD varchar(50))");
        sourceJdbc.update("INSERT INTO legacy_item VALUES (1, 'one')");
        sourceJdbc.execute("CREATE TABLE legacy_next (ID bigint PRIMARY KEY, PAYLOAD varchar(50))");
        sourceJdbc.update("INSERT INTO legacy_next VALUES (10, 'next')");
        targetJdbc.execute("CREATE TABLE tb_item (id bigint PRIMARY KEY, payload varchar(50))");
        targetJdbc.execute("CREATE TABLE tb_next (id bigint PRIMARY KEY, payload varchar(50))");

        TableMapping table = new TableMapping(
                "legacy_item", "tb_item", null, null, List.of("ID"), null,
                List.of(new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)),
                null,
                new IdentityStrategy(
                        TargetIdentityPolicy.PRESERVE,
                        List.of(component("ID")),
                        List.of(component("id")),
                        // 시험 대상 PK 는 시퀀스로 채번되지 않는다(DEC-OPS-306 none 선언).
                        Map.of("id", IdentityStrategy.NO_SEQUENCE)),
                List.of());
        TableMapping next = new TableMapping(
                "legacy_next", "tb_next", null, null, List.of("ID"), null,
                List.of(new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)),
                null,
                new IdentityStrategy(
                        TargetIdentityPolicy.PRESERVE,
                        List.of(component("ID")),
                        List.of(component("id")),
                        Map.of("id", IdentityStrategy.NO_SEQUENCE)),
                List.of());
        String runId = "typed-resume-" + suffix;
        MappingSpec firstSpec = new MappingSpec(
                source, target, List.of(table), Map.of(), new RunContext(runId, source.url()));
        MappingSpec resumeSpec = new MappingSpec(
                source, target, List.of(table, next), Map.of(), new RunContext(runId, source.url()));
        EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());

        assertThat(executor.execute(firstSpec, MigrationMode.COMMIT))
                .singleElement().satisfies(result -> assertThat(result.errors()).isEmpty());
        sourceJdbc.update("INSERT INTO legacy_item VALUES (2, 'two')");
        targetJdbc.update(
                "DELETE FROM migration_control.tb_migration_key_map WHERE run_id=?", runId);

        List<EtlExecutor.TableResult> resumed = executor.execute(resumeSpec, MigrationMode.COMMIT);
        assertThat(resumed).hasSize(2);
        assertThat(resumed.getFirst().errors())
                .anySatisfy(error -> assertThat(error).contains("checkpoint/keymap missing"))
                .allSatisfy(error -> assertThat(error).doesNotContain("tk1:"));
        assertThat(resumed.get(1).read()).isZero();
        assertThat(resumed.get(1).errors()).singleElement().asString()
                .contains("RUN_STOPPED_BY_ROW_FAILURE");
        assertThat(targetJdbc.queryForObject("SELECT count(*) FROM tb_item", Long.class)).isEqualTo(1L);
        assertThat(targetJdbc.queryForObject("SELECT count(*) FROM tb_next", Long.class)).isZero();
    }

    private static IdentityComponentSpec component(String column) {
        return new IdentityComponentSpec(column, IdentityValueType.SIGNED_INTEGER);
    }

    private static DbConfig h2Config(String name) {
        return new DbConfig(
                "jdbc:h2:mem:" + name + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "sa", "", "org.h2.Driver");
    }

    private static JdbcTemplate jdbc(DbConfig config) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                config.url(), config.username(), config.password());
        dataSource.setDriverClassName(config.driver());
        return new JdbcTemplate(dataSource);
    }
}
