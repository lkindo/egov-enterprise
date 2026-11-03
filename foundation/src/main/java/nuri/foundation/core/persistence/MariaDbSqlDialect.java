package nuri.foundation.core.persistence;

import java.util.Set;

/**
 * MariaDB 구현. 기준은 11.4 다(ADR-0047 단계 3).
 *
 * <p>응용 잠금은 {@code FOR UPDATE WAIT n} 이 대기를 묶고, 넘기면 1205 다. MySQL 의 행 별칭 문법이 없어 upsert 는
 * {@code VALUES(c)} 로 새 값을 읽는다.
 */
public class MariaDbSqlDialect extends InnoDbSqlDialect {

    private static final String LOCK_SLOT_SQL =
            "SELECT lock_slot_no FROM tb_sys_lock_slot WHERE lock_slot_no = ? FOR UPDATE WAIT " + LOCK_WAIT_SECONDS;
    /**
     * CHECK(4025)·NOT NULL(1048)·기본값 없음(1364)·형식(1366)은 입력 오류다. 1364·1366 은 SQLState 가 HY000·22007 이라 무결성
     * 위반으로 번역되지 않는다. 잠금 대기 초과(1205)는 HY000 이라 JdbcTemplate 이 분류하지 못하고, 1969 는 문장 시간 초과다.
     */
    private static final VendorErrorCodes ERROR_CODES = new VendorErrorCodes(
            Set.of(4025, 1048, 1364, 1366), Set.of(), Set.of(1205, 1213), Set.of(1969));

    @Override
    String lockSlotSql() {
        return LOCK_SLOT_SQL;
    }

    @Override
    String insertedRowAlias() {
        return "";
    }

    @Override
    String insertedValue(String column) {
        return "VALUES(" + column + ")";
    }

    /** MariaDB 드라이버는 MariaDB 서버에 연결하면 이 이름을 돌려준다. MySQL 서버면 "MySQL" 이라 기동이 멈춘다. */
    @Override
    public String databaseProductName() {
        return "MariaDB";
    }

    @Override
    public VendorErrorCodes errorCodes() {
        return ERROR_CODES;
    }
}
