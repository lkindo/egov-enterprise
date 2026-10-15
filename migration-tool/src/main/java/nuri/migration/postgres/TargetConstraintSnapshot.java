package nuri.migration.postgres;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * [ADR-0029 L4 D2] 매핑한 대상 표의 물리 제약 스냅숏 — PK·UNIQUE·FK·CHECK 제약과 유일 인덱스, FK 자식 쪽 RI 트리거 상태.
 *
 * <p>이름·종류·컬럼 이름·플래그만 담는다. CHECK 조건식·인덱스 술어는 리터럴을 담을 수 있어 싣지 않고, 트리거 이름은 oid 가
 * 들어가 싣지 않는다. 승인 workflow 는 이 스냅숏의 digest 를 bound target digest(형식 4)에 결속한다 — plan 뒤 제약이 빠지거나
 * RI 트리거가 꺼지면 load 가 쓰기 전에 멈춘다. 대상 표를 가리키는(inbound) FK 는 담지 않는다 — 자식 INSERT 가 이미 강제하고,
 * 이 run 의 쓰기를 증명하지 않으면서 digest 변동만 늘린다. 목록은 이름으로 정렬해 digest 가 결정적이다.
 */
public record TargetConstraintSnapshot(int schemaVersion, List<TableConstraints> tables) {

    public static final int CURRENT_SCHEMA_VERSION = 1;

    public TargetConstraintSnapshot {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be positive");
        }
        tables = Objects.requireNonNull(tables, "tables").stream()
                .map(table -> Objects.requireNonNull(table, "table"))
                .sorted(Comparator.comparing(TableConstraints::qualifiedName))
                .toList();
    }

    /** schema·table 이름을 대소문자 무시로 찾는다. 없으면 null. */
    public TableConstraints table(String schema, String name) {
        for (TableConstraints table : tables) {
            if (table.schema().equalsIgnoreCase(schema) && table.table().equalsIgnoreCase(name)) {
                return table;
            }
        }
        return null;
    }

    /** 한 표의 제약과 유일 인덱스. */
    public record TableConstraints(String schema, String table, List<Constraint> constraints,
                                   List<UniqueIndex> uniqueIndexes) {

        public TableConstraints {
            schema = requireText(schema, "schema");
            table = requireText(table, "table");
            constraints = Objects.requireNonNull(constraints, "constraints").stream()
                    .map(constraint -> Objects.requireNonNull(constraint, "constraint"))
                    .sorted(Comparator.comparing(Constraint::name))
                    .toList();
            uniqueIndexes = Objects.requireNonNull(uniqueIndexes, "uniqueIndexes").stream()
                    .map(index -> Objects.requireNonNull(index, "uniqueIndex"))
                    .sorted(Comparator.comparing(UniqueIndex::name))
                    .toList();
        }

        /** 소문자 {@code schema.table}. */
        public String qualifiedName() {
            return (schema + "." + table).toLowerCase(Locale.ROOT);
        }
    }

    /**
     * {@code pg_constraint} 한 행. {@code type} 은 {@code p}·{@code u}·{@code f}·{@code c} 다. 참조 표·컬럼과
     * {@code triggerStates}(자식 쪽 RI 트리거의 {@code tgenabled}, 정렬)는 FK 에만 있다. CHECK 는 이름·검증 여부만 담는다.
     */
    public record Constraint(String name, String type, List<String> columns, String refSchema, String refTable,
                             List<String> refColumns, boolean validated, List<String> triggerStates) {

        public Constraint {
            name = requireText(name, "constraint.name");
            type = requireText(type, "constraint.type");
            if (!List.of("p", "u", "f", "c").contains(type)) {
                throw new IllegalArgumentException("constraint.type must be one of p, u, f, c");
            }
            columns = columns == null ? List.of() : List.copyOf(columns);
            refColumns = refColumns == null ? List.of() : List.copyOf(refColumns);
            triggerStates = triggerStates == null ? List.of() : triggerStates.stream().sorted().toList();
        }

        public boolean foreignKey() {
            return "f".equals(type);
        }
    }

    /** {@code pg_index} 의 유일 인덱스. 식 컬럼은 고정 표지로 둔다. */
    public record UniqueIndex(String name, List<String> columns, boolean valid, boolean ready) {

        /** 식 인덱스 컬럼의 표지 — 식 텍스트는 싣지 않는다. */
        public static final String EXPRESSION = "<expression>";

        public UniqueIndex {
            name = requireText(name, "uniqueIndex.name");
            columns = columns == null ? List.of() : List.copyOf(columns);
        }
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }
}
