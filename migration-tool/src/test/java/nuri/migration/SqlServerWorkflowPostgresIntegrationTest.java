package nuri.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SqlServerSourceAdapter;
import nuri.migration.adapter.PreflightSeverity;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.CanonicalArtifactDigest;
import nuri.migration.artifact.MigrationExecutionArtifact;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
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
import nuri.migration.workflow.SourceLoadSurfaceGate;
import nuri.migration.workflow.WorkflowReview;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.dao.DataAccessException;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Reviewed public workflow through DRY_RUN; unqualified SQL Server COMMIT remains prohibited. */
class SqlServerWorkflowPostgresIntegrationTest extends SqlServerPostgresTestSupport {
    @TempDir
    Path temp;

    private final ObjectMapper json = new ObjectMapper();
    private final CatalogSnapshotArtifactCodec inventories = new CatalogSnapshotArtifactCodec();
    private final MigrationPlanArtifactCodec plans = new MigrationPlanArtifactCodec();

    @Test
    void databaseSchemaTableQualificationValidatesAndWrongCatalogFailsBeforeTargetState() throws Exception {
        Fixture fixture = fixture("metadata", "varchar(100)", "varchar(100)", "text");
        List<String> columns = new ArrayList<>();
        try (Connection connection = sourceConnection()) {
            assertThat(connection.getCatalog()).isEqualTo(SOURCE_DATABASE);
            assertThat(connection.getSchema()).isEqualTo("dbo");
            assertThat(connection.getMetaData().getDriverName()).isEqualTo("Microsoft JDBC Driver 13.6 for SQL Server");
            try (ResultSet rows = connection.getMetaData().getColumns(
                    connection.getCatalog(), connection.getSchema(), fixture.name(), null)) {
                while (rows.next()) {
                    assertThat(rows.getString("TABLE_CAT")).isEqualTo(SOURCE_DATABASE);
                    assertThat(rows.getString("TABLE_SCHEM")).isEqualTo("dbo");
                    assertThat(rows.getString("TABLE_NAME")).isEqualTo(fixture.name());
                    columns.add(rows.getString("COLUMN_NAME"));
                }
            }
        }
        assertThat(columns).containsExactlyInAnyOrder("id", "payload");
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "not-read-here.json");
        assertThat(validator.validateLiveSource(fixture.spec(), sourceJdbc()).errors()).isEmpty();

        MappingSpec.TableMapping table = fixture.spec().tables().getFirst();
        MappingSpec.TableMapping qualifiedTable = new MappingSpec.TableMapping(SOURCE_DATABASE + "." + table.source(),
                table.target(), table.where(), table.orderBy(), table.orderByKeys(), table.targetKey(),
                table.columns(), table.idStrategy(), table.identity(), table.foreignKeys());
        MappingSpec qualified = new MappingSpec(fixture.spec().source(), fixture.spec().target(), List.of(qualifiedTable),
                fixture.spec().codemaps(), fixture.spec().run());
        assertThat(validator.validateLiveSource(qualified, sourceJdbc()).errors()).isEmpty();
        sourceJdbc().update("INSERT INTO " + fixture.sourceTable() + " VALUES (1,'qualified-row')");
        assertThat(EtlSqlServerPostgresIntegrationTest.execute(qualified, MigrationMode.DRY_RUN))
                .singleElement().satisfies(result -> {
                    assertThat(result.read()).isEqualTo(1);
                    assertThat(result.transformed()).isEqualTo(1);
                    assertThat(result.written()).isZero();
                    assertThat(result.errors()).isEmpty();
                });

        MappingSpec.TableMapping wrongCatalog = new MappingSpec.TableMapping("master." + table.source(),
                table.target(), table.where(), table.orderBy(), table.orderByKeys(), table.targetKey(),
                table.columns(), table.idStrategy(), table.identity(), table.foreignKeys());
        MappingSpec wrong = new MappingSpec(fixture.spec().source(), fixture.spec().target(), List.of(wrongCatalog),
                fixture.spec().codemaps(), fixture.spec().run());
        assertThat(validator.validateLiveSource(wrong, sourceJdbc()).errors()).isNotEmpty();
        assertThat(EtlSqlServerPostgresIntegrationTest.execute(wrong, MigrationMode.COMMIT))
                .singleElement().satisfies(result -> {
                    assertThat(result.written()).isZero();
                    assertThat(result.errors()).isNotEmpty();
                });
        assertTargetUntouched(fixture);
    }

    @Test
    void schemaScopedScalarReviewValidatesAndDryRunsButDoesNotPermitUnverifiedCommit() throws Exception {
        Fixture fixture = fixture("scalar", "varchar(100)", "varchar(100)", "text");
        try (var connection = sourceConnection();
             var insert = connection.prepareStatement("INSERT INTO " + fixture.sourceTable() + " VALUES (?, ?)")) {
            for (int id = 1; id <= 501; id++) {
                insert.setLong(1, id);
                insert.setString(2, "sqlserver-row-" + id);
                insert.addBatch();
            }
            assertThat(insert.executeBatch()).hasSize(501);
        }
        assertLiveColumnTypes(fixture, Types.VARCHAR, Types.VARCHAR);

        discoverAndReview(fixture);
        assertThatThrownBy(() -> command(fixture, "load", "--mode=dry-run", "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("--ack-adapter");
        assertThatThrownBy(() -> command(fixture, "load", "--mode=dry-run", "--ack-adapter=sqlserver-catalog"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("--ack-source-freeze");
        assertThat(new SqlServerSourceAdapter().identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        assertThatThrownBy(() -> command(fixture, "load", "--mode=commit",
                "--ack-adapter=sqlserver-catalog", "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("UNVERIFIED source adapter");
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertDryRunPass(fixture, 501);
        assertTargetUntouched(fixture);
        assertThat(sourceJdbc().queryForObject("SELECT count(*) FROM " + fixture.sourceTable(), Long.class)).isEqualTo(501);
    }

    @Test
    void physicalReadOnlyDatabaseRejectsWritesWhileTheDriverReadOnlySignalStaysFalse() throws Exception {
        Fixture fixture = fixture("readonly", "varchar(100)", "text", "text");
        sourceJdbc().update("INSERT INTO " + fixture.sourceTable() + " VALUES (1,'protected-row')");
        var request = new DiscoveryRequest(Set.of(), Set.of("dbo"),
                EnumSet.of(ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
        try (var connection = sourceConnection()) {
            connection.setReadOnly(true);
            var writable = new SqlServerSourceAdapter().preflight(connection, request);
            assertThat(writable.connectionReadOnlySignal()).isFalse();
            assertThat(writable.hasBlockingFindings()).isTrue();
        }
        freezeSourceDatabase();
        var physical = sourceJdbc().queryForMap("SELECT DB_NAME() AS catalog_name,"
                + " CONVERT(varchar(32),DATABASEPROPERTYEX(DB_NAME(),'Updateability')) AS updateability");
        assertThat(physical.get("catalog_name")).isEqualTo(SOURCE_DATABASE);
        assertThat(physical.get("updateability")).isEqualTo("READ_ONLY");
        try (var connection = sourceConnection()) {
            connection.setReadOnly(true);
            var readOnly = new SqlServerSourceAdapter().preflight(connection, request);
            assertThat(readOnly.connectionReadOnlySignal()).isFalse();
            assertThat(readOnly.hasBlockingFindings()).isFalse();
            for (String code : List.of("PRIVILEGE_PROOF_REQUIRED", "UNVERIFIED_VENDOR_EVIDENCE")) {
                assertThat(readOnly.findings()).anySatisfy(finding -> {
                    assertThat(finding.code()).isEqualTo(code);
                    assertThat(finding.severity()).isEqualTo(PreflightSeverity.WARNING);
                });
            }
            assertThat(readOnly.identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        }
        assertReadOnlyWriteDenied(() -> sourceJdbc().update("INSERT INTO " + fixture.sourceTable() + " VALUES (2,'denied-row')"));
        assertReadOnlyWriteDenied(() -> sourceJdbc().update("UPDATE " + fixture.sourceTable() + " SET payload='denied-change' WHERE id=1"));
        assertThat(sourceJdbc().queryForObject("SELECT count(*) FROM " + fixture.sourceTable(), Long.class)).isEqualTo(1);
        assertThat("protected-row".equals(sourceJdbc().queryForObject("SELECT payload FROM " + fixture.sourceTable() + " WHERE id=1", String.class))).isTrue();
        assertTargetUntouched(fixture);
    }

    @ParameterizedTest
    @ValueSource(strings = {"varbinary(max)", "nvarchar(max)", "varchar(max)"})
    void realMaxFieldContentsSurviveReviewedDryRun(String sourceType) throws Exception {
        boolean binary = sourceType.startsWith("varbinary");
        boolean unicode = sourceType.startsWith("nvarchar");
        byte[] bytes = new byte[2 * 1024 * 1024 + 17];
        for (int index = 0; index < bytes.length; index++) bytes[index] = (byte) (index * 31 + index / 251);
        String token = unicode ? "본문🙂-" : "ascii-";
        String text = token.repeat(1 << 17);
        var witness = new PayloadWitness(binary ? bytes : text);
        Fixture fixture = fixture(binary ? "binary" : unicode ? "unicode" : "ascii",
                sourceType, binary ? "bytea" : "text", null, witness);
        if (binary) {
            try (Connection connection = sourceConnection();
                 var insert = connection.prepareStatement("INSERT INTO " + fixture.sourceTable() + " VALUES (1, ?)")) {
                insert.setBinaryStream(1, new ByteArrayInputStream(bytes), bytes.length);
                assertThat(insert.executeUpdate()).isEqualTo(1);
            }
        } else {
            sourceJdbc().update("INSERT INTO " + fixture.sourceTable() + " VALUES (1, REPLICATE(CAST(? AS " + sourceType + "), ?))", token, 1 << 17);
            assertThat(text.equals(sourceJdbc().queryForObject(
                    "SELECT payload FROM " + fixture.sourceTable() + " WHERE id=1", String.class)))
                    .as("complete Unicode source fixture before public dry-run").isTrue();
        }
        int sourceJdbcType = binary ? Types.VARBINARY : unicode ? Types.NVARCHAR : Types.VARCHAR;
        assertLiveColumnTypes(fixture, sourceJdbcType, binary ? Types.BINARY : Types.VARCHAR);
        CatalogSnapshot snapshot = discoverAndReview(fixture);
        CatalogObject table = snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.TABLE && object.name().equals(fixture.name()))
                .findFirst().orElseThrow();
        assertThat(snapshot.objects()).anySatisfy(column -> {
            assertThat(column.kind()).isEqualTo(ObjectKind.COLUMN);
            assertThat(column.attributes()).containsEntry("originalName", "payload")
                    .containsEntry("jdbcType", Integer.toString(sourceJdbcType));
            assertThat(column.dependencies()).anyMatch(dependency -> dependency.stableId().equals(table.referenceId()));
        });
        assertThat(SourceLoadSurfaceGate.blockers(snapshot, fixture.spec(),
                new SqlServerSourceAdapter().sourceReadSessionPolicy())).isEmpty();
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertDryRunPass(fixture, 1);
        assertThat(witness.observed).as("full field content is compared inside the real transformation path").isEqualTo(1);
        assertTargetUntouched(fixture);
    }

    @Test
    void targetSchemaDriftRequiresNewReviewBeforePlanCanBeRewritten() throws Exception {
        Fixture fixture = fixture("drift", "varchar(100)", "varchar(100)", "text");
        sourceJdbc().update("INSERT INTO " + fixture.sourceTable() + " VALUES (1, 'scalar-value')");
        discoverAndReview(fixture);
        String original = Files.readString(fixture.plan());
        MigrationPlan previousPlan = plans.read(original);
        targetJdbc().execute("ALTER TABLE " + fixture.targetTable() + " ADD COLUMN extra_value integer");
        try (Connection target = targetJdbc().getDataSource().getConnection()) {
            assertThat(new PostgresTargetSchemaFingerprinter().fingerprintBound(target, fixture.spec(), Set.of("public")).digest())
                    .isNotEqualTo(previousPlan.targetSchemaDigest());
        }
        assertThatThrownBy(() -> command(fixture, "plan", "--review=" + fixture.review()))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("plan 실패");
        assertThatThrownBy(() -> command(fixture, "load", "--mode=dry-run",
                "--ack-adapter=sqlserver-catalog", "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("target schema digest");
        assertThat(Files.readString(fixture.plan())).isEqualTo(original);
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertTargetUntouched(fixture);
    }

    private Fixture fixture(String scenario, String sourceType, String targetType, String mappingType) throws Exception {
        return fixture(scenario, sourceType, targetType, mappingType, null);
    }

    private Fixture fixture(String scenario, String sourceType, String targetType, String mappingType,
                            PayloadWitness witness) throws Exception {
        String name = "tb_sqlserver_wf_" + scenario + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String sourceTable = "dbo." + name;
        String targetTable = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + sourceTable + " (id bigint PRIMARY KEY, payload " + sourceType
                + ")");
        targetJdbc().execute("CREATE TABLE " + targetTable + " (id bigint PRIMARY KEY, payload " + targetType + ")");
        Path directory = Files.createDirectory(temp.resolve(scenario));
        Path mappingPath = directory.resolve("mapping.yml");
        Files.writeString(mappingPath, """
                source:
                  url: ${WF_SOURCE_URL}
                  username: ${WF_SOURCE_USER}
                  password: ${WF_SOURCE_PASSWORD}
                  driver: com.microsoft.sqlserver.jdbc.SQLServerDriver
                  endpointId: disposable-sqlserver-source
                target:
                  url: ${WF_TARGET_URL}
                  username: ${WF_TARGET_USER}
                  password: ${WF_TARGET_PASSWORD}
                  driver: org.postgresql.Driver
                  endpointId: disposable-postgres-target
                run:
                  runId: %s
                  sourceNamespace: sqlserver-workflow-fixture
                tables:
                  - source: %s
                    target: %s
                    orderBy: id
                    targetKey: id
                    columns:
                      - source: id
                        target: id
                        type: long
                      - source: payload
                        target: payload
                %s
                """.formatted(name, sourceTable, targetTable,
                (mappingType == null ? "" : "        type: " + mappingType + "\n")
                        + (witness == null ? "" : "        transform: verifyFixturePayload\n")));
        var source = sourceConfig();
        var target = targetConfig();
        Map<String, String> environment = Map.of("WF_SOURCE_URL", source.url(), "WF_SOURCE_USER", source.username(),
                "WF_SOURCE_PASSWORD", source.password(), "WF_TARGET_URL", target.url(),
                "WF_TARGET_USER", target.username(), "WF_TARGET_PASSWORD", target.password());
        var loader = new MappingLoader(environment::get);
        Path columns = directory.resolve("db-columns.json");
        json.writeValue(columns.toFile(), targetJdbc().queryForList(
                "SELECT table_schema || '.' || table_name AS table_name, column_name FROM information_schema.columns"
                        + " WHERE table_schema = 'public' AND table_name = ? ORDER BY ordinal_position", name));
        var transformers = new TransformerRegistry();
        if (witness != null) {
            try (InputStream implementation = PayloadWitness.class.getResourceAsStream(
                    "SqlServerWorkflowPostgresIntegrationTest$PayloadWitness.class")) {
                assertThat(implementation).isNotNull();
                String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(implementation.readAllBytes()));
                transformers.register("verifyFixturePayload", "1", digest, witness);
            }
        }
        var introspector = new SourceIntrospector();
        var runner = new MigrationWorkflowRunner(loader, new MappingValidator(transformers, columns.toString()),
                new EtlExecutor(introspector, transformers), new MigrationVerifier(), introspector,
                new SourceJdbcEndpointFactory(introspector), transformers);
        return new Fixture(name, sourceTable, targetTable, mappingPath, directory.resolve("inventory.json"),
                directory.resolve("plan.json"), directory.resolve("review.yml"), loader.load(mappingPath), runner);
    }

    private CatalogSnapshot discoverAndReview(Fixture fixture) throws Exception {
        freezeSourceDatabase();
        command(fixture, "discover");
        CatalogSnapshot snapshot = inventories.readEnvelope(Files.readString(fixture.inventory())).payload().toSnapshot();
        assertThat(snapshot.objects()).isNotEmpty();
        assertThat(snapshot.environment().defaultCatalog()).isEqualTo(SOURCE_DATABASE);
        assertThat(snapshot.environment().defaultSchema()).isEqualTo("dbo");
        assertThat(snapshot.visibilityFindings()).isEmpty();
        command(fixture, "plan");
        MigrationPlan draft = plans.read(Files.readString(fixture.plan()));
        assertThat(draft.commitReady()).isFalse();
        assertThatThrownBy(() -> command(fixture, "validate"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("commitReady=false");
        assertThatThrownBy(() -> command(fixture, "load", "--mode=dry-run",
                "--ack-adapter=sqlserver-catalog", "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("commitReady=false");
        Map<String, DispositionDecision> decisions = new LinkedHashMap<>();
        for (CatalogObject object : snapshot.objects()) {
            boolean mappedTable = object.kind() == ObjectKind.TABLE && object.name().equals(fixture.name());
            decisions.put(object.stableId(), new DispositionDecision(
                    mappedTable ? ObjectDisposition.AUTO_DATA_LOAD : ObjectDisposition.EXPORT_ONLY,
                    mappedTable ? fixture.targetTable() : null, true,
                    "Disposable fixture review for workflow boundary verification"));
        }
        var review = new WorkflowReview(WorkflowReview.CURRENT_SCHEMA_VERSION, draft.sourceInventoryDigest(),
                draft.targetSchemaDigest(), draft.mappingDigest(), draft.executionContractDigest(), decisions);
        new YAMLMapper().writeValue(fixture.review().toFile(), review);
        command(fixture, "plan", "--review=" + fixture.review());
        MigrationPlan reviewed = plans.read(Files.readString(fixture.plan()));
        assertThat(reviewed.readiness().blockers()).isEmpty();
        assertThat(reviewed.commitReady()).isTrue();
        command(fixture, "validate");
        return snapshot;
    }

    private void assertDryRunPass(Fixture fixture, long expectedRows) throws Exception {
        command(fixture, "load", "--mode=dry-run", "--ack-adapter=sqlserver-catalog", "--ack-source-freeze");
        List<Path> artifacts = executionArtifacts(fixture);
        assertThat(artifacts).hasSize(1);
        MigrationExecutionArtifact execution = json.readValue(Files.readString(artifacts.getFirst()), MigrationExecutionArtifact.class);
        assertThat(execution.mode()).isEqualTo("DRY_RUN");
        assertThat(execution.status()).isEqualTo("PASS");
        MigrationPlan plan = plans.read(Files.readString(fixture.plan()));
        assertThat(execution.planDigest()).isEqualTo(CanonicalArtifactDigest.sha256(plan));
        assertThat(execution.mappingDigest()).isEqualTo(plan.mappingDigest());
        assertThat(execution.targetDigest()).isEqualTo(plan.targetSchemaDigest());
        assertThat(execution.tables()).singleElement().satisfies(table -> {
            assertThat(table.read()).isEqualTo(expectedRows);
            assertThat(table.written()).isZero();
            assertThat(table.errors()).isZero();
            assertThat(table.targetRows()).isEqualTo(-1);
            assertThat(table.status()).isEqualTo("PASS");
        });
    }

    private void command(Fixture fixture, String command, String... extra) {
        List<String> arguments = new ArrayList<>(List.of("--command=" + command));
        if (!command.equals("validate")) {
            arguments.addAll(List.of("--mapping=" + fixture.mapping(), "--inventory=" + fixture.inventory(),
                    "--source-adapter=sqlserver-catalog", "--schemas=dbo",
                    "--object-kinds=TABLE,COLUMN,PRIMARY_KEY"));
        }
        if (!command.equals("discover")) arguments.add("--plan=" + fixture.plan());
        arguments.addAll(List.of(extra));
        fixture.runner().run(new DefaultApplicationArguments(arguments.toArray(String[]::new)));
    }

    private void assertLiveColumnTypes(Fixture fixture, int sourceType, int targetType) throws Exception {
        try (Connection source = sourceJdbc().getDataSource().getConnection();
             ResultSet columns = source.getMetaData().getColumns(SOURCE_DATABASE, "dbo", fixture.name(), "payload")) {
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
            return paths.filter(path -> path.getFileName().toString().startsWith("plan.json.load-")).toList();
        }
    }

    private static void assertReadOnlyWriteDenied(Runnable write) {
        try {
            write.run();
        } catch (DataAccessException failure) {
            Throwable cause = failure.getMostSpecificCause();
            assertThat(cause instanceof SQLException).isTrue();
            assertThat(((SQLException) cause).getErrorCode()).isEqualTo(3906);
            return;
        }
        throw new AssertionError("physical READ_ONLY SQL Server database accepted a write");
    }

    private void assertTargetUntouched(Fixture fixture) {
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + fixture.targetTable(), Long.class)).isZero();
        assertThat(targetJdbc().queryForObject(
                "SELECT count(*) FROM information_schema.schemata WHERE schema_name='migration_control'", Long.class)).isZero();
    }

    private record Fixture(String name, String sourceTable, String targetTable, Path mapping, Path inventory,
                           Path plan, Path review, MappingSpec spec, MigrationWorkflowRunner runner) { }

    /** Identity transform that witnesses complete field content during the public DRY_RUN. */
    private static final class PayloadWitness implements UnaryOperator<Object> {
        private final Object expected;
        private int observed;

        private PayloadWitness(Object expected) {
            this.expected = expected;
        }

        @Override
        public Object apply(Object value) {
            if (expected instanceof byte[] bytes) {
                assertThat(value instanceof byte[] actual && Arrays.equals(bytes, actual))
                        .as("complete VARBINARY MAX content").isTrue();
            } else {
                assertThat(value instanceof String && expected.equals(value)).as("complete MAX text content").isTrue();
            }
            observed++;
            return value;
        }
    }
}
