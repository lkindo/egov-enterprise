package nuri.migration;

import nuri.migration.jdbc.SourceDriverException;

import javax.net.ssl.SSLPeerUnverifiedException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.security.cert.CertificateException;
import java.security.cert.CertPathValidatorException;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Locale;
import java.util.Set;

/** Fixed public diagnostics only. Never return provider text, SQL, endpoints, or the cause chain. */
enum WorkflowFailureDiagnostic {
    DB_TLS_UNSUPPORTED,
    DB_TLS_CERTIFICATE,
    DB_AUTH_FAILED,
    DB_DATABASE_NOT_FOUND,
    DB_ACCESS_DENIED,
    DB_CONNECTION_REFUSED,
    DB_CONNECTION_TIMEOUT,
    DB_HOST_NOT_FOUND,
    DB_DRIVER_UNAVAILABLE,
    CLI_FAILED;

    static WorkflowFailureDiagnostic classify(Throwable failure) {
        try {
            return inspect(failure);
        } catch (VirtualMachineError fatal) {
            throw fatal;
        } catch (Throwable unreadable) {
            if ("java.lang.ThreadDeath".equals(unreadable.getClass().getName())) throw (Error) unreadable;
            // Even a vendor exception accessor is untrusted; diagnostics must not expose a new cause.
            return CLI_FAILED;
        }
    }

    private static WorkflowFailureDiagnostic inspect(Throwable failure) {
        ArrayDeque<Throwable> pending = new ArrayDeque<>();
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        if (failure != null) pending.add(failure);
        while (!pending.isEmpty() && seen.size() < 32) {
            Throwable current = pending.removeFirst();
            if (!seen.add(current)) continue;
            WorkflowFailureDiagnostic result = known(current);
            if (result != CLI_FAILED) return result;
            if (current.getCause() != null) pending.addLast(current.getCause());
            if (current instanceof SQLException sql && sql.getNextException() != null) {
                pending.addLast(sql.getNextException());
            }
        }
        return CLI_FAILED;
    }

    private static WorkflowFailureDiagnostic known(Throwable failure) {
        if (failure instanceof UnknownHostException) return DB_HOST_NOT_FOUND;
        if (failure instanceof SocketTimeoutException || failure instanceof SQLTimeoutException) {
            return DB_CONNECTION_TIMEOUT;
        }
        if (failure instanceof ConnectException) return DB_CONNECTION_REFUSED;
        if (failure instanceof CertificateException || failure instanceof CertPathValidatorException
                || failure instanceof SSLPeerUnverifiedException) return DB_TLS_CERTIFICATE;
        if (failure instanceof ClassNotFoundException || failure instanceof NoClassDefFoundError) {
            return DB_DRIVER_UNAVAILABLE;
        }
        String message = failure.getMessage();
        if (message != null && message.length() > 4096) message = message.substring(0, 4096);
        if (failure instanceof SourceDriverException && ("source driver 설정이 유효하지 않습니다.".equals(message)
                || "source driver를 격리 경계에서 로드하지 못했습니다.".equals(message))) {
            return DB_DRIVER_UNAVAILABLE;
        }
        if (failure instanceof SQLException sql) {
            String state = sql.getSQLState();
            if (state != null && state.length() == 5 && state.matches("28[A-Z0-9]{3}")) return DB_AUTH_FAILED;
            if ("3D000".equals(state)) return DB_DATABASE_NOT_FOUND;
            if ("42501".equals(state)) return DB_ACCESS_DENIED;
            // Driver text is examined only inside the SQL connection boundary, never returned.
            if (state != null && state.length() == 5 && state.startsWith("08") && message != null) {
                String lower = message.toLowerCase(Locale.ROOT);
                // pgjdbc's bundled messages_ko translates this same connection rejection.
                if (lower.contains("server does not support ssl")
                        || lower.contains("서버가 ssl을 지원하지 않습니다.")) return DB_TLS_UNSUPPORTED;
                if (lower.contains("could not open ssl root certificate file")
                        || lower.contains("could not be verified by hostnameverifier")
                        || lower.contains("pkix path building failed")
                        || lower.contains("unable to find valid certification path")) return DB_TLS_CERTIFICATE;
                if (lower.contains("connection refused")) return DB_CONNECTION_REFUSED;
                if (lower.contains("connect timed out") || lower.contains("connection timed out")) {
                    return DB_CONNECTION_TIMEOUT;
                }
            }
        }
        return CLI_FAILED;
    }
}
