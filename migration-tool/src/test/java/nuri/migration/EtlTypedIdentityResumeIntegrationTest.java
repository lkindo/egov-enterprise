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
        targetJdbc.execute("CREATE TABLE tb_item (id bigint PRIMARY KEY, payload varchar(50))");

        TableMapping table = new TableMapping(
                "legacy_item", "tb_item", null, null, List.of("ID"), null,
                List.of(new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)),
                null,
                new IdentityStrategy(
                        TargetIdentityPolicy.PRESERVE,
                        List.of(component("ID")),
                        List.of(component("id"))),
                List.of());
        String runId = "typed-resume-" + suffix;
        MappingSpec spec = new MappingSpec(
                source, target, List.of(table), Map.of(), new RunContext(runId, source.url()));
        EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());

        assertThat(executor.execute(spec, MigrationMode.COMMIT))
                .singleElement().satisfies(result -> assertThat(result.errors()).isEmpty());
        targetJdbc.update(
                "DELETE FROM migration_control.tb_migration_key_map WHERE run_id=?", runId);

        assertThat(executor.execute(spec, MigrationMode.COMMIT))
                .singleElement().satisfies(result -> assertThat(result.errors())
                        .anySatisfy(error -> assertThat(error).contains("checkpoint/keymap missing"))
                        .allSatisfy(error -> assertThat(error).doesNotContain("tk1:")));
        assertThat(targetJdbc.queryForObject("SELECT count(*) FROM tb_item", Long.class)).isEqualTo(1L);
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
