package nuri.api.harness;

import nuri.api.harness.SchemaConformanceRules.CatalogNames;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 벤더 DB 에 실제로 적용된 카탈로그를 스키마 규칙으로 본다(ADR-0047). 벤더 프로젝트의 Flyway 는 번역 기준선과 도입자의 벤더 마이그레이션을
 * 적용하므로, SQL 파일을 재생하는 PostgreSQL 린터는 그 스키마를 보지 못한다.
 *
 * <p>{@code scripts/project-composer-vendor-integration.mjs} 가 기준선과 나머지를 나눠 적용하고 두 시점의 이름 목록을
 * {@code VENDOR_CATALOG_SNAPSHOT} 파일로 넘긴 뒤 이 시험을 시나리오 시험과 소유 표시보다 먼저 돌린다. 그래야 시험 픽스처와
 * {@code vendor_test_owner} 가 도입자 객체로 보이지 않는다. 접속 값이 없으면 실패한다 — 이 시험은 전용 작업에서만 돈다.
 *
 * <p>규칙의 범위: PK 전략·숫자 변환·길이는 카탈로그 전체, 명명·감사·유니크 미러·바이트 길이는 기준선 뒤의 새 객체, 뷰 이름과 초기 권한은 전체. 표·컬럼 부재와 타입
 * 계열은 Hibernate validate 가 같은 DB 에서 본다. 생성 시점 기준선의 정확 대조는 실행 도구의 {@code assertVendorApplied} 가 한다.
 */
@Tag("vendor-conformance")
class VendorCatalogConformanceTest {

    /** 엔티티 대조의 하한. 조회가 조용히 비면 빈 대조가 통과한다. */
    private static final int MIN_ENTITIES = 20;
    private static final int MIN_CHECKED_COLUMNS = 200;
    private static final int MIN_MAPPED_UNIQUES = 4;

    private static final String ORACLE_HIDDEN_COLUMN = "sys_nc\\d+\\$";

    private static CatalogNames baseline;
    private static CatalogNames current;
    private static Map<String, Map<String, String>> schema;
    private static Map<String, Map<String, Set<String>>> uniques;
    private static Set<String> grants;
    private static Set<String> views;
    private static Map<String, Set<String>> primaryKeys;
    private static Set<String> unchangedUniques;
    private static Set<String> storedTables;
    private static Map<String, Integer> byteColumns;
    private static boolean oracle;

    @BeforeAll
    static void readCatalog() throws Exception {
        JsonNode snapshot = JsonMapper.builder().configureForJackson2().build()
                .readTree(Path.of(requireEnvironment("VENDOR_CATALOG_SNAPSHOT")).toFile());
        oracle = "oracle".equals(snapshot.path("vendor").asString());
        baseline = names(snapshot.path("baseline"));
        current = names(snapshot.path("current"));
        unchangedUniques = strings(snapshot.path("unchangedUniques"));
        byteColumns = new HashMap<>();
        strings(snapshot.path("byteColumns")).forEach(item -> byteColumns.put(item.substring(0, item.indexOf('=')), Integer.valueOf(item.substring(item.indexOf('=') + 1))));
        try (Connection connection = DriverManager.getConnection(requireEnvironment("VENDOR_TEST_URL"),
                requireEnvironment("SPRING_DATASOURCE_USERNAME"), requireEnvironment("SPRING_DATASOURCE_PASSWORD"))) {
            DatabaseMetaData metadata = connection.getMetaData();
            Map<String, String> stored = new LinkedHashMap<>();
            storedTables = new TreeSet<>();
            schema = readColumns(connection, metadata, stored, storedTables);
            views = readViews(connection, metadata);
            uniques = readUniques(connection, metadata, stored);
            primaryKeys = readPrimaryKeys(connection, metadata, stored);
            grants = readGrants(connection);
        }
    }

    @Test
    @DisplayName("엔티티 매핑이 실제 컬럼에 맞는다 — PK 전략·숫자 변환·길이 초과")
    void entityMappingsFitThePhysicalColumns() {
        var entities = SchemaConformanceRules.entityClasses("nuri");
        var audit = SchemaConformanceRules.auditEntities(entities, schema);
        if (entities.size() < MIN_ENTITIES || audit.checkedColumns() < MIN_CHECKED_COLUMNS) {
            fail("게이트 무결성 파손: 엔티티 " + entities.size() + "종 / 대조 컬럼 " + audit.checkedColumns()
                    + "건 — 카탈로그 조회 파손 의심(예상 하한 " + MIN_ENTITIES + "종·" + MIN_CHECKED_COLUMNS + "건).");
        }
        report("엔티티 매핑과 실제 컬럼의 불일치", audit.violations());
    }

    @Test
    @DisplayName("기준선 뒤에 생긴 객체가 DB 헌법의 명명·감사 컬럼 표준을 따른다")
    void newObjectsFollowTheStandard() {
        if (baseline.tables().isEmpty() || current.tables().isEmpty()) {
            fail("게이트 무결성 파손: 카탈로그 표 수 기준선 " + baseline.tables().size() + " / 현재 " + current.tables().size());
        }
        List<String> problems = new ArrayList<>(SchemaConformanceRules.tableProblems(storedTables, baseline.tables(), views, schema, oracle));
        problems.addAll(SchemaConformanceRules.newObjectProblems(baseline, current, schema, views));
        report("DB 헌법 명명·타입·감사 컬럼 표준 위반", problems);
    }

    @Test
    @DisplayName("기준선 뒤에 바이트 길이가 된 컬럼이 엔티티 길이만큼의 글자를 담는다")
    void newByteColumnsHoldTheEntityLength() {
        report("바이트 길이 컬럼과 엔티티 길이의 불일치", SchemaConformanceRules.byteLengthProblems(SchemaConformanceRules.entityClasses("nuri"), byteColumns));
    }

    @Test
    @DisplayName("기준선 뒤에 생긴 유니크가 엔티티에 미러돼 있다")
    void newUniquesAreMirrored() {
        var mirrors = SchemaConformanceRules.entityMirrors("nuri.business");
        long mapped = uniques.entrySet().stream().filter(entry -> mirrors.containsKey(entry.getKey()))
                .mapToLong(entry -> entry.getValue().size()).sum();
        if (mapped < MIN_MAPPED_UNIQUES) {
            fail("게이트 무결성 파손: 엔티티가 매핑된 표의 유니크 " + mapped + "건 — 드라이버 조회 파손 의심(예상 하한 " + MIN_MAPPED_UNIQUES + "건).");
        }
        report("DB UNIQUE 의 JPA 미러 누락", SchemaConformanceRules.mirrorProblems(mirrors, uniques, unchangedUniques, primaryKeys));
    }

    @Test
    @DisplayName("권한 카탈로그의 defaultGroups 와 벤더 DB 의 초기 부여가 같다")
    void defaultGroupsMatchTheVendorGrants() throws IOException {
        Set<String> expected = new TreeSet<>();
        JsonNode catalog = JsonMapper.builder().configureForJackson2().build()
                .readTree(HarnessSourceIndex.repoRoot().resolve("config/governance/permission-catalog.json").toFile());
        for (JsonNode permission : catalog.path("permissions")) {
            for (JsonNode group : permission.path("defaultGroups")) {
                expected.add(group.asString() + "/" + permission.path("code").asString());
            }
        }
        if (expected.isEmpty()) {
            fail("게이트 무결성 파손: 권한 카탈로그에서 초기 부여를 하나도 읽지 못했습니다.");
        }
        report("권한 초기 부여 불일치 — 카탈로그를 고쳤다면 벤더 마이그레이션으로 부여를 맞추십시오", SchemaConformanceRules.grantProblems(expected, grants));
    }

    private static void report(String title, List<String> problems) {
        if (!problems.isEmpty()) {
            fail("[VENDOR CONFORMANCE] " + title + "\n❌ " + String.join("\n❌ ", problems));
        }
    }

    private static String requireEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            fail("게이트 무결성 파손: " + name + " 가 없습니다. 벤더 생성물에서 npm run verify:vendor-schema 로 실행하십시오. 조용한 skip 은 false-green 을 만듭니다.");
        }
        return value;
    }

    private static CatalogNames names(JsonNode node) {
        return new CatalogNames(strings(node.path("columns")), strings(node.path("constraints")), strings(node.path("indexes")), strings(node.path("sequences")));
    }

    private static Set<String> strings(JsonNode array) {
        Set<String> values = new TreeSet<>();
        array.forEach(item -> values.add(item.asString()));
        return values;
    }

    /**
     * 메타 조회의 스키마. CUBRID 드라이버는 Connection.getSchema 를 지원하지 않는다(UnsupportedOperationException 을 감싼 SQLException).
     * CUBRID 의 스키마는 접속 계정이고 메타의 TABLE_SCHEM 도 그 이름이다(2026-11-06 실측).
     */
    private static String schema(Connection connection) throws SQLException {
        try {
            return connection.getSchema();
        } catch (SQLException unsupported) {
            if (unsupported.getCause() instanceof UnsupportedOperationException) {
                return connection.getMetaData().getUserName();
            }
            throw unsupported;
        }
    }

    private static String lower(String name) {
        return name.toLowerCase(Locale.ROOT);
    }

    /**
     * 표 → 컬럼 → 규칙이 읽는 타입. {@code stored} 에 드라이버에 다시 넘길 저장 표기를 남긴다(Oracle 은 대문자다).
     * {@code storedTables} 는 드라이버가 답한 표 이름 그대로다 — {@code stored} 의 키는 소문자로 접어 TB_A 와 "tb_a" 가 겹친다.
     */
    private static Map<String, Map<String, String>> readColumns(Connection connection, DatabaseMetaData metadata, Map<String, String> stored, Set<String> storedTables) throws SQLException {
        try (ResultSet tables = metadata.getTables(connection.getCatalog(), schema(connection), "%", new String[] {"TABLE"})) {
            while (tables.next()) {
                stored.put(lower(tables.getString("TABLE_NAME")), tables.getString("TABLE_NAME"));
                storedTables.add(tables.getString("TABLE_NAME"));
            }
        }
        Map<String, Map<String, String>> columns = new TreeMap<>();
        try (ResultSet rows = metadata.getColumns(connection.getCatalog(), schema(connection), "%", "%")) {
            while (rows.next()) {
                String table = lower(rows.getString("TABLE_NAME"));
                if (stored.containsKey(table)) {
                    columns.computeIfAbsent(table, key -> new LinkedHashMap<>()).put(lower(rows.getString("COLUMN_NAME")),
                            SchemaConformanceRules.physicalType(rows.getInt("DATA_TYPE"), rows.getString("TYPE_NAME"), rows.getInt("COLUMN_SIZE"), rows.getInt("DECIMAL_DIGITS")));
                }
            }
        }
        return columns;
    }

    private static Set<String> readViews(Connection connection, DatabaseMetaData metadata) throws SQLException {
        Set<String> names = new TreeSet<>();
        try (ResultSet rows = metadata.getTables(connection.getCatalog(), schema(connection), "%", new String[] {"VIEW"})) {
            while (rows.next()) {
                names.add(lower(rows.getString("TABLE_NAME")));
            }
        }
        return names;
    }

    private static Map<String, Set<String>> readPrimaryKeys(Connection connection, DatabaseMetaData metadata, Map<String, String> stored) throws SQLException {
        Map<String, Set<String>> keys = new HashMap<>();
        for (Map.Entry<String, String> table : stored.entrySet()) {
            try (ResultSet rows = metadata.getPrimaryKeys(connection.getCatalog(), schema(connection), table.getValue())) {
                while (rows.next()) {
                    keys.computeIfAbsent(table.getKey(), key -> new TreeSet<>()).add(lower(rows.getString("COLUMN_NAME")));
                }
            }
        }
        return keys;
    }

    /** 표 → 유니크 인덱스 이름 → 컬럼. approximate 로 부른다 — 정확 통계를 달라고 하면 Oracle 드라이버가 표를 분석하는 문장을 낸다. */
    private static Map<String, Map<String, Set<String>>> readUniques(Connection connection, DatabaseMetaData metadata, Map<String, String> stored) throws SQLException {
        Map<String, Map<String, Set<String>>> uniques = new HashMap<>();
        for (Map.Entry<String, String> table : stored.entrySet()) {
            try (ResultSet rows = metadata.getIndexInfo(connection.getCatalog(), schema(connection), table.getValue(), true, true)) {
                while (rows.next()) {
                    String index = rows.getString("INDEX_NAME");
                    String column = rows.getString("COLUMN_NAME");
                    if (index != null && column != null && rows.getShort("TYPE") != DatabaseMetaData.tableIndexStatistic) {
                        Set<String> columns = uniques.computeIfAbsent(table.getKey(), key -> new HashMap<>())
                                .computeIfAbsent(lower(index), key -> new TreeSet<>());
                        if (lower(column).matches(ORACLE_HIDDEN_COLUMN)) {
                            columns.addAll(oracleExpressionColumns(connection, index));
                        } else {
                            columns.add(lower(column));
                        }
                    }
                }
            }
        }
        if (oracle) {
            addOracleConstraintsOnPlainIndexes(connection, uniques);
        }
        return uniques;
    }

    /**
     * Oracle 의 유니크 제약은 일반 인덱스로 집행될 수 있다(기존 인덱스 재사용, DEFERRABLE). 드라이버는 유니크 인덱스만 답하므로 제약 쪽에서 읽어 더한다.
     * 값이 없으면 미러 없이 초록이 되고 PostgreSQL 린터의 {@code ADD CONSTRAINT ... UNIQUE} 판정보다 벤더만 느슨해진다.
     */
    private static void addOracleConstraintsOnPlainIndexes(Connection connection, Map<String, Map<String, Set<String>>> uniques) throws SQLException {
        String sql = "SELECT c.table_name, c.constraint_name, k.column_name FROM user_constraints c JOIN user_indexes i ON i.index_name = c.index_name"
                + " JOIN user_cons_columns k ON k.constraint_name = c.constraint_name AND k.table_name = c.table_name WHERE c.constraint_type = 'U' AND i.uniqueness = 'NONUNIQUE'";
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            while (rows.next()) {
                uniques.computeIfAbsent(lower(rows.getString(1)), key -> new HashMap<>()).computeIfAbsent(lower(rows.getString(2)), key -> new TreeSet<>()).add(lower(rows.getString(3)));
            }
        }
    }

    /** Oracle 함수 인덱스는 숨은 컬럼 이름으로 답한다. 복합 NULL 허용 유니크가 이 모양이라 식이 쓰는 컬럼으로 미러와 맞춘다. */
    private static Set<String> oracleExpressionColumns(Connection connection, String index) throws SQLException {
        Set<String> columns = new TreeSet<>();
        try (PreparedStatement statement = connection.prepareStatement("SELECT column_expression FROM user_ind_expressions WHERE index_name = ?")) {
            statement.setString(1, index);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    columns.addAll(SchemaConformanceRules.expressionColumns(rows.getString(1)));
                }
            }
        }
        return columns;
    }

    private static Set<String> readGrants(Connection connection) throws SQLException {
        Set<String> rows = new TreeSet<>();
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT authrt_cd, authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_type_cd = 'OPERATION'")) {
            while (result.next()) {
                rows.add(result.getString(1) + "/" + result.getString(2));
            }
        }
        return rows;
    }
}
