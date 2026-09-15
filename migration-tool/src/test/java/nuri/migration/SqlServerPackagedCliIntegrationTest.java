package nuri.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SqlServerSourceAdapter;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.MigrationExecutionArtifact;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.artifact.SourceDriverEvidence;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.plan.DispositionDecision;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.ObjectDisposition;
import nuri.migration.workflow.WorkflowReview;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
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
import java.util.jar.JarFile;
import java.util.spi.ToolProvider;

import static org.assertj.core.api.Assertions.assertThat;

/** Exercises the shipped bootJar and isolated external JDBC boundary without granting COMMIT qualification. */
class SqlServerPackagedCliIntegrationTest extends SqlServerPostgresTestSupport {
    private static final String SQLSERVER_DRIVER = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
    private static final int ROWS = 501;
    private static final int CHILD_TIMEOUT_SECONDS = 180;

    @TempDir
    Path directory;

    private final ObjectMapper json = new ObjectMapper();
    private final CatalogSnapshotArtifactCodec inventories = new CatalogSnapshotArtifactCodec();
    private final MigrationPlanArtifactCodec plans = new MigrationPlanArtifactCodec();

    @Test
    void shippedJarDiscoversReviewsValidatesAndDryRunsWithExternalDriverButCannotCommit() throws Exception {
        Path application = applicationJar();
        Path driver = externalDriverJar();
        assertDeploymentJarExcludesSourceDrivers(application);
        Fixture fixture = fixture(application, driver);
        SqlServerPostgresTestSupport.freezeSourceDatabase();

        assertChild("missing-source-driver", command(fixture, "discover", false), 1, Signal.DISCOVER_FAILURE);
        assertThat(Files.exists(fixture.inventory())).as("missing driver must not produce an inventory").isFalse();
        assertChild("discover", command(fixture, "discover", true), 0, null);
        var inventory = inventories.readEnvelope(Files.readString(fixture.inventory()));
        var snapshot = inventory.payload().toSnapshot();
        assertThat(snapshot.database().productName()).isEqualTo("Microsoft SQL Server");
        assertThat(snapshot.database().productVersion()).isEqualTo("16.00.4295");
        assertThat(snapshot.database().driverName()).isEqualTo("Microsoft JDBC Driver 13.6 for SQL Server");
        assertThat(snapshot.database().driverVersion()).isEqualTo("13.6.0.0");
        assertThat(snapshot.environment().defaultCatalog()).isEqualTo(SOURCE_DATABASE);
        assertThat(snapshot.environment().defaultSchema()).isEqualTo("dbo");
        assertThat(snapshot.visibilityFindings()).isEmpty();
        assertThat(snapshot.objects()).anyMatch(object -> object.kind() == ObjectKind.TABLE && object.name().equals(fixture.name()));
        SourceDriverEvidence expected = SourceDriverEvidence.isolated(SQLSERVER_DRIVER, List.of(sha256(driver)));
        assertThat(inventory.sourceDriverEvidence()).isEqualTo(expected);
        assertThat(inventory.sourceDriverEvidence().loadingMode()).isEqualTo(SourceDriverEvidence.LoadingMode.ISOLATED);
        assertThat(inventory.sourceDriverEvidence().jarCount()).isEqualTo(1);

        assertChild("draft-plan", command(fixture, "plan", false), 0, null);
        MigrationPlan draft = plans.read(Files.readString(fixture.plan()));
        assertThat(draft.sourceProduct()).isEqualTo(
                snapshot.database().productName() + " " + snapshot.database().productVersion());
        assertThat(draft.commitReady()).isFalse();
        assertChild("unreviewed-validate", command(fixture, "validate", false), 1, Signal.UNREVIEWED_PLAN);
        Map<String, DispositionDecision> decisions = new LinkedHashMap<>();
        for (var object : snapshot.objects()) {
            boolean mapped = object.kind() == ObjectKind.TABLE && object.name().equals(fixture.name());
            decisions.put(object.stableId(), new DispositionDecision(
                    mapped ? ObjectDisposition.AUTO_DATA_LOAD : ObjectDisposition.EXPORT_ONLY,
                    mapped ? fixture.targetTable() : null, true,
                    "Disposable packaged CLI boundary review"));
        }
        new YAMLMapper().writeValue(fixture.review().toFile(), new WorkflowReview(
                WorkflowReview.CURRENT_SCHEMA_VERSION, draft.sourceInventoryDigest(), draft.targetSchemaDigest(),
                draft.mappingDigest(), draft.executionContractDigest(), decisions));
        assertChild("reviewed-plan", command(fixture, "plan", false, "--review=" + fixture.review()), 0, null);
        MigrationPlan reviewed = plans.read(Files.readString(fixture.plan()));
        assertThat(reviewed.commitReady()).isTrue();
        assertThat(reviewed.readiness().blockers()).isEmpty();
        assertChild("validate", command(fixture, "validate", false), 0, null);

        Path changedDriver = directory.resolve("changed-sqlserver-driver.jar");
        Files.copy(driver, changedDriver);
        addArchiveResource(changedDriver, "driver-boundary-probe.txt");
        assertThat(sha256(changedDriver)).isNotEqualTo(sha256(driver));
        Fixture changedDriverFixture = new Fixture(fixture.name(), fixture.sourceTable(), fixture.targetTable(),
                fixture.application(), changedDriver, fixture.mapping(), fixture.columns(), fixture.inventory(),
                fixture.plan(), fixture.review());
        assertChild("changed-source-driver", command(changedDriverFixture, "load", true,
                "--mode=dry-run", "--ack-adapter=sqlserver-catalog", "--ack-source-freeze",
                "--ack-source-driver=" + expected.aggregateDigest()), 1, Signal.DRIVER_EVIDENCE);
        assertThat(executionArtifacts(fixture)).isEmpty();

        Path changedJar = directory.resolve("changed-migration.jar");
        Files.copy(application, changedJar);
        // Add a harmless resource with the JDK archive tool; keep the application and libraries executable.
        addArchiveResource(changedJar, "deployment-boundary-probe.txt");
        assertDeploymentJarExcludesSourceDrivers(changedJar);
        Fixture changedApplication = new Fixture(fixture.name(), fixture.sourceTable(), fixture.targetTable(),
                changedJar, fixture.driver(), fixture.mapping(), fixture.columns(), fixture.inventory(),
                fixture.plan(), fixture.review());
        assertChild("changed-application-jar", command(changedApplication, "load", true,
                "--mode=dry-run", "--ack-adapter=sqlserver-catalog", "--ack-source-freeze",
                "--ack-source-driver=" + expected.aggregateDigest()), 1, Signal.EXECUTION_CONTRACT);
        assertThat(executionArtifacts(fixture)).isEmpty();

        assertChild("missing-driver-ack", command(fixture, "load", true,
                "--mode=dry-run", "--ack-adapter=sqlserver-catalog", "--ack-source-freeze"), 1, Signal.DRIVER_ACK);
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertChild("wrong-driver-ack", command(fixture, "load", true,
                "--mode=dry-run", "--ack-adapter=sqlserver-catalog", "--ack-source-freeze",
                "--ack-source-driver=" + "0".repeat(64)), 1, Signal.DRIVER_ACK);
        assertThat(executionArtifacts(fixture)).isEmpty();
        assertChild("dry-run", command(fixture, "load", true,
                "--mode=dry-run", "--ack-adapter=sqlserver-catalog", "--ack-source-freeze",
                "--ack-source-driver=" + expected.aggregateDigest()), 0, null);
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
        // External driver approval is checked before adapter qualification in the packaged workflow.
        // The ordinary SQL Server workflow test separately proves the UNVERIFIED adapter prohibition.
        assertThat(new SqlServerSourceAdapter().identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        assertChild("commit-blocked", command(fixture, "load", true,
                "--mode=commit", "--ack-adapter=sqlserver-catalog", "--ack-source-freeze",
                "--ack-source-driver=" + expected.aggregateDigest()), 1, Signal.ISOLATED_COMMIT);
        assertThat(executionArtifacts(fixture)).containsExactlyElementsOf(evidence);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + fixture.targetTable(), Long.class)).isZero();
        assertThat(targetJdbc().queryForObject(
                "SELECT count(*) FROM information_schema.schemata WHERE schema_name='migration_control'", Long.class)).isZero();
        assertThat(sourceJdbc().queryForObject("SELECT count(*) FROM " + fixture.sourceTable(), Long.class)).isEqualTo(ROWS);
    }

    private Fixture fixture(Path application, Path driver) throws Exception {
        String name = "tb_sqlserver_packaged_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String sourceTable = "dbo." + name;
        String targetTable = "public." + name;
        sourceJdbc().execute("CREATE TABLE " + sourceTable + " (id bigint PRIMARY KEY, payload nvarchar(max), body varbinary(max))");
        targetJdbc().execute("CREATE TABLE " + targetTable + " (id bigint PRIMARY KEY, payload text, body bytea)");
        try (var connection = sourceConnection();
             var insert = connection.prepareStatement("INSERT INTO " + sourceTable + " VALUES (?, ?, ?)")) {
            for (int id = 1; id <= ROWS; id++) {
                insert.setLong(1, id);
                insert.setNString(2, id == 2 ? null : id == 3 ? "" : "본문🙂-packaged-" + id);
                insert.setBytes(3, id == 2 ? null : id == 3 ? new byte[0] : new byte[]{0, (byte) 0xff, (byte) id});
                insert.addBatch();
            }
            assertThat(insert.executeBatch()).hasSize(ROWS);
        }
        Path mapping = directory.resolve("mapping.yml");
        Files.writeString(mapping, """
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
                  sourceNamespace: packaged-sqlserver-fixture
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
                      - source: body
                        target: body
                """.formatted(name, sourceTable, targetTable));
        Path columns = directory.resolve("db-columns.json");
        json.writeValue(columns.toFile(), targetJdbc().queryForList(
                "SELECT table_schema || '.' || table_name AS table_name, column_name FROM information_schema.columns"
                        + " WHERE table_schema='public' AND table_name=? ORDER BY ordinal_position", name));
        return new Fixture(name, sourceTable, targetTable, application, driver, mapping, columns,
                directory.resolve("inventory.json"), directory.resolve("plan.json"), directory.resolve("review.yml"));
    }

    private ChildResult command(Fixture fixture, String phase, boolean externalDriver, String... extra) throws Exception {
        String java = Path.of(System.getProperty("java.home"), "bin",
                System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win") ? "java.exe" : "java").toString();
        var arguments = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-jar", fixture.application().toString(),
                "--command=" + phase));
        if (!phase.equals("validate")) {
            arguments.addAll(List.of("--mapping=" + fixture.mapping(), "--inventory=" + fixture.inventory(),
                    "--source-adapter=sqlserver-catalog", "--schemas=dbo",
                    "--object-kinds=TABLE,COLUMN,PRIMARY_KEY"));
        }
        if (!phase.equals("discover")) arguments.add("--plan=" + fixture.plan());
        if (externalDriver) arguments.addAll(List.of("--source-driver-jar=" + fixture.driver(), "--source-driver-class=" + SQLSERVER_DRIVER));
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
        Path driver = Path.of(Class.forName(SQLSERVER_DRIVER).getProtectionDomain().getCodeSource().getLocation().toURI()).toRealPath();
        assertThat(Files.isRegularFile(driver)).as("the runtime SQL Server JDBC dependency must be a JAR").isTrue();
        return driver;
    }

    private static void assertDeploymentJarExcludesSourceDrivers(Path application) throws Exception {
        try (var archive = new JarFile(application.toFile())) {
            assertThat(archive.getJarEntry("BOOT-INF/classes/nuri/migration/MigrationToolApplication.class")).isNotNull();
            assertThat(archive.stream().map(entry -> entry.getName().toLowerCase(Locale.ROOT)).anyMatch(name ->
                    name.startsWith("boot-inf/lib/mssql-jdbc-") || name.contains("/com/microsoft/sqlserver/")
                            || name.startsWith("boot-inf/lib/mariadb-java-client-") || name.contains("/org/mariadb/jdbc/")
                            || name.startsWith("boot-inf/lib/mysql-connector") || name.contains("/com/mysql/")
                            || name.startsWith("boot-inf/lib/ojdbc") || name.startsWith("boot-inf/lib/h2-")))
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

    private enum Signal {
        DISCOVER_FAILURE("discover 실패 — 상세정보는 보안상 제거되었습니다."),
        UNREVIEWED_PLAN("commitReady=false"),
        DRIVER_ACK("isolated source driver load에는 exact evidence digest ack가 필요합니다."),
        DRIVER_EVIDENCE("source driver evidence digest 불일치로 중단했습니다."),
        ISOLATED_COMMIT("isolated in-process source driver로 commit할 수 없습니다."),
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
