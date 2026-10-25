package nuri.migration;

import nuri.migration.jdbc.ConnectionFailureDiagnostic;

/**
 * Fixed public diagnostics only. Never return provider text, SQL, endpoints, or the cause chain.
 * 분류 규칙은 {@link ConnectionFailureDiagnostic} 한 곳에 있고, 여기서는 공개 코드 이름으로만 옮긴다.
 */
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
        return of(ConnectionFailureDiagnostic.classify(failure));
    }

    /** 분류 하나에 공개 코드 하나다. 분류가 늘면 이 switch 가 컴파일에서 막는다. */
    static WorkflowFailureDiagnostic of(ConnectionFailureDiagnostic diagnostic) {
        return switch (diagnostic) {
            case TLS_UNSUPPORTED -> DB_TLS_UNSUPPORTED;
            case TLS_CERTIFICATE -> DB_TLS_CERTIFICATE;
            case AUTH_FAILED -> DB_AUTH_FAILED;
            case DATABASE_NOT_FOUND -> DB_DATABASE_NOT_FOUND;
            case ACCESS_DENIED -> DB_ACCESS_DENIED;
            case CONNECTION_REFUSED -> DB_CONNECTION_REFUSED;
            case CONNECTION_TIMEOUT -> DB_CONNECTION_TIMEOUT;
            case HOST_NOT_FOUND -> DB_HOST_NOT_FOUND;
            case DRIVER_UNAVAILABLE -> DB_DRIVER_UNAVAILABLE;
            case UNCLASSIFIED -> CLI_FAILED;
        };
    }
}
