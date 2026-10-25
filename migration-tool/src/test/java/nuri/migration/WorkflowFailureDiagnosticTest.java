package nuri.migration;

import nuri.migration.jdbc.ConnectionFailureDiagnostic;
import nuri.migration.jdbc.LocalDriverJarPolicy;
import nuri.migration.jdbc.SourceJdbcEndpointFactory;
import nuri.migration.source.SourceIntrospector;
import org.junit.jupiter.api.Test;

import javax.net.ssl.SSLPeerUnverifiedException;
import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.security.cert.CertPathValidatorException;
import java.security.cert.CertificateException;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.mock;

class WorkflowFailureDiagnosticTest {
    private static final String PRIVATE = "jdbc:private://sentinel-host/db user=sentinel-user password=sentinel-secret";

    /** 접속 오류(08) 안에서만 보는 고정 문구와 그 문구가 가리키는 공개 코드. */
    private static final Map<String, WorkflowFailureDiagnostic> CONNECTION_MESSAGES = Map.of(
            "The server does not support SSL.", WorkflowFailureDiagnostic.DB_TLS_UNSUPPORTED,
            "서버가 SSL을 지원하지 않습니다.", WorkflowFailureDiagnostic.DB_TLS_UNSUPPORTED,
            "Could not open SSL root certificate file private-path.", WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE,
            "The hostname private-host could not be verified by hostnameverifier PgjdbcHostnameVerifier.",
            WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE,
            "PKIX path building failed: private-chain", WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE,
            "unable to find valid certification path to requested target", WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE,
            "Connection refused: private-host:5432", WorkflowFailureDiagnostic.DB_CONNECTION_REFUSED,
            "Connect timed out", WorkflowFailureDiagnostic.DB_CONNECTION_TIMEOUT,
            "Connection timed out: getsockopt", WorkflowFailureDiagnostic.DB_CONNECTION_TIMEOUT);

    @Test
    void mapsEveryExceptionTypeBranchToItsFixedCode() {
        Map<Throwable, WorkflowFailureDiagnostic> cases = Map.ofEntries(
                Map.entry(new UnknownHostException(PRIVATE), WorkflowFailureDiagnostic.DB_HOST_NOT_FOUND),
                Map.entry(new SocketTimeoutException(PRIVATE), WorkflowFailureDiagnostic.DB_CONNECTION_TIMEOUT),
                Map.entry(new ConnectException(PRIVATE), WorkflowFailureDiagnostic.DB_CONNECTION_REFUSED),
                Map.entry(new CertificateException(PRIVATE), WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE),
                Map.entry(new CertPathValidatorException(PRIVATE), WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE),
                Map.entry(new SSLPeerUnverifiedException(PRIVATE), WorkflowFailureDiagnostic.DB_TLS_CERTIFICATE),
                Map.entry(new ClassNotFoundException(PRIVATE), WorkflowFailureDiagnostic.DB_DRIVER_UNAVAILABLE),
                Map.entry(new NoClassDefFoundError(PRIVATE), WorkflowFailureDiagnostic.DB_DRIVER_UNAVAILABLE));
        cases.forEach((failure, expected) -> assertThat(WorkflowFailureDiagnostic.classify(failure))
                .as(failure.getClass().getSimpleName()).isEqualTo(expected));
        // 같은 계열이지만 분기에 없는 타입은 분류되지 않는다.
        assertThat(WorkflowFailureDiagnostic.classify(new IOException(PRIVATE)))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(new java.net.SocketException(PRIVATE)))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }

    @Test
    void mapsOnlyExactSqlStatesToFixedCodes() {
        Map<String, WorkflowFailureDiagnostic> states = Map.of(
                "28P01", WorkflowFailureDiagnostic.DB_AUTH_FAILED,
                "28000", WorkflowFailureDiagnostic.DB_AUTH_FAILED,
                "3D000", WorkflowFailureDiagnostic.DB_DATABASE_NOT_FOUND,
                "42501", WorkflowFailureDiagnostic.DB_ACCESS_DENIED);
        states.forEach((state, expected) -> assertThat(WorkflowFailureDiagnostic.classify(new SQLException(PRIVATE, state)))
                .as(state).isEqualTo(expected));
        for (String near : List.of("28000-sentinel-secret", "2800", "28p01", "38000", "3D001", "42502", "42000")) {
            assertThat(WorkflowFailureDiagnostic.classify(new SQLException(PRIVATE, near)))
                    .as(near).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        }
        assertThat(WorkflowFailureDiagnostic.classify(new SQLException(PRIVATE)))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }

    @Test
    void connectionMessagesCountOnlyInsideSqlStateClass08() {
        CONNECTION_MESSAGES.forEach((message, expected) -> {
            for (String state : List.of("08001", "08004", "08006", "08S01")) {
                assertThat(WorkflowFailureDiagnostic.classify(new SQLException(message + " " + PRIVATE, state)))
                        .as(message + " " + state).isEqualTo(expected);
            }
            // 08 밖의 SQLState, SQLState 없음, SQLException 이 아닌 예외는 같은 문구여도 분류하지 않는다.
            assertThat(WorkflowFailureDiagnostic.classify(new SQLException(message + " " + PRIVATE, "42601")))
                    .as(message).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
            assertThat(WorkflowFailureDiagnostic.classify(new SQLException(message + " " + PRIVATE)))
                    .as(message).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
            assertThat(WorkflowFailureDiagnostic.classify(new IllegalStateException(message + " " + PRIVATE)))
                    .as(message).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        });
        assertThat(WorkflowFailureDiagnostic.classify(new SQLException("The connection attempt failed. " + PRIVATE, "08001")))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(new SQLException(null, "08001")))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }

    @Test
    void readsOnlyTheFirst4096CharactersOfADriverMessage() {
        String keyword = "connection refused";
        String inside = "x".repeat(4096 - keyword.length()) + keyword;
        String straddling = "x".repeat(4096 - keyword.length() + 1) + keyword;
        String beyond = "x".repeat(4096) + keyword;

        assertThat(WorkflowFailureDiagnostic.classify(new SQLException(inside, "08001")))
                .isEqualTo(WorkflowFailureDiagnostic.DB_CONNECTION_REFUSED);
        assertThat(WorkflowFailureDiagnostic.classify(new SQLException(straddling, "08001")))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(new SQLException(beyond, "08001")))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }

    @Test
    void sqlTimeoutOutsideTheConnectBoundaryIsNotReportedAsConnectionTimeout() {
        // 단계를 모르는 SQLTimeoutException 은 문장 시간 초과일 수 있다. 접속 단계 분류는 외부 driver 경계 시험이 본다.
        assertThat(WorkflowFailureDiagnostic.classify(new SQLTimeoutException(PRIVATE)))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(new SQLTimeoutException(PRIVATE, "57014")))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        // 원인 사슬에 네트워크 시간 초과가 있으면 그것으로 분류한다.
        assertThat(WorkflowFailureDiagnostic.classify(new SQLTimeoutException(PRIVATE, null,
                new SocketTimeoutException(PRIVATE)))).isEqualTo(WorkflowFailureDiagnostic.DB_CONNECTION_TIMEOUT);
    }

    @Test
    void sourceDriverFailuresAreClassifiedByTheirFixedKindNotTheirText() {
        Throwable configuration = catchThrowable(() -> new SourceJdbcEndpointFactory(mock(SourceIntrospector.class))
                .open(null, List.of(), null));
        Throwable policy = catchThrowable(() -> new LocalDriverJarPolicy().validate(List.of()));

        assertThat(WorkflowFailureDiagnostic.classify(configuration)).isEqualTo(WorkflowFailureDiagnostic.DB_DRIVER_UNAVAILABLE);
        assertThat(WorkflowFailureDiagnostic.classify(new IllegalStateException(PRIVATE, configuration)))
                .isEqualTo(WorkflowFailureDiagnostic.DB_DRIVER_UNAVAILABLE);
        assertThat(WorkflowFailureDiagnostic.classify(policy)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        // 같은 문구를 흉내 낸 다른 예외는 driver 준비 실패가 아니다.
        assertThat(WorkflowFailureDiagnostic.classify(new IllegalStateException(configuration.getMessage())))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }

    @Test
    void everyConnectionClassificationHasExactlyOnePublicCode() {
        EnumSet<WorkflowFailureDiagnostic> reached = EnumSet.noneOf(WorkflowFailureDiagnostic.class);
        for (ConnectionFailureDiagnostic diagnostic : ConnectionFailureDiagnostic.values()) {
            WorkflowFailureDiagnostic code = WorkflowFailureDiagnostic.of(diagnostic);
            assertThat(code.name()).as(diagnostic.name()).isEqualTo(
                    diagnostic == ConnectionFailureDiagnostic.UNCLASSIFIED ? "CLI_FAILED" : "DB_" + diagnostic.name());
            assertThat(reached.add(code)).as("public code %s is reached once", code).isTrue();
        }
        assertThat(reached).containsExactlyInAnyOrder(WorkflowFailureDiagnostic.values());
        assertThat(Arrays.stream(WorkflowFailureDiagnostic.values()).map(Enum::name))
                .allMatch(name -> name.matches("[A-Z_]+")).noneMatch(name -> name.contains("sentinel"));
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
        assertThat(WorkflowFailureDiagnostic.classify(new SQLException("MW_DIAGNOSTIC=DB_AUTH_FAILED " + PRIVATE, "08001")))
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
        // 사슬은 앞에서부터 32개까지만 본다 — 32번째는 분류하고 33번째는 보지 않는다.
        Throwable reachable = new UnknownHostException(PRIVATE);
        for (int index = 0; index < 31; index++) reachable = new RuntimeException(PRIVATE, reachable);
        assertThat(WorkflowFailureDiagnostic.classify(reachable)).isEqualTo(WorkflowFailureDiagnostic.DB_HOST_NOT_FOUND);
        assertThat(WorkflowFailureDiagnostic.classify(new RuntimeException(PRIVATE, reachable)))
                .isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }

    @Test
    void throwingVendorExceptionAccessorsFailClosedWithoutExposingTheirNewFailure() {
        Throwable hostileMessage = new SQLException(null, "08001") {
            @Override public String getMessage() { throw new IllegalStateException(PRIVATE); }
        };
        Throwable hostileState = new SQLException(PRIVATE) {
            @Override public String getSQLState() { throw new IllegalStateException(PRIVATE); }
        };
        Throwable hostileCause = new RuntimeException() {
            @Override public synchronized Throwable getCause() { throw new AssertionError(PRIVATE); }
        };
        Throwable hostileNext = new SQLException(PRIVATE) {
            @Override public SQLException getNextException() { throw new IllegalStateException(PRIVATE); }
        };
        assertThat(WorkflowFailureDiagnostic.classify(hostileMessage)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(hostileState)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(hostileCause)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
        assertThat(WorkflowFailureDiagnostic.classify(hostileNext)).isEqualTo(WorkflowFailureDiagnostic.CLI_FAILED);
    }
}
