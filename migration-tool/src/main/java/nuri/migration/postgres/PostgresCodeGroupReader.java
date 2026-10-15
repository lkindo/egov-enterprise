package nuri.migration.postgres;

import nuri.migration.source.SourceIntrospector;
import nuri.migration.validate.CodeGroupReader;
import nuri.migration.validate.CodeGroupState;

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * [ADR-0029 L4 D7] 공통코드 그룹의 PostgreSQL 읽기. 헤더는 {@code tb_com_cd}, 상세코드는 {@code tb_com_dtl_cd} 에서 읽고
 * {@code use_yn = 'Y'} 만 사용 중으로 본다(앱의 공통코드 조회와 같다). 상세코드 값은 호출자의 메모리에만 둔다.
 */
public final class PostgresCodeGroupReader implements CodeGroupReader {

    @Override
    public Map<String, CodeGroupState> read(Connection connection, String schema, Set<String> groups)
            throws SQLException {
        Objects.requireNonNull(connection, "connection");
        String qualified = SourceIntrospector.ident(schema);
        Map<String, CodeGroupState> states = new LinkedHashMap<>();
        if (groups == null || groups.isEmpty()) {
            return states;
        }
        Set<String> headers = new HashSet<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT cd_id FROM " + qualified + ".tb_com_cd WHERE cd_id = ANY (?)")) {
            statement.setArray(1, array(connection, groups));
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    headers.add(rows.getString(1));
                }
            }
        }
        Map<String, Set<String>> active = new HashMap<>();
        Map<String, Set<String>> inactive = new HashMap<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT cd_id, dtl_cd, use_yn FROM " + qualified + ".tb_com_dtl_cd WHERE cd_id = ANY (?)")) {
            statement.setArray(1, array(connection, groups));
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    Map<String, Set<String>> codes = "Y".equals(rows.getString(3)) ? active : inactive;
                    codes.computeIfAbsent(rows.getString(1), ignored -> new HashSet<>()).add(rows.getString(2));
                }
            }
        }
        for (String group : groups) {
            states.put(group, headers.contains(group)
                    ? new CodeGroupState(true, active.get(group), inactive.get(group))
                    : CodeGroupState.absent());
        }
        return states;
    }

    private static Array array(Connection connection, Set<String> groups) throws SQLException {
        return connection.createArrayOf("varchar", groups.toArray());
    }
}
