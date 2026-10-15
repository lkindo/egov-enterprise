package nuri.migration.etl;

import nuri.migration.lookup.LookupRef;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.TableMapping;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/** ETL이 실제로 읽어야 하는 source 컬럼의 canonical projection을 만든다. */
public final class SourceProjection {

    private SourceProjection() {
    }

    /**
     * 주 표에서 읽을 컬럼. [ADR-0029 L3d] 조회 컬럼({@code alias.COLUMN})은 주 표의 컬럼이 아니라 빼고, 조회 키를 만드는
     * {@code key.from} 은 더한다.
     */
    public static List<String> requiredColumns(TableMapping table) {
        Objects.requireNonNull(table, "table");
        LinkedHashMap<String, String> columns = new LinkedHashMap<>();
        for (ColumnMapping column : table.columns()) {
            if (LookupRef.parse(column.source()) == null) {
                add(columns, column.source());
            }
        }
        if (table.idStrategy() != null) {
            add(columns, table.idStrategy().sourceKey());
        }
        if (table.identity() != null) {
            addComponents(columns, table.identity().sourceComponents());
        }
        for (CompositeForeignKey foreignKey : table.foreignKeys()) {
            addComponents(columns, foreignKey.sourceComponents());
        }
        table.effectiveOrderKeys().forEach(column -> add(columns, column));
        for (Lookup lookup : table.lookups()) {
            if (lookup != null && lookup.key() != null) {
                add(columns, lookup.key().from());
            }
        }
        return List.copyOf(columns.values());
    }

    /**
     * 조회 표에서 읽을 컬럼(ADR-0029 L3d) — 키({@code key.to})가 먼저이고, 이 매핑이 그 별칭으로 읽는 컬럼이 선언 순서로
     * 뒤따른다. 대소문자만 다른 같은 컬럼은 한 번만 읽는다.
     */
    public static List<String> lookupColumns(TableMapping table, Lookup lookup) {
        Objects.requireNonNull(table, "table");
        Objects.requireNonNull(lookup, "lookup");
        LinkedHashMap<String, String> columns = new LinkedHashMap<>();
        if (lookup.key() != null) {
            add(columns, lookup.key().to());
        }
        lookupValueColumns(table, lookup).forEach(column -> add(columns, column));
        return List.copyOf(columns.values());
    }

    /** 이 매핑이 그 별칭으로 읽어 대상에 옮기는 조회 컬럼(선언 순서, 대소문자만 다른 컬럼은 한 번). */
    public static List<String> lookupValueColumns(TableMapping table, Lookup lookup) {
        Objects.requireNonNull(table, "table");
        Objects.requireNonNull(lookup, "lookup");
        LinkedHashMap<String, String> columns = new LinkedHashMap<>();
        for (ColumnMapping column : table.columns()) {
            LookupRef ref = column == null ? null : LookupRef.parse(column.source());
            if (ref != null && ref.alias().equals(lookup.alias())) {
                add(columns, ref.column());
            }
        }
        return List.copyOf(columns.values());
    }

    private static void addComponents(
            LinkedHashMap<String, String> columns,
            List<IdentityComponentSpec> components
    ) {
        components.forEach(component -> add(columns, component.column()));
    }

    private static void add(LinkedHashMap<String, String> columns, String column) {
        if (column == null || column.isBlank()) {
            return;
        }
        columns.putIfAbsent(column.toLowerCase(Locale.ROOT), column);
    }
}
