package nuri.migration.jdbc;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ExternalDriverSourceContractTest {

    @Test
    void externalDriverBoundaryNeverUsesDriverManagerRegistrationOrConnection() throws Exception {
        Path root = Path.of(System.getProperty("user.dir"));
        Path sourceRoot = root.resolve("migration-tool/src/main/java/nuri/migration/jdbc");
        if (!Files.isDirectory(sourceRoot)) {
            sourceRoot = root.resolve("src/main/java/nuri/migration/jdbc");
        }
        StringBuilder sources = new StringBuilder();
        try (var paths = Files.list(sourceRoot)) {
            for (Path path : paths.filter(candidate -> candidate.toString().endsWith(".java")).toList()) {
                sources.append(Files.readString(path));
            }
        }

        assertThat(sources.toString())
                .contains("driver.connect(")
                .doesNotContain("DriverManager.", "registerDriver(", "deregisterDriver(");
    }
}
