package nuri.migration.workflow;

import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.etl.SourceProjection;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.TableMapping;

import java.sql.Types;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/** 승인 inventory에서 현재 ETL row reader가 안전하게 처리하지 못하는 표면을 차단한다. */
public final class SourceLoadSurfaceGate {

    private static final Set<Integer> LOB_TYPES = Set.of(
            Types.BLOB,
            Types.CLOB,
            Types.NCLOB,
            Types.LONGVARBINARY,
            Types.LONGVARCHAR,
            Types.LONGNVARCHAR,
            Types.SQLXML);
    private static final Set<Integer> VENDOR_SPECIFIC_TYPES = Set.of(
            Types.ARRAY,
            Types.DATALINK,
            Types.DISTINCT,
            Types.JAVA_OBJECT,
            Types.OTHER,
            Types.REF,
            Types.REF_CURSOR,
            Types.ROWID,
            Types.STRUCT);

    private SourceLoadSurfaceGate() {
    }

    public static List<Blocker> blockers(
            CatalogSnapshot snapshot,
            MappingSpec mapping,
            SourceReadSessionPolicy policy
    ) {
        Objects.requireNonNull(snapshot, "snapshot");
        Objects.requireNonNull(mapping, "mapping");
        Objects.requireNonNull(policy, "policy");

        List<CatalogObject> mappedTables = snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .filter(table -> mapping.tables().stream()
                        .anyMatch(candidate -> matches(candidate, table)))
                .toList();
        EnumSet<Blocker> blockers = EnumSet.noneOf(Blocker.class);
        if (!policy.quotedIdentifiersSupported()
                && mappedTables.stream().anyMatch(CatalogObject::quoted)) {
            blockers.add(Blocker.QUOTED_IDENTIFIER);
        }

        for (CatalogObject table : mappedTables) {
            TableMapping tableMapping = mapping.tables().stream()
                    .filter(candidate -> matches(candidate, table))
                    .findFirst()
                    .orElseThrow();
            List<CatalogObject> tableColumns = snapshot.objects().stream()
                    .filter(object -> object.kind() == ObjectKind.COLUMN)
                    .filter(column -> belongsTo(column, table.referenceId()))
                    .toList();
            for (String required : SourceProjection.requiredColumns(tableMapping)) {
                List<CatalogObject> matches = tableColumns.stream()
                        .filter(column -> identifierEquals(
                                required,
                                column.attributes().get("originalName"),
                                column.quoted()))
                        .toList();
                if (matches.isEmpty()) {
                    blockers.add(Blocker.COLUMN_DISCOVERY_MISSING);
                    continue;
                }
                matches.forEach(column -> inspectColumn(column, policy, blockers));
            }
        }
        return List.copyOf(blockers);
    }

    private static void inspectColumn(
            CatalogObject column,
            SourceReadSessionPolicy policy,
            EnumSet<Blocker> blockers
    ) {
        if (!policy.quotedIdentifiersSupported() && column.quoted()) {
            blockers.add(Blocker.QUOTED_IDENTIFIER);
        }
        String jdbcType = column.attributes().get("jdbcType");
        if (jdbcType == null || jdbcType.isBlank()) {
            blockers.add(Blocker.COLUMN_TYPE_EVIDENCE_MISSING);
            return;
        }
        final int parsed;
        try {
            parsed = Integer.parseInt(jdbcType);
        } catch (NumberFormatException invalidEvidence) {
            blockers.add(Blocker.COLUMN_TYPE_EVIDENCE_MISSING);
            return;
        }
        if (!policy.lobStreamingSupported() && LOB_TYPES.contains(parsed)) {
            blockers.add(Blocker.LOB_STREAMING);
        }
        if (VENDOR_SPECIFIC_TYPES.contains(parsed)) {
            blockers.add(Blocker.VENDOR_SPECIFIC_TYPE);
        }
    }

    private static boolean belongsTo(
            CatalogObject column,
            String mappedTableReferenceId
    ) {
        for (ObjectReference dependency : column.dependencies()) {
            if (dependency.kind() == ObjectKind.TABLE
                    && mappedTableReferenceId.equals(dependency.stableId())) {
                return true;
            }
        }
        return false;
    }

    private static boolean matches(TableMapping mapping, CatalogObject table) {
        if (mapping.source() == null) {
            return false;
        }
        String[] parts = mapping.source().trim().split("\\.", -1);
        boolean caseSensitive = table.quoted();
        return switch (parts.length) {
            case 1 -> identifierEquals(parts[0], table.name(), caseSensitive);
            case 2 -> identifierEquals(parts[0], table.schema(), caseSensitive)
                    && identifierEquals(parts[1], table.name(), caseSensitive);
            case 3 -> identifierEquals(parts[0], table.catalog(), caseSensitive)
                    && identifierEquals(parts[1], table.schema(), caseSensitive)
                    && identifierEquals(parts[2], table.name(), caseSensitive);
            default -> false;
        };
    }

    private static boolean identifierEquals(String expected, String actual, boolean caseSensitive) {
        if (actual == null) {
            return false;
        }
        return caseSensitive
                ? expected.equals(actual)
                : expected.toLowerCase(Locale.ROOT).equals(actual.toLowerCase(Locale.ROOT));
    }

    public enum Blocker {
        QUOTED_IDENTIFIER,
        LOB_STREAMING,
        VENDOR_SPECIFIC_TYPE,
        COLUMN_TYPE_EVIDENCE_MISSING,
        COLUMN_DISCOVERY_MISSING
    }
}
