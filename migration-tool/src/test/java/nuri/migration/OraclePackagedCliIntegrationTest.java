package nuri.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.OracleSourceAdapter;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.MigrationExecutionArtifact;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.artifact.SourceDriverEvidence;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.jdbc.LocalDriverJarPolicy;
import nuri.migration.jdbc.SourceDriverException;
import nuri.migration.plan.DispositionDecision;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.ObjectDisposition;
import nuri.migration.workflow.WorkflowReview;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.Reader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Types;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.jar.Attributes;
import java.util.jar.JarFile;
import java.util.spi.ToolProvider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Exercises an unmodified Oracle JAR on the JVM module path; raw isolated manifest expansion stays forbidden. */
class OraclePackagedCliIntegrationTest extends OraclePostgresTestSupport {
    private static final String ORACLE_DRIVER = "oracle.jdbc.OracleDriver";
    private static final int ROWS = 501;
    private static final int BLOB_BYTES = 2 * 1024 * 1024 + 17;
    private static final int CLOB_REPETITIONS = 1 << 17;
    private static final String CLOB_UNIT = "본문🙂-";
    private static final int CHILD_TIMEOUT_SECONDS = 180;

    @TempDir
    Path directory;

    private final ObjectMapper json = new ObjectMapper();
    private final CatalogSnapshotArtifactCodec inventories = new CatalogSnapshotArtifactCodec();
    private final MigrationPlanArtifactCodec plans = new MigrationPlanArtifactCodec();

    @Test
    void shippedJarRejectsRawIsolatedDriverAndDryRunsWithUnmodifiedModuleDriverButCannotCommit() throws Exception {
        Path application = applicationJar();
        Path driver = externalDriverJar();
        assertDeploymentJarExcludesSourceDrivers(application);
        Fixture fixture = fixture(application, driver);
        assertSourceLobContents(fixture);

        assertChild("missing-source-driver", command(fixture, "discover", DriverMode.NONE), 1, Signal.DISCOVER_FAILURE);
        assertThat(Files.exists(fixture.inventory())).as("missing driver must not produce an inventory").isFalse();
        try (var archive = new JarFile(driver.toFile())) {
            assertThat(archive.getManifest().getMainAttributes().getValue(Attributes.Name.CLASS_PATH))
                    .as("the original Oracle JAR declares an implicit manifest dependency")
                    .isEqualTo("oraclepki.jar");
        }
        assertThatThrownBy(() -> new LocalDriverJarPolicy().validate(List.of(driver)))
                .isInstanceOf(SourceDriverException.class)
                .hasMessage("source driver JAR가 로컬 안전 정책을 충족하지 않습니다.");
        assertChild("raw-isolated-driver-policy", command(fixture, "discover", DriverMode.ISOLATED),
                1, Signal.DISCOVER_FAILURE);
        assertThat(Files.exists(fixture.inventory())).as("rejected raw isolated driver must not produce an inventory").isFalse();
        assertChild("discover", command(fixture, "discover", DriverMode.MODULE_PATH), 0, null);
        var inventory = inventories.readEnvelope(Files.readString(fixture.inventory()));
        var snapshot = inventory.payload().toSnapshot();
        try (var connection = sourceJdbc().getDataSource().getConnection()) {
            var metadata = connection.getMetaData();
            assertThat(snapshot.database().productName()).isEqualTo("Oracle");
            assertThat(snapshot.database().productVersion()).isEqualTo(metadata.getDatabaseProductVersion());
            assertThat(snapshot.database().driverName()).isEqualTo(metadata.getDriverName());
            assertThat(snapshot.database().driverVersion()).isEqualTo(metadata.getDriverVersion());
        }
        assertThat(snapshot.environment().defaultSchema()).isEqualTo(sourceOwner());
        assertThat(snapshot.visibilityFindings()).isEmpty();
        assertThat(snapshot.objects()).anyMatch(object -> object.kind() == ObjectKind.TABLE
                && sourceOwner().equals(object.schema())
                && object.name().equals(fixture.name().toUpperCase(Locale.ROOT)));
        // A regular original JAR on the explicit JVM module path uses the bundled endpoint's full-JAR SHA binding.
        SourceDriverEvidence expected = SourceDriverEvidence.bundled(ORACLE_DRIVER, sha256(driver));
        assertThat(inventory.sourceDriverEvidence()).isEqualTo(expected);
        assertThat(inventory.sourceDriverEvidence().loadingMode()).isEqualTo(SourceDriverEvidence.LoadingMode.BUNDLED);
        assertThat(inventory.sourceDriverEvidence().jarCount()).isZero();

        assertChild("draft-plan", command(fixture, "plan", DriverMode.NONE), 0, null);
        MigrationPlan draft = plans.read(Files.readString(fixture.plan()));
        assertThat(draft.sourceProduct()).isEqualTo(
                snapshot.database().productName() + " " + snapshot.database().productVersion());
        assertThat(draft.commitReady()).isFalse();
        assertChild("unreviewed-validate", command(fixture, "validate", DriverMode.NONE), 1, Signal.UNREVIEWED_PLAN);
        assertChild("unreviewed-load", command(fixture, "load", DriverMode.MODULE_PATH,
                "--mode=dry-run", "--ack-adapter=oracle-catalog", "--ack-source-freeze"), 1, Signal.UNREVIEWED_PLAN);
        assertThat(executionArtifacts(fixture)).isEmpty();
        Map<String, DispositionDecision> decisions = new LinkedHashMap<>();
        for (var object : snapshot.objects()) {
            boolean mapped = object.kind() == ObjectKind.TABLE && sourceOwner().equals(object.schema())
                    && object.name().equals(fixture.name().toUpperCase(Locale.ROOT));
            decisions.put(object.stableId(), new DispositionDecision(
                    mapped ? ObjectDisposition.AUTO_DATA_LOAD : ObjectDisposition.EXPORT_ONLY,
                    mapped ? fixture.targetTable() : null, true,
                    "Disposable packaged CLI boundary review"));
        }
        new YAMLMapper().writeValue(fixture.review().toFile(), new WorkflowReview(
                WorkflowReview.CURRENT_SCHEMA_VERSION, draft.sourceInventoryDigest(), draft.targetSchemaDigest(),
                draft.mappingDigest(), draft.executionContractDigest(), decisions));
        assertChild("reviewed-plan", command(fixture, "plan", DriverMode.NONE, "--review=" + fixture.review()), 0, null);
        MigrationPlan reviewed = plans.read(Files.readString(fixture.plan()));
        assertThat(reviewed.commitReady()).isTrue();
        assertThat(reviewed.readiness().blockers()).isEmpty();
        assertChild("validate", command(fixture, "validate", DriverMode.NONE), 0, null);

        Path changedDriver = directory.resolve("changed-oracle-driver.jar");
        Files.copy(driver, changedDriver);
        addArchiveResource(changedDriver, "driver-boundary-probe.txt");
        assertThat(sha256(changedDriver)).isNotEqualTo(sha256(driver));
        Fixture changedDriverFixture = new Fixture(fixture.name(), fixture.sourceTable(), fixture.targetTable(),
                fixture.application(), changedDriver, fixture.mapping(), fixture.columns(), fixture.inventory(),
                fixture.plan(), fixture.review());
        assertChild("changed-source-driver", command(changedDriverFixture, "load", DriverMode.MODULE_PATH,
                "--mode=dry-run", "--ack-adapter=oracle-catalog", "--ack-source-freeze"), 1, Signal.DRIVER_EVIDENCE);
        assertThat(executionArtifacts(fixture)).isEmpty();

        Path changedJar = directory.resolve("changed-migration.jar");
        Files.copy(application, changedJar);
        // Add a harmless resource with the JDK archive tool; keep the application and libraries executable.
        addArchiveResource(changedJar, "deployment-boundary-probe.txt");
        assertDeploymentJarExcludesSourceDrivers(changedJar);
        Fixture changedApplication = new Fixture(fixture.name(), fixture.sourceTable(), fixture.targetTable(),
                changedJar, fixture.driver(), fixture.mapping(), fixture.columns(), fixture.inventory(),
                fixture.plan(), fixture.review());
        assertChild("changed-application-jar", command(changedApplication, "load", DriverMode.MODULE_PATH,
                "--mode=dry-run", "--ack-adapter=oracle-catalog", "--ack-source-freeze"), 1, Signal.EXECUTION_CONTRACT);
        assertThat(executionArtifacts(fixture)).isEmpty();

        assertChild("missing-adapter-ack", command(fixture, "load", DriverMode.MODULE_PATH,
                "--mode=dry-run", "--ack-source-freeze"), 1, Signal.ADAPTER_ACK_REQUIRED);
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertChild("wrong-adapter-ack", command(fixture, "load", DriverMode.MODULE_PATH,
                "--mode=dry-run", "--ack-adapter=jdbc-baseline", "--ack-source-freeze"), 1, Signal.ADAPTER_ACK_MISMATCH);
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertChild("missing-source-freeze-ack", command(fixture, "load", DriverMode.MODULE_PATH,
                "--mode=dry-run", "--ack-adapter=oracle-catalog"), 1, Signal.SOURCE_FREEZE_REQUIRED);
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertChild("unexpected-isolated-driver-ack", command(fixture, "load", DriverMode.MODULE_PATH,
                "--mode=dry-run", "--ack-adapter=oracle-catalog", "--ack-source-freeze",
                "--ack-source-driver=" + expected.aggregateDigest()), 1, Signal.BUNDLED_DRIVER_ACK);
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertChild("dry-run", command(fixture, "load", DriverMode.MODULE_PATH,
                "--mode=dry-run", "--ack-adapter=oracle-catalog", "--ack-source-freeze"), 0, null);
        List<Path> evidence = executionArtifacts(fixture);
        assertThat(evidence).hasSize(1);
        var execution = json.readValue(Files.readString(evidence.getFirst()), MigrationExecutionArtifact.class);
        assertThat(execution.mode()).isEqualTo("DRY_RUN");
        assertThat(execution.status()).isEqualTo("PASS");
        assertThat(execution.mappingDigest()).isEqualTo(reviewed.mappingDigest());
        assertThat(execution.targetDigest()).isEqualTo(reviewed.targetSchemaDigest());
        assertThat(execution.tables()).singleElement().satisfies(table -> {
            assertThat(table.read()).isEqualTo(ROWS);
            assertThat(table.written()).isZero();
            assertThat(table.errors()).isZero();
            assertThat(table.status()).isEqualTo("PASS");
        });
        // Module-path loading preserves the original driver bytes and reaches the public UNVERIFIED adapter gate.
        assertThat(new OracleSourceAdapter().identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        assertChild("commit-blocked", command(fixture, "load", DriverMode.MODULE_PATH,
                "--mode=commit", "--ack-adapter=oracle-catalog", "--ack-source-freeze"), 1, Signal.UNVERIFIED_COMMIT);
        assertThat(executionArtifacts(fixture)).containsExactlyElementsOf(evidence);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + fixture.targetTable(), Long.class)).isZero();
        assertThat(targetJdbc().queryForObject(
                "SELECT count(*) FROM information_schema.schemata WHERE schema_name='migration_control'", Long.class)).isZero();
        assertThat(sourceJdbc().queryForObject("SELECT count(*) FROM " + fixture.sourceTable(), Long.class)).isEqualTo(ROWS);
        assertSourceLobContents(fixture);
    }

    private Fixture fixture(Path application, Path driver) throws Exception {
        String name = "tb_oracle_packaged_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String sourceTable = sourceOwner() + "." + name.toUpperCase(Locale.ROOT);
        String targetTable = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + sourceTable + " (ID NUMBER(19) PRIMARY KEY, PAYLOAD CLOB, BODY BLOB)");
        targetJdbc().execute("CREATE TABLE " + targetTable + " (id bigint PRIMARY KEY, payload text, body bytea)");
        byte[] binary = binaryFixture();
        try (var connection = sourceJdbc().getDataSource().getConnection();
             var insert = connection.prepareStatement("INSERT INTO " + sourceTable + " VALUES (?, TO_CLOB(?), ?)")) {
            for (int id = 1; id <= ROWS; id++) {
                if (id == 3) continue;
                insert.setLong(1, id);
                insert.setString(2, id == 2 ? null : id == 1 ? CLOB_UNIT : "본문🙂-packaged-" + id);
                if (id == 1) insert.setBinaryStream(3, new ByteArrayInputStream(binary), binary.length);
                else insert.setBytes(3, id == 2 ? null : new byte[]{0, (byte) 0xff, (byte) id});
                insert.addBatch();
            }
            assertThat(insert.executeBatch()).hasSize(ROWS - 1);
        }
        assertThat(sourceJdbc().update("INSERT INTO " + sourceTable + " VALUES (3, EMPTY_CLOB(), EMPTY_BLOB())")).isEqualTo(1);
        for (int step = 0; step < 17; step++) {
            assertThat(sourceJdbc().update("UPDATE " + sourceTable + " SET PAYLOAD=PAYLOAD||PAYLOAD WHERE ID=1")).isEqualTo(1);
        }
        Path mapping = directory.resolve("mapping.yml");
        Files.writeString(mapping, """
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
                  sourceNamespace: packaged-oracle-fixture
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
                      - source: BODY
                        target: body
                """.formatted(name, sourceTable, targetTable));
        Path columns = directory.resolve("db-columns.json");
        json.writeValue(columns.toFile(), targetJdbc().queryForList(
                "SELECT table_schema || '.' || table_name AS table_name, column_name FROM information_schema.columns"
                        + " WHERE table_schema='public' AND table_name=? ORDER BY ordinal_position", name));
        return new Fixture(name, sourceTable, targetTable, application, driver, mapping, columns,
                directory.resolve("inventory.json"), directory.resolve("plan.json"), directory.resolve("review.yml"));
    }

    private static String sourceOwner() {
        return sourceConfig().username().toUpperCase(Locale.ROOT);
    }

    /** Fixture and source stability witness; the packaged dry-run artifact separately proves every row was read. */
    private void assertSourceLobContents(Fixture fixture) throws Exception {
        assertThat(sourceJdbc().queryForObject("SELECT count(*) FROM " + fixture.sourceTable(), Long.class)).isEqualTo(ROWS);
        try (var connection = sourceJdbc().getDataSource().getConnection();
             var query = connection.prepareStatement("SELECT ID, PAYLOAD, BODY FROM " + fixture.sourceTable() + " WHERE ID<=3 ORDER BY ID");
             var rows = query.executeQuery()) {
            assertThat(rows.getMetaData().getColumnType(2)).isEqualTo(Types.CLOB);
            assertThat(rows.getMetaData().getColumnType(3)).isEqualTo(Types.BLOB);
            assertThat(rows.next()).isTrue();
            assertThat(rows.getLong(1)).isEqualTo(1);
            var text = rows.getClob(2);
            try {
                assertThat(text).isNotNull();
                assertThat(text.length()).isEqualTo((long) CLOB_UNIT.length() * CLOB_REPETITIONS);
                assertThat(digestCharacters(text.getCharacterStream()))
                        .isEqualTo(digestCharacters(new StringReader(CLOB_UNIT.repeat(CLOB_REPETITIONS))));
            } finally {
                if (text != null) text.free();
            }
            var binary = rows.getBlob(3);
            try {
                assertThat(binary).isNotNull();
                assertThat(binary.length()).isEqualTo(BLOB_BYTES);
                assertThat(digestBinary(binary.getBinaryStream()))
                        .isEqualTo(digestBinary(new ByteArrayInputStream(binaryFixture())));
            } finally {
                if (binary != null) binary.free();
            }
            assertThat(rows.next()).isTrue();
            assertThat(rows.getLong(1)).isEqualTo(2);
            assertThat(rows.getClob(2)).isNull();
            assertThat(rows.getBlob(3)).isNull();
            assertThat(rows.next()).isTrue();
            assertThat(rows.getLong(1)).isEqualTo(3);
            var emptyText = rows.getClob(2);
            try {
                assertThat(emptyText).isNotNull();
                assertThat(emptyText.length()).isZero();
                assertThat(digestCharacters(emptyText.getCharacterStream()))
                        .isEqualTo(digestCharacters(new StringReader("")));
            } finally {
                if (emptyText != null) emptyText.free();
            }
            var emptyBinary = rows.getBlob(3);
            try {
                assertThat(emptyBinary).isNotNull();
                assertThat(emptyBinary.length()).isZero();
                assertThat(digestBinary(emptyBinary.getBinaryStream()))
                        .isEqualTo(digestBinary(InputStream.nullInputStream()));
            } finally {
                if (emptyBinary != null) emptyBinary.free();
            }
            assertThat(rows.next()).isFalse();
        }
    }

    private static byte[] binaryFixture() {
        byte[] bytes = new byte[BLOB_BYTES];
        for (int index = 0; index < bytes.length; index++) bytes[index] = (byte) (index * 31 + index / 251);
        return bytes;
    }

    private static String digestBinary(InputStream stream) throws Exception {
        var digest = MessageDigest.getInstance("SHA-256");
        try (stream) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) {
                if (count == 0) throw new java.io.IOException("SYNTHETIC_BINARY_READ_STALLED");
                digest.update(buffer, 0, count);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    /** Hashes exact UTF-16 units without replacing supplementary characters across read boundaries. */
    private static String digestCharacters(Reader stream) throws Exception {
        var digest = MessageDigest.getInstance("SHA-256");
        try (stream) {
            char[] characters = new char[8192];
            byte[] buffer = new byte[characters.length * 2];
            int count;
            while ((count = stream.read(characters)) != -1) {
                if (count == 0) throw new java.io.IOException("SYNTHETIC_CHARACTER_READ_STALLED");
                for (int index = 0; index < count; index++) {
                    buffer[index * 2] = (byte) (characters[index] >>> 8);
                    buffer[index * 2 + 1] = (byte) characters[index];
                }
                digest.update(buffer, 0, count * 2);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private ChildResult command(Fixture fixture, String phase, DriverMode driverMode, String... extra) throws Exception {
        String java = Path.of(System.getProperty("java.home"), "bin",
                System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win") ? "java.exe" : "java").toString();
        var arguments = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8"));
        if (driverMode == DriverMode.MODULE_PATH) {
            // Use exactly one unmodified named automatic module, without any directory/wildcard expansion.
            arguments.addAll(List.of("--module-path=" + fixture.driver(), "--add-modules=com.oracle.database.jdbc"));
        }
        arguments.addAll(List.of("-jar", fixture.application().toString(), "--command=" + phase));
        if (!phase.equals("validate")) {
            arguments.addAll(List.of("--mapping=" + fixture.mapping(), "--inventory=" + fixture.inventory(),
                    "--source-adapter=oracle-catalog", "--schemas=" + sourceOwner(),
                    "--object-kinds=TABLE,COLUMN,PRIMARY_KEY"));
        }
        if (!phase.equals("discover")) arguments.add("--plan=" + fixture.plan());
        if (driverMode == DriverMode.ISOLATED) {
            arguments.addAll(List.of("--source-driver-jar=" + fixture.driver(), "--source-driver-class=" + ORACLE_DRIVER));
        }
        arguments.addAll(List.of(extra));
        var launcher = new ProcessBuilder(arguments).directory(directory.toFile()).redirectErrorStream(true);
        var environment = launcher.environment();
        for (String inherited : List.of("CLASSPATH", "JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS")) environment.remove(inherited);
        var source = sourceConfig();
        var target = targetConfig();
        environment.putAll(Map.of("WF_SOURCE_URL", source.url(), "WF_SOURCE_USER", source.username(),
                "WF_SOURCE_PASSWORD", source.password(), "WF_TARGET_URL", target.url(),
                "WF_TARGET_USER", target.username(), "WF_TARGET_PASSWORD", target.password()));
        environment.put("MIGRATION_DB_COLUMNS_PATH", fixture.columns().toString());
        environment.put("SPRING_MAIN_BANNER_MODE", "off");
        environment.put("SPRING_MAIN_LOG_STARTUP_INFO", "false");
        environment.put("LOGGING_LEVEL_ROOT", "ERROR");
        Process child = launcher.start();
        var output = new OutputProbe(child, List.of(source.url(), source.password(), target.url(), target.password()));
        Thread drain = Thread.ofVirtual().start(output);
        boolean completed;
        try {
            completed = child.waitFor(CHILD_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!completed) child.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
        } finally {
            if (child.isAlive()) child.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
            drain.join(TimeUnit.SECONDS.toMillis(15));
        }
        assertThat(drain.isAlive()).as("packaged CLI output drain must terminate").isFalse();
        return new ChildResult(completed ? child.exitValue() : -1, !completed,
                output.readFailed, output.credentialObserved, Set.copyOf(output.signals));
    }

    private static void assertChild(String phase, ChildResult result, int expectedExit, Signal expectedSignal) {
        assertThat(result.timedOut()).as("packaged CLI phase=%s timeout", phase).isFalse();
        assertThat(result.readFailed()).as("packaged CLI phase=%s output drain", phase).isFalse();
        assertThat(result.credentialObserved()).as("packaged CLI phase=%s credential redaction", phase).isFalse();
        assertThat(result.exit()).as("packaged CLI phase=%s safeSignals=%s", phase, result.signals()).isEqualTo(expectedExit);
        if (expectedSignal != null) assertThat(result.signals()).as("packaged CLI phase=%s rejection reason", phase).contains(expectedSignal);
    }

    private List<Path> executionArtifacts(Fixture fixture) throws Exception {
        try (var paths = Files.list(directory)) {
            return paths.filter(path -> path.getFileName().toString().startsWith(fixture.plan().getFileName() + ".load-")).sorted().toList();
        }
    }

    private static Path applicationJar() throws Exception {
        String configured = System.getProperty("migration.drill.jar");
        assertThat(configured).as("Gradle must supply the shipped migration bootJar").isNotBlank();
        Path application = Path.of(configured).toRealPath();
        assertThat(Files.isRegularFile(application)).as("the shipped migration bootJar must exist").isTrue();
        return application;
    }

    private static Path externalDriverJar() throws Exception {
        Path driver = Path.of(Class.forName(ORACLE_DRIVER).getProtectionDomain().getCodeSource().getLocation().toURI()).toRealPath();
        assertThat(Files.isRegularFile(driver)).as("the runtime Oracle JDBC dependency must be a JAR").isTrue();
        return driver;
    }

    private static void assertDeploymentJarExcludesSourceDrivers(Path application) throws Exception {
        try (var archive = new JarFile(application.toFile())) {
            assertThat(archive.getJarEntry("BOOT-INF/classes/nuri/migration/MigrationToolApplication.class")).isNotNull();
            assertThat(archive.stream().map(entry -> entry.getName().toLowerCase(Locale.ROOT)).anyMatch(name ->
                    name.startsWith("boot-inf/lib/mssql-jdbc-") || name.contains("/com/microsoft/sqlserver/")
                            || name.startsWith("boot-inf/lib/mariadb-java-client-") || name.contains("/org/mariadb/jdbc/")
                            || name.startsWith("boot-inf/lib/mysql-connector") || name.contains("/com/mysql/")
                            || name.startsWith("boot-inf/lib/ojdbc") || name.contains("/oracle/jdbc/") || name.startsWith("boot-inf/lib/h2-")))
                    .as("source drivers and test-only H2 must be absent from the shipped executable JAR").isFalse();
        }
    }

    private void addArchiveResource(Path archive, String marker) throws Exception {
        Files.writeString(directory.resolve(marker), "synthetic deployment boundary probe\n");
        try (var quiet = new PrintWriter(OutputStream.nullOutputStream())) {
            assertThat(ToolProvider.findFirst("jar").orElseThrow()
                    .run(quiet, quiet, "--update", "--file", archive.toString(),
                            "-C", directory.toString(), marker))
                    .as("changed JAR fixture remains a valid executable archive").isZero();
        }
    }

    private static String sha256(Path path) throws Exception {
        var digest = MessageDigest.getInstance("SHA-256");
        try (var input = Files.newInputStream(path)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) if (read > 0) digest.update(buffer, 0, read);
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private record Fixture(String name, String sourceTable, String targetTable, Path application, Path driver,
                           Path mapping, Path columns, Path inventory, Path plan, Path review) { }

    private record ChildResult(int exit, boolean timedOut, boolean readFailed, boolean credentialObserved,
                               Set<Signal> signals) { }

    private enum DriverMode { NONE, ISOLATED, MODULE_PATH }

    private enum Signal {
        DISCOVER_FAILURE("discover 실패 — 상세정보는 보안상 제거되었습니다."),
        UNREVIEWED_PLAN("commitReady=false"),
        ADAPTER_ACK_REQUIRED("load에는 선택 adapter와 exact match하는 --ack-adapter 승인이 필요합니다."),
        ADAPTER_ACK_MISMATCH("--ack-adapter는 선택한 adapter ID와 exact match해야 합니다."),
        SOURCE_FREEZE_REQUIRED("load에는 --ack-source-freeze maintenance-window 승인이 필요합니다."),
        BUNDLED_DRIVER_ACK("bundled source driver에는 external driver ack를 사용할 수 없습니다."),
        DRIVER_EVIDENCE("source driver evidence digest 불일치로 중단했습니다."),
        UNVERIFIED_COMMIT("UNVERIFIED source adapter로 commit할 수 없습니다."),
        PLAN_FAILURE("plan 실패 — 상세정보는 보안상 제거되었습니다."),
        IMPLEMENTATION_UNAVAILABLE("migration module implementation bytes are unavailable"),
        EXECUTION_CONTRACT("execution contract digest 불일치로 중단했습니다.");

        private final String token;

        Signal(String token) { this.token = token; }
    }

    /** Drains logs in bounded memory and exposes only fixed signals; raw output never reaches test reports. */
    private static final class OutputProbe implements Runnable {
        private final Process child;
        private final List<String> credentials;
        private final EnumSet<Signal> signals = EnumSet.noneOf(Signal.class);
        private boolean readFailed;
        private boolean credentialObserved;

        private OutputProbe(Process child, List<String> credentials) {
            this.child = child;
            this.credentials = credentials;
        }

        @Override
        public void run() {
            try (var reader = new InputStreamReader(child.getInputStream(), StandardCharsets.UTF_8)) {
                char[] buffer = new char[8192];
                String tail = "";
                int read;
                while ((read = reader.read(buffer)) != -1) {
                    String chunk = tail + new String(buffer, 0, read);
                    for (Signal signal : Signal.values()) if (chunk.contains(signal.token)) signals.add(signal);
                    for (String credential : credentials) if (credential != null && !credential.isEmpty() && chunk.contains(credential)) credentialObserved = true;
                    tail = chunk.substring(Math.max(0, chunk.length() - 2048));
                }
            } catch (Exception failure) {
                readFailed = true;
            }
        }
    }
}
