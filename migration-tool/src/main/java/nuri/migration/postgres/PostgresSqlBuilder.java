package nuri.migration.postgres;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/** PostgreSQL projection/read, generated-key insert, sequence-sync SQL의 비실행 builder. */
public final class PostgresSqlBuilder {

    private PostgresSqlBuilder() {}

    public static String projectionSelect(
            PostgresQualifiedName table,
            List<PostgresIdentifier> columns
    ) {
        Objects.requireNonNull(table, "table");
        List<PostgresIdentifier> safeColumns = requireColumns(columns, "projection");
        return "SELECT " + join(safeColumns) + " FROM " + table.sql();
    }

    /** insertColumns가 비면 DEFAULT VALUES를 사용한다. returningColumns는 하나 이상이어야 한다. */
    public static String insertReturning(
            PostgresQualifiedName table,
            List<PostgresIdentifier> insertColumns,
            List<PostgresIdentifier> returningColumns
    ) {
        Objects.requireNonNull(table, "table");
        List<PostgresIdentifier> safeInsertColumns = copyColumns(insertColumns, "insert");
        List<PostgresIdentifier> safeReturningColumns = requireColumns(returningColumns, "returning");

        String insertClause;
        if (safeInsertColumns.isEmpty()) {
            insertClause = " DEFAULT VALUES";
        } else {
            String placeholders = safeInsertColumns.stream().map(ignored -> "?")
                    .collect(Collectors.joining(", "));
            insertClause = " (" + join(safeInsertColumns) + ") VALUES (" + placeholders + ')';
        }
        return "INSERT INTO " + table.sql() + insertClause + " RETURNING " + join(safeReturningColumns);
    }

    /**
     * 비어 있지 않은 테이블은 max(identity)를 마지막 사용값으로, 빈 테이블은 emptyStart를 미사용값으로
     * 설정하는 계획이다. sequence 이름은 regclass 파라미터로 바인딩해 SQL에 직접 삽입하지 않는다.
     */
    public static PostgresSequenceSyncPlan sequenceSyncPlan(
            PostgresQualifiedName sequence,
            PostgresQualifiedName table,
            PostgresIdentifier identityColumn,
            long emptyStart
    ) {
        Objects.requireNonNull(sequence, "sequence");
        Objects.requireNonNull(table, "table");
        Objects.requireNonNull(identityColumn, "identityColumn");
        String sql = "SELECT setval(CAST(? AS regclass), "
                + "COALESCE((SELECT MAX(" + identityColumn.sql() + ") FROM " + table.sql() + "), ?), "
                + "EXISTS (SELECT 1 FROM " + table.sql() + "))";
        return new PostgresSequenceSyncPlan(sql, List.of(sequence.regclassText(), emptyStart));
    }

    private static List<PostgresIdentifier> requireColumns(
            List<PostgresIdentifier> columns,
            String purpose
    ) {
        List<PostgresIdentifier> safe = copyColumns(columns, purpose);
        if (safe.isEmpty()) {
            throw new IllegalArgumentException(purpose + " columns must not be empty");
        }
        return safe;
    }

    private static List<PostgresIdentifier> copyColumns(
            List<PostgresIdentifier> columns,
            String purpose
    ) {
        List<PostgresIdentifier> safe = List.copyOf(Objects.requireNonNull(columns, purpose + " columns"));
        if (safe.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException(purpose + " columns contain null");
        }
        return safe;
    }

    private static String join(List<PostgresIdentifier> columns) {
        return columns.stream().map(PostgresIdentifier::sql).collect(Collectors.joining(", "));
    }
}
