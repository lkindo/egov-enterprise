package nuri.foundation.core.persistence;

import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.hibernate.Session;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.RowCallbackHandler;

/**
 * PostgreSQL 구현. 이 클래스가 돌려주는 문장은 포트를 만들기 전의 SQL 과 같다.
 *
 * <p>단위 시험의 H2 도 이 구현을 쓴다. H2 는 페이징·{@code EXISTS}·연결·잠금 절을 PostgreSQL 호환 문법으로 받는다. 트리거가 없는
 * H2 에서는 원장 표시를 건너뛴다.
 */
public class PostgresqlSqlDialect implements VendorSqlDialect {

    private static final String PRODUCT_NAME = "PostgreSQL";

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
        return "SELECT EXISTS (" + subquery + ")";
    }

    @Override
    public String concat(String... operands) {
        return String.join(" || ", operands);
    }

    @Override
    public String containsText(String needle, String haystack) {
        return "POSITION(" + needle + " IN " + haystack + ")>0";
    }

    @Override
    public String castToVarchar(String expression, int length) {
        return "CAST(" + expression + " AS varchar(" + length + "))";
    }

    @Override
    public String selectForLock(String columns, String table, String tail, RowLock lock) {
        String clause = lock == RowLock.FOR_NO_KEY_UPDATE ? "FOR NO KEY UPDATE" : "FOR UPDATE";
        String middle = tail.isEmpty() ? "" : " " + tail;
        return "SELECT " + columns + " FROM " + table + middle + " " + clause;
    }

    @Override
    public String upsertAddingCounters(String table, String primaryKeyConstraint, List<UpsertColumn> keys,
            List<UpsertColumn> counters, String createdAtColumn, String modifiedAtColumn) {
        List<UpsertColumn> inserted = Stream.concat(keys.stream(), counters.stream()).toList();
        String columns = inserted.stream().map(UpsertColumn::column).collect(Collectors.joining(", "));
        String values = inserted.stream().map(column -> ":" + column.parameter()).collect(Collectors.joining(", "));
        String additions = counters.stream()
                .map(column -> column.column() + " = COALESCE(" + table + "." + column.column() + ", 0) + EXCLUDED."
                        + column.column())
                .collect(Collectors.joining(", "));
        return "INSERT INTO " + table + " (" + columns + ", " + createdAtColumn + ", " + modifiedAtColumn + ")"
                + " VALUES (" + values + ", now(), now())"
                + " ON CONFLICT ON CONSTRAINT " + primaryKeyConstraint + " DO UPDATE SET " + additions + ", "
                + modifiedAtColumn + " = now()";
    }

    @Override
    public String transactionLockWaitSql(Duration wait) {
        long milliseconds = wait.toMillis();
        if (milliseconds <= 0) {
            throw new IllegalArgumentException("잠금 대기는 1ms 이상이어야 한다 — PostgreSQL 의 0 은 무제한이다: " + wait);
        }
        return "SET LOCAL lock_timeout = '" + milliseconds + "ms'";
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, long key) {
        jdbc.query("SELECT pg_advisory_xact_lock(?)", statement -> statement.setLong(1, key),
                (RowCallbackHandler) row -> { });
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, int namespace, int key) {
        jdbc.query("SELECT pg_advisory_xact_lock(?, ?)", statement -> {
            statement.setInt(1, namespace);
            statement.setInt(2, key);
        }, (RowCallbackHandler) row -> { });
    }

    @Override
    public void permitLedgerDeletion(EntityManager entityManager, LedgerDeletionPermit permit) {
        boolean postgres = entityManager.unwrap(Session.class).doReturningWork(
                connection -> PRODUCT_NAME.equalsIgnoreCase(connection.getMetaData().getDatabaseProductName()));
        if (postgres) {
            entityManager.createNativeQuery("SELECT set_config(?1, 'on', true)").setParameter(1, permit.key()).getSingleResult();
        }
    }
}
