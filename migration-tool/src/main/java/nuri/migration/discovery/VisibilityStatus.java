package nuri.migration.discovery;

/** 객체 가시성/수집 완전성을 판정하는 상태다. */
public enum VisibilityStatus {
    /** 해당 vendor에 그 객체 종류 자체가 없어 누락이 아니라 명시적 비대상이다. */
    NOT_APPLICABLE,
    /** 계정 권한 때문에 객체 정의를 읽을 수 없다. */
    UNREADABLE,
    /** 드라이버나 데이터베이스가 해당 메타데이터 기능을 제공하지 않는다. */
    UNSUPPORTED,
    /** 일부 정보만 수집할 수 있어 완전성을 보장할 수 없다. */
    PARTIAL,
    /** 권한/미지원 이외의 원인으로 메타데이터 질의가 실패했다. */
    QUERY_FAILED
}
