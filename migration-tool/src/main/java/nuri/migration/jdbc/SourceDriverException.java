package nuri.migration.jdbc;

/** 외부 driver 경계의 untrusted 값과 원인 예외를 노출하지 않는 고정 오류. */
public final class SourceDriverException extends RuntimeException {

    private SourceDriverException(String message) {
        super(message);
    }

    static SourceDriverException policy() {
        return new SourceDriverException("source driver JAR가 로컬 안전 정책을 충족하지 않습니다.");
    }

    static SourceDriverException configuration() {
        return new SourceDriverException("source driver 설정이 유효하지 않습니다.");
    }

    static SourceDriverException loading() {
        return new SourceDriverException("source driver를 격리 경계에서 로드하지 못했습니다.");
    }

    static SourceDriverException connection() {
        return new SourceDriverException("source JDBC connection을 생성하지 못했습니다.");
    }

    static SourceDriverException closed() {
        return new SourceDriverException("source JDBC endpoint가 이미 종료되었습니다.");
    }

    static SourceDriverException cleanup() {
        return new SourceDriverException("source driver 격리 경계를 완전히 종료하지 못했습니다.");
    }
}
