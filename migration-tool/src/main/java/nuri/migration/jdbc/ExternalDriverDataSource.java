package nuri.migration.jdbc;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Logger;

/** DriverManager 등록 없이 격리 loader의 Driver.connect를 직접 호출하는 DataSource. */
final class ExternalDriverDataSource implements DataSource {

    private final Driver driver;
    private final ClassLoader loader;
    private final String url;
    private final String username;
    private final String password;
    private final AtomicBoolean closed = new AtomicBoolean();
    private final Set<Connection> connections = Collections.synchronizedSet(
            Collections.newSetFromMap(new IdentityHashMap<>()));
    private volatile int loginTimeout;

    ExternalDriverDataSource(
            Driver driver,
            ClassLoader loader,
            String url,
            String username,
            String password
    ) {
        this.driver = driver;
        this.loader = loader;
        this.url = url;
        this.username = username;
        this.password = password;
    }

    @Override
    public Connection getConnection() {
        return connect(username, password);
    }

    @Override
    public Connection getConnection(String requestedUsername, String requestedPassword) {
        return connect(requestedUsername, requestedPassword);
    }

    private Connection connect(String user, String secret) {
        if (closed.get()) {
            throw SourceDriverException.closed();
        }
        Properties properties = new Properties();
        if (user != null) {
            properties.setProperty("user", user);
        }
        if (secret != null) {
            properties.setProperty("password", secret);
        }
        try {
            Connection connection = withContextLoader(() -> driver.connect(url, properties));
            if (connection == null) {
                throw SourceDriverException.connection();
            }
            synchronized (connections) {
                if (closed.get()) {
                    closeQuietly(connection);
                    throw SourceDriverException.closed();
                }
                connections.add(connection);
            }
            return connection;
        } catch (SourceDriverException failure) {
            throw failure;
        } catch (Throwable failure) {
            JvmFailureBoundary.rethrowIfFatal(failure);
            throw SourceDriverException.connection();
        }
    }

    boolean closeConnections() {
        if (!closed.compareAndSet(false, true)) {
            return true;
        }
        boolean clean = true;
        synchronized (connections) {
            for (Connection connection : new ArrayList<>(connections)) {
                clean &= closeQuietly(connection);
            }
            connections.clear();
        }
        return clean;
    }

    private <T> T withContextLoader(SqlSupplier<T> action) throws Exception {
        Thread thread = Thread.currentThread();
        ClassLoader previous = thread.getContextClassLoader();
        try {
            thread.setContextClassLoader(loader);
            return action.get();
        } finally {
            thread.setContextClassLoader(previous);
        }
    }

    private static boolean closeQuietly(Connection connection) {
        try {
            connection.close();
            return true;
        } catch (Throwable failure) {
            JvmFailureBoundary.rethrowIfFatal(failure);
            return false;
        }
    }

    @Override
    public PrintWriter getLogWriter() {
        return null;
    }

    @Override
    public void setLogWriter(PrintWriter out) throws SQLException {
        if (out != null) {
            throw new SQLFeatureNotSupportedException("external source driver logging is disabled");
        }
    }

    @Override
    public void setLoginTimeout(int seconds) {
        if (seconds < 0) {
            throw new IllegalArgumentException("login timeout must not be negative");
        }
        loginTimeout = seconds;
    }

    @Override
    public int getLoginTimeout() {
        return loginTimeout;
    }

    @Override
    public Logger getParentLogger() {
        return Logger.getLogger("nuri.migration.jdbc.external");
    }

    @Override
    public <T> T unwrap(Class<T> iface) throws SQLException {
        if (iface != null && iface.isInstance(this)) {
            return iface.cast(this);
        }
        throw new SQLException("JDBC wrapper type is unsupported");
    }

    @Override
    public boolean isWrapperFor(Class<?> iface) {
        return iface != null && iface.isInstance(this);
    }

    @Override
    public String toString() {
        return "ExternalDriverDataSource[values=<redacted>]";
    }

    @FunctionalInterface
    private interface SqlSupplier<T> {
        T get() throws Exception;
    }
}
