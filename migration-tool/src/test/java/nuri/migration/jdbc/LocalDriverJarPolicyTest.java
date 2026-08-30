package nuri.migration.jdbc;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import java.util.jar.Manifest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalDriverJarPolicyTest {

    @TempDir
    Path temp;

    private final LocalDriverJarPolicy policy = new LocalDriverJarPolicy();

    @Test
    void filesystemPolicyIsFailClosedForRemoteDistributedAndUnknownTypes() {
        assertThat(LocalDriverJarPolicy.isKnownLocalFileSystem("NTFS")).isTrue();
        assertThat(LocalDriverJarPolicy.isKnownLocalFileSystem("ext4")).isTrue();
        assertThat(LocalDriverJarPolicy.isKnownLocalFileSystem("apfs")).isTrue();
        assertThat(LocalDriverJarPolicy.isKnownLocalFileSystem("nfs")).isFalse();
        assertThat(LocalDriverJarPolicy.isKnownLocalFileSystem("fuse.sshfs")).isFalse();
        assertThat(LocalDriverJarPolicy.isKnownLocalFileSystem("ceph")).isFalse();
        assertThat(LocalDriverJarPolicy.isKnownLocalFileSystem("unknown-fs")).isFalse();
        assertThat(LocalDriverJarPolicy.isKnownLocalFileSystem(null)).isFalse();
    }

    @Test
    void acceptsOnlyAbsoluteLocalRegularJarAndComputesContentEvidence() throws Exception {
        Path jar = validJar(temp.resolve("driver.jar"), "first");

        List<ValidatedDriverJar> validated = policy.validate(List.of(jar));

        assertThat(validated).singleElement().satisfies(item -> {
            assertThat(item.path()).isEqualTo(jar.toRealPath());
            assertThat(item.sha256()).matches("[0-9a-f]{64}");
        });
    }

    @Test
    void rejectsRelativeUriUncGlobNonJarDirectoryMissingAndMalformedInputsWithoutPathLeak() throws Exception {
        Path secret = temp.resolve("sentinel-private-driver.jar");
        Files.writeString(secret, "not-a-jar", StandardCharsets.UTF_8);
        Path directory = Files.createDirectory(temp.resolve("directory.jar"));

        assertRejected(Path.of("relative-driver.jar"), "relative-driver.jar");
        assertRejected(Path.of("\\\\sentinel-host\\share\\driver.jar"), "sentinel-host");
        assertRejected(temp.resolve("driver.txt"), "driver.txt");
        assertRejected(directory, "directory.jar");
        assertRejected(temp.resolve("missing.jar"), "missing.jar");
        assertRejected(secret, secret.toString());
    }

    @Test
    void rejectsCanonicalAndHardLinkDuplicates() throws Exception {
        Path jar = validJar(temp.resolve("driver.jar"), "duplicate");

        assertThatThrownBy(() -> policy.validate(List.of(jar, jar)))
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining(jar.toString());

        Path hardLink = temp.resolve("driver-hardlink.jar");
        try {
            Files.createLink(hardLink, jar);
        } catch (UnsupportedOperationException | IOException failure) {
            Assumptions.abort("hard links are unavailable on this filesystem");
        }
        assertThatThrownBy(() -> policy.validate(List.of(jar, hardLink)))
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining(jar.toString())
                .hasMessageNotContaining(hardLink.toString());
    }

    @Test
    void rejectsLeafAndParentSymbolicLinksWhenSupported() throws Exception {
        Path jar = validJar(temp.resolve("driver.jar"), "symbolic");
        Path link = temp.resolve("driver-link.jar");
        Path realDirectory = Files.createDirectory(temp.resolve("real-directory"));
        Path directoryLink = temp.resolve("directory-link");
        try {
            Files.createSymbolicLink(link, jar);
            Files.createSymbolicLink(directoryLink, realDirectory);
        } catch (UnsupportedOperationException | IOException failure) {
            Assumptions.abort("symbolic links are unavailable on this filesystem");
        }
        Path nested = validJar(realDirectory.resolve("nested.jar"), "nested");

        assertRejected(link, link.toString());
        assertRejected(directoryLink.resolve(nested.getFileName()), directoryLink.toString());
    }

    @Test
    void rejectsManifestClasspathThatWouldExpandTheApprovedJarSet() throws Exception {
        Path jar = temp.resolve("manifest-classpath.jar");
        Manifest manifest = new Manifest();
        manifest.getMainAttributes().putValue("Manifest-Version", "1.0");
        manifest.getMainAttributes().putValue("Class-Path", "https://sentinel-host/remote.jar");
        try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(jar), manifest)) {
            output.putNextEntry(new JarEntry("marker.txt"));
            output.write("marker".getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
        }

        assertRejected(jar, "sentinel-host");
    }

    private void assertRejected(Path candidate, String secretMaterial) {
        assertThatThrownBy(() -> policy.validate(List.of(candidate)))
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining(secretMaterial);
    }

    private static Path validJar(Path path, String marker) throws IOException {
        try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(path))) {
            output.putNextEntry(new JarEntry("marker.txt"));
            output.write(marker.getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
        }
        return path;
    }
}
