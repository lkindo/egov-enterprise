package nuri.migration.validate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.transform.TypeConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 매핑의 TARGET 이 표준 스키마({@code db_columns.json})에 실재하는지 검증(DB 헌법 제2조 강제).
 *
 * <p>{@code db_columns.json} 은 {@code {table_name, column_name}} 배열(코드젠 스냅샷).
 * 부재·파싱 실패·빈 catalog는 타깃 표준을 증명할 수 없으므로 검증 오류다. 경로는
 * {@code migration.db-columns-path}.
 */
@Component
public class MappingValidator {

    private static final Pattern UNSAFE_WHERE = Pattern.compile(
            "(?is)(;|--|/\\*|\\*/|\\b(select|insert|update|delete|merge|drop|alter|create|truncate|call|copy|grant|revoke)\\b)");

    private final TransformerRegistry transformers;
    private final String dbColumnsPath;
    private final ObjectMapper json = new ObjectMapper();

    public MappingValidator(TransformerRegistry transformers,
                            @Value("${migration.db-columns-path:db_columns.json}") String dbColumnsPath) {
        this.transformers = transformers;
        this.dbColumnsPath = dbColumnsPath;
    }

    public ValidationResult validate(MappingSpec spec) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Set<String> targetColumns = loadTargetColumns(errors);
        Map<String, MappingSpec.TableMapping> sourceTables = new LinkedHashMap<>();
        for (MappingSpec.TableMapping t : spec.tables()) {
            if (!isBlank(t.source())) {
                MappingSpec.TableMapping previous = sourceTables.putIfAbsent(normalize(t.source()), t);
                if (previous != null) {
                    errors.add("중복 소스 테이블 매핑 금지: '" + t.source()
                            + "' — 한 소스 테이블은 한 번만 선언해야 실행 결과 식별성이 보장됩니다");
                }
            }
        }

        for (MappingSpec.TableMapping t : spec.tables()) {
            validateIdentifier("소스 테이블", t.source(), errors);
            if (isBlank(t.target())) {
                errors.add("타깃 테이블 미지정: source=" + t.source());
                continue;
            }
            validateIdentifier("타깃 테이블", t.target(), errors);
            if (!isBlank(t.orderBy()) && !t.orderByKeys().isEmpty()) {
                errors.add(t.source() + ": orderBy와 orderByKeys를 함께 선언할 수 없습니다");
            }
            if (!isBlank(t.orderBy())) {
                validateColumnIdentifier(t.source() + ": orderBy", t.orderBy(), errors);
            }
            Set<String> distinctOrderKeys = new HashSet<>();
            for (String orderKey : t.orderByKeys()) {
                validateColumnIdentifier(t.source() + ": orderByKeys", orderKey, errors);
                if (!isBlank(orderKey) && !distinctOrderKeys.add(normalize(orderKey))) {
                    errors.add(t.source() + ": orderByKeys 중복 금지: " + orderKey);
                }
            }
            if (!isBlank(t.targetKey())) {
                validateColumnIdentifier(t.target() + ": targetKey", t.targetKey(), errors);
            }
            if (!isBlank(t.where()) && UNSAFE_WHERE.matcher(t.where()).find()) {
                errors.add(t.source() + ": where에는 단일 읽기 조건식만 허용됩니다(주석·세미콜론·SQL 문 금지)");
            }
            MappingSpec.IdStrategy id = t.idStrategy();
            validateIdStrategy(t, id, targetColumns, errors);
            for (MappingSpec.ColumnMapping c : t.columns()) {
                if (isBlank(c.target())) {
                    errors.add(t.target() + ": 타깃 컬럼 미지정");
                    continue;
                }
                if (!targetColumns.isEmpty()) {
                    String key = normalize(t.target() + "." + c.target());
                    if (!targetColumns.contains(key)) {
                        errors.add("표준 스키마에 없는 타깃 컬럼: " + key);
                    }
                }
                if (!isBlank(c.transform()) && !transformers.has(c.transform())) {
                    errors.add(t.target() + "." + c.target() + ": 미등록 변환기 '" + c.transform() + "'");
                }
                if (!isBlank(c.type()) && !TypeConverter.isKnown(c.type())) {
                    errors.add(t.target() + "." + c.target() + ": 미지 타입 '" + c.type() + "'");
                }
                if (!isBlank(c.codemap()) && !spec.codemaps().containsKey(c.codemap())) {
                    errors.add(t.target() + "." + c.target() + ": 정의되지 않은 코드맵 '" + c.codemap() + "'");
                }
                if (!isBlank(c.fkRef())) {
                    validateFkRef(t, c, sourceTables, errors);
                }
                if (isBlank(c.source()) && c.constant() == null && isBlank(c.fkRef())) {
                    errors.add(t.target() + "." + c.target()
                            + ": source·const 모두 없음 — 값이 결정되지 않는 컬럼 매핑은 허용되지 않습니다");
                }
            }
        }
        validateCrossTableCycles(spec.tables(), sourceTables, errors);
        return new ValidationResult(errors, warnings);
    }

    private static void validateCrossTableCycles(List<MappingSpec.TableMapping> tables,
                                                  Map<String, MappingSpec.TableMapping> sourceTables,
                                                  List<String> errors) {
        Map<String, Set<String>> dependencies = new LinkedHashMap<>();
        for (MappingSpec.TableMapping table : tables) {
            if (isBlank(table.source())) {
                continue;
            }
            String child = normalize(table.source());
            dependencies.putIfAbsent(child, new HashSet<>());
            for (MappingSpec.ColumnMapping column : table.columns()) {
                if (isBlank(column.fkRef())) {
                    continue;
                }
                String parent = normalize(column.fkRef());
                if (sourceTables.containsKey(parent) && !parent.equals(child)) {
                    dependencies.get(child).add(parent);
                }
            }
        }

        Map<String, Integer> state = new LinkedHashMap<>();
        Deque<String> path = new ArrayDeque<>();
        Set<String> reported = new HashSet<>();
        for (String node : dependencies.keySet()) {
            detectCycle(node, dependencies, state, path, reported, errors);
        }
    }

    private static void detectCycle(String node, Map<String, Set<String>> dependencies,
                                    Map<String, Integer> state, Deque<String> path,
                                    Set<String> reported, List<String> errors) {
        int current = state.getOrDefault(node, 0);
        if (current == 2) {
            return;
        }
        if (current == 1) {
            List<String> cycle = new ArrayList<>();
            boolean collect = false;
            for (String item : path) {
                if (item.equals(node)) {
                    collect = true;
                }
                if (collect) {
                    cycle.add(item);
                }
            }
            cycle.add(node);
            String signature = cycle.stream().sorted().distinct().reduce((a, b) -> a + "," + b).orElse(node);
            if (reported.add(signature)) {
                errors.add("교차 테이블 FK 순환 감지 — 결정적 실행 순서가 없음: "
                        + String.join(" -> ", cycle));
            }
            return;
        }
        state.put(node, 1);
        path.addLast(node);
        for (String dependency : dependencies.getOrDefault(node, Set.of())) {
            detectCycle(dependency, dependencies, state, path, reported, errors);
        }
        path.removeLast();
        state.put(node, 2);
    }

    private static void validateIdStrategy(MappingSpec.TableMapping table, MappingSpec.IdStrategy id,
                                           Set<String> targetColumns, List<String> errors) {
        if (id == null) {
            return;
        }
        if (isBlank(id.column())) {
            errors.add(table.target() + ": idStrategy.column 미지정");
        }
        if (isBlank(id.generator())) {
            errors.add(table.target() + ": idStrategy.generator 미지정");
        }
        if (isBlank(id.sourceKey())) {
            errors.add(table.target()
                    + ": idStrategy.sourceKey 미지정 — 레거시 키 매핑 불가(신규 키 미채번, fkRef 번역 불가)");
        }
        if (!isBlank(id.column()) && !targetColumns.isEmpty()) {
            String idKey = normalize(table.target() + "." + id.column());
            if (!targetColumns.contains(idKey)) {
                errors.add("표준 스키마에 없는 idStrategy 타깃 컬럼: " + idKey);
            }
        }
    }

    private static void validateFkRef(MappingSpec.TableMapping child, MappingSpec.ColumnMapping column,
                                      Map<String, MappingSpec.TableMapping> sourceTables,
                                      List<String> errors) {
        String location = child.target() + "." + column.target();
        if (isBlank(column.source())) {
            errors.add(location + ": fkRef에는 번역할 source 컬럼이 필수입니다");
        }
        if (column.constant() != null) {
            errors.add(location + ": fkRef와 const를 함께 선언할 수 없습니다 — FK 번역이 우회됩니다");
        }

        MappingSpec.TableMapping parent = sourceTables.get(normalize(column.fkRef()));
        if (parent == null) {
            errors.add(location + ": fkRef 부모 소스 테이블 '" + column.fkRef()
                    + "' 이 매핑에 없음 — 모든 자식 행이 고아가 됩니다");
            return;
        }
        if (!isComplete(parent.idStrategy())) {
            errors.add(location + ": fkRef 부모 '" + column.fkRef()
                    + "' 의 idStrategy(column/generator/sourceKey)가 완전하지 않아 FK를 번역할 수 없습니다");
        }
    }

    private static boolean isComplete(MappingSpec.IdStrategy id) {
        return id != null
                && !isBlank(id.column())
                && !isBlank(id.generator())
                && !isBlank(id.sourceKey());
    }

    /**
     * 실행 전에 실제 source JDBC metadata를 대조한다. 모든 source table, column 및
     * {@code idStrategy.sourceKey}가 확인된 뒤에만 타깃 쓰기 단계로 진행할 수 있다.
     */
    public ValidationResult validateLiveSource(MappingSpec spec, JdbcTemplate source) {
        List<String> errors = new ArrayList<>();
        source.execute((Connection connection) -> {
            connection.setReadOnly(true);
            DatabaseMetaData metadata = connection.getMetaData();
            String defaultCatalog = connection.getCatalog();
            String defaultSchema = connection.getSchema();
            for (MappingSpec.TableMapping table : spec.tables()) {
                QualifiedName name = qualifiedName(table.source(), defaultCatalog, defaultSchema);
                Set<String> liveColumns = metadataColumns(
                        metadata, name.catalog(), name.schema(), name.table());
                if (liveColumns.isEmpty()) {
                    errors.add("실 source에 없는 테이블 또는 metadata 접근 불가: " + table.source());
                    continue;
                }
                for (MappingSpec.ColumnMapping column : table.columns()) {
                    if (!isBlank(column.source()) && !liveColumns.contains(normalize(column.source()))) {
                        errors.add("실 source에 없는 컬럼: " + table.source() + "." + column.source());
                    }
                }
                MappingSpec.IdStrategy id = table.idStrategy();
                if (id != null && !isBlank(id.sourceKey())
                        && !liveColumns.contains(normalize(id.sourceKey()))) {
                    errors.add("실 source에 없는 idStrategy.sourceKey: "
                            + table.source() + "." + id.sourceKey());
                }
                for (String orderKey : table.effectiveOrderKeys()) {
                    if (!liveColumns.contains(normalize(orderKey))) {
                        errors.add("실 source에 없는 order key: " + table.source() + "." + orderKey);
                    }
                }
            }
            return null;
        });
        return new ValidationResult(errors, List.of());
    }

    /**
     * commit 직전 실제 target JDBC metadata를 대조한다. 정적 표준 snapshot과 별개로,
     * 현재 접속 대상에 매핑 table/column이 모두 존재하지 않으면 쓰기를 시작하지 않는다.
     */
    public ValidationResult validateLiveTarget(MappingSpec spec, JdbcTemplate target) {
        List<String> errors = new ArrayList<>();
        target.execute((Connection connection) -> {
            DatabaseMetaData metadata = connection.getMetaData();
            String defaultCatalog = connection.getCatalog();
            String defaultSchema = connection.getSchema();
            for (MappingSpec.TableMapping table : spec.tables()) {
                String qualified = table.target();
                if (isBlank(qualified)) {
                    continue;
                }
                QualifiedName name = qualifiedName(qualified, defaultCatalog, defaultSchema);
                Set<String> liveColumns = metadataColumns(
                        metadata, name.catalog(), name.schema(), name.table());
                if (liveColumns.isEmpty()) {
                    errors.add("실 target에 없는 테이블 또는 metadata 접근 불가: " + qualified);
                    continue;
                }
                MappingSpec.IdStrategy id = table.idStrategy();
                if (id != null && !isBlank(id.column()) && !liveColumns.contains(normalize(id.column()))) {
                    errors.add("실 target에 없는 idStrategy 컬럼: " + qualified + "." + id.column());
                }
                if (!isBlank(table.targetKey()) && !liveColumns.contains(normalize(table.targetKey()))) {
                    errors.add("실 target에 없는 targetKey: " + qualified + "." + table.targetKey());
                }
                for (MappingSpec.ColumnMapping column : table.columns()) {
                    if (!isBlank(column.target()) && !liveColumns.contains(normalize(column.target()))) {
                        errors.add("실 target에 없는 컬럼: " + qualified + "." + column.target());
                    }
                }
            }
            return null;
        });
        return new ValidationResult(errors, List.of());
    }

    private static Set<String> metadataColumns(DatabaseMetaData metadata, String catalog,
                                               String schema, String table) throws SQLException {
        Set<String> columns = new HashSet<>();
        List<String> schemas = caseVariants(schema);
        List<String> tables = caseVariants(table);
        for (String schemaVariant : schemas) {
            for (String tableVariant : tables) {
                try (ResultSet result = metadata.getColumns(catalog, schemaVariant, tableVariant, null)) {
                    while (result.next()) {
                        if (!metadataIdentityMatches(result, catalog, schema, table)) {
                            continue;
                        }
                        String column = result.getString("COLUMN_NAME");
                        if (column != null) {
                            columns.add(normalize(column));
                        }
                    }
                }
                if (!columns.isEmpty()) {
                    return columns;
                }
            }
        }
        return columns;
    }

    /**
     * JDBC metadata의 schema/table 인자는 검색 패턴이라 {@code _}/{@code %}를 wildcard로 해석한다.
     * 드라이버가 돌려준 실제 identity를 다시 exact-match해 이름이 비슷한 다른 테이블의 컬럼을
     * 요청한 테이블의 컬럼으로 오인하지 않는다.
     */
    private static boolean metadataIdentityMatches(ResultSet result, String catalog,
                                                   String schema, String table) throws SQLException {
        return equalsNullableIgnoreCase(catalog, result.getString("TABLE_CAT"))
                && equalsNullableIgnoreCase(schema, result.getString("TABLE_SCHEM"))
                && table.equalsIgnoreCase(result.getString("TABLE_NAME"));
    }

    private static boolean equalsNullableIgnoreCase(String expected, String actual) {
        return expected == null ? actual == null : actual != null && expected.equalsIgnoreCase(actual);
    }

    private static QualifiedName qualifiedName(String qualified, String defaultCatalog, String defaultSchema) {
        String[] parts = qualified.split("\\.", -1);
        String table = parts[parts.length - 1];
        String schema = parts.length >= 2 ? parts[parts.length - 2] : defaultSchema;
        String catalog = parts.length >= 3 ? parts[parts.length - 3] : defaultCatalog;
        return new QualifiedName(catalog, schema, table);
    }

    private record QualifiedName(String catalog, String schema, String table) {}

    private static List<String> caseVariants(String value) {
        if (value == null || value.isBlank()) {
            List<String> variants = new ArrayList<>();
            variants.add(null);
            return variants;
        }
        return value.equals(value.toLowerCase(Locale.ROOT)) && value.equals(value.toUpperCase(Locale.ROOT))
                ? List.of(value)
                : List.of(value, value.toLowerCase(Locale.ROOT), value.toUpperCase(Locale.ROOT))
                        .stream().distinct().toList();
    }

    private Set<String> loadTargetColumns(List<String> errors) {
        Set<String> set = new HashSet<>();
        Path path = Path.of(dbColumnsPath);
        if (!Files.exists(path)) {
            errors.add("db_columns.json 부재(" + path + ") — 타깃 표준 검증을 수행할 수 없음");
            return set;
        }
        try {
            JsonNode root = json.readTree(Files.readAllBytes(path));
            if (root == null || !root.isArray()) {
                errors.add("db_columns.json 루트는 배열이어야 합니다: " + path);
                return set;
            }
            for (JsonNode n : root) {
                String table = text(n, "table_name");
                String col = text(n, "column_name");
                if (table != null && col != null) {
                    set.add(normalize(table + "." + col));
                }
            }
            if (set.isEmpty()) {
                errors.add("db_columns.json에 유효한 table_name/column_name 항목이 없습니다: " + path);
            }
        } catch (IOException e) {
            errors.add("db_columns.json 파싱 실패 — 타깃 표준 검증 불가: " + e.getMessage());
        }
        return set;
    }

    private static void validateIdentifier(String label, String identifier, List<String> errors) {
        try {
            SourceIntrospector.qualifiedIdent(identifier);
        } catch (IllegalArgumentException e) {
            errors.add(label + " 식별자 오류: " + e.getMessage());
        }
    }

    private static void validateColumnIdentifier(String label, String identifier, List<String> errors) {
        try {
            SourceIntrospector.ident(identifier);
        } catch (IllegalArgumentException e) {
            errors.add(label + " 식별자 오류: " + e.getMessage());
        }
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }
}
