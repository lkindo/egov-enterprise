package nuri.migration.protect;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.TableMapping;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * mapping 의 보호 컬럼 선언을 {@link ProtectedTargetColumns} 와 대조한다(DEC-OPS-308).
 *
 * <p>매핑 검증({@code MappingValidator})과 적재 시작({@code EtlExecutor}) 두 곳이 같은 판정을 쓴다. 위반 문구는
 * 대상 테이블·컬럼 이름만 담고 값·키·선언 원문을 담지 않는다.
 */
public final class ColumnProtectionPlan {

    /** 이관 도구가 암호화해 쓸 대상 컬럼. */
    public record ProtectedColumn(String targetTable, String column, ProtectedTargetColumns.Entry entry) {}

    private final Map<String, ProtectedColumn> columns;
    private final List<String> violations;

    private ColumnProtectionPlan(Map<String, ProtectedColumn> columns, List<String> violations) {
        this.columns = Map.copyOf(columns);
        this.violations = List.copyOf(violations);
    }

    public static ColumnProtectionPlan of(MappingSpec spec) {
        Map<String, ProtectedColumn> columns = new LinkedHashMap<>();
        List<String> violations = new ArrayList<>();
        for (TableMapping table : spec.tables()) {
            if (table == null || table.target() == null) {
                continue;
            }
            for (ColumnMapping column : table.columns()) {
                if (column != null && column.target() != null) {
                    inspect(table, column, columns, violations);
                }
            }
            rejectKeyUse(table, violations);
        }
        return new ColumnProtectionPlan(columns, violations);
    }

    public List<String> violations() {
        return violations;
    }

    /** 키는 {@link #key(String, String)} 형식이다. */
    public Map<String, ProtectedColumn> columns() {
        return columns;
    }

    static String key(String targetTable, String column) {
        return ProtectedTargetColumns.unqualified(targetTable) + "." + column.toLowerCase(Locale.ROOT);
    }

    private static void inspect(TableMapping table, ColumnMapping column,
                                Map<String, ProtectedColumn> columns, List<String> violations) {
        String name = table.target() + "." + column.target();
        Optional<ProtectedTargetColumns.Entry> registered = ProtectedTargetColumns.find(table.target(), column.target());
        if (column.encrypt() == null) {
            registered.ifPresent(entry -> violations.add(name + ": 온라인 앱이 암호화해 저장하는 컬럼입니다 — "
                    + (entry.protection().migratable()
                    ? "encrypt: " + entry.protection().id() + " 를 선언해야 평문으로 쓰지 않습니다"
                    : "이관 도구가 만들 수 없는 보호 방식이라 매핑할 수 없습니다(온라인 앱에서 다시 만듭니다)")));
            return;
        }
        Optional<ColumnProtection> declared = ColumnProtection.byId(column.encrypt());
        if (declared.isEmpty()) {
            violations.add(name + ": 알 수 없는 encrypt 방식입니다");
            return;
        }
        if (registered.isEmpty()) {
            violations.add(name + ": 온라인 앱이 암호화하지 않는 컬럼에 encrypt 를 선언했습니다");
            return;
        }
        if (registered.get().protection() != declared.get()) {
            violations.add(name + ": encrypt 방식이 온라인 앱의 보호 방식과 다릅니다");
            return;
        }
        if (!declared.get().migratable()) {
            violations.add(name + ": 이관 도구가 만들 수 없는 보호 방식이라 매핑할 수 없습니다(온라인 앱에서 다시 만듭니다)");
            return;
        }
        if (column.constant() != null || isBlank(column.source())) {
            violations.add(name + ": encrypt 컬럼은 const 없이 source 로만 채웁니다");
            return;
        }
        if (!isBlank(column.codemap()) || !isBlank(column.type()) || !isBlank(column.fkRef())) {
            violations.add(name + ": encrypt 컬럼에는 codemap·type·fkRef 를 함께 쓸 수 없습니다");
            return;
        }
        columns.put(key(table.target(), column.target()),
                new ProtectedColumn(table.target(), column.target(), registered.get()));
    }

    /** 보호 컬럼은 암호문이 키가 되므로 idStrategy·identity·복합 FK 의 대상 컬럼으로 쓸 수 없다. */
    private static void rejectKeyUse(TableMapping table, List<String> violations) {
        List<String> keyColumns = new ArrayList<>();
        if (table.idStrategy() != null && table.idStrategy().column() != null) {
            keyColumns.add(table.idStrategy().column());
        }
        if (table.identity() != null) {
            table.identity().targetComponents().stream().map(IdentityComponentSpec::column).forEach(keyColumns::add);
        }
        for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
            foreignKey.targetComponents().stream().map(IdentityComponentSpec::column).forEach(keyColumns::add);
        }
        for (String column : keyColumns) {
            if (ProtectedTargetColumns.find(table.target(), column).isPresent()) {
                violations.add(table.target() + "." + column + ": 보호 컬럼은 식별자·참조 키로 쓸 수 없습니다");
            }
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
