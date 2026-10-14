package nuri.migration.postgres;

import nuri.migration.validate.ledger.TermLedgerValidator.StandardTermRecord;

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * 용어 매핑 원장의 확정 행을 대조할 표준 용어를 live 메타에서 읽는다(ADR-0029 결정 3). 폐기 여부는 V2_128 이 더한
 * {@code deprecated_yn} 이다. 그 컬럼이 없으면(표준 메타 확장 전 DB) 폐기 용어를 걸러낼 수 없으므로 읽지 않고 멈춘다.
 */
public final class PostgresStandardTermReader {

    private static final String DEPRECATED_COLUMN = """
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = ? AND table_name = 'meta_standard_terms' AND column_name = 'deprecated_yn'
            """;

    /** {@code engAbbrs} 는 대문자 영문약어다. 결과의 키도 대문자다. */
    public Map<String, StandardTermRecord> read(Connection connection, String schema, Set<String> engAbbrs)
            throws SQLException {
        Objects.requireNonNull(connection, "connection");
        if (schema == null || !schema.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("표준 메타 schema 이름이 맞지 않습니다");
        }
        if (engAbbrs.isEmpty()) {
            return Map.of();
        }
        try (PreparedStatement check = connection.prepareStatement(DEPRECATED_COLUMN)) {
            check.setString(1, schema);
            try (ResultSet rows = check.executeQuery()) {
                if (!rows.next()) {
                    throw new IllegalStateException("표준 메타가 확장(V2_128) 전이라 폐기 여부를 확인할 수 없습니다");
                }
            }
        }
        String sql = "SELECT upper(eng_abbr), term_name, domain_name, deprecated_yn FROM \"" + schema
                + "\".meta_standard_terms WHERE upper(eng_abbr) = ANY (?)";
        Map<String, StandardTermRecord> terms = new HashMap<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            Array values = connection.createArrayOf("text", engAbbrs.toArray());
            statement.setArray(1, values);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    terms.put(rows.getString(1), new StandardTermRecord(rows.getString(2), rows.getString(3),
                            "Y".equals(rows.getString(4))));
                }
            }
        }
        return terms;
    }
}
