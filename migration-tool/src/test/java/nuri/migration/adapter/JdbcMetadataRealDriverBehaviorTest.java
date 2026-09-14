package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 실제 드라이버에서만 드러난 메타데이터 동작의 회귀 계약.
 *
 * <p>2026-09-14 Oracle AI Database 26ai Free(23.26.3)·ojdbc11 23.26.3 에 {@code oracle-catalog} 어댑터를 직접 실행해 확인한
 * 네 가지다: ① {@code getColumns} 열을 순서대로 읽지 않으면 LONG({@code COLUMN_DEF}) 스트림이 닫혀 ORA-17027 로 컬럼이
 * 중간에서 끊겼다 ② {@code getIndexInfo(approximate=false)} 가 원천 테이블 통계를 수집했다 ③ 스키마를 지정해도 사전
 * 전체를 훑어 루틴 조회가 380초를 넘겼다 ④ Oracle 벤더 쿼리 두 개가 실제 딕셔너리와 맞지 않았다.
 */
class JdbcMetadataRealDriverBehaviorTest {

    /** JDBC {@code getColumns} 결과의 열 순서(명세). */
    private static final List<String> GET_COLUMNS_ORDER = List.of(
            "TABLE_CAT", "TABLE_SCHEM", "TABLE_NAME", "COLUMN_NAME", "DATA_TYPE", "TYPE_NAME", "COLUMN_SIZE",
            "BUFFER_LENGTH", "DECIMAL_DIGITS", "NUM_PREC_RADIX", "NULLABLE", "REMARKS", "COLUMN_DEF",
            "SQL_DATA_TYPE", "SQL_DATETIME_SUB", "CHAR_OCTET_LENGTH", "ORDINAL_POSITION", "IS_NULLABLE",
            "SCOPE_CATALOG", "SCOPE_SCHEMA", "SCOPE_TABLE", "SOURCE_DATA_TYPE", "IS_AUTOINCREMENT",
            "IS_GENERATEDCOLUMN");

    @Test
    @DisplayName("getColumns 는 왼쪽에서 오른쪽으로 읽는다 — LONG 스트림 드라이버에서 기본값 있는 컬럼이 끊기지 않는다")
    void readsColumnMetadataLeftToRight() throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata.getTables(isNull(), any(), eq("%"), isNull()))
                .willAnswer(ignored -> rows(List.of(table("LEGACY_DEPT"))));
        given(fixture.metadata.getColumns(any(), any(), anyString(), anyString()))
                .willAnswer(ignored -> forwardOnlyColumns(List.of(
                        column("DEPT_ID", 1, null),
                        column("CRT_DT", 2, "SYSDATE"),
                        column("DEPT_NM", 3, null))));

        CatalogSnapshot snapshot = new JdbcMetadataSourceAdapter().discover(fixture.connection, request(Set.of("APP")));

        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN)
                .extracting(CatalogObject::name)
                .containsExactly("LEGACY_DEPT.DEPT_ID", "LEGACY_DEPT.CRT_DT", "LEGACY_DEPT.DEPT_NM");
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.DEFAULT_CONSTRAINT)
                .extracting(CatalogObject::name).containsExactly("LEGACY_DEPT.CRT_DT");
        assertThat(snapshot.visibilityFindings())
                .filteredOn(finding -> finding.status() == VisibilityStatus.QUERY_FAILED)
                .extracting(VisibilityFinding::operation).doesNotContain("jdbc-get-columns");
    }

    @Test
    @DisplayName("인덱스 조회는 approximate=true 로만 호출한다 — 드라이버가 원천 통계를 수집하지 않게 한다")
    void indexLookupNeverAsksForExactStatistics() throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata.getTables(isNull(), any(), eq("%"), isNull()))
                .willAnswer(ignored -> rows(List.of(table("ORDERS"))));

        new JdbcMetadataSourceAdapter().discover(fixture.connection, request(Set.of("APP")));

        verify(fixture.metadata).getIndexInfo(any(), any(), eq("ORDERS"), anyBoolean(), eq(true));
        verify(fixture.metadata, never()).getIndexInfo(any(), any(), anyString(), anyBoolean(), eq(false));
    }

    @Test
    @DisplayName("스키마를 지정한 탐색은 이스케이프한 스키마 패턴을 사전 조회에 넘기고, 미지정이면 전체를 조회한다")
    void scopedDiscoveryPushesEscapedSchemaIntoDictionaryCalls() throws Exception {
        Fixture scoped = fixture();
        new JdbcMetadataSourceAdapter().discover(scoped.connection, request(Set.of("APP_1")));
        verify(scoped.metadata).getTables(isNull(), eq("APP\\_1"), eq("%"), isNull());
        verify(scoped.metadata).getProcedures(isNull(), eq("APP\\_1"), eq("%"));
        verify(scoped.metadata).getFunctions(isNull(), eq("APP\\_1"), eq("%"));
        verify(scoped.metadata, never()).getTables(isNull(), isNull(), anyString(), any());
        verify(scoped.metadata, never()).getProcedures(isNull(), isNull(), anyString());
        verify(scoped.metadata, never()).getFunctions(isNull(), isNull(), anyString());

        Fixture unscoped = fixture();
        new JdbcMetadataSourceAdapter().discover(unscoped.connection, request(Set.of()));
        verify(unscoped.metadata).getTables(isNull(), isNull(), eq("%"), isNull());
        verify(unscoped.metadata).getProcedures(isNull(), isNull(), eq("%"));
    }

    @Test
    @DisplayName("Oracle 벤더 쿼리는 실제 딕셔너리 열을 쓰고, LONG 정의 열은 SELECT 목록의 마지막에 둔다")
    void oracleVendorQueriesMatchTheRealDictionary() {
        Map<String, VendorCatalogQuery> byOperation = new LinkedHashMap<>();
        VendorCatalogQueries.oracle().forEach(query -> byOperation.put(query.operation(), query));

        VendorCatalogQuery partitions = byOperation.get("oracle-partitions");
        assertThat(partitions.projection().definition().source().column()).isEqualTo("HIGH_VALUE");
        assertThat(selectList(partitions.sql())).last().isEqualTo("HIGH_VALUE");

        VendorCatalogQuery privileges = byOperation.get("oracle-table-privileges");
        assertThat(privileges.sql())
                .contains("TABLE_SCHEMA AS OWNER")
                .contains("TABLE_SCHEMA = ?")
                .doesNotContainPattern("(?<!TABLE_SCHEMA AS )\\bOWNER\\b\\s*(,|=)");
        assertThat(privileges.projection().schema().column()).isEqualTo("OWNER");
    }

    private static List<String> selectList(String sql) {
        Matcher matcher = Pattern.compile("(?is)^\\s*SELECT\\s+(.*?)\\s+FROM\\s").matcher(sql);
        assertThat(matcher.find()).as("SELECT 목록을 찾을 수 없습니다: %s", sql).isTrue();
        return java.util.Arrays.stream(matcher.group(1).split(",")).map(String::trim).toList();
    }

    private static DiscoveryRequest request(Set<String> schemas) {
        return new DiscoveryRequest(Set.of(), schemas, EnumSet.allOf(ObjectKind.class), false);
    }

    private static Map<String, Object> table(String name) {
        return map("TABLE_CAT", null, "TABLE_SCHEM", "APP", "TABLE_NAME", name, "TABLE_TYPE", "TABLE");
    }

    private static Map<String, Object> column(String name, int ordinal, String defaultExpression) {
        return map("TABLE_NAME", "LEGACY_DEPT", "COLUMN_NAME", name, "DATA_TYPE", Types.VARCHAR,
                "TYPE_NAME", "VARCHAR2", "COLUMN_SIZE", 100L, "DECIMAL_DIGITS", 0,
                "NULLABLE", DatabaseMetaData.columnNullable, "REMARKS", null, "COLUMN_DEF", defaultExpression,
                "ORDINAL_POSITION", ordinal, "IS_AUTOINCREMENT", "NO", "IS_GENERATEDCOLUMN", "NO");
    }

    private static Map<String, Object> map(Object... pairs) {
        LinkedHashMap<String, Object> row = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            row.put((String) pairs[i], pairs[i + 1]);
        }
        return row;
    }

    /**
     * Oracle 의 LONG 스트림처럼 동작하는 getColumns 결과: 한 행 안에서 이미 읽은 열보다 앞선 열을 다시 읽으면
     * ORA-17027 과 같은 SQLState 로 실패한다.
     */
    private static ResultSet forwardOnlyColumns(List<Map<String, Object>> source) throws Exception {
        ResultSet result = mock(ResultSet.class);
        AtomicInteger cursor = new AtomicInteger(-1);
        AtomicInteger highest = new AtomicInteger(-1);
        given(result.next()).willAnswer(ignored -> {
            highest.set(-1);
            return cursor.incrementAndGet() < source.size();
        });
        org.mockito.stubbing.Answer<Object> read = invocation -> {
            String label = invocation.getArgument(0);
            int position = GET_COLUMNS_ORDER.indexOf(label);
            if (position < highest.get()) {
                throw new SQLException("Stream has already been closed: " + label, "99999");
            }
            highest.set(position);
            Object value = source.get(cursor.get()).get(label);
            return switch (invocation.getMethod().getName()) {
                case "getInt" -> value instanceof Number number ? number.intValue() : 0;
                case "getLong" -> value instanceof Number number ? number.longValue() : 0L;
                default -> value == null ? null : String.valueOf(value);
            };
        };
        given(result.getString(anyString())).willAnswer(read);
        given(result.getInt(anyString())).willAnswer(read);
        given(result.getLong(anyString())).willAnswer(read);
        return result;
    }

    private static ResultSet rows(List<Map<String, Object>> source) throws Exception {
        ResultSet result = mock(ResultSet.class);
        AtomicInteger cursor = new AtomicInteger(-1);
        given(result.next()).willAnswer(ignored -> cursor.incrementAndGet() < source.size());
        given(result.getString(anyString())).willAnswer(invocation -> {
            Object value = source.get(cursor.get()).get(invocation.getArgument(0));
            return value == null ? null : String.valueOf(value);
        });
        given(result.getInt(anyString())).willReturn(0);
        given(result.getShort(anyString())).willReturn((short) 0);
        given(result.getLong(anyString())).willReturn(0L);
        return result;
    }

    private record Fixture(Connection connection, DatabaseMetaData metadata) {
    }

    private static Fixture fixture() throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getSchema()).willReturn("APP");
        given(metadata.getDatabaseProductName()).willReturn("Synthetic JDBC");
        given(metadata.getDatabaseProductVersion()).willReturn("1.0");
        given(metadata.getDriverName()).willReturn("synthetic-driver");
        given(metadata.getDriverVersion()).willReturn("1");
        given(metadata.storesUpperCaseIdentifiers()).willReturn(true);
        given(metadata.getSearchStringEscape()).willReturn("\\");
        given(metadata.getCatalogs()).willAnswer(ignored -> rows(List.of()));
        given(metadata.getSchemas()).willAnswer(ignored -> rows(List.of(map("TABLE_CATALOG", null, "TABLE_SCHEM", "APP"))));
        given(metadata.getTables(any(), any(), anyString(), any())).willAnswer(ignored -> rows(List.of()));
        given(metadata.getColumns(any(), any(), anyString(), anyString())).willAnswer(ignored -> rows(List.of()));
        given(metadata.getPrimaryKeys(any(), any(), anyString())).willAnswer(ignored -> rows(List.of()));
        given(metadata.getImportedKeys(any(), any(), anyString())).willAnswer(ignored -> rows(List.of()));
        given(metadata.getIndexInfo(any(), any(), anyString(), anyBoolean(), anyBoolean())).willAnswer(ignored -> rows(List.of()));
        given(metadata.getProcedures(any(), any(), anyString())).willAnswer(ignored -> rows(List.of()));
        given(metadata.getFunctions(any(), any(), anyString())).willAnswer(ignored -> rows(List.of()));
        given(metadata.getUDTs(any(), any(), anyString(), any(int[].class))).willAnswer(ignored -> rows(List.of()));
        return new Fixture(connection, metadata);
    }
}
