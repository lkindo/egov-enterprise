package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.JdbcTypedValueCodec;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.identity.TypedKeyEncoding;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.identity.TypedValue;
import nuri.migration.keymap.KeyMapRegistry;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class EtlGeneratedIdentityPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine");

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
    private final JdbcTypedValueCodec codec = new JdbcTypedValueCodec();

    @Test
    void returningCapturesGeneratedCompositeIdentityAndFeedsExplicitCompositeForeignKey() {
        Fixture fixture = fixture("generated_fk");
        seedParentAndChild(fixture);

        MappingSpec spec = parentChildSpec(fixture);
        List<EtlExecutor.TableResult> first = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(first).allSatisfy(result -> {
            assertThat(result.written()).isEqualTo(2L);
            assertThat(result.errors()).isEmpty();
        });
        assertThat(fixture.targetJdbc().queryForObject(
                "SELECT count(*) FROM " + fixture.childTarget() + " c JOIN " + fixture.parentTarget()
                        + " p ON p.tenant_id=c.tenant_id AND p.parent_id=c.parent_id",
                Long.class)).isEqualTo(2L);
        assertThat(fixture.targetJdbc().queryForList(
                "SELECT source_key FROM migration_control.tb_migration_checkpoint "
                        + "WHERE run_id=? ORDER BY source_key", String.class, fixture.runId()))
                .allMatch(key -> key.startsWith("tk1:"));
        assertThat(fixture.targetJdbc().queryForList(
                "SELECT new_key FROM migration_control.tb_migration_key_map "
                        + "WHERE run_id=? ORDER BY new_key", String.class, fixture.runId()))
                .hasSize(4)
                .allMatch(key -> key.startsWith("tk1:"));

        KeyMapRegistry preloaded = new KeyMapRegistry(fixture.runId(), fixture.source().url());
        preloaded.preload(fixture.targetJdbc());
        TypedKeyTuple sourceIdentity = TypedKeyTuple.of(
                codec.encode(IdentityValueType.TEXT, "A"),
                codec.encode(IdentityValueType.SIGNED_INTEGER, 10L));
        TypedKeyTuple generated = preloaded.translate(fixture.parentSource(), sourceIdentity);
        assertThat(generated).isNotNull();
        assertThat(generated.values()).hasSize(2);
        assertThat(generated.values().get(1).jdbcValue()).isInstanceOf(BigInteger.class);

        List<EtlExecutor.TableResult> rerun = executor.execute(spec, MigrationMode.COMMIT);
        assertThat(rerun).allSatisfy(result -> assertThat(result.errors()).isEmpty());
        assertThat(fixture.targetJdbc().queryForObject(
                "SELECT count(*) FROM " + fixture.parentTarget(), Long.class)).isEqualTo(2L);
        assertThat(fixture.targetJdbc().queryForObject(
                "SELECT count(*) FROM " + fixture.childTarget(), Long.class)).isEqualTo(2L);
    }

    @Test
    void generatedDataKeymapAndCheckpointRollbackTogetherWhenKeymapWriteFails() {
        Fixture fixture = fixture("generated_atomic");
        JdbcTemplate source = jdbc(fixture.source());
        source.execute("CREATE TABLE " + fixture.parentSource()
                + " (TENANT_ID varchar(20), LEGACY_NO bigint, PAYLOAD varchar(50))");
        source.update("INSERT INTO " + fixture.parentSource() + " VALUES ('A', 10, 'payload')");
        fixture.targetJdbc().execute("CREATE TABLE " + fixture.parentTarget()
                + " (tenant_id varchar(20) NOT NULL, parent_id bigint GENERATED BY DEFAULT AS IDENTITY, "
                + "payload varchar(50), PRIMARY KEY (tenant_id, parent_id))");
        new MigrationSchemaManager().migrateAndValidate(fixture.targetJdbc());
        String constraint = "ck_keymap_" + SEQUENCE.incrementAndGet();
        fixture.targetJdbc().execute("ALTER TABLE migration_control.tb_migration_key_map ADD CONSTRAINT "
                + constraint + " CHECK (run_id <> '" + fixture.runId() + "')");
        try {
            MappingSpec spec = new MappingSpec(
                    fixture.source(), fixture.target(), List.of(parentMapping(fixture)), Map.of(),
                    new RunContext(fixture.runId(), fixture.source().url()));

            List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

            assertThat(results).singleElement().satisfies(result -> {
                assertThat(result.written()).isZero();
                assertThat(result.errors()).anySatisfy(error -> assertThat(error).contains("keymap"));
            });
            assertThat(fixture.targetJdbc().queryForObject(
                    "SELECT count(*) FROM " + fixture.parentTarget(), Long.class)).isZero();
            assertThat(fixture.targetJdbc().queryForObject(
                    "SELECT count(*) FROM migration_control.tb_migration_key_map WHERE run_id=?",
                    Long.class, fixture.runId())).isZero();
            assertThat(fixture.targetJdbc().queryForObject(
                    "SELECT count(*) FROM migration_control.tb_migration_checkpoint WHERE run_id=?",
                    Long.class, fixture.runId())).isZero();
        } finally {
            fixture.targetJdbc().execute("ALTER TABLE migration_control.tb_migration_key_map DROP CONSTRAINT "
                    + constraint);
        }
    }

    @Test
    void resumeFailsClosedWhenDurableCheckpointKeymapIsMissingOrDisagrees() {
        Fixture fixture = fixture("generated_resume_guard");
        JdbcTemplate source = jdbc(fixture.source());
        source.execute("CREATE TABLE " + fixture.parentSource()
                + " (TENANT_ID varchar(20), LEGACY_NO bigint, PAYLOAD varchar(50))");
        source.update("INSERT INTO " + fixture.parentSource() + " VALUES ('A', 10, 'payload')");
        fixture.targetJdbc().execute("CREATE TABLE " + fixture.parentTarget()
                + " (tenant_id varchar(20) NOT NULL, parent_id bigint GENERATED BY DEFAULT AS IDENTITY, "
                + "payload varchar(50), PRIMARY KEY (tenant_id, parent_id))");
        MappingSpec spec = new MappingSpec(
                fixture.source(), fixture.target(), List.of(parentMapping(fixture)), Map.of(),
                new RunContext(fixture.runId(), fixture.source().url()));
        assertThat(executor.execute(spec, MigrationMode.COMMIT))
                .singleElement().satisfies(result -> assertThat(result.errors()).isEmpty());

        Map<String, Object> persisted = fixture.targetJdbc().queryForMap(
                "SELECT legacy_key, new_key FROM migration_control.tb_migration_key_map WHERE run_id=?",
                fixture.runId());
        fixture.targetJdbc().update(
                "DELETE FROM migration_control.tb_migration_key_map WHERE run_id=?", fixture.runId());

        assertThat(executor.execute(spec, MigrationMode.COMMIT))
                .singleElement().satisfies(result -> assertThat(result.errors())
                        .anySatisfy(error -> assertThat(error).contains("checkpoint/keymap missing")));

        String wrongTarget = TypedKeyEncoding.encode(
                TypedKeyTuple.of(TypedValue.text("A"), TypedValue.signedInteger(999)),
                256,
                "tb_migration_key_map.new_key");
        fixture.targetJdbc().update(
                "INSERT INTO migration_control.tb_migration_key_map "
                        + "(run_id, source_namespace, source_table, legacy_key, new_key) VALUES (?, ?, ?, ?, ?)",
                fixture.runId(), fixture.source().url(), fixture.parentSource().toLowerCase(),
                persisted.get("legacy_key"), wrongTarget);

        assertThat(executor.execute(spec, MigrationMode.COMMIT))
                .singleElement().satisfies(result -> assertThat(result.errors())
                        .anySatisfy(error -> assertThat(error).contains("checkpoint/keymap mismatch")));
        assertThat(fixture.targetJdbc().queryForObject(
                "SELECT count(*) FROM " + fixture.parentTarget(), Long.class)).isEqualTo(1L);
    }

    private static MappingSpec parentChildSpec(Fixture fixture) {
        TableMapping parent = parentMapping(fixture);
        IdentityStrategy childIdentity = new IdentityStrategy(
                TargetIdentityPolicy.PRESERVE,
                List.of(component("CHILD_NO", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("child_id", IdentityValueType.SIGNED_INTEGER)));
        CompositeForeignKey parentReference = new CompositeForeignKey(
                fixture.parentSource(),
                List.of(component("TENANT_ID", IdentityValueType.TEXT),
                        component("LEGACY_PARENT_NO", IdentityValueType.SIGNED_INTEGER)),
                parent.identity().targetComponents());
        TableMapping child = new TableMapping(
                fixture.childSource(), fixture.childTarget(), null, null,
                List.of("CHILD_NO"), null, List.of(), null, childIdentity, List.of(parentReference));
        return new MappingSpec(
                fixture.source(), fixture.target(), List.of(parent, child), Map.of(),
                new RunContext(fixture.runId(), fixture.source().url()));
    }

    private static TableMapping parentMapping(Fixture fixture) {
        return new TableMapping(
                fixture.parentSource(), fixture.parentTarget(), null, null,
                List.of("TENANT_ID", "LEGACY_NO"), null,
                List.of(
                        new ColumnMapping("TENANT_ID", "tenant_id", null, null, null, null, null),
                        new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)),
                null,
                new IdentityStrategy(
                        TargetIdentityPolicy.TARGET_GENERATED,
                        List.of(component("TENANT_ID", IdentityValueType.TEXT),
                                component("LEGACY_NO", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("tenant_id", IdentityValueType.TEXT),
                                component("parent_id", IdentityValueType.SIGNED_INTEGER))),
                List.of());
    }

    private static void seedParentAndChild(Fixture fixture) {
        JdbcTemplate source = jdbc(fixture.source());
        source.execute("CREATE TABLE " + fixture.parentSource()
                + " (TENANT_ID varchar(20), LEGACY_NO bigint, PAYLOAD varchar(50))");
        source.update("INSERT INTO " + fixture.parentSource() + " VALUES ('A', 10, 'parent-a')");
        source.update("INSERT INTO " + fixture.parentSource() + " VALUES ('B', 20, 'parent-b')");
        source.execute("CREATE TABLE " + fixture.childSource()
                + " (CHILD_NO bigint, TENANT_ID varchar(20), LEGACY_PARENT_NO bigint)");
        source.update("INSERT INTO " + fixture.childSource() + " VALUES (1, 'A', 10)");
        source.update("INSERT INTO " + fixture.childSource() + " VALUES (2, 'B', 20)");

        fixture.targetJdbc().execute("CREATE TABLE " + fixture.parentTarget()
                + " (tenant_id varchar(20) NOT NULL, parent_id bigint GENERATED BY DEFAULT AS IDENTITY, "
                + "payload varchar(50), PRIMARY KEY (tenant_id, parent_id))");
        fixture.targetJdbc().execute("CREATE TABLE " + fixture.childTarget()
                + " (child_id bigint PRIMARY KEY, tenant_id varchar(20) NOT NULL, parent_id bigint NOT NULL, "
                + "FOREIGN KEY (tenant_id, parent_id) REFERENCES " + fixture.parentTarget()
                + " (tenant_id, parent_id))");
    }

    private static IdentityComponentSpec component(String column, IdentityValueType type) {
        return new IdentityComponentSpec(column, type);
    }

    private static Fixture fixture(String prefix) {
        int sequence = SEQUENCE.incrementAndGet();
        String suffix = prefix + '_' + sequence;
        DbConfig source = new DbConfig(
                "jdbc:h2:mem:" + suffix + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
        DbConfig target = new DbConfig(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(), POSTGRES.getDriverClassName());
        return new Fixture(
                source, target, new JdbcTemplate(dataSource(target)), "run_" + UUID.randomUUID(),
                "legacy_parent_" + suffix, "legacy_child_" + suffix,
                "tb_parent_" + suffix, "tb_child_" + suffix);
    }

    private static JdbcTemplate jdbc(DbConfig config) {
        return new JdbcTemplate(dataSource(config));
    }

    private static DriverManagerDataSource dataSource(DbConfig config) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                config.url(), config.username(), config.password());
        dataSource.setDriverClassName(config.driver());
        return dataSource;
    }

    private record Fixture(
            DbConfig source,
            DbConfig target,
            JdbcTemplate targetJdbc,
            String runId,
            String parentSource,
            String childSource,
            String parentTarget,
            String childTarget
    ) {}
}
