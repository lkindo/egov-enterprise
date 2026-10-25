package nuri.migration.jdbc;

import javax.net.ssl.SSLPeerUnverifiedException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.security.cert.CertPathValidatorException;
import java.security.cert.CertificateException;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Locale;
import java.util.Set;

/**
 * 접속 실패의 고정 분류. 예외 타입·SQLState·접속 오류(08) 안의 고정 문구만 보고,
 * driver 문구·SQL·접속 주소·원인 사슬은 돌려주지 않는다. 분류 규칙은 이 한 곳에만 둔다.
 * 외부 driver 는 격리 경계 안에서 한 번 분류한 뒤 원인 예외를 버리고 {@link SourceDriverException#diagnostic()} 만 넘긴다.
 */
public enum ConnectionFailureDiagnostic {
    TLS_UNSUPPORTED,
    TLS_CERTIFICATE,
    AUTH_FAILED,
    DATABASE_NOT_FOUND,
    ACCESS_DENIED,
    CONNECTION_REFUSED,
    CONNECTION_TIMEOUT,
    HOST_NOT_FOUND,
    DRIVER_UNAVAILABLE,
    UNCLASSIFIED;

    private static final int CHAIN_LIMIT = 32;
    private static final int MESSAGE_LIMIT = 4096;

    /**
     * 단계를 모르는 실패를 분류한다. {@link SQLTimeoutException} 은 문장 시간 초과일 수 있어
     * 접속 시간 초과로 보지 않는다.
     */
    public static ConnectionFailureDiagnostic classify(Throwable failure) {
        return safely(failure, false);
    }

    /** {@code Driver.connect} 가 던진 실패만 분류한다. 이 단계의 {@link SQLTimeoutException} 은 접속 시간 초과다. */
    static ConnectionFailureDiagnostic classifyConnecting(Throwable failure) {
        return safely(failure, true);
    }

    private static ConnectionFailureDiagnostic safely(Throwable failure, boolean connecting) {
        try {
            return inspect(failure, connecting);
        } catch (Throwable unreadable) {
            JvmFailureBoundary.rethrowIfFatal(unreadable);
            // vendor 예외의 접근자도 신뢰하지 않는다. 진단이 새 원인을 드러내지 않게 미분류로 닫는다.
            return UNCLASSIFIED;
        }
    }

    private static ConnectionFailureDiagnostic inspect(Throwable failure, boolean connecting) {
        ArrayDeque<Throwable> pending = new ArrayDeque<>();
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        if (failure != null) pending.add(failure);
        while (!pending.isEmpty() && seen.size() < CHAIN_LIMIT) {
            Throwable current = pending.removeFirst();
            if (!seen.add(current)) continue;
            ConnectionFailureDiagnostic result = known(current, connecting);
            if (result != UNCLASSIFIED) return result;
            Throwable cause = current.getCause();
            if (cause != null) pending.addLast(cause);
            if (current instanceof SQLException sql) {
                SQLException next = sql.getNextException();
                if (next != null) pending.addLast(next);
            }
        }
        return UNCLASSIFIED;
    }

    private static ConnectionFailureDiagnostic known(Throwable failure, boolean connecting) {
        // 격리 경계가 이미 고정 분류로 바꾼 실패다. 원문을 다시 보지 않는다.
        if (failure instanceof SourceDriverException driver) return driver.diagnostic();
        if (failure instanceof UnknownHostException) return HOST_NOT_FOUND;
        if (failure instanceof SocketTimeoutException) return CONNECTION_TIMEOUT;
        if (connecting && failure instanceof SQLTimeoutException) return CONNECTION_TIMEOUT;
        if (failure instanceof ConnectException) return CONNECTION_REFUSED;
        if (failure instanceof CertificateException || failure instanceof CertPathValidatorException
                || failure instanceof SSLPeerUnverifiedException) return TLS_CERTIFICATE;
        if (failure instanceof ClassNotFoundException || failure instanceof NoClassDefFoundError) {
            return DRIVER_UNAVAILABLE;
        }
        if (!(failure instanceof SQLException sql)) return UNCLASSIFIED;
        String state = sql.getSQLState();
        if (state == null || state.length() != 5) return UNCLASSIFIED;
        if (state.matches("28[A-Z0-9]{3}")) return AUTH_FAILED;
        if ("3D000".equals(state)) return DATABASE_NOT_FOUND;
        if ("42501".equals(state)) return ACCESS_DENIED;
        if (!state.startsWith("08")) return UNCLASSIFIED;
        // driver 문구는 SQL 접속 오류(08) 안에서만 보고 돌려주지 않는다.
        String message = sql.getMessage();
        if (message == null) return UNCLASSIFIED;
        if (message.length() > MESSAGE_LIMIT) message = message.substring(0, MESSAGE_LIMIT);
        String lower = message.toLowerCase(Locale.ROOT);
        // pgjdbc 에 들어 있는 messages_ko 는 같은 접속 거부를 이렇게 옮긴다.
        if (lower.contains("server does not support ssl")
                || lower.contains("서버가 ssl을 지원하지 않습니다.")) return TLS_UNSUPPORTED;
        if (lower.contains("could not open ssl root certificate file")
                || lower.contains("could not be verified by hostnameverifier")
                || lower.contains("pkix path building failed")
                || lower.contains("unable to find valid certification path")) return TLS_CERTIFICATE;
        if (lower.contains("connection refused")) return CONNECTION_REFUSED;
        if (lower.contains("connect timed out") || lower.contains("connection timed out")) {
            return CONNECTION_TIMEOUT;
        }
        return UNCLASSIFIED;
    }
}
