package nuri.migration.state;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.ConnectionCallback;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

class MigrationScratchIndexTest {
    @TempDir Path temp;

    @Test
    void cleanupResidueDoesNotDiscardASuccessfulResultOrDeleteUnexpectedFiles() throws Exception {
        var index = new MigrationScratchIndex("CREATE TABLE scratch (id INTEGER)");
        Path database = index.access(jdbc -> jdbc.execute((ConnectionCallback<Path>) connection -> Path.of(
                connection.getMetaData().getURL().substring("jdbc:h2:file:".length()).split(";", 2)[0] + ".mv.db")));
        Path directory = database.getParent().toRealPath();
        Path unexpected = directory.resolve("owned-test-sentinel");
        Files.writeString(unexpected, "synthetic sentinel");
        try {
            Integer result = index.access(jdbc -> jdbc.queryForObject("SELECT 1", Integer.class));
            assertThat(result).isEqualTo(1);
            assertThatCode(index::close).doesNotThrowAnyException();
            assertThat(Files.readString(unexpected)).isEqualTo("synthetic sentinel");
        } finally {
            try { index.close(); } catch (IllegalStateException ignored) { /* pre-fix RED still releases the DB lock */ }
            assertThat(directory.toRealPath()).isEqualTo(directory);
            Files.deleteIfExists(unexpected);
            Files.deleteIfExists(database);
            Files.deleteIfExists(directory.resolve("index.trace.db"));
            Files.deleteIfExists(directory.resolve("index.lock.db"));
            Files.delete(directory);
        }
    }

    @Test
    void tempDirectoryAliasesResolveToTheirOwnedCanonicalDirectory() throws Exception {
        Path target = Files.createDirectory(temp.resolve("real-temp"));
        Path alias = temp.resolve("alias-temp");
        boolean windows = System.getProperty("os.name").startsWith("Windows");
        if (windows) {
            Process junction = new ProcessBuilder("cmd.exe", "/c", "mklink", "/J", alias.toString(), target.toString())
                    .redirectErrorStream(true).redirectOutput(temp.resolve("junction.log").toFile()).start();
            assertThat(junction.waitFor(10, TimeUnit.SECONDS)).isTrue();
            assertThat(junction.exitValue()).isZero();
        } else Files.createSymbolicLink(alias, target);
        try {
            Path arguments = temp.resolve("alias.args");
            Path log = temp.resolve("alias.log");
            String classpath = System.getProperty("migration.drill.classpath");
            assertThat(classpath).isNotBlank();
            Files.writeString(arguments, "-cp\n\"" + classpath.replace('\\', '/') + "\"\n" + AliasWorker.class.getName() + "\n");
            Process worker = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", windows ? "java.exe" : "java").toString(),
                    "-Djava.io.tmpdir=" + alias, "@" + arguments).redirectErrorStream(true).redirectOutput(log.toFile()).start();
            try {
                assertThat(worker.waitFor(30, TimeUnit.SECONDS)).isTrue();
                assertThat(worker.exitValue()).withFailMessage("Alias worker failed: %s", Files.readString(log)).isZero();
            } finally { if (worker.isAlive()) worker.destroyForcibly().waitFor(10, TimeUnit.SECONDS); }
            try (var remaining = Files.list(target)) { assertThat(remaining.toList()).isEmpty(); }
        } finally {
            assertThat(alias.toRealPath()).isEqualTo(target.toRealPath());
            Files.delete(alias);
        }
    }

    public static final class AliasWorker {
        public static void main(String[] ignored) {
            try (var index = new MigrationScratchIndex("CREATE TABLE scratch (id INTEGER)")) {
                if (index.access(jdbc -> jdbc.queryForObject("SELECT 1", Integer.class)) != 1) throw new AssertionError();
            }
        }
    }

    @Test
    void indexIsEncryptedPrivateDisposableAndDoesNotExposeSqlValues() throws Exception {
        Path database;
        var index = new MigrationScratchIndex("CREATE TABLE scratch (source_key VARCHAR PRIMARY KEY)");
        try (index) {
            database = index.access(jdbc -> jdbc.execute((ConnectionCallback<Path>) connection -> {
                String url = connection.getMetaData().getURL();
                assertThat(url).startsWith("jdbc:h2:file:");
                return Path.of(url.substring("jdbc:h2:file:".length()).split(";", 2)[0] + ".mv.db");
            }));
            var acl = Files.getFileAttributeView(database.getParent(), AclFileAttributeView.class);
            if (acl != null) {
                var owner = acl.getOwner();
                assertThat(acl.getAcl().stream().filter(entry -> entry.type() == AclEntryType.ALLOW)
                        .allMatch(entry -> entry.principal().equals(owner))).isTrue();
            } else {
                assertThat(Files.getPosixFilePermissions(database.getParent()))
                        .isEqualTo(PosixFilePermissions.fromString("rwx------"));
            }
            String value = "synthetic-private-source-key";
            index.access(jdbc -> jdbc.update("INSERT INTO scratch VALUES (?)", value));
            assertThatThrownBy(() -> index.access(jdbc -> jdbc.update("INSERT INTO scratch VALUES (?)", value)))
                    .hasMessage("migration scratch index operation failed").hasNoCause();
            // Release H2's file lock before inspecting its encrypted header on Windows.
            index.access(jdbc -> { jdbc.execute("SHUTDOWN"); return null; });
            try (var file = Files.newInputStream(database)) {
                assertThat(new String(file.readNBytes(10), StandardCharsets.US_ASCII)).isEqualTo("H2encrypt\n");
            }
        }
        assertThat(Files.exists(database.getParent())).isFalse();
        assertThatThrownBy(() -> index.access(jdbc -> jdbc.queryForObject("SELECT 1", Integer.class)))
                .hasMessage("migration scratch index is closed");
        index.close();
    }
}
