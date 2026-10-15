package nuri.migration.validate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.domain.DomainViolation;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.lookup.LookupRef;
import nuri.migration.lookup.LookupRules;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.mapping.MappingKey;
import nuri.migration.model.MappingSpec;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.protect.ColumnProtectionPlan;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.CodeTranslator;
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
import java.sql.SQLFeatureNotSupportedException;
import java.sql.Types;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.EnumSet;
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
        for (int tableIndex = 0; tableIndex < spec.tables().size(); tableIndex++) {
            MappingSpec.TableMapping table = spec.tables().get(tableIndex);
            if (table == null) {
                errors.add("tables[" + tableIndex + "]: 테이블 매핑 항목은 null일 수 없습니다");
                continue;
            }
            for (int columnIndex = 0; columnIndex < table.columns().size(); columnIndex++) {
                if (table.columns().get(columnIndex) == null) {
                    errors.add("tables[" + tableIndex + "].columns[" + columnIndex
                            + "]: 컬럼 매핑 항목은 null일 수 없습니다");
                }
            }
        }
        if (!errors.isEmpty()) {
            return new ValidationResult(errors, warnings);
        }
        Set<String> targetColumns = loadTargetColumns(errors);
        // [ADR-0029 L3c] 매핑은 (소스, 매핑 id) 로 유일하고, 소스마다 keymap 을 만드는 매핑은 하나다. 부모 소스는 그
        //   소유 매핑으로 푼다 — 실행 순서·실행기와 같은 판정기(MappingIndex)를 쓴다.
        MappingIndex sourceTables = MappingIndex.of(spec.tables());
        errors.addAll(sourceTables.errors());
        // [ADR-0029 L3d] 조회 조인 — 실행기와 같은 규칙(LookupRules)이다.
        errors.addAll(LookupRules.violations(spec.tables()));

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
            for (MappingSpec.Lookup lookup : t.lookups()) {
                if (lookup != null && !isBlank(lookup.where()) && UNSAFE_WHERE.matcher(lookup.where()).find()) {
                    errors.add(MappingIndex.label(t) + ".lookups[" + lookup.alias()
                            + "]: where에는 단일 읽기 조건식만 허용됩니다(주석·세미콜론·SQL 문 금지)");
                }
            }
            MappingSpec.IdStrategy id = t.idStrategy();
            validateIdStrategy(t, id, targetColumns, errors);
            validateTypedIdentity(t, sourceTables, targetColumns, errors);
            Set<String> written = new HashSet<>();
            for (MappingSpec.ColumnMapping c : t.columns()) {
                if (isBlank(c.target())) {
                    errors.add(t.target() + ": 타깃 컬럼 미지정");
                    continue;
                }
                // [ADR-0029 L3a-2] 실행기는 대상 컬럼마다 값 하나만 쓴다 — 두 항목이 같은 컬럼을 채우면 앞 값이 조용히 빠진다.
                if (!written.add(normalize(c.target()))) {
                    errors.add(t.target() + ": 같은 타깃 컬럼을 두 컬럼 항목이 채웁니다: " + c.target());
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
                validateDomainLoad(t, c, errors);
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
        // 온라인 앱이 암호화해 저장하는 컬럼은 encrypt 선언이 같아야 한다(DEC-OPS-308). 문구는 테이블·컬럼 이름만 담는다.
        errors.addAll(ColumnProtectionPlan.of(spec).violations());
        validateCodemaps(spec.codemaps(), errors, warnings);
        return new ValidationResult(errors, warnings);
    }

    /**
     * [ADR-0029 L3a-1] 표준 도메인 변환기는 대상 표기를 스스로 정하므로 같은 컬럼의 type·codemap 과 함께 쓸 수 없고,
     * 암호화 컬럼에는 쓸 수 없다(암호화할 평문이 바뀐다). nullify 는 그 컬럼의 load 가 실제로 낼 수 있는 위반
     * ({@code BLANK}·{@code PLACEHOLDER_DATE})에만, 1 이상의 상한과 함께 한 번씩 선언한다 — 실행기도 같은 선언을 다시
     * 확인한다.
     */
    private void validateDomainLoad(MappingSpec.TableMapping table, MappingSpec.ColumnMapping column,
                                    List<String> errors) {
        String location = table.target() + "." + column.target();
        if (transformers.isDomain(column.transform())) {
            String label = location + ": 표준 도메인 변환기 '" + column.transform() + "' 는 ";
            if (!isBlank(column.type())) {
                errors.add(label + "type 과 함께 쓸 수 없습니다 — 변환기가 대상 표기를 정합니다");
            }
            if (!isBlank(column.codemap())) {
                errors.add(label + "codemap 과 함께 쓸 수 없습니다 — 변환기가 대상 표기를 정합니다");
            }
            if (column.encrypt() != null) {
                errors.add(label + "암호화 컬럼에 쓸 수 없습니다 — 암호화할 평문이 바뀝니다");
            }
        }
        Set<DomainViolation> producible = nullifiable(column);
        Set<DomainViolation> declared = EnumSet.noneOf(DomainViolation.class);
        for (MappingSpec.Nullify rule : column.nullify()) {
            if (rule.violation() == null) {
                errors.add(location + ": nullify 항목에는 violation 이 필요합니다");
                continue;
            }
            if (rule.violation() != DomainViolation.BLANK && rule.violation() != DomainViolation.PLACEHOLDER_DATE) {
                errors.add(location + ": nullify 는 BLANK·PLACEHOLDER_DATE 위반에만 선언할 수 있습니다");
            } else if (!producible.contains(rule.violation())) {
                errors.add(location + ": nullify " + rule.violation() + " 는 이 컬럼의 load 가 내지 않는 위반입니다"
                        + " — BLANK 는 표준 도메인 변환기나 비문자 type, PLACEHOLDER_DATE 는 날짜 변환기가 냅니다");
            }
            if (rule.maxRows() == null || rule.maxRows() < 1) {
                errors.add(location + ": nullify maxRows 는 1 이상이어야 합니다");
            }
            if (!declared.add(rule.violation())) {
                errors.add(location + ": nullify 에 같은 위반을 두 번 선언할 수 없습니다");
            }
        }
    }

    /** 이 컬럼의 load 가 nullify 로 넘길 수 있는 위반. const·source 없는 컬럼은 값을 변환하지 않아 없다. */
    private Set<DomainViolation> nullifiable(MappingSpec.ColumnMapping column) {
        Set<DomainViolation> producible = EnumSet.noneOf(DomainViolation.class);
        if (column.constant() == null && !isBlank(column.source())) {
            producible.addAll(transformers.domainViolations(column.transform()));
            if (TypeConverter.isNonTextType(column.type())) {
                producible.add(DomainViolation.BLANK);
            }
        }
        return producible;
    }

    /**
     * [2026-10-13 DEC-OPS-309] 실행기와 같은 판정으로 codemap 정의의 결함을 적재 전에 알린다.
     * 숫자처럼 보이지만 정규형이 아닌 키(1.0·01)는 숫자 열에서 닿지 않으므로 경고한다 — 문자열 열의 정상 코드일 수
     * 있어 오류로 막지 않는다. 경고는 키 값 대신 values 안의 위치만 밝힌다.
     */
    private static void validateCodemaps(Map<String, MappingSpec.CodeMap> codemaps, List<String> errors,
                                         List<String> warnings) {
        for (Map.Entry<String, MappingSpec.CodeMap> entry : codemaps.entrySet()) {
            String problem = CodeTranslator.definitionProblem(entry.getValue());
            if (problem != null) {
                errors.add("codemap '" + entry.getKey() + "': " + problem);
                continue;
            }
            List<Integer> positions = CodeTranslator.nonCanonicalNumericCodes(entry.getValue());
            if (!positions.isEmpty()) {
                warnings.add("codemap '" + entry.getKey() + "': values 의 "
                        + String.join("·", positions.stream().map(String::valueOf).toList())
                        + "번째 코드는 숫자처럼 보이지만 정규형이 아닙니다 — 숫자 원천값은 정규형(1.0·01 → 1)으로"
                        + " 찾으므로 숫자 열에서는 이 코드에 닿지 않습니다. 문자열 열의 코드라면 그대로 두십시오.");
            }
        }
    }

    /**
     * 매핑 사이의 FK 순환을 찾는다. [ADR-0029 L3c] 노드는 매핑 키(소스, 매핑 id)이고 부모는 소스의 keymap 소유 매핑이다
     * — 형제 매핑을 거치는 의존은 소스 단위로는 순환처럼 보여도 매핑 단위로는 DAG 다.
     */
    private static void validateCrossTableCycles(List<MappingSpec.TableMapping> tables,
                                                  MappingIndex sourceTables,
                                                  List<String> errors) {
        Map<String, Set<String>> dependencies = new LinkedHashMap<>();
        for (MappingSpec.TableMapping table : tables) {
            MappingKey self = sourceTables.key(table);
            if (self == null) {
                continue;
            }
            String child = self.label();
            dependencies.putIfAbsent(child, new HashSet<>());
            for (MappingSpec.ColumnMapping column : table.columns()) {
                if (!isBlank(column.fkRef())) {
                    addDependency(sourceTables, column.fkRef(), self, dependencies.get(child));
                }
            }
            for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
                addDependency(sourceTables, foreignKey.parentSource(), self, dependencies.get(child));
            }
        }

        Map<String, Integer> state = new LinkedHashMap<>();
        Deque<String> path = new ArrayDeque<>();
        Set<String> reported = new HashSet<>();
        for (String node : dependencies.keySet()) {
            detectCycle(node, dependencies, state, path, reported, errors);
        }
    }

    private static void addDependency(MappingIndex sourceTables, String parentSource, MappingKey self,
                                      Set<String> dependencies) {
        MappingKey parent = sourceTables.key(sourceTables.parent(parentSource));
        if (parent != null && !parent.equals(self)) {
            dependencies.add(parent.label());
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
                                      MappingIndex sourceTables,
                                      List<String> errors) {
        String location = child.target() + "." + column.target();
        if (isBlank(column.source())) {
            errors.add(location + ": fkRef에는 번역할 source 컬럼이 필수입니다");
        }
        if (column.constant() != null) {
            errors.add(location + ": fkRef와 const를 함께 선언할 수 없습니다 — FK 번역이 우회됩니다");
        }

        MappingSpec.TableMapping parent = sourceTables.parent(column.fkRef());
        if (parent == null) {
            errors.add(sourceTables.mappingsOf(column.fkRef()).isEmpty()
                    ? location + ": fkRef 부모 소스 테이블 '" + column.fkRef()
                            + "' 이 매핑에 없음 — 모든 자식 행이 고아가 됩니다"
                    : location + ": fkRef 부모 소스 테이블 '" + column.fkRef()
                            + "' 을 나눈 매핑 가운데 keymap 을 만드는 매핑(idStrategy)이 없습니다 — 한 매핑이 키를 만들어야 합니다");
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

    private static void validateTypedIdentity(
            MappingSpec.TableMapping table,
            MappingIndex sourceTables,
            Set<String> targetColumns,
            List<String> errors
    ) {
        MappingSpec.IdentityStrategy identity = table.identity();
        if (identity == null) {
            if (!table.foreignKeys().isEmpty()) {
                errors.add(table.source() + ": composite foreignKeys에는 typed identity가 필수입니다");
            }
            return;
        }
        if (table.idStrategy() != null) {
            errors.add(table.source() + ": legacy idStrategy와 typed identity를 함께 선언할 수 없습니다");
        }

        validateComponents(table.source(), "sourceComponents", identity.sourceComponents(), errors);
        validateComponents(table.source(), "targetComponents", identity.targetComponents(), errors);
        validateStaticTargetColumns(
                table, "typed identity", identity.targetComponents(), targetColumns, errors);

        if (identity.policy() == TargetIdentityPolicy.PRESERVE) {
            validateTypeContract(
                    table.source(), "PRESERVE identity",
                    identity.sourceComponents(), identity.targetComponents(), errors);
        }
        if (identity.policy() == TargetIdentityPolicy.REMAP) {
            Set<String> producers = new HashSet<>();
            for (MappingSpec.ColumnMapping column : table.columns()) {
                if (!isBlank(column.target())) {
                    producers.add(normalize(column.target()));
                }
            }
            for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
                for (MappingSpec.IdentityComponentSpec component : foreignKey.targetComponents()) {
                    producers.add(normalize(component.column()));
                }
            }
            for (MappingSpec.IdentityComponentSpec component : identity.targetComponents()) {
                if (!producers.contains(normalize(component.column()))) {
                    errors.add(table.source()
                            + ": REMAP target identity component 값 생성 mapping 없음: "
                            + component.column());
                }
            }
        }

        for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
            validateIdentifier(table.source() + ": foreign key parentSource",
                    foreignKey.parentSource(), errors);
            validateComponents(table.source(), "foreignKeys.sourceComponents",
                    foreignKey.sourceComponents(), errors);
            validateComponents(table.source(), "foreignKeys.targetComponents",
                    foreignKey.targetComponents(), errors);
            validateStaticTargetColumns(
                    table, "foreign key", foreignKey.targetComponents(), targetColumns, errors);

            MappingSpec.TableMapping parent = sourceTables.parent(foreignKey.parentSource());
            if (parent == null) {
                errors.add(table.source() + ": composite foreign key parent mapping 없음: "
                        + foreignKey.parentSource());
                continue;
            }
            if (parent.identity() == null) {
                errors.add(table.source() + ": composite foreign key parent typed identity 없음: "
                        + foreignKey.parentSource());
                continue;
            }
            validateTypeContract(
                    table.source(), "composite foreign key source type",
                    parent.identity().sourceComponents(), foreignKey.sourceComponents(), errors);
            validateTypeContract(
                    table.source(), "composite foreign key target type",
                    parent.identity().targetComponents(), foreignKey.targetComponents(), errors);
        }
    }

    private static void validateComponents(
            String table,
            String label,
            List<MappingSpec.IdentityComponentSpec> components,
            List<String> errors
    ) {
        if (components.isEmpty()) {
            errors.add(table + ": " + label + "가 비어 있습니다");
            return;
        }
        Set<String> distinct = new HashSet<>();
        for (MappingSpec.IdentityComponentSpec component : components) {
            validateColumnIdentifier(table + ": " + label, component.column(), errors);
            if (!distinct.add(normalize(component.column()))) {
                errors.add(table + ": " + label + " 중복 금지: " + component.column());
            }
        }
    }

    private static void validateStaticTargetColumns(
            MappingSpec.TableMapping table,
            String label,
            List<MappingSpec.IdentityComponentSpec> components,
            Set<String> targetColumns,
            List<String> errors
    ) {
        if (targetColumns.isEmpty()) {
            return;
        }
        for (MappingSpec.IdentityComponentSpec component : components) {
            String key = normalize(table.target() + "." + component.column());
            if (!targetColumns.contains(key)) {
                errors.add("표준 스키마에 없는 " + label + " 타깃 컬럼: " + key);
            }
        }
    }

    private static void validateTypeContract(
            String table,
            String label,
            List<MappingSpec.IdentityComponentSpec> expected,
            List<MappingSpec.IdentityComponentSpec> actual,
            List<String> errors
    ) {
        if (expected.size() != actual.size()) {
            errors.add(table + ": " + label + " arity 불일치: expected="
                    + expected.size() + ", actual=" + actual.size());
            return;
        }
        for (int i = 0; i < expected.size(); i++) {
            if (expected.get(i).type() != actual.get(i).type()) {
                errors.add(table + ": " + label + " 불일치: "
                        + actual.get(i).column() + " expected="
                        + expected.get(i).type().externalName() + ", actual="
                        + actual.get(i).type().externalName());
            }
        }
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
            boolean cubridDriver = "CUBRID".equals(metadata.getDatabaseProductName())
                    && "CUBRID JDBC Driver".equals(metadata.getDriverName());
            String defaultCatalog = connection.getCatalog();
            if (cubridDriver && "".equals(defaultCatalog)) {
                // CUBRID reports an empty connection catalog but null TABLE_CAT in metadata.
                defaultCatalog = null;
            }
            String defaultSchema;
            try {
                defaultSchema = connection.getSchema();
            } catch (SQLException failure) {
                // The official driver wraps UnsupportedOperationException for getSchema().
                // Do not disguise connection failures or another driver's metadata failure.
                if (!cubridDriver || (!(failure instanceof SQLFeatureNotSupportedException)
                        && !(failure.getCause() instanceof UnsupportedOperationException))) {
                    throw failure;
                }
                defaultSchema = null;
            }
            boolean mysqlSchemaMode = defaultCatalog == null && !isBlank(defaultSchema)
                    && "MySQL".equals(metadata.getDatabaseProductName())
                    && "MySQL Connector/J".equals(metadata.getDriverName());
            boolean mariaDbSchemaMode = "def".equals(defaultCatalog) && !isBlank(defaultSchema)
                    && "MariaDB".equals(metadata.getDatabaseProductName())
                    && "MariaDB Connector/J".equals(metadata.getDriverName());
            if (mysqlSchemaMode) {
                // Connector/J databaseTerm=SCHEMA makes getCatalog() a null no-op,
                // but getColumns() still reports the fixed INFORMATION_SCHEMA catalog "def".
                // Resolve only the missing metadata default; MySQL source SQL accepts
                // table or schema.table, so an explicit catalog qualification is rejected.
                defaultCatalog = "def";
            }
            for (MappingSpec.TableMapping table : spec.tables()) {
                if ((mysqlSchemaMode || mariaDbSchemaMode) && table.source().split("\\.", -1).length > 2) {
                    errors.add(mysqlSchemaMode ? "MYSQL_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED"
                            : "MARIADB_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED");
                    continue;
                }
                QualifiedName name = qualifiedName(table.source(), defaultCatalog, defaultSchema);
                Map<String, ColumnMetadata> liveColumns = metadataColumnInfo(
                        metadata, name.catalog(), name.schema(), name.table(), cubridDriver);
                if (liveColumns.isEmpty()) {
                    errors.add("실 source에 없는 테이블 또는 metadata 접근 불가: " + table.source());
                    continue;
                }
                for (MappingSpec.ColumnMapping column : table.columns()) {
                    // 조회 컬럼(alias.COLUMN)은 조회 표에서 따로 본다(ADR-0029 L3d).
                    if (!isBlank(column.source()) && LookupRef.parse(column.source()) == null
                            && !liveColumns.containsKey(normalize(column.source()))) {
                        errors.add("실 source에 없는 컬럼: " + table.source() + "." + column.source());
                    }
                }
                MappingSpec.IdStrategy id = table.idStrategy();
                if (id != null && !isBlank(id.sourceKey())
                        && !liveColumns.containsKey(normalize(id.sourceKey()))) {
                    errors.add("실 source에 없는 idStrategy.sourceKey: "
                            + table.source() + "." + id.sourceKey());
                }
                for (String orderKey : table.effectiveOrderKeys()) {
                    if (!liveColumns.containsKey(normalize(orderKey))) {
                        errors.add("실 source에 없는 order key: " + table.source() + "." + orderKey);
                    }
                }
                if (table.identity() != null) {
                    validateLiveComponents(
                            "source", table.source(), "identity source",
                            table.identity().sourceComponents(), liveColumns, errors);
                }
                for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
                    validateLiveComponents(
                            "source", table.source(), "foreign key source",
                            foreignKey.sourceComponents(), liveColumns, errors);
                }
                for (MappingSpec.Lookup lookup : table.lookups()) {
                    if (lookup == null || lookup.key() == null || isBlank(lookup.source())) {
                        continue; // 정적 규칙(LookupRules)이 알린다.
                    }
                    if ((mysqlSchemaMode || mariaDbSchemaMode) && lookup.source().split("\\.", -1).length > 2) {
                        errors.add(mysqlSchemaMode ? "MYSQL_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED"
                                : "MARIADB_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED");
                        continue;
                    }
                    QualifiedName lookupName = qualifiedName(lookup.source(), defaultCatalog, defaultSchema);
                    validateLiveLookup(table, lookup, liveColumns, metadataColumnInfo(metadata,
                            lookupName.catalog(), lookupName.schema(), lookupName.table(), cubridDriver), errors);
                }
            }
            return null;
        });
        return new ValidationResult(errors, List.of());
    }

    /**
     * [ADR-0029 L3d] 조회 표와 그 컬럼이 실재하고, 조회 키 두 컬럼이 같은 계열(가변 길이 문자 또는 정수·고정소수)인지
     * 본다. CHAR 키는 공백 채움 비교가 DBMS 마다 달라 받지 않는다. 문구는 표·컬럼 이름과 타입 이름뿐이다.
     */
    private static void validateLiveLookup(MappingSpec.TableMapping table, MappingSpec.Lookup lookup,
                                           Map<String, ColumnMetadata> mainColumns,
                                           Map<String, ColumnMetadata> lookupColumns, List<String> errors) {
        if (lookupColumns.isEmpty()) {
            errors.add("실 source에 없는 조회 표 또는 metadata 접근 불가: " + lookup.source());
            return;
        }
        ColumnMetadata from = mainColumns.get(normalize(lookup.key().from()));
        ColumnMetadata to = lookupColumns.get(normalize(lookup.key().to()));
        if (from == null) {
            errors.add("실 source에 없는 조회 키 컬럼: " + table.source() + "." + lookup.key().from());
        }
        if (to == null) {
            errors.add("실 source에 없는 조회 키 컬럼: " + lookup.source() + "." + lookup.key().to());
        }
        for (MappingSpec.ColumnMapping column : table.columns()) {
            LookupRef ref = LookupRef.parse(column.source());
            if (ref != null && ref.alias().equals(lookup.alias())
                    && !lookupColumns.containsKey(normalize(ref.column()))) {
                errors.add("실 source에 없는 조회 컬럼: " + lookup.source() + "." + ref.column());
            }
        }
        if (from == null || to == null) {
            return;
        }
        String at = MappingIndex.label(table) + ".lookups[" + lookup.alias() + "]";
        Boolean fromNumeric = lookupKeyFamily(from.jdbcType());
        Boolean toNumeric = lookupKeyFamily(to.jdbcType());
        if (fromNumeric == null || toNumeric == null) {
            errors.add(at + ": 조회 키는 가변 길이 문자(VARCHAR 계열)나 정수·고정소수 컬럼이어야 합니다 — CHAR 는 공백 채움"
                    + " 비교가 DBMS 마다 달라 받지 않습니다: " + from.typeName() + " / " + to.typeName());
        } else if (!fromNumeric.equals(toNumeric)) {
            errors.add(at + ": 조회 키 두 컬럼의 계열(문자·수)이 다릅니다: " + from.typeName() + " / " + to.typeName());
        }
    }

    /** 조회 키 계열 — 수면 true, 가변 길이 문자면 false, 받지 않는 타입이면 null. */
    private static Boolean lookupKeyFamily(int jdbcType) {
        return switch (jdbcType) {
            case Types.VARCHAR, Types.NVARCHAR -> false;
            case Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT, Types.NUMERIC, Types.DECIMAL -> true;
            default -> null;
        };
    }

    /**
     * plan·load 에서 live 대상 컬럼 계약과 표준 사전으로 매핑을 대조한다(DEC-OPS-307). 계약은 승인 workflow 가
     * target schema digest 에 결속한 {@link TargetSchemaFingerprint#standard()} 이며, 없으면 실패한다.
     */
    public ValidationResult validateTargetStandard(MappingSpec spec, TargetSchemaFingerprint target,
                                                   CatalogSnapshot inventory) {
        return new TargetStandardValidator(transformers::isBuiltin).validate(spec, target, inventory);
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
                Map<String, ColumnMetadata> liveColumns = metadataColumnInfo(
                        metadata, name.catalog(), name.schema(), name.table(), false);
                if (liveColumns.isEmpty()) {
                    errors.add("실 target에 없는 테이블 또는 metadata 접근 불가: " + qualified);
                    continue;
                }
                MappingSpec.IdStrategy id = table.idStrategy();
                if (id != null && !isBlank(id.column()) && !liveColumns.containsKey(normalize(id.column()))) {
                    errors.add("실 target에 없는 idStrategy 컬럼: " + qualified + "." + id.column());
                }
                if (!isBlank(table.targetKey()) && !liveColumns.containsKey(normalize(table.targetKey()))) {
                    errors.add("실 target에 없는 targetKey: " + qualified + "." + table.targetKey());
                }
                for (MappingSpec.ColumnMapping column : table.columns()) {
                    if (!isBlank(column.target()) && !liveColumns.containsKey(normalize(column.target()))) {
                        errors.add("실 target에 없는 컬럼: " + qualified + "." + column.target());
                    }
                }
                if (table.identity() != null) {
                    validateLiveComponents(
                            "target", qualified, "identity target",
                            table.identity().targetComponents(), liveColumns, errors);
                }
                for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
                    validateLiveComponents(
                            "target", qualified, "foreign key target",
                            foreignKey.targetComponents(), liveColumns, errors);
                }
            }
            return null;
        });
        return new ValidationResult(errors, List.of());
    }

    private static Map<String, ColumnMetadata> metadataColumnInfo(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table,
            boolean ownerQualifiedTablePattern
    ) throws SQLException {
        Map<String, ColumnMetadata> columns = new LinkedHashMap<>();
        List<String> schemas = caseVariants(schema);
        List<String> tables = caseVariants(table);
        for (String schemaVariant : schemas) {
            for (String tableVariant : tables) {
                // CUBRID ignores schemaPattern; its table pattern must carry the owner.
                // Returned owner/catalog/table still pass the same exact identity check below.
                String tablePattern = ownerQualifiedTablePattern && schemaVariant != null
                        ? schemaVariant + "." + tableVariant : tableVariant;
                try (ResultSet result = metadata.getColumns(catalog, schemaVariant, tablePattern, null)) {
                    while (result.next()) {
                        if (!metadataIdentityMatches(result, catalog, schema, table)) {
                            continue;
                        }
                        String column = result.getString("COLUMN_NAME");
                        if (column != null) {
                            columns.put(normalize(column), new ColumnMetadata(
                                    result.getInt("DATA_TYPE"), result.getString("TYPE_NAME")));
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

    private record ColumnMetadata(int jdbcType, String typeName) {}

    private static void validateLiveComponents(
            String side,
            String table,
            String label,
            List<MappingSpec.IdentityComponentSpec> components,
            Map<String, ColumnMetadata> liveColumns,
            List<String> errors
    ) {
        for (MappingSpec.IdentityComponentSpec component : components) {
            ColumnMetadata metadata = liveColumns.get(normalize(component.column()));
            if (metadata == null) {
                errors.add("실 " + side + "에 없는 " + label + " 컬럼: "
                        + table + "." + component.column());
                continue;
            }
            if (!jdbcTypeCompatible(component.type(), metadata)) {
                errors.add(label + " type 불일치: " + table + "." + component.column()
                        + " declared=" + component.type().externalName()
                        + " jdbc=" + metadata.typeName() + "(" + metadata.jdbcType() + ")");
            }
        }
    }

    private static boolean jdbcTypeCompatible(IdentityValueType type, ColumnMetadata metadata) {
        int jdbcType = metadata.jdbcType();
        return switch (type) {
            case TEXT -> jdbcType == Types.CHAR
                    || jdbcType == Types.VARCHAR
                    || jdbcType == Types.LONGVARCHAR
                    || jdbcType == Types.NCHAR
                    || jdbcType == Types.NVARCHAR
                    || jdbcType == Types.LONGNVARCHAR;
            case SIGNED_INTEGER, UNSIGNED_INTEGER, DECIMAL -> jdbcType == Types.TINYINT
                    || jdbcType == Types.SMALLINT
                    || jdbcType == Types.INTEGER
                    || jdbcType == Types.BIGINT
                    || jdbcType == Types.NUMERIC
                    || jdbcType == Types.DECIMAL;
            case BOOLEAN -> jdbcType == Types.BOOLEAN || jdbcType == Types.BIT;
            case UUID -> isUuidType(metadata.typeName())
                    || jdbcType == Types.CHAR
                    || jdbcType == Types.VARCHAR
                    || jdbcType == Types.NCHAR
                    || jdbcType == Types.NVARCHAR;
            case DATE -> jdbcType == Types.DATE;
            case TIME -> jdbcType == Types.TIME;
            case LOCAL_TIMESTAMP -> jdbcType == Types.TIMESTAMP;
            case OFFSET_TIMESTAMP -> jdbcType == Types.TIMESTAMP_WITH_TIMEZONE;
            case BINARY -> jdbcType == Types.BINARY
                    || jdbcType == Types.VARBINARY
                    || jdbcType == Types.LONGVARBINARY;
        };
    }

    private static boolean isUuidType(String typeName) {
        return typeName != null && typeName.equalsIgnoreCase("uuid");
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
