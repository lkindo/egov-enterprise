package nuri.migration.jdbc;

import nuri.migration.artifact.SourceDriverEvidence;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.source.SourceIntrospector;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.DriverPropertyInfo;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.ArrayList;
import java.util.concurrent.TimeUnit;
import java.util.jar.JarFile;
import java.util.logging.Logger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static nuri.migration.PackagedCliArchiveAssertions.assertDeploymentJarExcludesSourceDrivers;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.BDDMockito.given;

class SourceJdbcEndpointFactoryTest {

    @TempDir
    Path temp;

    private final SourceIntrospector introspector = mock(SourceIntrospector.class);
    private final SourceJdbcEndpointFactory factory = new SourceJdbcEndpointFactory(
            introspector, new LocalDriverJarPolicy());

    @Test
    void privateIndexDriverCannotBecomeABundledUserSource() {
        SourceJdbcEndpointFactory production = new SourceJdbcEndpointFactory(new SourceIntrospector());
        DbConfig source = new DbConfig("jdbc:h2:mem:untrusted-source;DATABASE_EVENT_LISTENER=private.Listener",
                "synthetic-user", "synthetic-password", "org.h2.Driver");
        assertThatThrownBy(() -> production.open(source, List.of(), null))
                .isInstanceOf(SourceDriverException.class).hasNoCause()
                .hasMessageNotContaining(source.url()).hasMessageNotContaining(source.password());
    }

    @Test
    void shippedJarRejectsPrivateIndexSourceAndTargetBeforeOpeningUserDatabaseFiles() throws Exception {
        Path application = Path.of(System.getProperty("migration.drill.jar")).toRealPath();
        assertDeploymentJarExcludesSourceDrivers(application);
        for (String command : List.of("discover", "plan")) {
            boolean source = command.equals("discover");
            Path database = temp.resolve(command + "-forbidden");
            String h2 = "jdbc:h2:file:" + database.toString().replace('\\', '/');
            Path mapping = temp.resolve(command + "-mapping.yml");
            Path log = temp.resolve(command + "-packaged.log");
            Files.writeString(mapping, """
                    source:
                      url: '%s'
                      username: synthetic-user
                      password: '${DRILL_ENDPOINT_PASSWORD}'
                      driver: %s
                      endpointId: synthetic-source
                    target:
                      url: '%s'
                      username: synthetic-user
                      password: '${DRILL_ENDPOINT_PASSWORD}'
                      driver: %s
                      endpointId: synthetic-target
                    tables: []
                    """.formatted(source ? h2 : "jdbc:postgresql://127.0.0.1:1/unused",
                    source ? "org.h2.Driver" : "org.postgresql.Driver",
                    source ? "jdbc:postgresql://127.0.0.1:1/unused" : h2,
                    source ? "org.postgresql.Driver" : "org.h2.Driver"));
            boolean windows = System.getProperty("os.name").startsWith("Windows");
            var arguments = new ArrayList<>(List.of(Path.of(System.getProperty("java.home"), "bin", windows ? "java.exe" : "java").toString(),
                    "-Dfile.encoding=UTF-8", "-jar", application.toString(), "--command=" + command,
                    "--mapping=" + mapping, "--inventory=" + temp.resolve(command + "-inventory.json")));
            if (!source) arguments.add("--plan=" + temp.resolve("forbidden-plan.json"));
            ProcessBuilder builder = new ProcessBuilder(arguments).redirectErrorStream(true).redirectOutput(log.toFile());
            builder.environment().put("DRILL_ENDPOINT_PASSWORD", "synthetic-private-password");
            Process worker = builder.start();
            try {
                assertThat(worker.waitFor(60, TimeUnit.SECONDS)).as("packaged endpoint rejection terminates").isTrue();
                assertThat(worker.exitValue()).isNotZero();
                String output = Files.readString(log);
                assertThat(output).contains(source ? "MW_DIAGNOSTIC=DB_DRIVER_UNAVAILABLE"
                        : "H2는 내부 임시 인덱스 전용이며 workflow target으로 사용할 수 없습니다.");
                assertThat(output).doesNotContain("synthetic-private-password");
                assertThat(Files.exists(Path.of(database + ".mv.db"))).isFalse();
                assertThat(Files.exists(Path.of(database + ".trace.db"))).isFalse();
            } finally { if (worker.isAlive()) worker.destroyForcibly().waitFor(10, TimeUnit.SECONDS); }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "BOOT-INF/lib/mysql-connector-j-fixture.jar",
            "BOOT-INF/lib/mariadb-java-client-fixture.jar",
            "BOOT-INF/lib/ojdbc11-fixture.jar",
            "BOOT-INF/lib/mssql-jdbc-fixture.jar",
            "BOOT-INF/classes/com/mysql/cj/jdbc/Driver.class",
            "BOOT-INF/classes/org/mariadb/jdbc/Driver.class",
            "BOOT-INF/classes/oracle/jdbc/OracleDriver.class",
            "BOOT-INF/classes/com/microsoft/sqlserver/jdbc/SQLServerDriver.class"
    })
    void shippedArchiveRejectsInjectedExternalSourceDriver(String entry) throws Exception {
        Path application = Path.of(System.getProperty("migration.drill.jar")).toRealPath();
        Path changed = Files.copy(application, temp.resolve("source-driver-injected.jar"));
        try (var archive = FileSystems.newFileSystem(changed, Map.of())) {
            Path resource = archive.getPath("/" + entry);
            Files.createDirectories(resource.getParent());
            Files.write(resource, new byte[] { 0 });
        }
        assertThatThrownBy(() -> assertDeploymentJarExcludesSourceDrivers(changed))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("external source drivers must stay outside");
    }

    @ParameterizedTest
    @ValueSource(strings = { "missing-h2", "duplicate-h2", "missing-private-index" })
    void shippedArchiveRequiresPrivateIndexAndOneH2Library(String violation) throws Exception {
        Path application = Path.of(System.getProperty("migration.drill.jar")).toRealPath();
        Path changed = Files.copy(application, temp.resolve("private-index-violation.jar"));
        try (var archive = FileSystems.newFileSystem(changed, Map.of())) {
            if (violation.equals("missing-private-index")) {
                Files.delete(archive.getPath("/BOOT-INF/classes/nuri/migration/state/MigrationScratchIndex.class"));
            } else {
                Path library;
                try (var libraries = Files.list(archive.getPath("/BOOT-INF/lib"))) {
                    library = libraries.filter(path -> path.getFileName().toString().startsWith("h2-"))
                            .findFirst().orElseThrow();
                }
                if (violation.equals("missing-h2")) Files.delete(library);
                else Files.copy(library, library.resolveSibling("h2-duplicate-fixture.jar"));
            }
        }
        assertThatThrownBy(() -> assertDeploymentJarExcludesSourceDrivers(changed))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining(violation.equals("missing-private-index")
                        ? "private encrypted index" : "exactly one H2 library");
    }

    @Test
    void springCreatesTheFactoryUsingItsProductionConstructorAndInjectedIntrospector() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        DataSource dataSource = mock(DataSource.class);
        DbConfig config = new DbConfig("jdbc:bundled:source", "user", "password", "org.h2.Driver");
        given(introspector.jdbc(config)).willReturn(jdbc);
        given(jdbc.getDataSource()).willReturn(dataSource);

        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.registerBean(SourceIntrospector.class, () -> introspector);
            context.register(SourceJdbcEndpointFactory.class);
            context.refresh();

            SourceJdbcEndpointFactory managed = context.getBean(SourceJdbcEndpointFactory.class);
            try (SourceJdbcEndpoint endpoint = managed.open(config, List.of(), null)) {
                assertThat(endpoint.jdbc()).isSameAs(jdbc);
                assertThat(endpoint.dataSource()).isSameAs(dataSource);
                assertThat(endpoint.evidence().loadingMode())
                        .isEqualTo(SourceDriverEvidence.LoadingMode.BUNDLED);
            }
        }
    }

    @Test
    void loadsCopiedH2JarWithPlatformParentAndUsesDriverConnectUntilEndpointClose() throws Exception {
        Path externalJar = Files.copy(findH2Jar(), temp.resolve("external-h2.jar"));
        DbConfig config = new DbConfig(
                "jdbc:h2:mem:isolated-driver;DB_CLOSE_DELAY=-1",
                "sentinel-user", "sentinel-password", "wrong.MappingDriver");

        SourceJdbcEndpoint endpoint = factory.open(
                config, List.of(externalJar), "org.h2.Driver");
        Connection connection = endpoint.dataSource().getConnection();
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT 1")) {
            assertThat(result.next()).isTrue();
            assertThat(result.getInt(1)).isEqualTo(1);
        }

        ClassLoader driverLoader = connection.getClass().getClassLoader();
        assertThat(driverLoader).isNotSameAs(ClassLoader.getSystemClassLoader());
        assertThat(driverLoader.getParent()).isSameAs(ClassLoader.getPlatformClassLoader());
        assertThat(endpoint.evidence().loadingMode())
                .isEqualTo(SourceDriverEvidence.LoadingMode.ISOLATED);
        assertThat(endpoint.evidence().jarCount()).isEqualTo(1);
        verifyNoInteractions(introspector);

        endpoint.close();

        assertThat(connection.isClosed()).isTrue();
        assertThatThrownBy(() -> endpoint.dataSource().getConnection())
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining(config.url())
                .hasMessageNotContaining(config.username())
                .hasMessageNotContaining(config.password())
                .hasMessageNotContaining(externalJar.toString());
    }

    @Test
    void usesMappingDriverAsFallbackAndStagesVerifiedBytesBeforeOriginalChanges() throws Exception {
        Path externalJar = Files.copy(findH2Jar(), temp.resolve("mutable-h2.jar"));
        DbConfig config = new DbConfig(
                "jdbc:h2:mem:staged-driver", "sa", "sentinel-password", "org.h2.Driver");

        try (SourceJdbcEndpoint endpoint = factory.open(config, List.of(externalJar), null)) {
            Files.writeString(externalJar, "replaced-after-open");
            try (Connection connection = endpoint.dataSource().getConnection();
                 Statement statement = connection.createStatement();
                 ResultSet result = statement.executeQuery("SELECT 1")) {
                assertThat(result.next()).isTrue();
            }
        }
    }

    @Test
    void rejectsExternalClassWithoutJarsAndSanitizesLoadOrConnectFailures() throws Exception {
        DbConfig config = new DbConfig(
                "jdbc:h2:mem:sentinel-private-db", "sentinel-user", "sentinel-password", null);

        assertThatThrownBy(() -> factory.open(config, List.of(), "org.h2.Driver"))
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining(config.url())
                .hasMessageNotContaining(config.username())
                .hasMessageNotContaining(config.password());

        Path externalJar = Files.copy(findH2Jar(), temp.resolve("external-h2.jar"));
        assertThatThrownBy(() -> factory.open(config, List.of(externalJar), "sentinel.MissingDriver"))
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining(config.url())
                .hasMessageNotContaining(config.username())
                .hasMessageNotContaining(config.password())
                .hasMessageNotContaining(externalJar.toString())
                .hasMessageNotContaining("sentinel.MissingDriver");

        DbConfig unsupportedUrl = new DbConfig(
                "jdbc:unsupported:sentinel", "sentinel-user", "sentinel-password", "org.h2.Driver");
        assertThatThrownBy(() -> factory.open(unsupportedUrl, List.of(externalJar), null))
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining("unsupported")
                .hasMessageNotContaining(externalJar.toString());
    }

    @Test
    void bundledEndpointUsesExistingIntrospectorAndHasNoOwnedCloseLifecycle() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        DataSource dataSource = mock(DataSource.class);
        DbConfig config = new DbConfig("jdbc:bundled:source", "user", "password", "org.h2.Driver");
        given(introspector.jdbc(config)).willReturn(jdbc);
        given(jdbc.getDataSource()).willReturn(dataSource);

        SourceJdbcEndpoint endpoint = factory.open(config, List.of(), null);
        endpoint.close();
        endpoint.close();

        assertThat(endpoint.jdbc()).isSameAs(jdbc);
        assertThat(endpoint.dataSource()).isSameAs(dataSource);
        assertThat(endpoint.evidence().loadingMode())
                .isEqualTo(SourceDriverEvidence.LoadingMode.BUNDLED);
        assertThat(endpoint.evidence())
                .isNotEqualTo(SourceDriverEvidence.bundled("org.h2.Driver"));

        DbConfig classesDirectoryConfig = new DbConfig(
                "jdbc:test:classes", "user", "password", TestBundledDriver.class.getName());
        given(introspector.jdbc(classesDirectoryConfig)).willReturn(jdbc);
        try (SourceJdbcEndpoint classesEndpoint = factory.open(
                classesDirectoryConfig, List.of(), null)) {
            assertThat(classesEndpoint.evidence().loadingMode())
                    .isEqualTo(SourceDriverEvidence.LoadingMode.BUNDLED);
            assertThat(classesEndpoint.evidence()).isNotEqualTo(endpoint.evidence());
        }
    }

    @Test
    void rejectsMissingUrlOrMalformedEffectiveDriverClassWithoutLeakingValues() throws Exception {
        assertThatThrownBy(() -> factory.open(null, List.of(), null))
                .isInstanceOf(SourceDriverException.class).hasNoCause();
        assertThatThrownBy(() -> factory.open(
                new DbConfig(null, "user", "password", "driver"), List.of(), null))
                .isInstanceOf(SourceDriverException.class).hasNoCause();
        assertThatThrownBy(() -> factory.open(
                new DbConfig("jdbc:auto:source", "user", "password", null), List.of(), null))
                .isInstanceOf(SourceDriverException.class).hasNoCause();

        Path externalJar = Files.copy(findH2Jar(), temp.resolve("external-h2.jar"));
        for (String invalid : List.of("", " Driver", "Driver", "bad-name.Driver")) {
            assertThatThrownBy(() -> factory.open(
                    new DbConfig("jdbc:h2:mem:test", "user", "password", invalid),
                    List.of(externalJar), null))
                    .isInstanceOf(SourceDriverException.class)
                    .hasNoCause();
        }
    }

    private static Path findH2Jar() throws IOException {
        String[] entries = System.getProperty("java.class.path").split(
                java.util.regex.Pattern.quote(System.getProperty("path.separator")));
        for (String entry : entries) {
            Path candidate;
            try {
                candidate = Path.of(entry);
            } catch (RuntimeException ignored) {
                continue;
            }
            if (!Files.isRegularFile(candidate) || !candidate.getFileName().toString().endsWith(".jar")) {
                continue;
            }
            try (JarFile jar = new JarFile(candidate.toFile(), false)) {
                if (jar.getJarEntry("org/h2/Driver.class") != null) {
                    return candidate;
                }
            }
        }
        throw new IOException("H2 test driver jar is unavailable");
    }

    private static final class TestBundledDriver implements Driver {
        @Override
        public Connection connect(String url, Properties info) {
            return null;
        }

        @Override
        public boolean acceptsURL(String url) {
            return false;
        }

        @Override
        public DriverPropertyInfo[] getPropertyInfo(String url, Properties info) {
            return new DriverPropertyInfo[0];
        }

        @Override
        public int getMajorVersion() {
            return 1;
        }

        @Override
        public int getMinorVersion() {
            return 0;
        }

        @Override
        public boolean jdbcCompliant() {
            return false;
        }

        @Override
        public Logger getParentLogger() {
            return Logger.getAnonymousLogger();
        }
    }
}
