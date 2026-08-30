package nuri.migration.jdbc;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import java.util.jar.Manifest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StagedDriverJarsTest {

    @TempDir
    Path temp;

    @Test
    void digestMismatchRemovesCopiedBytesAndTemporaryDirectory() throws Exception {
        Path source = jar(temp.resolve("source.jar"));
        ValidatedDriverJar forged = new ValidatedDriverJar(source, "0".repeat(64));

        assertThatThrownBy(() -> StagedDriverJars.stage(List.of(forged), temp))
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause();

        try (var children = Files.list(temp)) {
            assertThat(children.map(Path::getFileName).toList())
                    .containsExactly(source.getFileName());
        }
    }

    @Test
    void closeAttemptsKnownJarCleanupEvenWhenDirectoryRemovalFails() throws Exception {
        Path source = jar(temp.resolve("source.jar"));
        ValidatedDriverJar validated = new ValidatedDriverJar(
                source, DriverJarDigests.sha256(source));
        StagedDriverJars staged = StagedDriverJars.stage(List.of(validated), temp);
        Path unexpected = Files.createDirectory(staged.directory().resolve("unexpected"));

        assertThatThrownBy(staged::close)
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause();
        assertThat(staged.jars()).allMatch(path -> Files.notExists(path));

        Files.delete(unexpected);
        Files.delete(staged.directory());
    }

    @Test
    void stagedBytesAreRevalidatedSoForgedPrevalidationCannotInjectManifestClasspath()
            throws Exception {
        Path source = temp.resolve("forged.jar");
        Manifest manifest = new Manifest();
        manifest.getMainAttributes().putValue("Manifest-Version", "1.0");
        manifest.getMainAttributes().putValue("Class-Path", "https://sentinel-host/remote.jar");
        try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(source), manifest)) {
            output.putNextEntry(new JarEntry("marker.txt"));
            output.write("driver".getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
        }
        ValidatedDriverJar forged = new ValidatedDriverJar(
                source, DriverJarDigests.sha256(source));

        assertThatThrownBy(() -> StagedDriverJars.stage(List.of(forged), temp))
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining("sentinel-host");
        try (var children = Files.list(temp)) {
            assertThat(children.map(Path::getFileName).toList())
                    .containsExactly(source.getFileName());
        }
    }

    private static Path jar(Path path) throws Exception {
        try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(path))) {
            output.putNextEntry(new JarEntry("marker.txt"));
            output.write("driver".getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
        }
        return path;
    }
}
