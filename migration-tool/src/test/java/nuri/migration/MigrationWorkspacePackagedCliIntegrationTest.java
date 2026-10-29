package nuri.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.spi.ToolProvider;

import static org.assertj.core.api.Assertions.assertThat;

/** Actual Node workspace -> shipped CLI -> private PostgreSQL DRY_RUN; never COMMIT or a shared database. */
@Testcontainers
class MigrationWorkspacePackagedCliIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
            // Catalog names are exported; the login identifier must not coincide with one.
            .withDatabaseName("workspace_fixture").withUsername("d03_operator")
            .withPassword("d03-" + UUID.randomUUID());
    @TempDir Path directory;
    private final ObjectMapper json = new ObjectMapper();

    @Test void actualWorkspaceDiscoversReviewsDryRunsAndRejectsChangedInputs() throws Exception {
        // Both the ordinary subproject and the generated single-module migrationTest run in migration-tool/.
        Path module = Path.of("").toRealPath();
        assertThat(module.getFileName().toString()).isEqualTo("migration-tool");
        Path root = module.getParent();
        Path application = Path.of(System.getProperty("migration.drill.jar")).toRealPath();
        for (String input : List.of("tools/migration-workspace/engine.mjs",
                "tools/migration-workspace/store.mjs", "tools/migration-workspace/inputs.mjs")) {
            assertThat(Files.isRegularFile(root.resolve(input)))
                    .as("the actual workspace engine dependency must be exported").isTrue();
        }
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        jdbc.execute("CREATE SCHEMA d03_source");
        jdbc.execute("CREATE SCHEMA d03_target");
        jdbc.execute("CREATE TABLE d03_source.tb_workspace (id bigint PRIMARY KEY, payload text)");
        jdbc.execute("CREATE TABLE d03_target.tb_workspace (id bigint PRIMARY KEY, payload text)");
        StandardMetaFixture.create(jdbc, "d03_target");
        try (var connection = POSTGRES.createConnection("");
             var insert = connection.prepareStatement("INSERT INTO d03_source.tb_workspace VALUES (?, ?)")) {
            String[] values = {"ordinary", null, "", "합성 본문🙂"};
            for (int index = 0; index < values.length; index++) {
                insert.setLong(1, index + 1);
                insert.setString(2, values[index]);
                insert.addBatch();
            }
            assertThat(insert.executeBatch()).hasSize(4);
        }
        var sourceBefore = jdbc.queryForList("SELECT id,payload FROM d03_source.tb_workspace ORDER BY id");
        prepareInputs(jdbc);
        prepareReviewedGit();
        Path changedJar = changedJar(application);
        Path nodeScript = directory.resolve("packaged-cli-drill.mjs");
        try (var input = getClass().getResourceAsStream("/workspace/packaged-cli-drill.mjs")) {
            assertThat(input).as("the Node fixture must be included in the test resources").isNotNull();
            Files.copy(input, nodeScript);
        }
        String java = Path.of(System.getProperty("java.home"), "bin", windows() ? "java.exe" : "java").toString();
        var environment = new HashMap<String, String>();
        environment.put("D03_PRODUCT_ROOT", root.toString());
        environment.put("D03_DIRECTORY", directory.toRealPath().toString());
        environment.put("D03_JAVA", java);
        environment.put("D03_JAR", application.toString());
        environment.put("D03_TAMPERED_JAR", changedJar.toString());
        environment.put("D03_HOST", POSTGRES.getHost());
        environment.put("D03_PORT", POSTGRES.getMappedPort(5432).toString());
        environment.put("D03_DATABASE", POSTGRES.getDatabaseName());
        environment.put("D03_USER", POSTGRES.getUsername());
        environment.put("D03_PASSWORD", POSTGRES.getPassword());
        ChildResult result = child(List.of("node", nodeScript.toString()),
                directory, environment, 600);
        assertChild(result, "workspace");
        assertThat(result.passed()).as("Node must reach the verified final stage").isTrue();
        assertThat(result.reportedPids()).as("public engine state must identify actual CLI children").hasSize(9);
        assertThat(result.observedPids()).containsAll(result.reportedPids());
        assertThat(jdbc.queryForList("SELECT id,payload FROM d03_source.tb_workspace ORDER BY id"))
                .isEqualTo(sourceBefore);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM d03_target.tb_workspace", Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.schemata "
                + "WHERE schema_name='migration_control'", Long.class)).isZero();
        // Only this class's container is stopped by @Testcontainers; no external DB or shared container is addressed.
    }

    private void prepareInputs(JdbcTemplate jdbc) throws Exception {
        Path reviewed = Files.createDirectory(directory.resolve("reviewed"));
        String yamlLedger = LedgerFixtures.nonStandard(List.of(
                LedgerFixtures.row("d03_source.tb_workspace", "id", "d03_target.tb_workspace", "id", null, "long"),
                LedgerFixtures.row("d03_source.tb_workspace", "payload", "d03_target.tb_workspace", "payload")));
        json.writeValue(reviewed.resolve("ledger.json").toFile(), new YAMLMapper().readTree(yamlLedger));
        json.writeValue(directory.resolve("skeleton.json").toFile(), Map.of(
                "run", Map.of("runId", "d03_workspace_fixture", "sourceNamespace", "d03_source"),
                "tables", List.of(Map.of("source", "d03_source.tb_workspace", "target", "d03_target.tb_workspace",
                        "orderBy", "id", "targetKey", "id")), "codemaps", Map.of()));
        json.writeValue(directory.resolve("columns.json").toFile(), jdbc.queryForList(
                "SELECT table_schema || '.' || table_name AS table_name,column_name FROM information_schema.columns "
                        + "WHERE table_schema='d03_target' AND table_name='tb_workspace' ORDER BY ordinal_position"));
    }

    private void prepareReviewedGit() throws Exception {
        String nullPath = windows() ? "NUL" : "/dev/null";
        var prefix = List.of("git",
                "-c", "core.hooksPath=" + nullPath, "-c", "core.autocrlf=false",
                "-c", "core.fsmonitor=false", "-c", "commit.gpgSign=false",
                "-c", "user.name=Disposable fixture", "-c", "user.email=fixture@example.invalid");
        Map<String, String> environment = Map.of("GIT_CONFIG_NOSYSTEM", "1", "GIT_CONFIG_GLOBAL", nullPath,
                "GIT_CONFIG_SYSTEM", nullPath, "GIT_CONFIG_COUNT", "0", "GIT_TERMINAL_PROMPT", "0");
        for (List<String> arguments : List.of(List.of("init", "--quiet"), List.of("add", "--", "ledger.json"),
                List.of("commit", "--quiet", "-m", "Synthetic fixture ledger only"))) {
            var command = new ArrayList<>(prefix);
            command.addAll(arguments);
            assertChild(child(command, directory.resolve("reviewed"), environment, 30), "fixture-git");
        }
        // Engine import additionally checks HEAD commit, blob, index mode and exact tracked file bytes.
    }

    private Path changedJar(Path application) throws Exception {
        Path copy = directory.resolve("changed-migration.jar");
        Files.copy(application, copy);
        String marker = "d03-harmless-resource.txt";
        Files.writeString(directory.resolve(marker), "Disposable integration fixture\n");
        try (var quiet = new PrintWriter(OutputStream.nullOutputStream())) {
            assertThat(ToolProvider.findFirst("jar").orElseThrow().run(quiet, quiet,
                    "--update", "--file", copy.toString(), "-C", directory.toString(), marker)).isZero();
        }
        return copy;
    }

    private ChildResult child(List<String> command, Path workingDirectory, Map<String, String> supplied, int timeoutSeconds)
            throws Exception {
        var launcher = new ProcessBuilder(command).directory(workingDirectory.toFile()).redirectErrorStream(true);
        launcher.environment().keySet().removeIf(key -> {
            String upper = key.toUpperCase(Locale.ROOT);
            return upper.startsWith("GIT_") || upper.startsWith("NODE_") || upper.equals("CLASSPATH")
                    || Set.of("JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS").contains(upper);
        });
        launcher.environment().putAll(supplied);
        Process child = launcher.start();
        Map<Long, OwnedProcess> owned = new ConcurrentHashMap<>();
        Probe probe = new Probe(child, owned, List.of(POSTGRES.getPassword(), POSTGRES.getJdbcUrl()));
        Thread drain = Thread.ofVirtual().start(probe);
        boolean completed = false;
        boolean cleanupProven;
        try {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds);
            do {
                child.descendants().forEach(handle -> remember(owned, handle));
                completed = child.waitFor(50, TimeUnit.MILLISECONDS);
            } while (!completed && !probe.cleanupRequired && System.nanoTime() < deadline);
        } finally {
            // Capture while the parent identity is still known. Never enumerate unrelated machine processes.
            child.descendants().forEach(handle -> remember(owned, handle));
            for (OwnedProcess process : owned.values()) process.destroyIfStillOwned();
            if (child.isAlive()) child.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
            while (owned.values().stream().anyMatch(OwnedProcess::sameLiveProcess) && System.nanoTime() < deadline)
                Thread.sleep(25);
            cleanupProven = owned.values().stream().noneMatch(process -> process.identityUnknown() || process.sameLiveProcess());
            drain.join(TimeUnit.SECONDS.toMillis(15));
        }
        return new ChildResult(completed ? child.exitValue() : -1, completed, cleanupProven, !drain.isAlive(),
                probe.readFailed, probe.secretObserved, probe.cleanupRequired, probe.passed, probe.failureCode,
                Set.copyOf(probe.reportedPids), Set.copyOf(owned.keySet()));
    }

    private static void remember(Map<Long, OwnedProcess> owned, ProcessHandle handle) {
        owned.putIfAbsent(handle.pid(), new OwnedProcess(handle, handle.info().startInstant().orElse(null)));
    }

    private static void assertChild(ChildResult result, String phase) {
        assertThat(result.completed()).as("phase=%s completed before deadline", phase).isTrue();
        assertThat(result.cleanupProven()).as("phase=%s owned child termination was verified", phase).isTrue();
        assertThat(result.drainEnded()).as("phase=%s bounded output reader terminated", phase).isTrue();
        assertThat(result.readFailed()).as("phase=%s child output readable", phase).isFalse();
        assertThat(result.secretObserved()).as("phase=%s no credentials in child output", phase).isFalse();
        assertThat(result.cleanupRequired()).as("phase=%s no unfinished engine operation", phase).isFalse();
        assertThat(result.exit()).as("phase=%s safeFailure=%s", phase, result.failureCode()).isZero();
    }

    private record ChildResult(int exit, boolean completed, boolean cleanupProven, boolean drainEnded,
                               boolean readFailed, boolean secretObserved, boolean cleanupRequired, boolean passed,
                               String failureCode, Set<Long> reportedPids, Set<Long> observedPids) {}

    private record OwnedProcess(ProcessHandle handle, Instant startedAt) {
        boolean identityUnknown() { return handle.isAlive() && (startedAt == null || handle.info().startInstant().isEmpty()); }
        boolean sameLiveProcess() {
            return startedAt != null && handle.isAlive() && handle.info().startInstant().filter(startedAt::equals).isPresent();
        }
        void destroyIfStillOwned() { if (sameLiveProcess()) handle.destroyForcibly(); }
    }

    private static final class Probe implements Runnable {
        private static final Pattern CHILD_PID = Pattern.compile("D03_CHILD_PID=(\\d+)\\n");
        private static final Pattern FAILURE = Pattern.compile("D03_FAILURE=([a-z-]+:[A-Z0-9_]+)\\n");
        private final Process child;
        private final Map<Long, OwnedProcess> owned;
        private final List<String> secrets;
        private final Set<Long> reportedPids = ConcurrentHashMap.newKeySet();
        private volatile boolean readFailed, secretObserved, cleanupRequired, passed;
        private volatile String failureCode;
        Probe(Process child, Map<Long, OwnedProcess> owned, List<String> secrets) {
            this.child = child; this.owned = owned; this.secrets = secrets;
        }
        @Override public void run() {
            try (var reader = new InputStreamReader(child.getInputStream(), StandardCharsets.UTF_8)) {
                char[] buffer = new char[4096];
                String tail = "";
                int count;
                while ((count = reader.read(buffer)) != -1) {
                    String text = tail + new String(buffer, 0, count);
                    for (String secret : secrets) if (secret != null && !secret.isEmpty() && text.contains(secret)) secretObserved = true;
                    passed |= text.contains("D03_PASS\n");
                    cleanupRequired |= text.contains("D03_CLEANUP_REQUIRED\n");
                    var failure = FAILURE.matcher(text);
                    if (failure.find()) failureCode = failure.group(1);
                    var pid = CHILD_PID.matcher(text);
                    while (pid.find()) {
                        long id = Long.parseLong(pid.group(1));
                        reportedPids.add(id);
                        ProcessHandle.of(id).filter(handle -> handle.parent().filter(parent -> parent.pid() == child.pid()).isPresent())
                                .ifPresent(handle -> remember(owned, handle));
                    }
                    tail = text.substring(Math.max(0, text.length() - 2048));
                }
            } catch (Exception failure) { readFailed = true; }
        }
    }

    private static boolean windows() { return System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win"); }
}
