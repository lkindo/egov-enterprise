package nuri.migration.etl;

import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.TableMapping;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/** ETL이 실제로 읽어야 하는 source 컬럼의 canonical projection을 만든다. */
public final class SourceProjection {

    private SourceProjection() {
    }

    public static List<String> requiredColumns(TableMapping table) {
        Objects.requireNonNull(table, "table");
        LinkedHashMap<String, String> columns = new LinkedHashMap<>();
        for (ColumnMapping column : table.columns()) {
            add(columns, column.source());
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
