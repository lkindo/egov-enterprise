package nuri.migration.etl;

import nuri.migration.archive.ArchiveRun;
import nuri.migration.domain.DomainViolation;
import nuri.migration.domain.TargetValueGuard;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.isolate.RowIsolationPolicy;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.mapping.MappingKey;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ArchiveDump;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.Isolate;
import nuri.migration.model.MappingSpec.Nullify;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.validate.ledger.LoadCapabilities;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * {@link EtlExecutor}의 실행 전 계약 검증(commit·nullify·isolate·archive·복합 FK 순서)과 대상 컬럼/INSERT SQL 계획을 담당한다.
 */
public final class EtlContractSupport {

    private EtlContractSupport() {
    }

    /**
     * [ADR-0029 L3e] 보관·격리 키 반출 전제를 연결을 열기 전에 확인한다. COMMIT 에 보관 선언이나 isolate 가 있으면 보관
     * 디렉터리가 있어야 하고(덤프·격리 키 없이 적재하지 않는다), dry-run 은 파일을 쓰지 않는다. 보관은 적재 run 과 함께 하므로
     * 표 매핑이 있어야 하고, 보관 id 는 한 번씩, 매핑된 표의 보관은 그 매핑의 where·정렬 키를 쓰며(따로 두면 오류), 덤프에는
     * 정렬 키가 있어야 한다. 덤프 머리(컬럼·원장 행·보존 기한)도 여기서 확인한다. 오류는 표 이름과 고정 문구뿐이다.
     */
    static void requireArchiveRules(MappingSpec spec, ArchiveRun archives, boolean commit) {
        if (commit && ArchiveRun.required(spec) && !archives.writesFiles()) {
            throw new IllegalArgumentException("commit 에서 보관 선언(archives)이나 격리(isolate)가 있으면 보관 디렉터리"
                    + "(--archive-dir)가 필요합니다 — 덤프·격리 키 없이 적재하지 않습니다");
        }
        if (!commit && archives.writesFiles()) {
            throw new IllegalArgumentException("dry-run 은 보관 파일을 쓰지 않습니다 — 보관 디렉터리는 commit 에서만 씁니다");
        }
        if (spec.archives().isEmpty()) {
            return;
        }
        if (spec.tables().isEmpty()) {
            throw new IllegalArgumentException("보관 선언만 있는 mapping 은 실행할 수 없습니다 — 보관은 적재 run 과 함께 합니다");
        }
        Set<String> ids = new HashSet<>();
        for (ArchiveDump dump : spec.archives()) {
            if (dump == null || isBlank(dump.id()) || isBlank(dump.source()) || !ids.add(dump.id())) {
                throw new IllegalArgumentException("보관 선언의 id·source 가 비었거나 id 가 겹칩니다");
            }
            if (spec.archiveReaderAmbiguous(dump.source())) {
                // [ADR-0029 L3c] 분할한 소스의 보관은 keymap 소유 매핑이나 id 를 생략한 매핑의 읽기에 붙는다.
                throw new IllegalArgumentException(dump.source()
                        + ": 분할한 소스의 보관을 붙일 읽기(keymap 소유 매핑이나 id 를 생략한 매핑)가 없습니다");
            }
            if (!spec.archiveReaderCoversSource(dump.source())) {
                // 덤프는 읽는 매핑의 where 로 걸러진 행만 담는다 — 다른 where 의 매핑이 적재한 행의 보관 값이 빠진다.
                throw new IllegalArgumentException(dump.source() + ": " + MappingSpec.SPLIT_ARCHIVE_WHERE_MISMATCH);
            }
            TableMapping mapped = spec.mappedTableOf(dump.source());
            if (mapped != null && (dump.where() != null || !dump.orderByKeys().isEmpty())) {
                throw new IllegalArgumentException(dump.source()
                        + ": 매핑된 표의 보관은 그 매핑의 where·정렬 키를 씁니다 — 보관 선언에 따로 둘 수 없습니다");
            }
            List<String> keys = mapped == null ? dump.orderByKeys() : mapped.effectiveOrderKeys();
            if (keys.isEmpty()) {
                throw new IllegalArgumentException(dump.source() + ": 보관 덤프에는 정렬 키가 필요합니다");
            }
            SourceIntrospector.qualifiedIdent(dump.source());
            keys.forEach(SourceIntrospector::ident);
            dump.columns().forEach(SourceIntrospector::ident);
        }
        archives.check(spec);
    }

    static void requireCommitContract(MappingSpec spec) {
        RunContext run = spec.run();
        if (run == null || isBlank(run.runId()) || isBlank(run.sourceNamespace())) {
            throw new IllegalArgumentException(
                    "commit 모드에는 run.runId와 run.sourceNamespace가 필수입니다");
        }
        MappingIndex index = MappingIndex.of(spec.tables());
        for (TableMapping table : spec.tables()) {
            validateIdentityContract(spec, index, table);
            if (!isBlank(table.orderBy()) && !table.orderByKeys().isEmpty()) {
                throw new IllegalArgumentException(label(table)
                        + ": orderBy와 orderByKeys를 함께 선언할 수 없습니다");
            }
            List<String> orderKeys = table.effectiveOrderKeys();
            if (orderKeys.isEmpty()) {
                throw new IllegalArgumentException(label(table)
                        + ": commit 모드에는 명시적 orderBy/orderByKeys source key가 필수입니다");
            }
            Set<String> distinct = new HashSet<>();
            for (String orderKey : orderKeys) {
                SourceIntrospector.ident(orderKey);
                if (!distinct.add(orderKey.toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException(label(table)
                            + ": orderByKeys 중복 금지: " + orderKey);
                }
            }
            if (table.identity() == null) {
                String targetIdentity = targetIdentityColumn(table);
                if (isBlank(targetIdentity)) {
                    throw new IllegalArgumentException(label(table)
                            + ": checkpoint/verifier용 targetKey 또는 idStrategy.column이 필수입니다");
                }
                SourceIntrospector.ident(targetIdentity);
            }
        }
    }

    /**
     * nullify 선언을 연결을 열기 전에 확인한다(ADR-0029 L3a-1). {@code BLANK}·{@code PLACEHOLDER_DATE} 만, 위반마다 한 번,
     * 상한은 1 이상이어야 한다 — 그 밖의 선언으로 위반을 NULL 로 바꾸지 않는다. 오류는 테이블·컬럼 이름만 밝힌다.
     */
    static void requireNullifyRules(MappingSpec spec) {
        for (TableMapping table : spec.tables()) {
            for (ColumnMapping column : table.columns()) {
                Set<DomainViolation> declared = EnumSet.noneOf(DomainViolation.class);
                for (Nullify rule : column.nullify()) {
                    String label = label(table) + "." + column.target();
                    if (rule == null || (rule.violation() != DomainViolation.BLANK
                            && rule.violation() != DomainViolation.PLACEHOLDER_DATE)) {
                        throw new IllegalArgumentException(label
                                + ": nullify 는 BLANK·PLACEHOLDER_DATE 위반에만 선언할 수 있습니다");
                    }
                    if (rule.maxRows() == null || rule.maxRows() < 1) {
                        throw new IllegalArgumentException(label + ": nullify maxRows 는 1 이상이어야 합니다");
                    }
                    if (!declared.add(rule.violation())) {
                        throw new IllegalArgumentException(label + ": nullify 에 같은 위반을 두 번 선언할 수 없습니다");
                    }
                }
            }
        }
    }

    /**
     * 승인 행 격리 선언을 연결을 열기 전에 확인한다(ADR-0029 L3b). mapping 정적 검증과 같은 전제 — 순서 키가 있고, 격리하면
     * 안 되는 표(target_generated·분할한 소스·자기참조·다른 매핑의 부모)와 컬럼(암호화·fkRef·값을 변환하지 않는 컬럼)이
     * 아니며, 위반은 격리할 수 있는 코드를 한 번씩 그 컬럼의 nullify 밖에서만 담고, 원장 행마다 상한이 하나다 — 를 다시 보고,
     * isolate 컬럼마다 값 한계 가드가 있어야 한다. 그 밖의 선언으로 행을 적재하지 않고 넘기지 않는다. 오류는 표·컬럼 이름만
     * 밝힌다.
     */
    static void requireIsolationRules(MappingSpec spec, Map<String, Map<String, TargetValueGuard.Limit>> guards) {
        for (TableMapping table : spec.tables()) {
            RowIsolationPolicy policy = RowIsolationPolicy.of(table);
            if (!policy.active()) {
                continue;
            }
            policy.caps();
            if (table.effectiveOrderKeys().isEmpty()) {
                throw new IllegalArgumentException(label(table)
                        + ": isolate 가 있는 표에는 orderBy·orderByKeys 가 필요합니다");
            }
            String tableBlocker = RowIsolationPolicy.tableBlocker(spec.tables(), table);
            if (tableBlocker != null) {
                throw new IllegalArgumentException(label(table) + ": " + tableBlocker + "에는 isolate 를 둘 수 없습니다");
            }
            Map<String, TargetValueGuard.Limit> tableGuards = guards.getOrDefault(lower(label(table)), Map.of());
            for (ColumnMapping column : table.columns()) {
                Isolate isolate = column.isolate();
                if (isolate == null) {
                    continue;
                }
                String label = label(table) + "." + column.target();
                String columnBlocker = RowIsolationPolicy.columnBlocker(column);
                if (columnBlocker != null) {
                    throw new IllegalArgumentException(label + ": " + columnBlocker + "에는 isolate 를 둘 수 없습니다");
                }
                Set<String> codes = new HashSet<>();
                for (String code : isolate.violations()) {
                    if (!LoadCapabilities.ISOLATABLE.contains(code) || !codes.add(code)) {
                        throw new IllegalArgumentException(label
                                + ": isolate 위반은 격리할 수 있는 코드를 한 번씩만 담습니다");
                    }
                    if (column.nullify().stream().anyMatch(rule -> rule.violation().name().equals(code))) {
                        throw new IllegalArgumentException(label
                                + ": nullify 가 NULL 로 바꾸는 위반은 isolate 에 둘 수 없습니다");
                    }
                }
                if (!tableGuards.containsKey(column.target())) {
                    throw new IllegalArgumentException(label + ": isolate 컬럼의 값 한계 가드가 없습니다"
                            + " — 승인 workflow(load)가 대상 계약으로 정한 가드와 함께 실행하세요");
                }
            }
        }
    }

    /** 매핑 라벨(기본 매핑은 소스 표 이름, 나눈 매핑은 {@code source#id})을 소문자로 맞춘 가드 표. null 이면 비어 있다. */
    static Map<String, Map<String, TargetValueGuard.Limit>> normalizeGuards(
            Map<String, Map<String, TargetValueGuard.Limit>> rowGuards) {
        Map<String, Map<String, TargetValueGuard.Limit>> guards = new HashMap<>();
        if (rowGuards == null) {
            return guards;
        }
        for (Map.Entry<String, Map<String, TargetValueGuard.Limit>> table : rowGuards.entrySet()) {
            if (table.getKey() == null || table.getValue() == null) {
                throw new IllegalArgumentException("값 한계 가드의 표 이름과 한계는 비어 있을 수 없습니다");
            }
            if (guards.put(lower(table.getKey()), Map.copyOf(table.getValue())) != null) {
                throw new IllegalArgumentException("값 한계 가드에 같은 표가 두 번 있습니다: " + table.getKey());
            }
        }
        return guards;
    }

    private static void validateIdentityContract(MappingSpec spec, MappingIndex index, TableMapping table) {
        IdentityStrategy identity = table.identity();
        if (identity == null) {
            if (!table.foreignKeys().isEmpty()) {
                throw new IllegalArgumentException(label(table)
                        + ": composite foreignKeys에는 typed identity가 필수입니다");
            }
            return;
        }
        if (table.idStrategy() != null) {
            throw new IllegalArgumentException(label(table)
                    + ": legacy idStrategy와 typed identity를 함께 선언할 수 없습니다");
        }
        requireComponents(label(table), "sourceComponents", identity.sourceComponents());
        requireComponents(label(table), "targetComponents", identity.targetComponents());
        if (identity.policy() == TargetIdentityPolicy.PRESERVE
                && identity.sourceComponents().size() != identity.targetComponents().size()) {
            throw new IllegalArgumentException(label(table) + ": PRESERVE identity arity 불일치");
        }
        if (identity.policy() == TargetIdentityPolicy.REMAP) {
            Set<String> valueProducers = new HashSet<>();
            for (ColumnMapping column : table.columns()) {
                if (!isBlank(column.target())) {
                    valueProducers.add(column.target().toLowerCase(Locale.ROOT));
                }
            }
            for (CompositeForeignKey foreignKey : table.foreignKeys()) {
                for (IdentityComponentSpec component : foreignKey.targetComponents()) {
                    valueProducers.add(component.column().toLowerCase(Locale.ROOT));
                }
            }
            for (IdentityComponentSpec target : identity.targetComponents()) {
                if (!valueProducers.contains(target.column().toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException(label(table)
                            + ": REMAP target identity component 값 생성 mapping 없음: "
                            + target.column());
                }
            }
        }
        if (identity.policy() == TargetIdentityPolicy.TARGET_GENERATED
                && (spec.target() == null || spec.target().url() == null
                || !spec.target().url().toLowerCase(Locale.ROOT).startsWith("jdbc:postgresql:"))) {
            throw new IllegalArgumentException(label(table)
                    + ": TARGET_GENERATED는 PostgreSQL INSERT ... RETURNING target에서만 지원됩니다");
        }
        for (CompositeForeignKey foreignKey : table.foreignKeys()) {
            requireComponents(label(table), "foreignKeys.sourceComponents", foreignKey.sourceComponents());
            requireComponents(label(table), "foreignKeys.targetComponents", foreignKey.targetComponents());
            if (foreignKey.sourceComponents().size() != foreignKey.targetComponents().size()) {
                throw new IllegalArgumentException(label(table)
                        + ": composite foreign key source/target arity 불일치");
            }
            // [ADR-0029 L3c] 부모 소스는 그 소스의 keymap 소유 매핑으로 푼다.
            TableMapping parent = index.parent(foreignKey.parentSource());
            if (parent == null) {
                throw new IllegalArgumentException(label(table)
                        + ": composite foreign key parent mapping 없음: " + foreignKey.parentSource());
            }
            if (parent.identity() == null
                    || !sameOrderedTypes(
                            parent.identity().sourceComponents(), foreignKey.sourceComponents())
                    || !sameOrderedTypes(
                            parent.identity().targetComponents(), foreignKey.targetComponents())) {
                throw new IllegalArgumentException(label(table)
                        + ": composite foreign key component arity/type 순서가 parent typed identity와 불일치합니다");
            }
        }
    }

    private static boolean sameOrderedTypes(
            List<IdentityComponentSpec> expected,
            List<IdentityComponentSpec> actual
    ) {
        if (expected.size() != actual.size()) {
            return false;
        }
        for (int i = 0; i < expected.size(); i++) {
            if (expected.get(i).type() != actual.get(i).type()) {
                return false;
            }
        }
        return true;
    }

    private static void requireComponents(
            String table,
            String label,
            List<IdentityComponentSpec> components
    ) {
        if (components.isEmpty()) {
            throw new IllegalArgumentException(table + ": " + label + "가 비어 있습니다");
        }
        Set<String> names = new HashSet<>();
        for (IdentityComponentSpec component : components) {
            SourceIntrospector.ident(component.column());
            if (!names.add(component.column().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException(table + ": " + label + " 중복: " + component.column());
            }
        }
    }

    /**
     * 복합 FK 의 부모(소스의 keymap 소유 매핑, ADR-0029 L3c)가 자식보다 먼저 실행되는지 본다. 부모가 자기 자신이면
     * 생성 identity 선채번이 안전하지 않아 막는다. 소유 매핑이 아닌 매핑이 자기 소스를 가리키면 형제 소유 매핑이 부모다.
     */
    static void requireCompositeForeignKeyOrder(List<TableMapping> orderedTables) {
        MappingIndex index = MappingIndex.of(orderedTables);
        Map<MappingKey, Integer> order = new LinkedHashMap<>();
        for (int i = 0; i < orderedTables.size(); i++) {
            MappingKey key = index.key(orderedTables.get(i));
            if (key != null) {
                order.put(key, i);
            }
        }
        for (int childIndex = 0; childIndex < orderedTables.size(); childIndex++) {
            TableMapping child = orderedTables.get(childIndex);
            for (CompositeForeignKey foreignKey : child.foreignKeys()) {
                if (index.resolvesTo(foreignKey.parentSource(), child)) {
                    throw new IllegalArgumentException(label(child)
                            + ": typed composite self reference is blocked; generated identity pre-mint is unsafe");
                }
                MappingKey parent = index.key(index.parent(foreignKey.parentSource()));
                Integer parentIndex = parent == null ? null : order.get(parent);
                if (parentIndex == null || parentIndex >= childIndex) {
                    throw new IllegalArgumentException(label(child)
                            + ": composite foreign key requires explicit parent-first order: "
                            + foreignKey.parentSource());
                }
            }
        }
    }

    public static List<String> canonicalTargetColumns(TableMapping t) {
        List<String> cols = new ArrayList<>(insertTargetColumns(t));
        if (t.identity() != null) {
            for (IdentityComponentSpec component : t.identity().targetComponents()) {
                addColumn(cols, component.column());
            }
        }
        return cols;
    }

    public static List<String> insertTargetColumns(TableMapping t) {
        List<String> cols = new ArrayList<>();
        for (ColumnMapping c : t.columns()) {
            if (c.target() != null) {
                addColumn(cols, c.target());
            }
        }
        IdStrategy id = t.idStrategy();
        if (id != null && id.column() != null) {
            addColumn(cols, id.column());
        }
        if (t.identity() != null && t.identity().policy() != TargetIdentityPolicy.TARGET_GENERATED) {
            for (IdentityComponentSpec component : t.identity().targetComponents()) {
                addColumn(cols, component.column());
            }
        }
        for (CompositeForeignKey foreignKey : t.foreignKeys()) {
            for (IdentityComponentSpec component : foreignKey.targetComponents()) {
                addColumn(cols, component.column());
            }
        }
        return cols;
    }

    static List<String> returningTargetColumns(TableMapping table) {
        if (!isTargetGenerated(table)) {
            return List.of();
        }
        return table.identity().targetComponents().stream()
                .map(IdentityComponentSpec::column)
                .toList();
    }

    public static String targetIdentityColumn(TableMapping table) {
        if (table.identity() != null) {
            return table.identity().targetComponents().size() == 1
                    ? table.identity().targetComponents().getFirst().column()
                    : null;
        }
        IdStrategy id = table.idStrategy();
        if (id != null && !isBlank(id.column())) {
            return id.column();
        }
        return table.targetKey();
    }

    static boolean isTargetGenerated(TableMapping table) {
        return table.identity() != null
                && table.identity().policy() == TargetIdentityPolicy.TARGET_GENERATED;
    }

    private static void addColumn(List<String> columns, String candidate) {
        if (columns.stream().noneMatch(column -> column.equalsIgnoreCase(candidate))) {
            columns.add(candidate);
        }
    }

    static String buildInsertSql(String table, List<String> cols, List<String> returningColumns) {
        String base;
        if (cols.isEmpty()) {
            base = "INSERT INTO " + SourceIntrospector.qualifiedIdent(table) + " DEFAULT VALUES";
        } else {
            String colList = String.join(", ", cols.stream().map(SourceIntrospector::ident).toList());
            String placeholders = String.join(", ", cols.stream().map(c -> "?").toList());
            base = "INSERT INTO " + SourceIntrospector.qualifiedIdent(table)
                    + " (" + colList + ") VALUES (" + placeholders + ")";
        }
        if (returningColumns.isEmpty()) {
            return base;
        }
        return base + " RETURNING " + String.join(", ", returningColumns.stream()
                .map(SourceIntrospector::ident)
                .toList());
    }

    private static String label(TableMapping table) {
        return MappingIndex.label(table);
    }

    private static String lower(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
