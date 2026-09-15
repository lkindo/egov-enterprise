package nuri.migration.jdbc;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SourceReadStatementsTest {
    public interface ResponseBuffered {
        void setResponseBuffering(String value) throws SQLException;
        String getResponseBuffering() throws SQLException;
    }

    @Test
    void sqlServerOverridesFullBufferingBeforeReturningTheForwardOnlyReadOnlyStatement() throws Exception {
        Connection connection = sqlServerConnection();
        PreparedStatement statement = bufferedStatement(connection);
        when(((ResponseBuffered) statement).getResponseBuffering()).thenReturn("adaptive");

        assertThat(SourceReadStatements.prepare(connection, "SELECT 1")).isSameAs(statement);

        var order = inOrder(statement);
        order.verify((ResponseBuffered) statement).setResponseBuffering("adaptive");
        order.verify((ResponseBuffered) statement).getResponseBuffering();
        order.verify(statement).setFetchSize(1);
        verify(connection, never()).prepareStatement(anyString());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"adaptive ", "full", "ADAPTIVE"})
    void sqlServerRejectsAnUnconfirmedAdaptiveModeAndClosesTheStatement(String mode) throws Exception {
        Connection connection = sqlServerConnection();
        PreparedStatement statement = bufferedStatement(connection);
        when(((ResponseBuffered) statement).getResponseBuffering()).thenReturn(mode);

        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1"))
                .isInstanceOf(SQLException.class).hasMessage("SOURCE_DRIVER_STREAMING_UNSUPPORTED");

        verify(statement).close();
        verify(statement, never()).setFetchSize(anyInt());
    }

    @Test
    void sqlServerRejectsAStatementWithoutTheDriverBufferingMethods() throws Exception {
        Connection connection = sqlServerConnection();
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT 1", ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY))
                .thenReturn(statement);
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1"))
                .isInstanceOf(SQLException.class).hasMessage("SOURCE_DRIVER_STREAMING_UNSUPPORTED").hasNoCause();
        verify(statement).close();
    }

    @Test
    void sqlServerBufferingFailureDoesNotExposeDriverDetails() throws Exception {
        Connection connection = sqlServerConnection();
        PreparedStatement statement = bufferedStatement(connection);
        doThrow(new SQLException("private driver detail"))
                .when((ResponseBuffered) statement).setResponseBuffering("adaptive");
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1"))
                .isInstanceOf(SQLException.class).hasMessage("SOURCE_DRIVER_STREAMING_UNSUPPORTED").hasNoCause();
        verify(statement).close();
    }

    @Test
    void sqlServerFatalBufferingFailureRemainsFatalAndClosesTheStatement() throws Exception {
        Connection connection = sqlServerConnection();
        PreparedStatement statement = bufferedStatement(connection);
        OutOfMemoryError fatal = new OutOfMemoryError("synthetic buffering failure");
        doThrow(fatal).when((ResponseBuffered) statement).setResponseBuffering("adaptive");
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1")).isSameAs(fatal);
        verify(statement).close();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"Other JDBC driver", "Microsoft JDBC Driver 13.4 for SQL Server",
            "Microsoft JDBC Driver 13.6 for SQL Server "})
    void sqlServerRejectsDriversOutsideTheMeasuredStreamingContract(String driver) throws Exception {
        Connection connection = sqlServerConnection();
        when(connection.getMetaData().getDriverName()).thenReturn(driver);
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1"))
                .isInstanceOf(SQLException.class).hasMessage("SOURCE_DRIVER_STREAMING_UNSUPPORTED");
        verify(connection, never()).prepareStatement(anyString(), anyInt(), anyInt());
    }

    private static Connection sqlServerConnection() throws Exception {
        Connection connection = connection("Microsoft SQL Server");
        when(connection.getMetaData().getDriverName()).thenReturn("Microsoft JDBC Driver 13.6 for SQL Server");
        return connection;
    }

    private static PreparedStatement bufferedStatement(Connection connection) throws Exception {
        PreparedStatement statement = mock(PreparedStatement.class, withSettings().extraInterfaces(ResponseBuffered.class));
        when(connection.prepareStatement("SELECT 1", ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY))
                .thenReturn(statement);
        return statement;
    }

    @Test
    void mariaDbUsesItsPositiveFetchContractWithForwardOnlyReadOnlyResults() throws Exception {
        Connection connection = connection("MariaDB");
        when(connection.getMetaData().getDriverName()).thenReturn("MariaDB Connector/J");
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT payload FROM tb_source",
                ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY)).thenReturn(statement);

        assertThat(SourceReadStatements.prepare(connection, "SELECT payload FROM tb_source")).isSameAs(statement);

        verify(statement).setFetchSize(1);
        verify(connection, never()).prepareStatement(anyString());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"MySQL Connector/J", "Other JDBC driver", "mariadb connector/j"})
    void mariaDbRejectsUnqualifiedDriversBeforeOpeningAResult(String driver) throws Exception {
        Connection connection = connection("MariaDB");
        when(connection.getMetaData().getDriverName()).thenReturn(driver);

        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1"))
                .isInstanceOf(SQLException.class).hasMessage("SOURCE_DRIVER_STREAMING_UNSUPPORTED");

        verify(connection, never()).prepareStatement(anyString(), anyInt(), anyInt());
        verify(connection, never()).prepareStatement(anyString());
    }

    @Test
    void mysqlStreamsWithoutDependingOnUrlFlags() throws Exception {
        Connection connection = connection("MySQL");
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT payload FROM tb_source",
                ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY)).thenReturn(statement);
        SourceReadStatements.prepare(connection, "SELECT payload FROM tb_source");
        verify(statement).setFetchSize(Integer.MIN_VALUE);
    }

    @Test
    void enabledServerCursorUsesPositiveFetchSize() throws Exception {
        Connection connection = propertyAwareConnection(new DriverProperties(true, true));
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT 1", ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY))
                .thenReturn(statement);
        SourceReadStatements.prepare(connection, "SELECT 1");
        verify(statement).setFetchSize(1);
    }

    @ParameterizedTest
    @CsvSource({"true,false", "false,true", "false,false"})
    void bothActualCursorPropertiesAreRequiredForPositiveFetchSize(boolean cursor, boolean prepared) throws Exception {
        Connection connection = propertyAwareConnection(new DriverProperties(cursor, prepared));
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT 1", ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY))
                .thenReturn(statement);
        SourceReadStatements.prepare(connection, "SELECT 1");
        verify(statement).setFetchSize(Integer.MIN_VALUE);
    }

    @Test
    void fatalPropertyProbePropagatesBeforeOpeningAStatement() throws Exception {
        Connection connection = propertyAwareConnection(new DriverProperties(true, true));
        OutOfMemoryError fatal = new OutOfMemoryError("synthetic property failure");
        when(((PropertyAware) connection).getPropertySet()).thenThrow(fatal);
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1")).isSameAs(fatal);
        verify(connection, never()).prepareStatement(anyString(), anyInt(), anyInt());
    }

    public interface PropertyAware { DriverProperties getPropertySet(); }
    public static final class DriverProperties {
        private final boolean cursor;
        private final boolean prepared;

        DriverProperties(boolean cursor, boolean prepared) {
            this.cursor = cursor;
            this.prepared = prepared;
        }

        public DriverProperty getBooleanProperty(String name) {
            return new DriverProperty(switch (name) {
                case "useCursorFetch" -> cursor;
                case "useServerPrepStmts" -> prepared;
                default -> throw new IllegalArgumentException("unexpected property");
            });
        }
    }
    public static final class DriverProperty {
        private final boolean value;

        DriverProperty(boolean value) { this.value = value; }
        public Boolean getValue() { return value; }
    }

    @Test
    void unqualifiedMysqlDriverCannotSilentlyFallBackToBufferedReads() throws Exception {
        Connection connection = connection("MySQL");
        when(connection.getMetaData().getDriverName()).thenReturn("Other JDBC driver");
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1"))
                .isInstanceOf(SQLException.class).hasMessage("SOURCE_DRIVER_STREAMING_UNSUPPORTED");
        verify(connection, never()).prepareStatement(anyString(), anyInt(), anyInt());
    }

    @ParameterizedTest
    @MethodSource("fetchFailures")
    void fetchConfigurationFailuresCloseStatementAndPreserveOriginalFailure(Throwable failure) throws Exception {
        Connection connection = connection("PostgreSQL");
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT 1")).thenReturn(statement);
        SQLException closeFailure = new SQLException("synthetic close failure");
        doThrow(failure).when(statement).setFetchSize(1);
        doThrow(closeFailure).when(statement).close();
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1")).isSameAs(failure);
        assertThat(failure.getSuppressed()).containsExactly(closeFailure);
        verify(statement).close();
    }

    private static Stream<Throwable> fetchFailures() {
        return Stream.of(new SQLException("synthetic fetch failure"),
                new IllegalStateException("synthetic fetch failure"),
                new OutOfMemoryError("synthetic fetch failure"));
    }

    @ParameterizedTest
    @MethodSource("nonSqlCloseFailures")
    void fatalFetchFailureRemainsFatalAcrossOrdinaryAndFatalCloseFailures(Throwable closeFailure) throws Exception {
        Connection connection = connection("PostgreSQL");
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT 1")).thenReturn(statement);
        OutOfMemoryError fatal = new OutOfMemoryError("synthetic fetch failure");
        doThrow(fatal).when(statement).setFetchSize(1);
        doThrow(closeFailure).when(statement).close();
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1")).isSameAs(fatal);
        assertThat(fatal.getSuppressed()).containsExactly(closeFailure);
        verify(statement).close();
    }

    private static Stream<Throwable> nonSqlCloseFailures() {
        return Stream.of(new IllegalStateException("synthetic close failure"),
                new AssertionError("synthetic close failure"),
                new OutOfMemoryError("synthetic close failure"));
    }

    @ParameterizedTest
    @MethodSource("ordinaryNonSqlCloseFailures")
    void ordinaryCloseFailuresRemainSuppressedUnderTheOriginalSqlFailure(Throwable closeFailure) throws Exception {
        Connection connection = connection("PostgreSQL");
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT 1")).thenReturn(statement);
        SQLException failure = new SQLException("synthetic fetch failure");
        doThrow(failure).when(statement).setFetchSize(1);
        doThrow(closeFailure).when(statement).close();
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1")).isSameAs(failure);
        assertThat(failure.getSuppressed()).containsExactly(closeFailure);
        verify(statement).close();
    }

    private static Stream<Throwable> ordinaryNonSqlCloseFailures() {
        return Stream.of(new IllegalStateException("synthetic close failure"),
                new AssertionError("synthetic close failure"));
    }

    @Test
    void theSameSqlFailureFromFetchAndCloseRemainsTheOriginalFailure() throws Exception {
        Connection connection = connection("PostgreSQL");
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT 1")).thenReturn(statement);
        SQLException failure = new SQLException("synthetic repeated failure");
        doThrow(failure).when(statement).setFetchSize(1);
        doThrow(failure).when(statement).close();
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1")).isSameAs(failure);
        assertThat(failure.getSuppressed()).isEmpty();
        verify(statement).close();
    }

    @Test
    void fatalCloseFailureCannotBeSuppressedUnderSqlFailure() throws Exception {
        Connection connection = connection("PostgreSQL");
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT 1")).thenReturn(statement);
        OutOfMemoryError fatal = new OutOfMemoryError("synthetic close failure");
        doThrow(new SQLException("synthetic fetch failure")).when(statement).setFetchSize(1);
        doThrow(fatal).when(statement).close();
        assertThatThrownBy(() -> SourceReadStatements.prepare(connection, "SELECT 1")).isSameAs(fatal);
        verify(statement).close();
    }

    private static Connection propertyAwareConnection(DriverProperties properties) throws Exception {
        Connection connection = mock(Connection.class, withSettings().extraInterfaces(PropertyAware.class));
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("MySQL");
        when(metadata.getDriverName()).thenReturn("MySQL Connector/J");
        when(((PropertyAware) connection).getPropertySet()).thenReturn(properties);
        return connection;
    }

    private static Connection connection(String product) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn(product);
        when(metadata.getDriverName()).thenReturn("MySQL Connector/J");
        return connection;
    }
}
