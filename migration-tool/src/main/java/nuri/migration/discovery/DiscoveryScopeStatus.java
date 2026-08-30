package nuri.migration.discovery;

/** discovery 요청의 각 객체 종류가 실제 census 범위에 포함되는 방식을 명시한다. */
public enum DiscoveryScopeStatus {
    /** 현재 adapter와 요청 경계에서 실제로 수집해야 하는 객체 종류다. */
    REQUESTED,
    /** 사용자가 선택하지 않았거나 schema 경계 밖의 전역 객체라 이번 census 범위가 아니다. */
    NOT_REQUESTED,
    /** 선택한 DB 제품에는 해당 객체 종류 자체가 없다. */
    NOT_APPLICABLE
}
