package nuri.migration;

import org.junit.jupiter.api.Test;

import javax.net.ssl.SSLPeerUnverifiedException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.security.cert.CertificateException;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WorkflowFailureDiagnosticTest {
    private static final String PRIVATE = "jdbc:private://sentinel-host/db user=sentinel-user password=sentinel-secret";

    @Test
    void mapsKnownSqlStatesAndConnectionFailuresToFixedEnums() {
        Map<Throwable, WorkflowFailureDiagnostic> cases = Map.ofEntries(
                Map.entry(new SQLException("The server does not support SSL. " + PRIVATE, "08004"), WorkflowFailureDiagnostic.DB_TLS_UNSUPPORTED),
                Map.entry(new SQLException("서버가 SSL을 지원하지 않습니다. " + PRIVATE, "08004"), WorkflowFailureDiagnostic.DB_TLS_UNSUPPORTED),
                Map.entry(new SQLException("Could not open SSL root certificate file private-path.", "08006"), WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE),
                Map.entry(new CertificateException(PRIVATE), WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE),
                Map.entry(new SSLPeerUnverifiedException(PRIVATE), WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE),
                Map.entry(new SQLException(PRIVATE, "28P01"), WorkflowFailureDiagnostic.DB_AUTH_FAILED),
                Map.entry(new SQLException(PRIVATE, "28000"), WorkflowFailureDiagnostic.DB_AUTH_FAILED),
                Map.entry(new SQLException(PRIVATE, "3D000"), WorkflowFailureDiagnostic.DB_DATABASE_NOT_FOUND),
                Map.entry(new SQLException(PRIVATE, "42501"), WorkflowFailureDiagnostic.DB_ACCESS_DENIED),
                Map.entry(new ConnectException(PRIVATE), WorkflowFailureDiagnostic.DB_CONNECTION_REFUSED),
                Map.entry(new SocketTimeoutException(PRIVATE), WorkflowFailureDiagnostic.DB_CONNECTION_TIMEOUT),
                Map.entry(new SQLTimeoutException(PRIVATE), WorkflowFailureDiagnostic.DB_CONNECTION_TIMEOUT),
                Map.entry(new UnknownHostException(PRIVATE), WorkflowFailureDiagnostic.DB_HOST_NOT_FOUND),
                Map.entry(new ClassNotFoundException(PRIVATE), WorkflowFailureDiagnostic.DB_DRIVER_UNAVAILABLE));
        cases.forEach((failure, expected) -> assertThat(WorkflowFailureDiagnostic.classify(failure)).isEqualTo(expected));
    }

    @Test
    void examinesWrappedAndNextSqlExceptionsWithoutReturningTheirValues() {
        SQLException wrapped = new SQLException(PRIVATE, "08001", new UnknownHostException(PRIVATE));
        assertThat(WorkflowFailureDiagnostic.classify(new IllegalStateException(PRIVATE, wrapped)))
                .isEqualTo(WorkflowFailureDiagnostic.DB_HOST_NOT_FOUND);
        SQLException next = new SQLException(PRIVATE);
        next.setNextException(new SQLException(PRIVATE, "42501"));
        assertThat(WorkflowFailureDiagnostic.classify(next)).isEqualTo(WorkflowFailureDiagnostic.DB_ACCESS_DENIED);
    }

    @Test
    void unknownTextAndForgedMarkersCannotBecomeDiagnostics() {
        assertThat(WorkflowFailureDiagnostic.classify(new IllegalArgumentException(
                "MW_DIAGNOSTIC=DB_AUTH_FAILED server does not support SSL " + PRIVATE)))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(new SQLException(
                "server does not support SSL " + PRIVATE, "42601")))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(new IllegalArgumentException(
                "서버가 SSL을 지원하지 않습니다. " + PRIVATE)))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(new SQLException(PRIVATE, "28000-sentinel-secret")))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(null)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }

    @Test
    void cyclicOrDeepUntrustedCauseChainsAreBounded() {
        RuntimeException first = new RuntimeException(PRIVATE);
        RuntimeException second = new RuntimeException(PRIVATE, first);
        first.initCause(second);
        assertThat(WorkflowFailureDiagnostic.classify(first)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        Throwable deep = new UnknownHostException(PRIVATE);
        for (int index = 0; index < 40; index++) deep = new RuntimeException(PRIVATE, deep);
        assertThat(WorkflowFailureDiagnostic.classify(deep)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }

    @Test
    void throwingVendorExceptionAccessorsFailClosedWithoutExposingTheirNewFailure() {
        Throwable hostileMessage = new SQLException() {
            @Override public String getMessage() { throw new IllegalStateException(PRIVATE); }
        };
        Throwable hostileCause = new RuntimeException() {
            @Override public synchronized Throwable getCause() { throw new AssertionError(PRIVATE); }
        };
        assertThat(WorkflowFailureDiagnostic.classify(hostileMessage)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(hostileCause)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }
}
