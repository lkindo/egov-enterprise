package nuri.migration.validate;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.validate.ProductCodeBindings.Binding;
import nuri.migration.validate.ProductCodeBindings.Use;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

/**
 * [ADR-0029 L4 D7] 공통코드 바인딩 컬럼의 쓰기 전 게이트. plan·load 가 원장 검증과 같은 읽기 전용 연결에서 대상의 공통코드
 * 그룹을 읽어 돌린다 — 오류가 있으면 행을 하나도 쓰지 않고 멈춘다. 문구는 대상 표·컬럼, 그룹 id, codemap 이름과 values
 * 위치만 싣고 코드값은 싣지 않는다.
 *
 * <ul>
 *   <li>그룹 헤더가 대상에 없으면 {@link Use#VALIDATE} 는 {@code CODE_GROUP_ABSENT} 로 멈추고, {@link Use#DISPLAY} 는 통과해
 *       적재 뒤 대사가 {@code groupAbsent} 로 남긴다.</li>
 *   <li>{@link Use#VALIDATE} 컬럼은 상수이거나 codemap 이어야 하고, codemap 은 미매핑을 그대로 쓰면 안 된다
 *       ({@code VALIDATE_BINDING_CODEMAP_REQUIRED}). 앱이 쓰기 때 거부할 값을 이관이 조용히 넣지 않게 하려는 것이다 —
 *       원장의 비표준 대상(U1)·허용값 미확인(U3) 확정도 이 규칙을 지난다.</li>
 *   <li>{@link Use#VALIDATE} 컬럼의 상수, codemap {@code values} 의 출력, 쓰이는 {@code fallback} 은 그 그룹의 사용 중 상세코드
 *       안이어야 한다({@code CODE_OUTPUT_NOT_ACTIVE}).</li>
 * </ul>
 *
 * <p>mapping 이 같은 schema 의 공통코드 표({@code tb_com_cd}·{@code tb_com_dtl_cd})를 함께 적재하면 그 schema 의 그룹 헤더·
 * 상세코드 판정은 적재 뒤 대사로 미룬다({@code deferred}) — 이 run 이 코드를 함께 넣는다. 상수·codemap 필수 규칙은 대상 DB 와
 * 무관하므로 미루지 않는다.</p>
 */
public final class CodeSetPrecheck {

    /** 이 표를 mapping 이 적재하면 그 schema 의 대상 DB 판정을 미룬다. */
    static final Set<String> CODE_TABLES = Set.of("tb_com_cd", "tb_com_dtl_cd");

    private CodeSetPrecheck() {
    }

    /** 대상 표·컬럼 키(소문자, 표는 {@code schema.table}). */
    public record ColumnKey(String table, String column) {

        public ColumnKey {
            table = Objects.requireNonNull(table, "table").toLowerCase(Locale.ROOT);
            column = Objects.requireNonNull(column, "column").toLowerCase(Locale.ROOT);
        }
    }

    /**
     * 게이트 결과. {@code errors} 가 비어야 통과다. {@code deferred} 는 판정을 미룬 schema(소문자), {@code groupAbsent} 는 헤더가
     * 없어 표시 대사만 남기는 DISPLAY 컬럼이다.
     */
    public record PrecheckResult(List<String> errors, Set<String> deferred, Set<ColumnKey> groupAbsent) {

        private static final PrecheckResult EMPTY = new PrecheckResult(List.of(), Set.of(), Set.of());

        public PrecheckResult {
            errors = errors == null ? List.of() : List.copyOf(errors);
            deferred = deferred == null ? Set.of() : Collections.unmodifiableSet(new TreeSet<>(deferred));
            groupAbsent = groupAbsent == null ? Set.of()
                    : Collections.unmodifiableSet(new LinkedHashSet<>(groupAbsent));
        }

        /** 바인딩 컬럼이 없는 mapping 의 결과. */
        public static PrecheckResult empty() {
            return EMPTY;
        }

        public boolean passed() {
            return errors.isEmpty();
        }

        public boolean deferred(String schema) {
            return schema != null && deferred.contains(schema.toLowerCase(Locale.ROOT));
        }

        public boolean groupAbsent(String qualifiedTable, String column) {
            return qualifiedTable != null && column != null
                    && groupAbsent.contains(new ColumnKey(qualifiedTable, column));
        }
    }

    /**
     * 게이트가 읽어야 할 그룹 — schema(소문자) → 그룹 id. mapping 이 바인딩 컬럼을 쓰지 않으면 빈 맵이고, 호출자는 공통코드 표를
     * 읽지 않는다.
     */
    public static Map<String, Set<String>> requiredGroups(MappingSpec spec, List<Binding> bindings,
                                                          String defaultSchema) {
        Map<String, Set<String>> required = new LinkedHashMap<>();
        for (BoundColumn bound : boundColumns(spec, bindings, defaultSchema)) {
            required.computeIfAbsent(bound.schema(), ignored -> new TreeSet<>()).add(bound.binding().group());
        }
        return required;
    }

    /**
     * 게이트를 돈다. {@code groups} 는 schema(소문자) → 그룹 id → 상태이고, {@link #requiredGroups} 의 그룹을 모두 담아야 한다 —
     * 빠진 그룹은 헤더가 없는 것으로 본다.
     */
    public static PrecheckResult check(MappingSpec spec, List<Binding> bindings,
                                       Map<String, Map<String, CodeGroupState>> groups, String defaultSchema) {
        Objects.requireNonNull(groups, "groups");
        Set<String> deferred = deferredSchemas(spec, defaultSchema);
        Set<String> errors = new LinkedHashSet<>();
        Set<ColumnKey> groupAbsent = new LinkedHashSet<>();
        for (BoundColumn bound : boundColumns(spec, bindings, defaultSchema)) {
            ColumnMapping column = bound.column();
            Binding binding = bound.binding();
            String label = bound.label();
            CodeMap codemap = column.codemap() == null ? null : spec.codemaps().get(column.codemap());
            boolean validate = binding.use() == Use.VALIDATE;
            boolean passthrough = codemap != null && codemap.unmapped() == UnmappedPolicy.PASSTHROUGH;
            if (validate && column.constant() == null && (column.codemap() == null || passthrough)) {
                errors.add(label + ": 쓰기 검증하는 공통코드 컬럼(" + binding.group() + ")은 codemap(미매핑 그대로 쓰기 아님)"
                        + "이나 상수로 채웁니다(VALIDATE_BINDING_CODEMAP_REQUIRED)");
            }
            if (deferred.contains(bound.schema())) {
                continue;
            }
            CodeGroupState state = groups.getOrDefault(bound.schema(), Map.of()).get(binding.group());
            if (state == null || !state.headerPresent()) {
                if (validate) {
                    errors.add(label + ": 공통코드 그룹(" + binding.group() + ")이 대상에 없습니다(CODE_GROUP_ABSENT)"
                            + " — 참조 데이터(DEC-OPS-262)를 먼저 넣으세요");
                } else {
                    groupAbsent.add(new ColumnKey(bound.table(), column.target()));
                }
                continue;
            }
            if (!validate) {
                continue;
            }
            if (column.constant() != null) {
                if (!state.active().contains(column.constant())) {
                    errors.add(label + ": 상수가 공통코드 그룹(" + binding.group() + ")의 사용 중 상세코드가 아닙니다"
                            + "(CODE_OUTPUT_NOT_ACTIVE)");
                }
                continue;
            }
            if (codemap == null) {
                // 정의 없는 codemap 은 mapping 검증이 거부한다.
                continue;
            }
            List<Integer> positions = new ArrayList<>();
            int position = 0;
            for (String output : codemap.values().values()) {
                position++;
                if (!state.active().contains(output)) {
                    positions.add(position);
                }
            }
            if (!positions.isEmpty()) {
                errors.add(label + ": codemap " + column.codemap() + " 의 values 위치 " + join(positions)
                        + " 의 표준 코드가 공통코드 그룹(" + binding.group() + ")의 사용 중 상세코드가 아닙니다"
                        + "(CODE_OUTPUT_NOT_ACTIVE)");
            }
            boolean fallbackUsed = codemap.unmapped() == UnmappedPolicy.FALLBACK
                    || codemap.nullAs() == NullPolicy.FALLBACK;
            if (fallbackUsed && codemap.fallback() != null && !state.active().contains(codemap.fallback())) {
                errors.add(label + ": codemap " + column.codemap() + " 의 fallback 표준 코드가 공통코드 그룹("
                        + binding.group() + ")의 사용 중 상세코드가 아닙니다(CODE_OUTPUT_NOT_ACTIVE)");
            }
        }
        return new PrecheckResult(new ArrayList<>(errors), deferred, groupAbsent);
    }

    /** mapping 이 공통코드 표를 함께 적재하는 schema(소문자). */
    static Set<String> deferredSchemas(MappingSpec spec, String defaultSchema) {
        Set<String> schemas = new TreeSet<>();
        for (TableMapping table : spec.tables()) {
            if (table != null && table.target() != null && !table.target().isBlank()
                    && CODE_TABLES.contains(ProductCodeBindings.tableName(table.target()))) {
                schemas.add(ProductCodeBindings.schemaName(table.target(), defaultSchema));
            }
        }
        return schemas;
    }

    /** mapping 이 쓰는 바인딩 컬럼. 매핑·컬럼 순서, 한 컬럼에 바인딩이 여럿이면 바인딩 순서다. */
    private static List<BoundColumn> boundColumns(MappingSpec spec, List<Binding> bindings, String defaultSchema) {
        Objects.requireNonNull(spec, "spec");
        Objects.requireNonNull(bindings, "bindings");
        List<BoundColumn> bound = new ArrayList<>();
        for (TableMapping table : spec.tables()) {
            if (table == null || table.target() == null || table.target().isBlank()) {
                continue;
            }
            String schema = ProductCodeBindings.schemaName(table.target(), defaultSchema);
            String qualified = schema + "." + ProductCodeBindings.tableName(table.target());
            for (ColumnMapping column : table.columns()) {
                if (column == null || column.target() == null || column.target().isBlank()) {
                    continue;
                }
                for (Binding binding : ProductCodeBindings.of(bindings, table.target(), column.target())) {
                    bound.add(new BoundColumn(schema, qualified, table.target().trim() + "." + column.target().trim(),
                            column, binding));
                }
            }
        }
        return bound;
    }

    private static String join(List<Integer> positions) {
        StringBuilder text = new StringBuilder();
        for (Integer position : positions) {
            if (!text.isEmpty()) {
                text.append('·');
            }
            text.append(position);
        }
        return text.toString();
    }

    private record BoundColumn(String schema, String table, String label, ColumnMapping column, Binding binding) {}
}
