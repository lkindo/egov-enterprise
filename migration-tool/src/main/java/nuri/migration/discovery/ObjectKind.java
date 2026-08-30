package nuri.migration.discovery;

/**
 * 데이터베이스 제품과 무관하게 inventory에 기록할 수 있는 객체 종류다.
 *
 * <p>지원하지 않는 종류를 enum에서 제거하지 않는다. 발견 불가 여부는
 * {@link VisibilityFinding}으로 별도 기록해 "0건"과 "볼 수 없음"을 구분한다.</p>
 */
public enum ObjectKind {
    CATALOG,
    SCHEMA,
    TABLE,
    PARTITION,
    COLUMN,
    PRIMARY_KEY,
    UNIQUE_KEY,
    FOREIGN_KEY,
    CHECK_CONSTRAINT,
    DEFAULT_CONSTRAINT,
    INDEX,
    SEQUENCE,
    IDENTITY,
    VIEW,
    MATERIALIZED_VIEW,
    ROUTINE,
    FUNCTION,
    PROCEDURE,
    PACKAGE,
    PACKAGE_BODY,
    TRIGGER,
    TYPE,
    DOMAIN,
    ENUM,
    SYNONYM,
    DATABASE_LINK,
    EXTENSION,
    POLICY,
    ROLE,
    USER,
    TABLESPACE,
    COLLATION,
    CHARACTER_SET,
    COMMENT,
    GRANT,
    JOB,
    EVENT,
    FOREIGN_DATA_WRAPPER,
    FOREIGN_SERVER,
    USER_MAPPING,
    PUBLICATION,
    SUBSCRIPTION,
    EXTERNAL_OBJECT,
    UNKNOWN
}
