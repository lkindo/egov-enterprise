package nuri.api.schema;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Migration 검증 36개가 공유하는 PostgreSQL 17 서버와 클래스별 격리 database lifecycle.
 *
 * <p>서버는 테스트 JVM에서 한 번만 lazy-start하고, 각 하위 클래스는 서로 다른 database를 생성한다.
 * 따라서 migration target과 fixture가 서로 오염되지 않으며 JUnit 병렬 실행에서도 이름이 충돌하지 않는다.
 * 접속 암호는 소스에 두지 않고 JVM마다 생성하며, 클래스 종료 시 강제 drop해 실패한 연결도 정리한다.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class SharedPostgresMigrationTestSupport {

    private static final Logger log = LoggerFactory.getLogger(SharedPostgresMigrationTestSupport.class);
    private static final String DATABASE_PREFIX = "schema_";
    private static final int POSTGRES_IDENTIFIER_LIMIT = 63;
    private static final String RUN_ID = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    private static final AtomicLong DATABASE_SEQUENCE = new AtomicLong();
    private static final AtomicInteger SERVER_START_COUNT = new AtomicInteger();

    private String databaseName;

    @BeforeAll
    final void createIsolatedDatabase() throws SQLException {
        PostgreSQLContainer<?> server = ServerHolder.INSTANCE;
        if (SERVER_START_COUNT.get() != 1 || !server.isRunning()) {
            throw new IllegalStateException("공용 PostgreSQL 서버는 테스트 JVM에서 정확히 한 번 실행돼야 합니다");
        }

        String candidate = databaseNameFor(
                getClass().getSimpleName(),
                RUN_ID + Long.toString(DATABASE_SEQUENCE.incrementAndGet(), 36));
        try (Connection connection = adminConnection();
             Statement statement = connection.createStatement()) {
            connection.setAutoCommit(true);
            statement.execute("CREATE DATABASE " + quoteIdentifier(candidate)
                    + " TEMPLATE template0 ENCODING 'UTF8'");
        }
        databaseName = candidate;
        log.info("[schema-isolated-db] created database={} testClass={}",
                candidate, getClass().getSimpleName());
    }

    @AfterAll
    final void dropIsolatedDatabase() throws SQLException {
        String candidate = databaseName;
        if (candidate == null) {
            return;
        }
        try (Connection connection = adminConnection();
             Statement statement = connection.createStatement()) {
            connection.setAutoCommit(true);
            statement.execute("DROP DATABASE " + quoteIdentifier(candidate) + " WITH (FORCE)");
            log.info("[schema-isolated-db] dropped database={} testClass={}",
                    candidate, getClass().getSimpleName());
        } finally {
            databaseName = null;
        }
    }

    protected final Connection openConnection() throws SQLException {
        return DriverManager.getConnection(
                jdbcUrl(requiredDatabaseName()),
                ServerHolder.INSTANCE.getUsername(),
                ServerHolder.INSTANCE.getPassword());
    }

    protected final Flyway flyway(MigrationVersion target) {
        var configuration = Flyway.configure()
                .dataSource(
                        jdbcUrl(requiredDatabaseName()),
                        ServerHolder.INSTANCE.getUsername(),
                        ServerHolder.INSTANCE.getPassword())
                .locations("classpath:db/migration");
        if (target != null) {
            configuration.target(target);
        }
        return configuration.load();
    }

    public static String databaseNameFor(String testClassSimpleName, String uniquenessToken) {
        String classPart = normalizeIdentifierPart(testClassSimpleName);
        String tokenPart = normalizeIdentifierPart(uniquenessToken);
        if (classPart.isEmpty() || tokenPart.isEmpty()) {
            throw new IllegalArgumentException("database 이름 구성 요소는 영문자 또는 숫자를 포함해야 합니다");
        }

        int classLimit = POSTGRES_IDENTIFIER_LIMIT
                - DATABASE_PREFIX.length()
                - 1
                - tokenPart.length();
        if (classLimit < 1) {
            throw new IllegalArgumentException("database uniqueness token이 PostgreSQL 식별자 한도를 초과합니다");
        }
        if (classPart.length() > classLimit) {
            classPart = classPart.substring(0, classLimit);
        }
        return DATABASE_PREFIX + classPart + "_" + tokenPart;
    }

    private static String normalizeIdentifierPart(String value) {
        Objects.requireNonNull(value, "database 이름 구성 요소");
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }

    private static Connection adminConnection() throws SQLException {
        return DriverManager.getConnection(
                ServerHolder.INSTANCE.getJdbcUrl(),
                ServerHolder.INSTANCE.getUsername(),
                ServerHolder.INSTANCE.getPassword());
    }

    private static String jdbcUrl(String database) {
        String adminUrl = ServerHolder.INSTANCE.getJdbcUrl();
        int queryStart = adminUrl.indexOf('?');
        String query = queryStart >= 0 ? adminUrl.substring(queryStart) : "";
        String withoutQuery = queryStart >= 0 ? adminUrl.substring(0, queryStart) : adminUrl;
        int databaseSeparator = withoutQuery.lastIndexOf('/');
        if (databaseSeparator < "jdbc:postgresql://".length()) {
            throw new IllegalStateException("예상하지 못한 PostgreSQL JDBC URL: " + withoutQuery);
        }
        return withoutQuery.substring(0, databaseSeparator + 1) + database + query;
    }

    private String requiredDatabaseName() {
        if (databaseName == null) {
            throw new IllegalStateException("격리 database가 아직 생성되지 않았거나 이미 정리됐습니다");
        }
        return databaseName;
    }

    private static String quoteIdentifier(String identifier) {
        if (!identifier.matches("[a-z0-9_]+")) {
            throw new IllegalArgumentException("안전하지 않은 PostgreSQL 식별자: " + identifier);
        }
        return '"' + identifier + '"';
    }

    private static PostgreSQLContainer<?> startSharedServer() {
        PostgreSQLContainer<?> server = new PostgreSQLContainer<>("postgres:17-alpine")
                .withDatabaseName("postgres")
                .withUsername("schema_test")
                .withPassword(UUID.randomUUID().toString());
        server.start();
        int starts = SERVER_START_COUNT.incrementAndGet();
        if (starts != 1) {
            server.stop();
            throw new IllegalStateException("공용 PostgreSQL 서버 중복 시작 감지: " + starts);
        }
        log.info("[schema-shared-postgres] started container={} starts={}", server.getContainerId(), starts);
        return server;
    }

    private static final class ServerHolder {
        private static final PostgreSQLContainer<?> INSTANCE = startSharedServer();

        private ServerHolder() {
        }
    }
}
