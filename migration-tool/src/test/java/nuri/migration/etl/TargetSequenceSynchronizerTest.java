package nuri.migration.etl;

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

import java.sql.Connection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PostgreSQL 이 아닌 대상(H2)의 시퀀스 판정 경계(DEC-OPS-306). 카탈로그 경로는
 * {@code EtlSequenceResetPostgresIntegrationTest} 가 실제 PostgreSQL 로 검증한다.
 */
class TargetSequenceSynchronizerTest {

    @Test
    void nonPostgresTargetRequiresNoneForPreservedIntegerKeys() throws Exception {
        DriverManagerDataSource target = h2("plan_" + UUID.randomUUID());
        try (Connection connection = target.getConnection()) {
            assertThatThrownBy(() -> TargetSequenceSynchronizer.plan(connection, List.of(item(Map.of()))))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("tb_item.id: PostgreSQL 이 아닌 대상은 시퀀스를 판정·재설정할 수 없습니다");
            assertThatThrownBy(() -> TargetSequenceSynchronizer.plan(
                    connection, List.of(item(Map.of("id", "sq_item")))))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("none 을 선언하세요");

            // [사용자 Q9] remap 정수 키도 mapping 이 값을 넣으므로 선언이 없으면 멈춘다.
            assertThatThrownBy(() -> TargetSequenceSynchronizer.plan(connection, List.of(remap(Map.of()))))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("tb_remap.id: PostgreSQL 이 아닌 대상은 시퀀스를 판정·재설정할 수 없습니다");

            List<TargetSequenceSynchronizer.Target> planned = TargetSequenceSynchronizer.plan(connection,
                    List.of(item(Map.of("ID", "none")), textKey(), remap(Map.of("id", "none"))));
            assertThat(planned).containsExactly(
                    new TargetSequenceSynchronizer.Target("LEGACY_ITEM", "tb_item", "id", null),
                    new TargetSequenceSynchronizer.Target("LEGACY_REMAP", "tb_remap", "id", null));
            assertThat(TargetSequenceSynchronizer.apply(connection, planned.getFirst())).isEqualTo(
                    new TargetSequenceSynchronizer.SequenceReset(
                            "tb_item", "id", null, TargetSequenceSynchronizer.Action.DECLARED_NONE));
        }
    }

    @Test
    void undeterminedSequenceStopsTheLoadBeforeAnyRowIsWritten() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        DriverManagerDataSource source = h2("source_" + suffix);
        DriverManagerDataSource target = h2("target_" + suffix);
        new JdbcTemplate(source).execute("CREATE TABLE LEGACY_ITEM (ID bigint PRIMARY KEY, PAYLOAD varchar(20))");
        new JdbcTemplate(source).update("INSERT INTO LEGACY_ITEM VALUES (7, 'payload')");
        JdbcTemplate targetJdbc = new JdbcTemplate(target);
        targetJdbc.execute("CREATE TABLE tb_item (id bigint PRIMARY KEY, payload varchar(20))");
        MappingSpec spec = new MappingSpec(config(source), config(target), List.of(item(Map.of())), Map.of(),
                new RunContext("sequence-run", "legacy"));
        EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());

        assertThatThrownBy(() -> executor.execute(spec, MigrationMode.COMMIT,
                new JdbcTemplate(source), targetJdbc))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PostgreSQL 이 아닌 대상은 시퀀스를 판정·재설정할 수 없습니다");
        assertThat(targetJdbc.queryForObject("SELECT count(*) FROM tb_item", Long.class)).isZero();
        assertThat(targetJdbc.queryForObject(
                "SELECT count(*) FROM information_schema.schemata WHERE lower(schema_name)='migration_control'",
                Long.class)).as("행을 쓰기 전에 멈춰 실행 상태도 만들지 않는다").isZero();

        MappingSpec declared = new MappingSpec(config(source), config(target),
                List.of(item(Map.of("id", "none"))), Map.of(), new RunContext("sequence-run", "legacy"));
        List<EtlExecutor.TableResult> results = executor.execute(declared, MigrationMode.COMMIT,
                new JdbcTemplate(source), targetJdbc);
        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.sequenceResets()).containsExactly(new TargetSequenceSynchronizer.SequenceReset(
                    "tb_item", "id", null, TargetSequenceSynchronizer.Action.DECLARED_NONE));
        });
        assertThat(executor.execute(declared, MigrationMode.DRY_RUN, new JdbcTemplate(source), null))
                .singleElement().satisfies(result -> assertThat(result.sequenceResets()).isEmpty());
    }

    private static TableMapping item(Map<String, String> sequences) {
        return new TableMapping("LEGACY_ITEM", "tb_item", null, null, List.of("ID"), null,
                List.of(new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(integer("ID")), List.of(integer("id")), sequences),
                List.of());
    }

    private static TableMapping textKey() {
        return new TableMapping("LEGACY_CODE", "tb_code", null, null, List.of("CODE"), null, List.of(), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(new IdentityComponentSpec("CODE", IdentityValueType.TEXT)),
                        List.of(new IdentityComponentSpec("code", IdentityValueType.TEXT))),
                List.of());
    }

    private static TableMapping remap(Map<String, String> sequences) {
        return new TableMapping("LEGACY_REMAP", "tb_remap", null, null, List.of("ID"), null,
                List.of(new ColumnMapping("NEW_ID", "id", null, null, null, null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.REMAP, List.of(integer("ID")), List.of(integer("id")),
                        sequences),
                List.of());
    }

    private static IdentityComponentSpec integer(String column) {
        return new IdentityComponentSpec(column, IdentityValueType.SIGNED_INTEGER);
    }

    private static DriverManagerDataSource h2(String name) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "");
        dataSource.setDriverClassName("org.h2.Driver");
        return dataSource;
    }

    private static DbConfig config(DriverManagerDataSource dataSource) {
        return new DbConfig(dataSource.getUrl(), "sa", "", "org.h2.Driver");
    }
}
