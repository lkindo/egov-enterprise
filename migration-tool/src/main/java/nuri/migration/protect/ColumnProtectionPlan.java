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
            rejectSourceKeyUse(table, violations);
        }
        rejectArchiveUse(spec, violations);
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

    /**
     * 암호화할 소스 값은 키로도 쓸 수 없다. 정렬 키·idStrategy.sourceKey·identity·복합 FK·fkRef 의 소스 값은 평문 그대로
     * 제어 테이블({@code tb_migration_checkpoint.source_key}·{@code tb_migration_key_map.legacy_key})에 남기 때문이다.
     * 주민번호만 키인 테이블은 지금 적재할 수 없다(GAP-MIG-002). [ADR-0029 L3d] 조회 키({@code key.from}, 조회 표 쪽은
     * {@code alias.key.to})도 키로 센다 — 암호화할 값으로 다른 표를 찾지 않는다.
     */
    private static void rejectSourceKeyUse(TableMapping table, List<String> violations) {
        List<String> keySources = new ArrayList<>(table.effectiveOrderKeys());
        if (table.idStrategy() != null && table.idStrategy().sourceKey() != null) {
            keySources.add(table.idStrategy().sourceKey());
        }
        if (table.identity() != null) {
            table.identity().sourceComponents().stream().map(IdentityComponentSpec::column).forEach(keySources::add);
        }
        for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
            foreignKey.sourceComponents().stream().map(IdentityComponentSpec::column).forEach(keySources::add);
        }
        for (MappingSpec.Lookup lookup : table.lookups()) {
            if (lookup != null && lookup.key() != null) {
                keySources.add(lookup.key().from());
                if (lookup.alias() != null && lookup.key().to() != null) {
                    keySources.add(lookup.alias() + "." + lookup.key().to());
                }
            }
        }
        for (ColumnMapping column : table.columns()) {
            // encrypt 컬럼 자신의 fkRef 는 위(inspect)에서 따로 거부한다.
            if (column != null && column.encrypt() == null && !isBlank(column.fkRef()) && !isBlank(column.source())) {
                keySources.add(column.source());
            }
        }
        for (ColumnMapping column : table.columns()) {
            if (column == null || column.encrypt() == null || isBlank(column.source()) || column.target() == null) {
                continue;
            }
            String source = column.source().trim();
            if (keySources.stream().anyMatch(key -> key != null && key.trim().equalsIgnoreCase(source))) {
                violations.add(table.target() + "." + column.target()
                        + ": 암호화할 소스 값을 정렬·식별자·참조 키로 쓸 수 없습니다(평문이 제어 테이블에 남습니다)");
            }
        }
    }

    /**
     * [ADR-0029 L3e] 암호화해 적재할 소스 값은 외부 보관 덤프에 넣을 수 없다 — 덤프는 원시 값을 평문 그대로 담으므로 대상에서
     * 암호화한 값이 덤프에 평문으로 남는다. 보관 선언이 읽는 매핑된 표(같은 source 표기)의 encrypt 컬럼 소스와 보관 컬럼을
     * 대조한다. 원장은 같은 소스 컬럼을 확정·보관에 함께 두지 못하게 막지만, 손으로 고친 mapping 도 여기서 멈춘다.
     */
    private static void rejectArchiveUse(MappingSpec spec, List<String> violations) {
        for (MappingSpec.ArchiveDump archive : spec.archives()) {
            if (archive == null) {
                continue;
            }
            TableMapping table = spec.mappedTableOf(archive.source());
            if (table == null || table.target() == null) {
                continue;
            }
            for (ColumnMapping column : table.columns()) {
                if (column == null || column.encrypt() == null || isBlank(column.source()) || column.target() == null) {
                    continue;
                }
                String source = column.source().trim();
                if (archive.columns().stream()
                        .anyMatch(dumped -> dumped != null && dumped.trim().equalsIgnoreCase(source))) {
                    violations.add(table.target() + "." + column.target()
                            + ": 암호화할 소스 값은 외부 보관 덤프에 넣을 수 없습니다(덤프에 평문으로 남습니다)");
                }
            }
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
