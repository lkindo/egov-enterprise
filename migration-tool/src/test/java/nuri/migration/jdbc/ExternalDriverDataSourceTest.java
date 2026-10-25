package nuri.migration.jdbc;

import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
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
    void connectFailureLeavesOnlyAFixedClassificationAndNeverItsCause() throws Exception {
        Map<Throwable, ConnectionFailureDiagnostic> cases = Map.ofEntries(
                Map.entry(new SQLException("sentinel-vendor-text", "28000"), ConnectionFailureDiagnostic.AUTH_FAILED),
                Map.entry(new SQLException("sentinel-vendor-text", "08S01", new UnknownHostException("sentinel-host")),
                        ConnectionFailureDiagnostic.HOST_NOT_FOUND),
                Map.entry(new SQLException("sentinel-vendor-text", "08001", new ConnectException("sentinel-host")),
                        ConnectionFailureDiagnostic.CONNECTION_REFUSED),
                Map.entry(new SQLException("PKIX path building failed sentinel-chain", "08S01"),
                        ConnectionFailureDiagnostic.TLS_CERTIFICATE),
                Map.entry(new RuntimeException("sentinel-wrapper", new SQLException("sentinel-vendor-text", "3D000")),
                        ConnectionFailureDiagnostic.DATABASE_NOT_FOUND),
                // Driver.connect 단계의 시간 초과는 로그인 시간 초과다.
                Map.entry(new SQLTimeoutException("sentinel-vendor-text"), ConnectionFailureDiagnostic.CONNECTION_TIMEOUT),
                Map.entry(new NoClassDefFoundError("sentinel-class"), ConnectionFailureDiagnostic.DRIVER_UNAVAILABLE),
                // 실측 근거 없는 vendor 상태 코드(예: SQL Server S0001, Oracle 72000)는 인증 실패로 넓히지 않는다.
                Map.entry(new SQLException("sentinel-vendor-text", "S0001"), ConnectionFailureDiagnostic.UNCLASSIFIED),
                Map.entry(new SQLException("sentinel-vendor-text", "72000"), ConnectionFailureDiagnostic.UNCLASSIFIED),
                Map.entry(new IllegalStateException("sentinel-vendor-text"), ConnectionFailureDiagnostic.UNCLASSIFIED));

        for (Map.Entry<Throwable, ConnectionFailureDiagnostic> entry : cases.entrySet()) {
            assertThat(connectFailure(entry.getKey()).diagnostic())
                    .as(entry.getKey().getClass().getSimpleName()).isEqualTo(entry.getValue());
        }
    }

    @Test
    void connectFailureIsClassifiedInsideTheDriverContext() throws Exception {
        ClassLoader isolated = new ClassLoader(ClassLoader.getPlatformClassLoader()) {};
        ClassLoader caller = Thread.currentThread().getContextClassLoader();
        List<ClassLoader> observed = new ArrayList<>();
        SQLException vendor = new SQLException("sentinel-vendor-text", "28P01") {
            @Override
            public String getSQLState() {
                observed.add(Thread.currentThread().getContextClassLoader());
                return super.getSQLState();
            }
        };
        Driver driver = mock(Driver.class);
        given(driver.connect(any(), any())).willThrow(vendor);
        ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                driver, isolated, "jdbc:vendor:sentinel-url", "sentinel-user", "sentinel-password");

        assertThatThrownBy(dataSource::getConnection)
                .isInstanceOfSatisfying(SourceDriverException.class, failure -> assertThat(failure.diagnostic())
                        .isEqualTo(ConnectionFailureDiagnostic.AUTH_FAILED))
                .hasNoCause();
        assertThat(observed).isNotEmpty().allMatch(loader -> loader == isolated);
        assertThat(Thread.currentThread().getContextClassLoader()).isSameAs(caller);
    }

    @Test
    void unreadableVendorFailureIsUnclassifiedButJvmFatalAccessorErrorsAreRethrown() throws Exception {
        SQLException hostile = new SQLException("sentinel-vendor-text") {
            @Override
            public String getSQLState() {
                throw new IllegalStateException("sentinel-accessor");
            }
        };
        assertThat(connectFailure(hostile).diagnostic()).isEqualTo(ConnectionFailureDiagnostic.UNCLASSIFIED);

        OutOfMemoryError fatal = new OutOfMemoryError("synthetic-fatal");
        SQLException fatalAccessor = new SQLException("sentinel-vendor-text") {
            @Override
            public String getSQLState() {
                throw fatal;
            }
        };
        Driver driver = mock(Driver.class);
        given(driver.connect(any(), any())).willThrow(fatalAccessor);
        ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                driver, getClass().getClassLoader(), "jdbc:vendor:source", "user", "password");
        assertThatThrownBy(dataSource::getConnection).isSameAs(fatal);
    }

    @Test
    void fixedFailuresCarryTheirOwnClassification() {
        assertThat(SourceDriverException.configuration().diagnostic()).isEqualTo(ConnectionFailureDiagnostic.DRIVER_UNAVAILABLE);
        assertThat(SourceDriverException.loading().diagnostic()).isEqualTo(ConnectionFailureDiagnostic.DRIVER_UNAVAILABLE);
        assertThat(SourceDriverException.policy().diagnostic()).isEqualTo(ConnectionFailureDiagnostic.UNCLASSIFIED);
        assertThat(SourceDriverException.connection().diagnostic()).isEqualTo(ConnectionFailureDiagnostic.UNCLASSIFIED);
        assertThat(SourceDriverException.connection(null).diagnostic()).isEqualTo(ConnectionFailureDiagnostic.UNCLASSIFIED);
        assertThat(SourceDriverException.closed().diagnostic()).isEqualTo(ConnectionFailureDiagnostic.UNCLASSIFIED);
        assertThat(SourceDriverException.cleanup().diagnostic()).isEqualTo(ConnectionFailureDiagnostic.UNCLASSIFIED);
        SourceDriverException classified = SourceDriverException.connection(ConnectionFailureDiagnostic.TLS_UNSUPPORTED);
        assertThat(classified).hasNoCause().hasMessage("source JDBC connection을 생성하지 못했습니다.");
        assertThat(classified.diagnostic()).isEqualTo(ConnectionFailureDiagnostic.TLS_UNSUPPORTED);
    }

    /** 외부 driver 가 던진 실패를 경계에 통과시키고, 원문·원인·접속값이 남지 않았는지 확인한 뒤 돌려준다. */
    private SourceDriverException connectFailure(Throwable vendorFailure) throws Exception {
        Driver driver = mock(Driver.class);
        given(driver.connect(any(), any())).willThrow(vendorFailure);
        ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                driver, getClass().getClassLoader(), "jdbc:vendor:sentinel-url", "sentinel-user", "sentinel-password");

        Throwable failure = catchThrowable(dataSource::getConnection);

        assertThat(failure).isInstanceOf(SourceDriverException.class).hasNoCause()
                .hasMessage("source JDBC connection을 생성하지 못했습니다.");
        assertThat(failure.getSuppressed()).isEmpty();
        StringWriter trace = new StringWriter();
        failure.printStackTrace(new PrintWriter(trace));
        assertThat(trace.toString()).doesNotContain("sentinel");
        return (SourceDriverException) failure;
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
