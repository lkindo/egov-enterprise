package nuri.migration.jdbc;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/** Keeps source read-ahead bounded under each qualified JDBC driver's streaming contract. */
public final class SourceReadStatements {
    private SourceReadStatements() { }

    public static PreparedStatement prepare(Connection connection, String sql) throws SQLException {
        var metadata = connection.getMetaData();
        boolean mysql = "MySQL".equals(metadata.getDatabaseProductName());
        boolean mariaDb = "MariaDB".equals(metadata.getDatabaseProductName());
        boolean sqlServer = "Microsoft SQL Server".equals(metadata.getDatabaseProductName());
        if ((mysql && !"MySQL Connector/J".equals(metadata.getDriverName()))
                || (mariaDb && !"MariaDB Connector/J".equals(metadata.getDriverName()))
                || (sqlServer && !"Microsoft JDBC Driver 13.6 for SQL Server".equals(metadata.getDriverName()))) {
            throw new SQLException("SOURCE_DRIVER_STREAMING_UNSUPPORTED");
        }
        // Resolve reflective driver properties before opening a statement that a fatal probe could abandon.
        int fetchSize = mysql && !mysqlCursorEnabled(connection) ? Integer.MIN_VALUE : 1;
        // MariaDB Connector/J uses positive fetch sizes; MySQL's negative sentinel is not portable.
        PreparedStatement statement = mysql || mariaDb || sqlServer
                ? connection.prepareStatement(sql, ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY)
                : connection.prepareStatement(sql);
        try {
            if (sqlServer) requireAdaptiveBuffering(statement);
            // Prefer an enabled server cursor so closing a byte-budgeted page need not drain it.
            // The sentinel still bounds read-ahead when cursor URL settings are absent.
            statement.setFetchSize(fetchSize);
            return statement;
        } catch (SQLException | RuntimeException | Error failure) {
            try {
                statement.close();
            } catch (SQLException | RuntimeException | Error closeFailure) {
                // Cleanup must not replace a process-fatal fetch failure with an ordinary close failure.
                if (!JvmFailureBoundary.isFatal(failure)) JvmFailureBoundary.rethrowIfFatal(closeFailure);
                if (closeFailure != failure) failure.addSuppressed(closeFailure);
            }
            throw failure;
        }
    }

    private static void requireAdaptiveBuffering(PreparedStatement statement) throws SQLException {
        try {
            // Override an external driver's responseBuffering=full before executing any source query.
            statement.getClass().getMethod("setResponseBuffering", String.class).invoke(statement, "adaptive");
            Object buffering = statement.getClass().getMethod("getResponseBuffering").invoke(statement);
            if (!"adaptive".equals(buffering)) throw new SQLException("SOURCE_DRIVER_STREAMING_UNSUPPORTED");
        } catch (ReflectiveOperationException failure) {
            if (failure.getCause() != null) JvmFailureBoundary.rethrowIfFatal(failure.getCause());
            throw new SQLException("SOURCE_DRIVER_STREAMING_UNSUPPORTED");
        }
    }

    private static boolean mysqlCursorEnabled(Connection connection) {
        try {
            // Read the actual driver properties, including URL overrides, without bundling Connector/J.
            Object properties = connection.getClass().getMethod("getPropertySet").invoke(connection);
            return booleanProperty(properties, "useCursorFetch")
                    && booleanProperty(properties, "useServerPrepStmts");
        } catch (ReflectiveOperationException failure) {
            if (failure.getCause() != null) JvmFailureBoundary.rethrowIfFatal(failure.getCause());
            return false;
        }
    }

    private static boolean booleanProperty(Object properties, String name) throws ReflectiveOperationException {
        Object property = properties.getClass().getMethod("getBooleanProperty", String.class)
                .invoke(properties, name);
        return Boolean.TRUE.equals(property.getClass().getMethod("getValue").invoke(property));
    }
}
