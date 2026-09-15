package nuri.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.OracleSourceAdapter;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.MigrationExecutionArtifact;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.jdbc.SourceJdbcEndpointFactory;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.plan.DispositionDecision;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.ObjectDisposition;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.MappingValidator;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.workflow.WorkflowReview;
import nuri.migration.workflow.SourceLoadSurfaceGate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.DefaultApplicationArguments;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Real reviewed workflow through DRY_RUN; unqualified Oracle production commit remains prohibited. */
class OracleWorkflowPostgresIntegrationTest extends OraclePostgresTestSupport {

    @TempDir
    Path temp;

    private final ObjectMapper json = new ObjectMapper();
    private final CatalogSnapshotArtifactCodec inventories = new CatalogSnapshotArtifactCodec();
    private final MigrationPlanArtifactCodec plans = new MigrationPlanArtifactCodec();

    @Test
    void ownerScopedReviewedScalarPlanValidatesAndDryRunsButDoesNotPermitUnverifiedCommit() throws Exception {
        Fixture fixture = fixture("scalar", "VARCHAR2(100)", "varchar(100)", "text");
        sourceJdbc().update("INSERT INTO " + fixture.sourceTable()
                + " (ID, PAYLOAD) SELECT LEVEL, 'oracle-row-' || TO_CHAR(LEVEL)"
                + " FROM DUAL CONNECT BY LEVEL <= 501");
        assertLiveColumnTypes(fixture, Types.VARCHAR, Types.VARCHAR);

        discoverAndReview(fixture);
        assertThatThrownBy(() -> command(fixture, "load", "--mode=dry-run", "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("--ack-adapter");
        assertThatThrownBy(() -> command(fixture, "load", "--mode=dry-run", "--ack-adapter=oracle-catalog"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("--ack-source-freeze");
        assertThat(new OracleSourceAdapter().identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        assertThatThrownBy(() -> command(fixture, "load", "--mode=commit",
                "--ack-adapter=oracle-catalog", "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("UNVERIFIED source adapter");

        assertThat(executionArtifacts(fixture)).isEmpty();
        assertDryRunPass(fixture, 501L);
        assertTargetUntouched(fixture);
        assertThat(sourceJdbc().queryForObject("SELECT COUNT(*) FROM " + fixture.sourceTable(), Long.class))
                .isEqualTo(501L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"BLOB", "CLOB"})
    void realOracleLobContentsSurviveTheReviewedDryRun(String lobType) throws Exception {
        boolean binary = lobType.equals("BLOB");
        byte[] bytes = new byte[2 * 1024 * 1024 + 17];
        for (int index = 0; index < bytes.length; index++) {
            bytes[index] = (byte) (index * 31 + index / 251);
        }
        String text = "본문🙂-".repeat(1 << 17);
        PayloadWitness witness = new PayloadWitness(binary ? bytes : text);
        Fixture fixture = fixture(lobType.toLowerCase(Locale.ROOT), lobType,
                binary ? "bytea" : "text", binary ? null : "text", witness);
        if (binary) {
            try (Connection connection = ORACLE.createConnection("");
                 var insert = connection.prepareStatement("INSERT INTO " + fixture.sourceTable() + " VALUES (1, ?)")) {
                insert.setBinaryStream(1, new ByteArrayInputStream(bytes), bytes.length);
                assertThat(insert.executeUpdate()).isEqualTo(1);
            }
        } else {
            // Grow inside Oracle to preserve supplementary Unicode characters across upload buffer boundaries.
            sourceJdbc().update("INSERT INTO " + fixture.sourceTable() + " VALUES (1, TO_CLOB(?))", "본문🙂-");
            for (int step = 0; step < 17; step++) {
                sourceJdbc().update("UPDATE " + fixture.sourceTable() + " SET PAYLOAD=PAYLOAD || PAYLOAD WHERE ID=1");
            }
        }
        assertLiveColumnTypes(fixture, binary ? Types.BLOB : Types.CLOB,
                binary ? Types.BINARY : Types.VARCHAR);
        CatalogSnapshot snapshot = discoverAndReview(fixture);
        CatalogObject table = snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .filter(object -> object.name().equals(fixture.name().toUpperCase(Locale.ROOT)))
                .findFirst().orElseThrow();
        assertThat(snapshot.objects()).anySatisfy(column -> {
            assertThat(column.kind()).isEqualTo(ObjectKind.COLUMN);
            assertThat(column.attributes()).containsEntry("originalName", "PAYLOAD")
                    .containsEntry("jdbcType", Integer.toString(binary ? Types.BLOB : Types.CLOB));
            assertThat(column.dependencies()).anyMatch(dependency ->
                    dependency.stableId().equals(table.referenceId()));
        });

        assertThat(SourceLoadSurfaceGate.blockers(snapshot, fixture.spec(),
                new OracleSourceAdapter().sourceReadSessionPolicy()))
                .isEmpty();

        assertThat(executionArtifacts(fixture)).isEmpty();
        assertDryRunPass(fixture, 1L);
        assertThat(witness.observed).as("the full LOB content was compared inside the real transformation path")
                .isEqualTo(1);
        assertTargetUntouched(fixture);
    }

    @Test
    void targetSchemaChangeRequiresANewReviewBeforeTheOraclePlanCanBeRewritten() throws Exception {
        Fixture fixture = fixture("drift", "VARCHAR2(100)", "varchar(100)", "text");
        sourceJdbc().update("INSERT INTO " + fixture.sourceTable() + " VALUES (1, 'scalar-value')");
        discoverAndReview(fixture);
        String previousArtifact = Files.readString(fixture.plan());
        MigrationPlan previousPlan = plans.read(previousArtifact);
        targetJdbc().execute("ALTER TABLE " + fixture.targetTable() + " ADD COLUMN extra_value integer");
        try (Connection target = targetJdbc().getDataSource().getConnection()) {
            String liveDigest = new PostgresTargetSchemaFingerprinter()
                    .fingerprintBound(target, fixture.spec(), Set.of("public")).digest();
            assertThat(liveDigest).isNotEqualTo(previousPlan.targetSchemaDigest());
        }

        assertThatThrownBy(() -> command(fixture, "plan", "--review=" + fixture.review()))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("plan 실패");
        assertThatThrownBy(() -> command(fixture, "load", "--mode=dry-run",
                "--ack-adapter=oracle-catalog", "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("target schema digest");

        assertThat(Files.readString(fixture.plan())).isEqualTo(previousArtifact);
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertTargetUntouched(fixture);
    }

    private Fixture fixture(String scenario, String sourceType, String targetType, String mappingType)
            throws Exception {
        return fixture(scenario, sourceType, targetType, mappingType, null);
    }

    private Fixture fixture(String scenario, String sourceType, String targetType, String mappingType,
                            PayloadWitness witness) throws Exception {
        String name = "tb_wf_" + scenario + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String sourceTable = ORACLE.getUsername().toUpperCase(Locale.ROOT) + "." + name.toUpperCase(Locale.ROOT);
        String targetTable = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + sourceTable + " (ID NUMBER(10) PRIMARY KEY, PAYLOAD " + sourceType + ")");
        targetJdbc().execute("CREATE TABLE " + targetTable + " (id bigint PRIMARY KEY, payload " + targetType + ")");
        Path directory = Files.createDirectory(temp.resolve(scenario));
        Path mappingPath = directory.resolve("mapping.yml");
        Files.writeString(mappingPath, """
                source:
                  url: ${WF_SOURCE_URL}
                  username: ${WF_SOURCE_USER}
                  password: ${WF_SOURCE_PASSWORD}
                  driver: oracle.jdbc.OracleDriver
                  endpointId: disposable-oracle-source
                target:
                  url: ${WF_TARGET_URL}
                  username: ${WF_TARGET_USER}
                  password: ${WF_TARGET_PASSWORD}
                  driver: org.postgresql.Driver
                  endpointId: disposable-postgres-target
                run:
                  runId: %s
                  sourceNamespace: oracle-workflow-fixture
                tables:
                  - source: %s
                    target: %s
                    orderBy: ID
                    targetKey: id
                    columns:
                      - source: ID
                        target: id
                        type: long
                      - source: PAYLOAD
                        target: payload
                %s
                """.formatted(name, sourceTable, targetTable,
                (mappingType == null ? "" : "        type: " + mappingType + "\n")
                        + (witness == null ? "" : "        transform: verifyFixturePayload\n")));
        MappingSpec.DbConfig source = sourceConfig();
        MappingSpec.DbConfig target = targetConfig();
        Map<String, String> environment = Map.of(
                "WF_SOURCE_URL", source.url(), "WF_SOURCE_USER", source.username(),
                "WF_SOURCE_PASSWORD", source.password(), "WF_TARGET_URL", target.url(),
                "WF_TARGET_USER", target.username(), "WF_TARGET_PASSWORD", target.password());
        MappingLoader loader = new MappingLoader(environment::get);
        // The fixture standard snapshot is derived from the existing physical target, before planning.
        Path columns = directory.resolve("db-columns.json");
        json.writeValue(columns.toFile(), targetJdbc().queryForList(
                "SELECT table_schema || '.' || table_name AS table_name, column_name"
                        + " FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?"
                        + " ORDER BY ordinal_position", name));
        TransformerRegistry transformers = new TransformerRegistry();
        if (witness != null) {
            try (InputStream implementation = PayloadWitness.class.getResourceAsStream(
                    "OracleWorkflowPostgresIntegrationTest$PayloadWitness.class")) {
                assertThat(implementation).isNotNull();
                String implementationDigest = HexFormat.of().formatHex(
                        MessageDigest.getInstance("SHA-256").digest(implementation.readAllBytes()));
                transformers.register("verifyFixturePayload", "1", implementationDigest, witness);
            }
        }
        SourceIntrospector introspector = new SourceIntrospector();
        MigrationWorkflowRunner runner = new MigrationWorkflowRunner(loader,
                new MappingValidator(transformers, columns.toString()),
                new EtlExecutor(introspector, transformers), new MigrationVerifier(), introspector,
                new SourceJdbcEndpointFactory(introspector), transformers);
        return new Fixture(name, sourceTable, targetTable, mappingPath,
                directory.resolve("inventory.json"), directory.resolve("plan.json"),
                directory.resolve("review.yml"), loader.load(mappingPath), runner);
    }

    private CatalogSnapshot discoverAndReview(Fixture fixture) throws Exception {
        command(fixture, "discover");
        CatalogSnapshot snapshot = inventories.readEnvelope(Files.readString(fixture.inventory())).payload().toSnapshot();
        assertThat(snapshot.objects()).isNotEmpty();
        assertThat(snapshot.visibilityFindings()).isEmpty();
        command(fixture, "plan");
        MigrationPlan draft = plans.read(Files.readString(fixture.plan()));
        assertThat(draft.commitReady()).isFalse();
        assertThatThrownBy(() -> command(fixture, "validate"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("commitReady=false");
        assertThatThrownBy(() -> command(fixture, "load", "--mode=dry-run",
                "--ack-adapter=oracle-catalog", "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("commitReady=false");
        Map<String, DispositionDecision> decisions = new LinkedHashMap<>();
        for (CatalogObject object : snapshot.objects()) {
            boolean mappedTable = object.kind() == ObjectKind.TABLE
                    && object.name().equals(fixture.name().toUpperCase(Locale.ROOT));
            decisions.put(object.stableId(), new DispositionDecision(
                    mappedTable ? ObjectDisposition.AUTO_DATA_LOAD : ObjectDisposition.EXPORT_ONLY,
                    mappedTable ? fixture.targetTable() : null, true,
                    "Disposable fixture review for workflow boundary verification"));
        }
        WorkflowReview review = new WorkflowReview(WorkflowReview.CURRENT_SCHEMA_VERSION,
                draft.sourceInventoryDigest(), draft.targetSchemaDigest(), draft.mappingDigest(),
                draft.executionContractDigest(), decisions);
        new YAMLMapper().writeValue(fixture.review().toFile(), review);
        command(fixture, "plan", "--review=" + fixture.review());
        MigrationPlan reviewed = plans.read(Files.readString(fixture.plan()));
        assertThat(reviewed.readiness().blockers()).isEmpty();
        assertThat(reviewed.commitReady()).isTrue();
        command(fixture, "validate");
        return snapshot;
    }

    private void assertDryRunPass(Fixture fixture, long expectedRows) throws Exception {
        command(fixture, "load", "--mode=dry-run", "--ack-adapter=oracle-catalog", "--ack-source-freeze");
        List<Path> artifacts = executionArtifacts(fixture);
        assertThat(artifacts).hasSize(1);
        MigrationExecutionArtifact execution = json.readValue(Files.readString(artifacts.getFirst()),
                MigrationExecutionArtifact.class);
        assertThat(execution.mode()).isEqualTo("DRY_RUN");
        assertThat(execution.status()).isEqualTo("PASS");
        MigrationPlan plan = plans.read(Files.readString(fixture.plan()));
        assertThat(execution.mappingDigest()).isEqualTo(plan.mappingDigest());
        assertThat(execution.targetDigest()).isEqualTo(plan.targetSchemaDigest());
        assertThat(execution.tables()).singleElement().satisfies(table -> {
            assertThat(table.read()).isEqualTo(expectedRows);
            assertThat(table.written()).isZero();
            assertThat(table.errors()).isZero();
            assertThat(table.targetRows()).isEqualTo(-1L);
            assertThat(table.status()).isEqualTo("PASS");
        });
    }

    private void command(Fixture fixture, String command, String... extra) {
        List<String> arguments = new ArrayList<>(List.of("--command=" + command));
        if (!command.equals("validate")) {
            arguments.addAll(List.of("--mapping=" + fixture.mapping(), "--inventory=" + fixture.inventory(),
                    "--source-adapter=oracle-catalog", "--schemas=" + ORACLE.getUsername().toUpperCase(Locale.ROOT),
                    "--object-kinds=TABLE,COLUMN,PRIMARY_KEY"));
        }
        if (!command.equals("discover")) {
            arguments.add("--plan=" + fixture.plan());
        }
        arguments.addAll(List.of(extra));
        fixture.runner().run(new DefaultApplicationArguments(arguments.toArray(String[]::new)));
    }

    private void assertLiveColumnTypes(Fixture fixture, int sourceType, int targetType) throws Exception {
        try (Connection source = sourceJdbc().getDataSource().getConnection();
             ResultSet columns = source.getMetaData().getColumns(null,
                     ORACLE.getUsername().toUpperCase(Locale.ROOT), fixture.name().toUpperCase(Locale.ROOT), "PAYLOAD")) {
            assertThat(columns.next()).isTrue();
            assertThat(columns.getInt("DATA_TYPE")).isEqualTo(sourceType);
            assertThat(columns.next()).isFalse();
        }
        try (Connection target = targetJdbc().getDataSource().getConnection();
             ResultSet columns = target.getMetaData().getColumns(target.getCatalog(), "public", fixture.name(), "payload")) {
            assertThat(columns.next()).isTrue();
            assertThat(columns.getInt("DATA_TYPE")).isEqualTo(targetType);
            assertThat(columns.next()).isFalse();
        }
    }

    private List<Path> executionArtifacts(Fixture fixture) throws Exception {
        try (var paths = Files.list(fixture.plan().getParent())) {
            return paths.filter(path -> path.getFileName().toString().startsWith("plan.json.load-"))
                    .toList();
        }
    }

    private void assertTargetUntouched(Fixture fixture) {
        assertThat(targetJdbc().queryForObject("SELECT COUNT(*) FROM " + fixture.targetTable(), Long.class)).isZero();
        assertThat(targetJdbc().queryForObject(
                "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'migration_control'", Long.class))
                .isZero();
    }

    private record Fixture(String name, String sourceTable, String targetTable, Path mapping, Path inventory,
                           Path plan, Path review, MappingSpec spec, MigrationWorkflowRunner runner) { }

    /** Identity transform used only to witness full content during a public DRY_RUN. */
    private static final class PayloadWitness implements UnaryOperator<Object> {
        private final Object expected;
        private int observed;

        private PayloadWitness(Object expected) {
            this.expected = expected;
        }

        @Override
        public Object apply(Object value) {
            if (expected instanceof byte[] bytes) {
                assertThat(value).isInstanceOf(byte[].class);
                assertThat(Arrays.equals(bytes, (byte[]) value)).as("complete BLOB content").isTrue();
            } else {
                assertThat(value).isInstanceOf(String.class);
                assertThat(expected.equals(value)).as("complete Unicode CLOB content").isTrue();
            }
            observed++;
            return value;
        }
    }
}
