package nuri.foundation.core.persistence;

import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Oracle 구현. 기준은 19c 다(ADR-0047 결정 3).
 *
 * <p>응용 잠금은 {@code DBMS_LOCK} 대신 슬롯 표의 행 잠금으로 한다. {@code DBMS_LOCK} 은 앱 계정에 별도 실행 권한이 있어야 한다.
 * 슬롯이 겹치면 무관한 키가 서로를 기다린다. 한 트랜잭션이 키를 여럿 잠그면 교차 순서로 교착할 수도 있으므로 충돌이 드물도록 슬롯을
 * 넓게 둔다. 그래도 나면 교착·대기 초과가 트랜잭션을 되돌리고 409 로 끝나 다시 시도할 수 있다. 값이 틀어지지는 않는다.
 *
 * <p>PostgreSQL 의 {@code lock_timeout} 처럼 이후의 모든 행 잠금 대기를 묶는 세션 범위 설정이 없다. 응용 잠금은 {@link #LOCK_WAIT_SECONDS}
 * 로 묶고, 행 잠금 대기는 JPA 잠금 시간 힌트가 맡는다.
 */
public class OracleSqlDialect implements VendorSqlDialect {

    /** 응용 잠금 슬롯 수. 벤더 어댑터가 같은 수의 행을 만든다. */
    static final int LOCK_SLOTS = 65_536;
    static final int LOCK_WAIT_SECONDS = 10;
    private static final String LOCK_SLOT_SQL =
            "SELECT lock_slot_no FROM tb_sys_lock_slot WHERE lock_slot_no = ? FOR UPDATE WAIT " + LOCK_WAIT_SECONDS;

    @Override
    public String paginate(String orderedSelect, long limit, long offset) {
        return orderedSelect + " OFFSET " + offset + " ROWS FETCH NEXT " + limit + " ROWS ONLY";
    }

    @Override
    public String limit(String select, long limit) {
        return select + " FETCH FIRST " + limit + " ROWS ONLY";
    }

    @Override
    public String existsQuery(String subquery) {
        return "SELECT CASE WHEN EXISTS (" + subquery + ") THEN 1 ELSE 0 END FROM DUAL";
    }

    @Override
    public String concat(String... operands) {
        return String.join(" || ", operands);
    }

    @Override
    public String containsText(String needle, String haystack) {
        return "INSTR(" + haystack + ", " + needle + ")>0";
    }

    @Override
    public String castToVarchar(String expression, int length) {
        return "CAST(" + expression + " AS VARCHAR2(" + length + " CHAR))";
    }

    /** {@code FOR NO KEY UPDATE} 가 없다. 자식 FK 입력까지 막히지만 Oracle 의 FK 검사는 부모 행 잠금을 기다리지 않는다. */
    @Override
    public String selectForLock(String columns, String table, String tail, RowLock lock) {
        String middle = tail.isEmpty() ? "" : " " + tail;
        return "SELECT " + columns + " FROM " + table + middle + " FOR UPDATE";
    }

    /**
     * MERGE 는 같은 키의 동시 입력을 직렬화하지 않아 뒤 세션이 중복 키 오류를 받는다.
     * 그 경우 앞 세션이 이미 행을 만든 것이므로 카운터만 더한다.
     */
    @Override
    public String upsertAddingCounters(String table, String primaryKeyConstraint, List<UpsertColumn> keys,
            List<UpsertColumn> counters, String createdAtColumn, String modifiedAtColumn) {
        List<UpsertColumn> inserted = Stream.concat(keys.stream(), counters.stream()).toList();
        String source = inserted.stream().map(column -> ":" + column.parameter() + " AS " + column.column())
                .collect(Collectors.joining(", "));
        String on = keys.stream().map(column -> "t." + column.column() + " = s." + column.column())
                .collect(Collectors.joining(" AND "));
        String additions = counters.stream()
                .map(column -> "t." + column.column() + " = COALESCE(t." + column.column() + ", 0) + s." + column.column())
                .collect(Collectors.joining(", "));
        String columns = inserted.stream().map(UpsertColumn::column).collect(Collectors.joining(", "));
        String values = inserted.stream().map(column -> "s." + column.column()).collect(Collectors.joining(", "));
        String fallback = counters.stream()
                .map(column -> column.column() + " = COALESCE(" + column.column() + ", 0) + :" + column.parameter())
                .collect(Collectors.joining(", "));
        String match = keys.stream().map(column -> column.column() + " = :" + column.parameter())
                .collect(Collectors.joining(" AND "));
        return "BEGIN MERGE INTO " + table + " t USING (SELECT " + source + " FROM DUAL) s ON (" + on + ")"
                + " WHEN MATCHED THEN UPDATE SET " + additions + ", t." + modifiedAtColumn + " = LOCALTIMESTAMP"
                + " WHEN NOT MATCHED THEN INSERT (" + columns + ", " + createdAtColumn + ", " + modifiedAtColumn + ")"
                + " VALUES (" + values + ", LOCALTIMESTAMP, LOCALTIMESTAMP);"
                + " EXCEPTION WHEN DUP_VAL_ON_INDEX THEN UPDATE " + table + " SET " + fallback + ", " + modifiedAtColumn
                + " = LOCALTIMESTAMP WHERE " + match + "; END;";
    }

    /** 트랜잭션 범위의 잠금 대기 설정이 없다. 응용 잠금의 대기는 잠금 문장이 직접 묶는다. */
    @Override
    public String transactionLockWaitSql(Duration wait) {
        if (wait.toMillis() <= 0) {
            throw new IllegalArgumentException("잠금 대기는 1ms 이상이어야 한다");
        }
        return "BEGIN NULL; END;";
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, long key) {
        lockSlot(jdbc, Math.floorMod(Long.hashCode(key), LOCK_SLOTS));
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, int namespace, int key) {
        lockSlot(jdbc, Math.floorMod(31 * namespace + key, LOCK_SLOTS));
    }

    private static void lockSlot(JdbcOperations jdbc, int slot) {
        jdbc.query(LOCK_SLOT_SQL, statement -> statement.setInt(1, slot), (RowCallbackHandler) row -> { });
    }

    /**
     * 허가 표의 미커밋 행은 다른 세션에 보이지 않아 트랜잭션 범위가 되고, 롤백하면 함께 사라진다.
     * 지우지 않고 커밋하면 허가가 열린 채 남으므로 커밋 직전에 지운다. 같은 트랜잭션의 두 번째 호출은 이미 열린 허가를 쓴다.
     * 행마다 고유 토큰이 키에 들어 있어(벤더 어댑터) 바깥 트랜잭션이 중단된 채 안쪽이 같은 허가를 내도 서로 기다리지 않는다.
     */
    @Override
    public void permitLedgerDeletion(EntityManager entityManager, LedgerDeletionPermit permit) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("불변 원장 삭제 허가는 쓰기 트랜잭션 안에서만 낼 수 있다");
        }
        String resource = OracleSqlDialect.class.getName() + ":" + permit.key();
        if (TransactionSynchronizationManager.hasResource(resource)) {
            return;
        }
        entityManager.createNativeQuery("INSERT INTO tb_sys_ledger_permit (permit_key) VALUES (?1)")
                .setParameter(1, permit.key()).executeUpdate();
        TransactionSynchronizationManager.bindResource(resource, permit);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void beforeCommit(boolean readOnly) {
                entityManager.flush();
                int removed = entityManager.createNativeQuery("DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1")
                        .setParameter(1, permit.key()).executeUpdate();
                if (removed != 1) {
                    throw new IllegalStateException("불변 원장 삭제 허가를 회수하지 못했다: " + permit.key());
                }
            }

            /** 표식은 이 트랜잭션의 것이다. 중단되면 안쪽 트랜잭션은 자기 허가를 새로 내야 한다. */
            @Override
            public void suspend() {
                TransactionSynchronizationManager.unbindResourceIfPossible(resource);
            }

            @Override
            public void resume() {
                TransactionSynchronizationManager.bindResource(resource, permit);
            }

            @Override
            public void afterCompletion(int status) {
                TransactionSynchronizationManager.unbindResourceIfPossible(resource);
            }
        });
    }

    @Override
    public String countTablesQuery(List<String> tables) {
        String names = tables.stream().map(table -> "'" + table + "'").collect(Collectors.joining(","));
        return "SELECT count(*) FROM user_tables WHERE LOWER(table_name) IN (" + names + ")";
    }

    @Override
    public String databaseProductName() {
        return "Oracle";
    }

    @Override
    public void assertNoOpenLedgerPermit(JdbcOperations jdbc) {
        Integer open = jdbc.queryForObject("SELECT count(*) FROM tb_sys_ledger_permit", Integer.class);
        if (open == null || open != 0) {
            throw new IllegalStateException("불변 원장 삭제 허가가 열린 채 남아 있다: tb_sys_ledger_permit");
        }
    }
}
