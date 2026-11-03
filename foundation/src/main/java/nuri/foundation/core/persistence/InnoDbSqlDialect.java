package nuri.foundation.core.persistence;

import jakarta.persistence.EntityManager;
import java.sql.ResultSet;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * MySQL·MariaDB(InnoDB) 공통 구현(ADR-0047 단계 3). 두 엔진이 다른 것은 응용 잠금의 대기 상한 문법, upsert 의 새 값 참조,
 * 제품명, 오류 번호뿐이다.
 *
 * <p>응용 잠금은 Oracle 처럼 슬롯 표의 행 잠금이다. {@code GET_LOCK} 은 세션 범위라 트랜잭션이 끝나도 풀리지 않는다.
 * 슬롯 수와 키를 접는 식은 Oracle 과 같다.
 *
 * <p>트랜잭션 범위의 잠금 대기 설정이 없다. {@code SET SESSION innodb_lock_wait_timeout} 은 커밋·롤백 뒤에도 남아 커넥션 풀로
 * 샌다(두 엔진 실측). 응용 잠금의 대기는 잠금 문장이 직접 묶는다.
 *
 * <p>DB 가 채우는 시각은 세션 시계다. JDBC URL 이 세션 시간대를 +09:00 으로 두어야 한국 벽시계가 된다(CTX-025).
 */
public abstract class InnoDbSqlDialect implements VendorSqlDialect {

    /** 응용 잠금 슬롯 수. 벤더 어댑터가 같은 수의 행을 만든다. */
    static final int LOCK_SLOTS = 65_536;
    static final int LOCK_WAIT_SECONDS = 10;
    static final String INSERT_PERMIT =
            "INSERT INTO tb_sys_ledger_permit (permit_key, permit_conn) VALUES (?1, CONNECTION_ID())";
    static final String DELETE_PERMIT =
            "DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1 AND permit_conn = CONNECTION_ID()";
    private static final String NOW = "CURRENT_TIMESTAMP(6)";

    /** 두 엔진만 이 기반을 쓴다. */
    InnoDbSqlDialect() {
    }

    /** 슬롯 행 하나를 대기 상한과 함께 잠그는 문장. 자리표시자 하나에 슬롯 번호를 받는다. */
    abstract String lockSlotSql();

    /** VALUES 목록 뒤에 붙는 새 행 별칭. 없으면 빈 문자열이다. */
    abstract String insertedRowAlias();

    /** ON DUPLICATE KEY UPDATE 안에서 넣으려던 값을 읽는 식. */
    abstract String insertedValue(String column);

    @Override
    public String paginate(String orderedSelect, long limit, long offset) {
        return orderedSelect + " LIMIT " + limit + " OFFSET " + offset;
    }

    @Override
    public String limit(String select, long limit) {
        return select + " LIMIT " + limit;
    }

    @Override
    public String existsQuery(String subquery) {
        return "SELECT CASE WHEN EXISTS (" + subquery + ") THEN 1 ELSE 0 END";
    }

    /** 기본 설정의 {@code ||} 는 논리 OR 이다. 연결은 함수로만 한다. */
    @Override
    public String concat(String... operands) {
        return "CONCAT(" + String.join(", ", operands) + ")";
    }

    /** {@code INSTR(문자열, 찾을 값)} 순서다. {@code LOCATE} 는 인자 순서가 반대다. */
    @Override
    public String containsText(String needle, String haystack) {
        return "INSTR(" + haystack + ", " + needle + ")>0";
    }

    /** {@code CAST ... AS VARCHAR} 를 받지 않는다. 표가 이진 콜레이션이라 이 결과와 비교해도 콜레이션이 섞이지 않는다(실측). */
    @Override
    public String castToVarchar(String expression, int length) {
        return "CAST(" + expression + " AS CHAR(" + length + "))";
    }

    /**
     * {@code FOR NO KEY UPDATE} 가 없고 MariaDB 에는 {@code FOR SHARE} 도 없다. InnoDB 의 FK 검사는 부모 행에 공유 잠금을 걸므로
     * PostgreSQL 의 {@code FOR UPDATE} 처럼 자식 FK 입력도 기다리게 한다(두 엔진 실측).
     */
    @Override
    public String selectForLock(String columns, String table, String tail, RowLock lock) {
        String middle = tail.isEmpty() ? "" : " " + tail;
        return "SELECT " + columns + " FROM " + table + middle + " FOR UPDATE";
    }

    /**
     * {@code ON DUPLICATE KEY UPDATE} 는 충돌한 키를 고를 수 없어 {@code primaryKeyConstraint} 를 문장에 싣지 못한다. PK 든 UNIQUE 든
     * 어느 키가 겹쳐도 갱신하므로, PK 외 UNIQUE 가 없는 표에만 쓴다. 갱신이면 엔진 규약상 영향 행 수가 1 이 아니라 2 다
     * (호출부는 수를 쓰지 않는다). 시각은 세션 시계로 채운다.
     */
    @Override
    public String upsertAddingCounters(String table, String primaryKeyConstraint, List<UpsertColumn> keys,
            List<UpsertColumn> counters, String createdAtColumn, String modifiedAtColumn) {
        List<UpsertColumn> inserted = Stream.concat(keys.stream(), counters.stream()).toList();
        String columns = inserted.stream().map(UpsertColumn::column).collect(Collectors.joining(", "));
        String values = inserted.stream().map(column -> ":" + column.parameter()).collect(Collectors.joining(", "));
        String additions = counters.stream()
                .map(column -> column.column() + " = COALESCE(" + table + "." + column.column() + ", 0) + "
                        + insertedValue(column.column()))
                .collect(Collectors.joining(", "));
        return "INSERT INTO " + table + " (" + columns + ", " + createdAtColumn + ", " + modifiedAtColumn + ")"
                + " VALUES (" + values + ", " + NOW + ", " + NOW + ")" + insertedRowAlias()
                + " ON DUPLICATE KEY UPDATE " + additions + ", " + modifiedAtColumn + " = " + NOW;
    }

    /** 트랜잭션 범위의 잠금 대기 설정이 없다. 세션 설정은 풀로 새므로 실행해도 아무 일이 없는 문장을 돌려준다. */
    @Override
    public String transactionLockWaitSql(Duration wait) {
        if (wait.toMillis() <= 0) {
            throw new IllegalArgumentException("잠금 대기는 1ms 이상이어야 한다");
        }
        return "DO 0";
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, long key) {
        lockSlot(jdbc, Math.floorMod(Long.hashCode(key), LOCK_SLOTS));
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, int namespace, int key) {
        lockSlot(jdbc, Math.floorMod(31 * namespace + key, LOCK_SLOTS));
    }

    /** READ COMMITTED 의 잠금 읽기는 없는 행에 간격 잠금을 걸지 않는다. 슬롯 행이 없으면 아무것도 잠그지 않고 지나가므로 멈춘다. */
    private void lockSlot(JdbcOperations jdbc, int slot) {
        Boolean held = jdbc.query(lockSlotSql(), statement -> statement.setInt(1, slot),
                (ResultSetExtractor<Boolean>) ResultSet::next);
        if (!Boolean.TRUE.equals(held)) {
            throw new IllegalStateException("응용 잠금 슬롯 행이 없다: tb_sys_lock_slot " + slot);
        }
    }

    /**
     * 허가 표의 미커밋 행은 다른 세션에 보이지 않아 트랜잭션 범위가 되고, 롤백하면 함께 사라진다. 지우지 않고 커밋하면 허가가 열린 채
     * 남으므로 커밋 직전에 지운다. 같은 트랜잭션의 두 번째 호출은 이미 열린 허가를 쓴다.
     * 키에 연결 번호가 있고 트리거·회수도 자기 연결의 행만 찾는다. 키만 보면 트리거의 읽기가 다른 세션의 미커밋 허가를 기다려, 바깥
     * 트랜잭션이 중단된 채 안쪽이 같은 허가를 내면 대기 초과로 끝난다(두 엔진 실측).
     */
    @Override
    public void permitLedgerDeletion(EntityManager entityManager, LedgerDeletionPermit permit) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("불변 원장 삭제 허가는 쓰기 트랜잭션 안에서만 낼 수 있다");
        }
        String resource = InnoDbSqlDialect.class.getName() + ":" + permit.key();
        if (TransactionSynchronizationManager.hasResource(resource)) {
            return;
        }
        entityManager.createNativeQuery(INSERT_PERMIT).setParameter(1, permit.key()).executeUpdate();
        TransactionSynchronizationManager.bindResource(resource, permit);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void beforeCommit(boolean readOnly) {
                entityManager.flush();
                int removed = entityManager.createNativeQuery(DELETE_PERMIT).setParameter(1, permit.key()).executeUpdate();
                if (removed != 1) {
                    throw new IllegalStateException("불변 원장 삭제 허가를 회수하지 못했다: " + permit.key());
                }
            }

            /** 표식은 이 트랜잭션의 것이다. 중단되면 안쪽 트랜잭션은 자기 연결로 허가를 새로 내야 한다. */
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
        return "SELECT count(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND LOWER(table_name) IN ("
                + names + ")";
    }

    /** 연결 번호는 서버를 다시 띄우면 다시 쓰인다. 회수되지 않고 커밋된 허가가 다른 연결에 넘어가지 않게 기동 때 막는다. */
    @Override
    public void assertNoOpenLedgerPermit(JdbcOperations jdbc) {
        Integer open = jdbc.queryForObject("SELECT count(*) FROM tb_sys_ledger_permit", Integer.class);
        if (open == null || open != 0) {
            throw new IllegalStateException("불변 원장 삭제 허가가 열린 채 남아 있다: tb_sys_ledger_permit");
        }
    }
}
