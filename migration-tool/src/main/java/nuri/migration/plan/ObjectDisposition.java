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
    BLOCKED
}
