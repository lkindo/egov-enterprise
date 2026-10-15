package nuri.migration.archive;

/**
 * 보관·격리 키 파일을 쓰지 못했다(ADR-0029 L3e). 메시지는 고정 문구와 사유 코드뿐이다 — 경로·값·원인 예외의 문구를 싣지
 * 않으려고 원인 예외를 붙이지 않는다. 사유 코드로 디스크·권한·덮어쓰기 거부를 가린다.
 */
public final class ArchiveWriteException extends IllegalStateException {

    /** 같은 이름의 파일이 이미 있다 — 덮어쓰지 않는다. */
    public static final String FILE_EXISTS = "ARCHIVE_FILE_EXISTS";
    /** 디렉터리·파일 권한으로 쓰지 못했다. */
    public static final String ACCESS_DENIED = "ARCHIVE_ACCESS_DENIED";
    /** 같은 디렉터리 안의 원자적 이동을 파일 시스템이 지원하지 않는다. */
    public static final String ATOMIC_MOVE_UNSUPPORTED = "ARCHIVE_ATOMIC_MOVE_UNSUPPORTED";
    /** 쓰는 사이 예약한 파일이 바뀌었다 — 다른 프로세스가 같은 이름을 건드렸다. */
    public static final String RESERVATION_CHANGED = "ARCHIVE_RESERVATION_CHANGED";
    /** 덤프에 쓸 수 없는 값 종류다(배열·구조·참조 등). */
    public static final String VALUE_TYPE_UNSUPPORTED = "ARCHIVE_VALUE_TYPE_UNSUPPORTED";
    /** 그 밖의 입출력 실패. */
    public static final String WRITE_FAILED = "ARCHIVE_WRITE_FAILED";

    private final String reason;

    ArchiveWriteException(String reason) {
        super("보관 파일을 쓰지 못했습니다: " + reason);
        this.reason = reason;
    }

    /** 사유 코드. 실행 증거에 그대로 실을 수 있다. */
    public String reason() {
        return reason;
    }
}
