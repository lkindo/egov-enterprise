package nuri.foundation.core.persistence;

import java.util.Set;

/**
 * MySQL 구현. 기준은 8.4 다(ADR-0047 단계 3).
 *
 * <p>응용 잠금의 대기는 {@code MAX_EXECUTION_TIME} 힌트가 묶고, 넘기면 3024 다. {@code innodb_lock_wait_timeout} 은
 * {@code SET_VAR} 힌트를 받지 않는다(경고 3637, 실측). upsert 는 행 별칭으로 새 값을 읽는다 — {@code VALUES(c)} 는 8.0.20
 * 부터 폐기 예정이다.
 */
public class MySqlSqlDialect extends InnoDbSqlDialect {

    private static final String LOCK_SLOT_SQL = "SELECT /*+ MAX_EXECUTION_TIME(" + LOCK_WAIT_SECONDS * 1000
            + ") */ lock_slot_no FROM tb_sys_lock_slot WHERE lock_slot_no = ? FOR UPDATE";
    /**
     * CHECK(3819)·기본값 없음(1364)·형식(1366)은 SQLState 가 HY000 이라 무결성 위반으로 번역되지 않는다. NOT NULL(1048)은 23000 이라
     * 번호로 갈라야 400 이다. NOWAIT(3572)와 잠금 문장의 실행 시간 상한(3024)은 HY000 이라 JdbcTemplate 이 분류하지 못한다.
     * 3024 는 힌트를 단 잠금 문장에서만 난다. 문장 시간 초과는 드라이버가 SQLTimeoutException 으로 올려 번호가 없다.
     */
    private static final VendorErrorCodes ERROR_CODES = new VendorErrorCodes(
            Set.of(3819, 1048, 1364, 1366), Set.of(), Set.of(1205, 1213, 3572, 3024), Set.of());

    @Override
    String lockSlotSql() {
        return LOCK_SLOT_SQL;
    }

    @Override
    String insertedRowAlias() {
        return " AS new";
    }

    @Override
    String insertedValue(String column) {
        return "new." + column;
    }

    /** Connector/J 는 서버와 무관하게 이 이름을 돌려준다. */
    @Override
    public String databaseProductName() {
        return "MySQL";
    }

    @Override
    public VendorErrorCodes errorCodes() {
        return ERROR_CODES;
    }
}
