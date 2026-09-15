package nuri.migration;

import com.github.dockerjava.api.command.InspectContainerResponse;
import com.github.dockerjava.api.model.ExposedPort;
import com.github.dockerjava.api.model.PortBinding;
import com.github.dockerjava.api.model.Ports;
import nuri.migration.jdbc.JvmFailureBoundary;
import org.testcontainers.containers.JdbcDatabaseContainer;
import org.testcontainers.containers.output.OutputFrame;
import org.testcontainers.containers.startupcheck.MinimumDurationRunningStartupCheckStrategy;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Properties;
import java.util.UUID;

/** Disposable Oracle 19c EE/PDB fixture using Oracle's SingleInstance image contract. */
final class Oracle19cContainer extends JdbcDatabaseContainer<Oracle19cContainer> {
    static final String FIXTURE_USER = "migration_fixture_reader";
    static final String PDB_NAME = "ORCLPDB1";
    static final String EXPECTED_VERSION = "19.3.0.0.0";
    private static final int ORACLE_PORT = 1521;
    // Oracle 19c DBCA limits administrator passwords to 30 characters.
    private final String password = "Oracle19c1_" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);

    Oracle19cContainer(String image) {
        super(DockerImageName.parse(image));
        withExposedPorts(ORACLE_PORT);
        withCreateContainerCmdModifier(command -> command.getHostConfig()
                .withMemory(6L * 1024 * 1024 * 1024).withNanoCPUs(4_000_000_000L)
                .withShmSize(1024L * 1024 * 1024).withPortBindings(
                        new PortBinding(Ports.Binding.bindIpAndPort("127.0.0.1", 0), new ExposedPort(ORACLE_PORT))));
        withEnv("ORACLE_SID", "ORCLCDB");
        withEnv("ORACLE_PDB", PDB_NAME);
        withEnv("ORACLE_PWD", password);
        withEnv("ORACLE_CHARACTERSET", "AL32UTF8");
        waitingFor(Wait.forLogMessage(".*DATABASE IS READY TO USE!.*\\s", 1));
        withStartupCheckStrategy(new MinimumDurationRunningStartupCheckStrategy(Duration.ofSeconds(5)));
        // DBCA converts the shipped template charset and creates a PDB on a cold volume.
        // This bounds fixture initialization, while the ready log and JDBC checks stay required.
        withStartupTimeout(Duration.ofMinutes(30));
    }

    @Override public String getDriverClassName() { return "oracle.jdbc.OracleDriver"; }

    @Override public String getJdbcUrl() {
        return "jdbc:oracle:thin:@//" + getHost() + ":" + getMappedPort(ORACLE_PORT) + "/" + PDB_NAME;
    }

    @Override public String getDatabaseName() { return PDB_NAME; }
    @Override public String getUsername() { return FIXTURE_USER; }
    // Existing visibility tests connect as SYSTEM using getPassword(), so both fixture passwords agree.
    @Override public String getPassword() { return password; }
    @Override protected String getTestQueryString() { return "SELECT 1 FROM DUAL"; }

    @Override
    protected void waitUntilContainerStarted() {
        getWaitStrategy().waitUntilReady(this);
        try (var admin = waitForAdminConnection(); var statement = admin.createStatement()) {
            // Confirm this disposable image's physical DB and charset before creating the fixture account.
            try (var rows = statement.executeQuery("SELECT VERSION_FULL, SYS_CONTEXT('USERENV','CON_NAME') AS pdb_name,"
                    + " (SELECT VALUE FROM NLS_DATABASE_PARAMETERS WHERE PARAMETER='NLS_CHARACTERSET') AS charset_name"
                    + " FROM V$INSTANCE")) {
                if (!rows.next() || !EXPECTED_VERSION.equals(rows.getString(1))
                        || !PDB_NAME.equals(rows.getString(2)) || !"AL32UTF8".equals(rows.getString(3)) || rows.next()) {
                    throw new SQLException("ORACLE19C_BOOTSTRAP_EVIDENCE_REJECTED");
                }
            }
            statement.execute("CREATE USER " + FIXTURE_USER + " IDENTIFIED BY \"" + password
                    + "\" DEFAULT TABLESPACE USERS");
            statement.execute("GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, UNLIMITED TABLESPACE TO " + FIXTURE_USER);
        } catch (SQLException failure) {
            JvmFailureBoundary.rethrowSuppressedFatal(failure);
            // Startup errors must not publish a credential-bearing DDL or a raw JDBC cause.
            throw new IllegalStateException("ORACLE19C_FIXTURE_BOOTSTRAP_FAILED");
        }
        try (var connection = createConnection(""); var statement = connection.createStatement();
             var rows = statement.executeQuery(getTestQueryString())) {
            if (!rows.next() || rows.getInt(1) != 1 || rows.next()) {
                throw new SQLException("ORACLE19C_FIXTURE_JDBC_NOT_READY");
            }
        } catch (SQLException failure) {
            JvmFailureBoundary.rethrowSuppressedFatal(failure);
            throw new IllegalStateException("ORACLE19C_FIXTURE_JDBC_NOT_READY");
        }
    }

    @Override
    protected void containerIsStarted(InspectContainerResponse containerInfo) {
        // JdbcDatabaseContainer's default callback prints the JDBC URL; this fixture records safe metadata later.
    }

    @Override
    public Connection createConnection(String queryString) throws SQLException {
        return createConnection(queryString, new Properties());
    }

    @Override
    public Connection createConnection(String queryString, Properties info) throws SQLException {
        return connect(getUsername(), constructUrlForConnection(queryString), info);
    }

    Connection createAdminConnection() throws SQLException {
        return connect("system", getJdbcUrl(), new Properties());
    }

    private Connection connect(String username, String url, Properties additional) throws SQLException {
        var properties = new Properties();
        properties.setProperty("oracle.net.CONNECT_TIMEOUT", "10000");
        properties.setProperty("oracle.jdbc.ReadTimeout", "30000");
        properties.putAll(additional);
        properties.setProperty("user", username);
        properties.setProperty("password", password);
        // Avoid the base class's DEBUG logging of connection URL and credential properties.
        Connection connection = getJdbcDriverInstance().connect(url, properties);
        if (connection == null) throw new SQLException("ORACLE19C_FIXTURE_DRIVER_REJECTED_URL");
        return connection;
    }

    private Connection waitForAdminConnection() throws SQLException {
        long deadline = System.nanoTime() + Duration.ofMinutes(2).toNanos();
        do {
            try {
                return createAdminConnection();
            } catch (SQLException failure) {
                JvmFailureBoundary.rethrowSuppressedFatal(failure);
                try {
                    Thread.sleep(200);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new SQLException("ORACLE19C_FIXTURE_STARTUP_INTERRUPTED");
                }
            }
        } while (System.nanoTime() < deadline && isRunning());
        throw new SQLException("ORACLE19C_FIXTURE_ADMIN_JDBC_NOT_READY");
    }

    @Override public String getLogs() { return redact(super.getLogs()); }
    @Override public String getLogs(OutputFrame.OutputType... types) { return redact(super.getLogs(types)); }

    private String redact(String logs) {
        return logs.replace(password, "<redacted>").replace(FIXTURE_USER, "<fixture-user>");
    }
}
