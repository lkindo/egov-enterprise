package nuri.migration.jdbc;

/**
 * 외부 driver 경계의 untrusted 값과 원인 예외를 노출하지 않는 고정 오류.
 * 접속 실패는 원인 대신 격리 경계 안에서 정한 고정 분류({@link #diagnostic()})만 싣는다.
 */
public final class SourceDriverException extends RuntimeException {

    private final ConnectionFailureDiagnostic diagnostic;

    private SourceDriverException(String message, ConnectionFailureDiagnostic diagnostic) {
        super(message);
        this.diagnostic = diagnostic;
    }

    /** 원문·원인 없는 고정 분류. driver 준비·접속과 무관한 실패는 {@code UNCLASSIFIED} 다. */
    public ConnectionFailureDiagnostic diagnostic() {
        return diagnostic;
    }

    static SourceDriverException policy() {
        return new SourceDriverException("source driver JAR가 로컬 안전 정책을 충족하지 않습니다.",
                ConnectionFailureDiagnostic.UNCLASSIFIED);
    }

    static SourceDriverException configuration() {
        return new SourceDriverException("source driver 설정이 유효하지 않습니다.",
                ConnectionFailureDiagnostic.DRIVER_UNAVAILABLE);
    }

    static SourceDriverException loading() {
        return new SourceDriverException("source driver를 격리 경계에서 로드하지 못했습니다.",
                ConnectionFailureDiagnostic.DRIVER_UNAVAILABLE);
    }

    static SourceDriverException connection() {
        return connection(ConnectionFailureDiagnostic.UNCLASSIFIED);
    }

    /** 격리 경계 안에서 이미 고정 분류로 바꾼 접속 실패. 원인 예외는 싣지 않는다. */
    static SourceDriverException connection(ConnectionFailureDiagnostic diagnostic) {
        return new SourceDriverException("source JDBC connection을 생성하지 못했습니다.",
                diagnostic == null ? ConnectionFailureDiagnostic.UNCLASSIFIED : diagnostic);
    }

    static SourceDriverException closed() {
        return new SourceDriverException("source JDBC endpoint가 이미 종료되었습니다.",
                ConnectionFailureDiagnostic.UNCLASSIFIED);
    }

    static SourceDriverException cleanup() {
        return new SourceDriverException("source driver 격리 경계를 완전히 종료하지 못했습니다.",
                ConnectionFailureDiagnostic.UNCLASSIFIED);
    }
}
