package nuri.migration.jdbc;

import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.SQLException;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class ExternalDriverDataSourceTest {

    @Test
    void connectsWithRequestedPropertiesInsideDriverContextAndRestoresCallerContext() throws Exception {
        Driver driver = mock(Driver.class);
        Connection connection = mock(Connection.class);
        ClassLoader isolated = new ClassLoader(ClassLoader.getPlatformClassLoader()) {};
        ClassLoader caller = Thread.currentThread().getContextClassLoader();
        given(driver.connect(eq("jdbc:vendor:source"), any(Properties.class))).willAnswer(invocation -> {
            assertThat(Thread.currentThread().getContextClassLoader()).isSameAs(isolated);
            Properties properties = invocation.getArgument(1);
            assertThat(properties).containsEntry("user", "requested-user")
                    .containsEntry("password", "requested-password");
            return connection;
        });
        ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                driver, isolated, "jdbc:vendor:source", "default-user", "default-password");

        assertThat(dataSource.getConnection("requested-user", "requested-password"))
                .isSameAs(connection);
        assertThat(Thread.currentThread().getContextClassLoader()).isSameAs(caller);
        assertThat(dataSource.closeConnections()).isTrue();
        verify(connection).close();
    }

    @Test
    void nullCredentialsStayAbsentAndNullOrThrowingDriverResultIsSanitized() throws Exception {
        Driver driver = mock(Driver.class);
        given(driver.connect(eq("jdbc:vendor:source"), any(Properties.class))).willAnswer(invocation -> {
            assertThat((Properties) invocation.getArgument(1)).isEmpty();
            return null;
        });
        ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                driver, getClass().getClassLoader(), "jdbc:vendor:source", null, null);

        assertThatThrownBy(dataSource::getConnection)
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining("jdbc:vendor:source");

        given(driver.connect(eq("jdbc:vendor:source"), any(Properties.class)))
                .willThrow(new SQLException("sentinel-url-user-password"));
        assertThatThrownBy(dataSource::getConnection)
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining("sentinel");
    }

    @Test
    void nonFatalErrorsAreSanitizedButJvmFatalErrorsAreRethrown() throws Exception {
        Driver driver = mock(Driver.class);
        ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                driver, getClass().getClassLoader(),
                "jdbc:vendor:sentinel", "sentinel-user", "sentinel-password");
        given(driver.connect(any(), any())).willThrow(
                new AssertionError("sentinel-private-assertion"));

        assertThatThrownBy(dataSource::getConnection)
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining("sentinel");

        OutOfMemoryError fatal = new OutOfMemoryError("synthetic-fatal");
        reset(driver);
        given(driver.connect(any(), any())).willThrow(fatal);
        assertThatThrownBy(dataSource::getConnection).isSameAs(fatal);
    }

    @Test
    void closeIsIdempotentAndReportsConnectionCloseFailureWithoutCause() throws Exception {
        Driver driver = mock(Driver.class);
        Connection connection = mock(Connection.class);
        given(driver.connect(any(), any())).willReturn(connection);
        doThrow(new SQLException("sentinel-close-cause")).when(connection).close();
        ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                driver, getClass().getClassLoader(), "jdbc:vendor:source", "user", "password");
        dataSource.getConnection();

        assertThat(dataSource.closeConnections()).isFalse();
        assertThat(dataSource.closeConnections()).isTrue();
        verify(connection, times(1)).close();
        assertThatThrownBy(dataSource::getConnection)
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause();
    }

    @Test
    void dataSourceAdministrativeSurfaceIsFailClosedAndRedacted() throws Exception {
        ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                mock(Driver.class), getClass().getClassLoader(),
                "jdbc:sentinel:url", "sentinel-user", "sentinel-password");

        assertThat(dataSource.getLogWriter()).isNull();
        dataSource.setLogWriter(null);
        assertThatThrownBy(() -> dataSource.setLogWriter(new PrintWriter(System.out)))
                .isInstanceOf(SQLException.class);
        dataSource.setLoginTimeout(17);
        assertThat(dataSource.getLoginTimeout()).isEqualTo(17);
        assertThatThrownBy(() -> dataSource.setLoginTimeout(-1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(dataSource.getParentLogger().getName()).isEqualTo("nuri.migration.jdbc.external");
        assertThat(dataSource.isWrapperFor(ExternalDriverDataSource.class)).isTrue();
        assertThat(dataSource.isWrapperFor(null)).isFalse();
        assertThat(dataSource.unwrap(ExternalDriverDataSource.class)).isSameAs(dataSource);
        assertThatThrownBy(() -> dataSource.unwrap(String.class)).isInstanceOf(SQLException.class);
        assertThat(dataSource.toString())
                .doesNotContain("jdbc:sentinel:url", "sentinel-user", "sentinel-password");
    }
}
