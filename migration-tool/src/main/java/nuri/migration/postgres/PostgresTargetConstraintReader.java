package nuri.migration.postgres;

import nuri.migration.postgres.TargetConstraintSnapshot.Constraint;
import nuri.migration.postgres.TargetConstraintSnapshot.TableConstraints;
import nuri.migration.postgres.TargetConstraintSnapshot.UniqueIndex;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * [ADR-0029 L4 D2] 매핑한 대상 표의 물리 제약을 PostgreSQL 카탈로그에서 읽는다(읽기 전용, 값 없음).
 *
 * <p>표마다 {@code pg_constraint}(PK·UNIQUE·FK·CHECK)와 {@code pg_index} 의 유일 인덱스를 읽는다. FK 는 자식 쪽 RI 트리거
 * ({@code tgisinternal} 이고 {@code tgrelid = conrelid})의 {@code tgenabled} 를 함께 읽는다 — 대사가 FK 집행을
 * {@code tgenabled IN ('O','A')} 로 증명한다. 대상 표를 가리키는 FK 는 읽지 않는다.
 */
public final class PostgresTargetConstraintReader {

    private static final String CONSTRAINTS = """
            SELECT con.conname::text AS name,
                   con.contype::text AS type,
                   con.convalidated AS validated,
                   ARRAY(SELECT a.attname::text
                         FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
                         JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
                         ORDER BY k.ord) AS columns,
                   rn.nspname::text AS ref_schema,
                   rc.relname::text AS ref_table,
                   ARRAY(SELECT a.attname::text
                         FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
                         JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.attnum
                         ORDER BY k.ord) AS ref_columns,
                   ARRAY(SELECT t.tgenabled::text
                         FROM pg_trigger t
                         WHERE t.tgconstraint = con.oid AND t.tgrelid = con.conrelid AND t.tgisinternal
                         ORDER BY 1) AS trigger_states
            FROM pg_constraint con
            JOIN pg_class cl ON cl.oid = con.conrelid
            JOIN pg_namespace ns ON ns.oid = cl.relnamespace
            LEFT JOIN pg_class rc ON rc.oid = con.confrelid
            LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
            WHERE ns.nspname = ? AND cl.relname = ? AND con.contype IN ('p', 'u', 'f', 'c')
            ORDER BY con.conname
            """;

    private static final String UNIQUE_INDEXES = """
            SELECT i.relname::text AS name,
                   ix.indisvalid AS valid,
                   ix.indisready AS ready,
                   ARRAY(SELECT CASE WHEN k.attnum = 0 THEN '%s' ELSE a.attname::text END
                         FROM unnest(ix.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
                         LEFT JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = k.attnum
                         ORDER BY k.ord) AS columns
            FROM pg_index ix
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_class t ON t.oid = ix.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = ? AND t.relname = ? AND ix.indisunique
            ORDER BY i.relname
            """.formatted(UniqueIndex.EXPRESSION);

    public TargetConstraintSnapshot read(Connection connection, List<TableMetadata> tables) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        List<TableConstraints> result = new ArrayList<>();
        for (TableMetadata table : Objects.requireNonNull(tables, "tables")) {
            String schema = Objects.requireNonNull(table.schema(), "table.schema");
            result.add(new TableConstraints(schema, table.name(),
                    constraints(connection, schema, table.name()),
                    uniqueIndexes(connection, schema, table.name())));
        }
        return new TargetConstraintSnapshot(TargetConstraintSnapshot.CURRENT_SCHEMA_VERSION, result);
    }

    private static List<Constraint> constraints(Connection connection, String schema, String table)
            throws SQLException {
        List<Constraint> constraints = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(CONSTRAINTS)) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    String type = rows.getString("type");
                    boolean foreignKey = "f".equals(type);
                    boolean check = "c".equals(type);
                    constraints.add(new Constraint(
                            rows.getString("name"),
                            type,
                            check ? List.of() : strings(rows.getArray("columns")),
                            foreignKey ? rows.getString("ref_schema") : null,
                            foreignKey ? rows.getString("ref_table") : null,
                            foreignKey ? strings(rows.getArray("ref_columns")) : List.of(),
                            rows.getBoolean("validated"),
                            foreignKey ? strings(rows.getArray("trigger_states")) : List.of()));
                }
            }
        }
        return constraints;
    }

    private static List<UniqueIndex> uniqueIndexes(Connection connection, String schema, String table)
            throws SQLException {
        List<UniqueIndex> indexes = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(UNIQUE_INDEXES)) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    indexes.add(new UniqueIndex(rows.getString("name"), strings(rows.getArray("columns")),
                            rows.getBoolean("valid"), rows.getBoolean("ready")));
                }
            }
        }
        return indexes;
    }

    private static List<String> strings(Array array) throws SQLException {
        if (array == null) {
            return List.of();
        }
        try {
            Object[] values = (Object[]) array.getArray();
            return Arrays.stream(values).map(value -> value == null ? null : value.toString()).toList();
        } finally {
            array.free();
        }
    }
}
