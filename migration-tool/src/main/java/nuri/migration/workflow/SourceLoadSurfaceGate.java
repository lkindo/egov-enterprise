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
import java.util.LinkedHashMap;
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
        // [ADR-0029 L3d] 조회 표 — 조회 키와 조회 컬럼의 형식 증거를 본다. 조회 행은 한 번에 읽으므로 LOB 는 받지 않는다.
        List<CatalogObject> lookupTables = snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .filter(table -> mapping.tables().stream()
                        .flatMap(candidate -> candidate.lookups().stream())
                        .anyMatch(lookup -> lookup != null && matches(lookup.source(), table)))
                .toList();
        EnumSet<Blocker> blockers = EnumSet.noneOf(Blocker.class);
        if (!policy.quotedIdentifiersSupported()
                && (mappedTables.stream().anyMatch(CatalogObject::quoted)
                || lookupTables.stream().anyMatch(CatalogObject::quoted))) {
            blockers.add(Blocker.QUOTED_IDENTIFIER);
        }
        for (CatalogObject table : lookupTables) {
            LinkedHashMap<String, String> requiredColumns = new LinkedHashMap<>();
            for (TableMapping candidate : mapping.tables()) {
                for (MappingSpec.Lookup lookup : candidate.lookups()) {
                    if (lookup != null && matches(lookup.source(), table)) {
                        SourceProjection.lookupColumns(candidate, lookup)
                                .forEach(column -> requiredColumns.putIfAbsent(column.toLowerCase(Locale.ROOT), column));
                    }
                }
            }
            inspectRequired(snapshot, table, requiredColumns, policy, false, blockers);
        }

        for (CatalogObject table : mappedTables) {
            // [ADR-0029 L3c] 한 소스를 나눈 매핑들이 요구하는 컬럼의 합집합을 본다 — 첫 매핑만 보면 다른 매핑이 읽는
            //   컬럼의 형식 증거가 빠진다.
            LinkedHashMap<String, String> requiredColumns = new LinkedHashMap<>();
            mapping.tables().stream()
                    .filter(candidate -> matches(candidate, table))
                    .flatMap(candidate -> SourceProjection.requiredColumns(candidate).stream())
                    .forEach(column -> requiredColumns.putIfAbsent(column.toLowerCase(Locale.ROOT), column));
            inspectRequired(snapshot, table, requiredColumns, policy, true, blockers);
        }
        return List.copyOf(blockers);
    }

    private static void inspectRequired(
            CatalogSnapshot snapshot,
            CatalogObject table,
            LinkedHashMap<String, String> requiredColumns,
            SourceReadSessionPolicy policy,
            boolean largeValues,
            EnumSet<Blocker> blockers
    ) {
        List<CatalogObject> tableColumns = snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.COLUMN)
                .filter(column -> belongsTo(column, table.referenceId()))
                .toList();
        for (String required : requiredColumns.values()) {
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
            matches.forEach(column -> inspectColumn(column, policy, largeValues, blockers));
        }
    }

    /**
     * 승인 inventory 에서 매핑 소스 표의 한 컬럼 선언을 찾는다. 표 이름은 이 gate 와 같은 규칙으로
     * 대조하고, 이름이 겹쳐 둘 이상 나오면 그대로 돌려줘 호출부가 모호함을 판정하게 한다.
     */
    public static List<CatalogObject> sourceColumns(CatalogSnapshot snapshot, TableMapping mapping, String column) {
        Objects.requireNonNull(mapping, "mapping");
        return sourceColumns(snapshot, mapping.source(), column);
    }

    /** 소스 표 표기로 한 컬럼 선언을 찾는다(조회 표 포함, ADR-0029 L3d). */
    public static List<CatalogObject> sourceColumns(CatalogSnapshot snapshot, String source, String column) {
        Objects.requireNonNull(snapshot, "snapshot");
        if (column == null || column.isBlank()) {
            return List.of();
        }
        List<String> tables = snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .filter(table -> matches(source, table))
                .map(CatalogObject::referenceId)
                .toList();
        return snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.COLUMN)
                .filter(candidate -> tables.stream().anyMatch(table -> belongsTo(candidate, table)))
                .filter(candidate -> identifierEquals(column,
                        candidate.attributes().get("originalName"), candidate.quoted()))
                .toList();
    }

    /** {@code largeValues} 가 false 면(조회 표) 정책과 무관하게 LOB·긴 값을 받지 않는다. */
    private static void inspectColumn(
            CatalogObject column,
            SourceReadSessionPolicy policy,
            boolean largeValues,
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
        boolean supportedLocator = largeValues && policy.lobStreamingSupported()
                && (parsed == Types.BLOB || parsed == Types.CLOB);
        boolean supportedLongValue = largeValues && policy.longValueStreamingSupported()
                && (parsed == Types.LONGVARCHAR || parsed == Types.LONGVARBINARY);
        if (LOB_TYPES.contains(parsed) && !supportedLocator && !supportedLongValue) {
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
        return matches(mapping.source(), table);
    }

    private static boolean matches(String source, CatalogObject table) {
        if (source == null) {
            return false;
        }
        String[] parts = source.trim().split("\\.", -1);
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
