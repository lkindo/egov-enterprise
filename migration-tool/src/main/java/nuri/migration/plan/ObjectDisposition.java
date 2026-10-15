package nuri.migration.plan;

/**
 * 발견한 AS-IS 객체를 현재 프로젝트로 가져올 때의 명시적 처리 결정이다.
 *
 * <p>이 enum에는 의도적으로 {@code UNCLASSIFIED}를 두지 않는다. 미분류는
 * disposition이 없는 상태로 남겨 plan 실행을 차단해야 하기 때문이다.</p>
 */
public enum ObjectDisposition {
    AUTO_DATA_LOAD,
    TARGET_OWNED,
    RECREATE_VIA_FLYWAY,
    REIMPLEMENT_IN_APP,
    EXTERNALIZE,
    EXPORT_ONLY,
    APPROVED_IGNORE,
    /**
     * 적재하지 않고 다른 매핑의 조회 조인(lookups)만 읽는 표(ADR-0029 L3d). 플래너는 자동으로 달지 않는다 — 검토자가
     * 명시해야 하고, 어떤 매핑도 조회하지 않는 표에 달면 막는다.
     */
    LOOKUP_INPUT,
    BLOCKED
}
