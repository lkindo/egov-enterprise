package nuri.migration.postgres;

import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import nuri.migration.verify.ReconciliationQueryException;
import nuri.migration.verify.TargetReconciliationQueries;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * [ADR-0029 L4 D2·D7] 대사 질의의 PostgreSQL 구현. 호출마다 자기 읽기 전용 트랜잭션을 열고 되돌린다 — verify 의 대상 재조회와 같은
 * 연결 처리다. 컬렉션·배열 인자는 {@code varchar[]} 로 바인딩한다. SQL 오류는 SQLSTATE 만 담은
 * {@link ReconciliationQueryException} 이다(형 변환 오류 문구에는 입력값이 들어간다).
 */
public final class PostgresReconciliationQueries implements TargetReconciliationQueries {

    private final JdbcTemplate target;
    private final PostgresTargetConstraintReader constraintReader = new PostgresTargetConstraintReader();

    public PostgresReconciliationQueries(JdbcTemplate target) {
        this.target = Objects.requireNonNull(target, "target");
    }

    @Override
    public long count(String sql, List<Object> args) {
        Map<String, Long> counts = counts(sql, args);
        if (counts.size() != 1) {
            throw new ReconciliationQueryException(null);
        }
        return counts.values().iterator().next();
    }

    @Override
    public Map<String, Long> counts(String sql, List<Object> args) {
        return readOnly(connection -> {
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                List<Object> arguments = args == null ? List.of() : args;
                for (int i = 0; i < arguments.size(); i++) {
                    statement.setObject(i + 1, parameter(connection, arguments.get(i)));
                }
                try (ResultSet rows = statement.executeQuery()) {
                    if (!rows.next()) {
                        throw new ReconciliationQueryException(null);
                    }
                    ResultSetMetaData metadata = rows.getMetaData();
                    Map<String, Long> counts = new LinkedHashMap<>();
                    for (int column = 1; column <= metadata.getColumnCount(); column++) {
                        counts.put(metadata.getColumnLabel(column), rows.getLong(column));
                    }
                    return counts;
                }
            }
        });
    }

    @Override
    public TargetConstraintSnapshot constraints(List<TableMetadata> tables) {
        return readOnly(connection -> constraintReader.read(connection, tables));
    }

    private static Object parameter(Connection connection, Object argument) throws SQLException {
        if (argument instanceof Collection<?> values) {
            return connection.createArrayOf("varchar", values.stream()
                    .map(value -> value == null ? null : value.toString()).toArray());
        }
        if (argument instanceof Object[] values) {
            return connection.createArrayOf("varchar", values);
        }
        return argument;
    }

    private <T> T readOnly(SqlWork<T> work) {
        try {
            return target.execute((ConnectionCallback<T>) connection -> {
                boolean ownTransaction = connection.getAutoCommit();
                boolean previousReadOnly = connection.isReadOnly();
                boolean transactionStarted = false;
                try {
                    if (ownTransaction) {
                        connection.setReadOnly(true);
                        connection.setAutoCommit(false);
                        transactionStarted = true;
                    }
                    return work.run(connection);
                } finally {
                    // 호출자가 연 트랜잭션은 커밋·롤백하지 않는다.
                    if (ownTransaction) {
                        if (transactionStarted) {
                            connection.rollback();
                            connection.setAutoCommit(true);
                        }
                        connection.setReadOnly(previousReadOnly);
                    }
                }
            });
        } catch (ReconciliationQueryException failure) {
            throw failure;
        } catch (RuntimeException failure) {
            throw new ReconciliationQueryException(sqlState(failure));
        }
    }

    private static String sqlState(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && sql.getSQLState() != null) {
                return sql.getSQLState();
            }
        }
        return null;
    }

    @FunctionalInterface
    private interface SqlWork<T> {
        T run(Connection connection) throws SQLException;
    }
}
