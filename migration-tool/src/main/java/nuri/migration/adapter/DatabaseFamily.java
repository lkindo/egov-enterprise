package nuri.migration.adapter;

/** Source adapter가 구분하는 DB 제품군. Oracle과 Tibero는 의도적으로 별도 값이다. */
public enum DatabaseFamily {
    GENERIC_JDBC,
    POSTGRESQL,
    ORACLE,
    TIBERO,
    MYSQL,
    MARIADB,
    SQL_SERVER
}
