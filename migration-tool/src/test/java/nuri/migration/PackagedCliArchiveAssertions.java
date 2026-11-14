package nuri.migration;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Locale;
import java.util.jar.JarFile;

import static org.assertj.core.api.Assertions.assertThat;

/** One archive boundary for the native source-driver workflows and the private index. */
public final class PackagedCliArchiveAssertions {
    private PackagedCliArchiveAssertions() { }

    public static void assertDeploymentJarExcludesSourceDrivers(Path application) throws IOException {
        try (var archive = new JarFile(application.toFile())) {
            var names = archive.stream().map(entry -> entry.getName().toLowerCase(Locale.ROOT)).toList();
            assertThat(names).as("the application and its private encrypted index are packaged")
                    .contains("boot-inf/classes/nuri/migration/migrationtoolapplication.class",
                            "boot-inf/classes/nuri/migration/state/migrationscratchindex.class");
            assertThat(names).filteredOn(name -> name.startsWith("boot-inf/lib/h2-") && name.endsWith(".jar"))
                    .as("exactly one H2 library supports the private index").hasSize(1);
            assertThat(names).as("external source drivers must stay outside the shipped executable JAR")
                    .noneMatch(PackagedCliArchiveAssertions::isExternalSourceDriver);
        }
    }

    private static boolean isExternalSourceDriver(String name) {
        return name.startsWith("boot-inf/lib/mssql-jdbc-") || name.contains("/com/microsoft/sqlserver/")
                || name.startsWith("boot-inf/lib/mariadb-java-client-") || name.contains("/org/mariadb/jdbc/")
                || name.startsWith("boot-inf/lib/mysql-connector") || name.contains("/com/mysql/")
                || name.startsWith("boot-inf/lib/ojdbc") || name.contains("/oracle/jdbc/");
    }
}
