package nuri.migration;

import nuri.migration.model.MappingSpec;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.mssqlserver.MSSQLServerContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.UUID;

/** Owns disposable SQL Server fixtures; metadata evidence does not qualify public COMMIT. */
@Testcontainers
abstract class SqlServerPostgresTestSupport {
    protected static final String SOURCE_DATABASE = "migration_fixture";
    @Container
    protected static final MSSQLServerContainer SQLSERVER = new MSSQLServerContainer(
            "mcr.microsoft.com/mssql/server@sha256:4402d880dd4c34bfa7d8705e56a86cd6c88da80a1f6bbbe741f999e76264a090")
            .acceptLicense()
            .withPassword("SqlServer1!" + UUID.randomUUID())
            .withUrlParam("encrypt", "true")
            .withUrlParam("trustServerCertificate", "true");
    @Container
    protected static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
            .withPassword(UUID.randomUUID().toString());

    @BeforeAll
    static void createDisposableDatabaseAndRecordVersions() throws Exception {
        // MSSQLServerContainer has no database-name setter. Its admin connection creates only this fixture DB.
        try (var connection = SQLSERVER.createConnection(""); var statement = connection.createStatement()) {
            statement.execute("IF DB_ID(N'migration_fixture') IS NULL CREATE DATABASE [migration_fixture]");
        }
        try (var source = sourceConnection(); var target = POSTGRES.createConnection("")) {
            var original = source.getMetaData();
            var destination = target.getMetaData();
            System.out.printf("SQL Server metadata rehearsal: %s %s; driver %s %s; target %s %s%n",
                    original.getDatabaseProductName(), original.getDatabaseProductVersion(),
                    original.getDriverName(), original.getDriverVersion(),
                    destination.getDatabaseProductName(), destination.getDatabaseProductVersion());
        }
    }

    @BeforeEach
    void resetDisposableFixtures() throws Exception {
        setSourceDatabaseReadOnly(false);
        var source = sourceJdbc();
        for (String table : source.queryForList("SELECT t.name FROM sys.tables t"
                + " JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name='dbo'", String.class)) {
            if (table.startsWith("tb_sqlserver_")) {
                source.execute("DROP TABLE [dbo].[" + table.replace("]", "]]") + "]");
            }
        }
        targetJdbc().execute("DROP SCHEMA IF EXISTS public CASCADE");
        targetJdbc().execute("CREATE SCHEMA public");
        targetJdbc().execute("DROP SCHEMA IF EXISTS migration_control CASCADE");
    }

    protected static void freezeSourceDatabase() throws Exception {
        setSourceDatabaseReadOnly(true);
    }

    private static void setSourceDatabaseReadOnly(boolean readOnly) throws Exception {
        // Only this disposable database is changed, from master, without forcing other sessions to roll back.
        try (var connection = SQLSERVER.createConnection(""); var statement = connection.createStatement()) {
            statement.execute("ALTER DATABASE [migration_fixture] SET " + (readOnly ? "READ_ONLY" : "READ_WRITE"));
        }
    }

    protected static MappingSpec.DbConfig sourceConfig() {
        return new MappingSpec.DbConfig(SQLSERVER.getJdbcUrl() + ";databaseName=" + SOURCE_DATABASE,
                SQLSERVER.getUsername(), SQLSERVER.getPassword(),
                "com.microsoft.sqlserver.jdbc.SQLServerDriver", "disposable-sqlserver-source");
    }

    protected static MappingSpec.DbConfig targetConfig() {
        return new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                "org.postgresql.Driver", "disposable-postgres-target");
    }

    protected static Connection sourceConnection() throws Exception {
        var config = sourceConfig();
        Class.forName(config.driver());
        return DriverManager.getConnection(config.url(), config.username(), config.password());
    }

    protected static JdbcTemplate sourceJdbc() { return jdbc(sourceConfig()); }

    protected static JdbcTemplate targetJdbc() { return jdbc(targetConfig()); }

    private static JdbcTemplate jdbc(MappingSpec.DbConfig config) {
        var source = new DriverManagerDataSource(config.url(), config.username(), config.password());
        source.setDriverClassName(config.driver());
        return new JdbcTemplate(source);
    }
}
