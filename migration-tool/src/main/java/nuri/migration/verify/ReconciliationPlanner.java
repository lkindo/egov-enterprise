package nuri.migration.verify;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.InventoryTables;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.lookup.LookupRef;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.VerifyReference;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyColumn;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import nuri.migration.postgres.TargetStandardSnapshot.TableContract;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.CodeSetTarget;
import nuri.migration.verify.ColumnCheck.SourceColumnType;
import nuri.migration.verify.ColumnClassifier.ColumnFacts;
import nuri.migration.verify.ColumnClassifier.Origin;
import nuri.migration.verify.ColumnClassifier.TransformKind;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * [ADR-0029 L4 D2] load 의 대사 계획을 만든다. 입력은 승인된 mapping·inventory·bound fingerprint 와 공통코드 대사 대상이고
 * 값은 담지 않는다. 실행기와 verifier 가 같은 계획을 쓴다.
 *
 * <ul>
 *   <li>매핑마다 컬럼 분류({@link ColumnClassifier}) — 원천 타입은 inventory COLUMN 의 {@code jdbcType}·{@code nativeType}·
 *       {@code size}·{@code scale}, 대상 계약은 fingerprint 의 live 컬럼 계약이다. 계약을 읽지 않은 fingerprint(목·비결속)면
 *       도메인·합·최소최대를 사유 없이 생략한다.</li>
 *   <li>대상 PK 는 fingerprint 의 키 순서, 키를 그대로 쓰는가·isolate 가 있는가·대상이 키를 만드는가를 함께 싣는다.</li>
 *   <li>대사할 참조 — {@code verify.references}(DECLARED), fkRef·foreignKeys(FKREF: 자식 컬럼 → 부모 매핑의 대상 키).
 *       같은 자식·부모·컬럼 짝은 하나로 둔다.</li>
 * </ul>
 */
public final class ReconciliationPlanner {

    private ReconciliationPlanner() {
    }

    /**
     * @param inventory 승인 inventory. null 이면 원천 타입을 모두 모른다
     * @param target    bound fingerprint. null 이면 대상 계약·PK·제약을 모른다
     * @param codeSets  공통코드·허용값 대사 대상(D7)
     */
    public static ReconciliationPlan plan(MappingSpec spec, CatalogSnapshot inventory, TargetSchemaFingerprint target,
                                          List<CodeSetTarget> codeSets, TransformerRegistry transformers) {
        Objects.requireNonNull(spec, "spec");
        Objects.requireNonNull(transformers, "transformers");
        List<MappingPlan> mappings = new ArrayList<>();
        for (TableMapping table : spec.tables()) {
            if (table == null || blank(table.source()) || blank(table.target())) {
                continue;
            }
            mappings.add(mapping(spec, table, inventory, target, transformers));
        }
        return new ReconciliationPlan(true, mappings, declared(spec),
                target == null ? null : target.constraints(),
                target == null ? List.of() : target.tables(),
                codeSets == null ? List.of() : codeSets);
    }

    /**
     * mapping 이 선언한 참조 — {@code verify.references}, fkRef(자식 컬럼 → 부모 매핑의 대상 키 컬럼), foreignKeys(자식
     * 구성요소 → 부모 identity 구성요소). 부모 매핑은 실행기와 같이 {@link MappingIndex#parent} 로 푼다. 형식이 맞지 않는
     * 선언은 검증기가 거부하므로 여기서는 건너뛴다.
     */
    public static List<DeclaredReference> declared(MappingSpec spec) {
        Objects.requireNonNull(spec, "spec");
        MappingIndex index = MappingIndex.of(spec.tables());
        List<DeclaredReference> references = new ArrayList<>();
        for (TableMapping table : spec.tables()) {
            if (table == null || blank(table.target())) {
                continue;
            }
            String child = table.target().trim();
            if (table.verify() != null) {
                for (VerifyReference reference : table.verify().references()) {
                    if (reference == null || blank(reference.parent())) {
                        continue;
                    }
                    add(references, child, trimmed(reference.columns()), reference.parent().trim(),
                            trimmed(reference.parentColumns()), DeclaredReference.Origin.DECLARED);
                }
            }
            for (ColumnMapping column : table.columns()) {
                if (column == null || blank(column.fkRef()) || blank(column.target())) {
                    continue;
                }
                TableMapping parent = index.parent(column.fkRef());
                String parentKey = parent == null ? null : EtlExecutor.targetIdentityColumn(parent);
                if (parent != null && !blank(parent.target()) && !blank(parentKey)) {
                    add(references, child, List.of(column.target().trim()), parent.target().trim(),
                            List.of(parentKey), DeclaredReference.Origin.FKREF);
                }
            }
            for (CompositeForeignKey foreignKey : table.foreignKeys()) {
                if (foreignKey == null) {
                    continue;
                }
                TableMapping parent = index.parent(foreignKey.parentSource());
                if (parent == null || parent.identity() == null || blank(parent.target())) {
                    continue;
                }
                add(references, child, names(foreignKey.targetComponents()), parent.target().trim(),
                        names(parent.identity().targetComponents()), DeclaredReference.Origin.FKREF);
            }
        }
        return DeclaredReference.distinct(references);
    }

    private static MappingPlan mapping(MappingSpec spec, TableMapping table, CatalogSnapshot inventory,
                                       TargetSchemaFingerprint target, TransformerRegistry transformers) {
        TableContract contract = contract(target, table.target());
        Map<String, SourceColumnType> sourceTypes = sourceTypes(inventory, table.source());
        List<ColumnCheck> columns = new ArrayList<>();
        boolean isolates = false;
        for (ColumnMapping column : table.columns()) {
            if (column == null || blank(column.target())) {
                continue;
            }
            isolates |= column.isolate() != null;
            columns.add(ColumnClassifier.classify(facts(spec, table, column, sourceTypes, inventory, contract,
                    transformers)));
        }
        TableMetadata metadata = metadata(target, table.target());
        List<String> primaryKey = metadata == null ? List.of()
                : metadata.primaryKey().columns().stream().map(PrimaryKeyColumn::name).toList();
        boolean generatedIdentity = table.identity() != null
                && table.identity().policy() == TargetIdentityPolicy.TARGET_GENERATED;
        boolean preservedKey = table.idStrategy() == null
                && (table.identity() == null || table.identity().policy() == TargetIdentityPolicy.PRESERVE);
        return new MappingPlan(MappingIndex.label(table), table.source(), table.id(), table.where(), table.target(),
                columns, primaryKey, preservedKey, isolates, generatedIdentity);
    }

    private static ColumnFacts facts(MappingSpec spec, TableMapping table, ColumnMapping column,
                                     Map<String, SourceColumnType> sourceTypes, CatalogSnapshot inventory,
                                     TableContract contract, TransformerRegistry transformers) {
        Origin origin;
        String sourceColumn = null;
        String lookupAlias = null;
        boolean atMostOne = false;
        SourceColumnType sourceType = null;
        LookupRef reference = LookupRef.parse(column.source());
        if (column.constant() != null) {
            origin = Origin.CONSTANT;
        } else if (blank(column.source())) {
            origin = Origin.NONE;
        } else if (reference != null) {
            origin = Origin.LOOKUP;
            lookupAlias = reference.alias();
            Lookup lookup = table.lookup(reference.alias());
            atMostOne = lookup != null && lookup.cardinality() == LookupCardinality.AT_MOST_ONE;
            if (lookup != null && reference.column() != null) {
                sourceType = sourceTypes(inventory, lookup.source()).get(lower(reference.column()));
            }
        } else {
            origin = Origin.SOURCE;
            sourceColumn = column.source().trim();
            sourceType = sourceTypes.get(lower(sourceColumn));
        }
        String codemapName = blank(column.codemap()) ? null : column.codemap();
        CodeMap codemap = codemapName == null ? null : spec.codemaps().get(codemapName);
        return new ColumnFacts(column.target().trim(), origin, sourceColumn, column.constant(), lookupAlias, atMostOne,
                column.encrypt() != null, !blank(column.fkRef()) || foreignKeyTarget(table, column.target()),
                generated(table, column.target()), sourceType, column.transform(),
                transformKind(column.transform(), transformers), codemapName,
                codemap != null && codemap.nullAs() == NullPolicy.FALLBACK, column.type(), !column.nullify().isEmpty(),
                contract == null ? null : contract.column(column.target().trim()));
    }

    private static TransformKind transformKind(String transform, TransformerRegistry transformers) {
        if (blank(transform)) {
            return TransformKind.NONE;
        }
        if (transformers.isDomain(transform)) {
            return TransformKind.DOMAIN;
        }
        return transformers.isBuiltin(transform) ? TransformKind.BUILTIN : TransformKind.CUSTOM;
    }

    /** 대상 컬럼을 실행기가 만드는가 — idStrategy 의 대상 컬럼, 대상이 키를 만드는 identity 의 구성요소. */
    private static boolean generated(TableMapping table, String target) {
        if (table.idStrategy() != null && target.equalsIgnoreCase(String.valueOf(table.idStrategy().column()))) {
            return true;
        }
        if (table.identity() != null && table.identity().policy() == TargetIdentityPolicy.TARGET_GENERATED) {
            return table.identity().targetComponents().stream()
                    .anyMatch(component -> component.column().equalsIgnoreCase(target));
        }
        return false;
    }

    /** foreignKeys 의 자식 구성요소 컬럼인가 — 부모 keymap 이 값을 바꿔 쓴다. */
    private static boolean foreignKeyTarget(TableMapping table, String target) {
        for (CompositeForeignKey foreignKey : table.foreignKeys()) {
            if (foreignKey != null && foreignKey.targetComponents().stream()
                    .anyMatch(component -> component.column().equalsIgnoreCase(target))) {
                return true;
            }
        }
        return false;
    }

    /** inventory 표의 컬럼 타입(소문자 이름). 표를 찾지 못하거나 판정할 수 없으면 빈 맵이다. */
    private static Map<String, SourceColumnType> sourceTypes(CatalogSnapshot inventory, String source) {
        Map<String, SourceColumnType> types = new HashMap<>();
        if (inventory == null || blank(source)) {
            return types;
        }
        InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, source.trim());
        if (!resolution.resolved()) {
            return types;
        }
        for (CatalogObject column : InventoryTables.columns(inventory, resolution.table()).columns()) {
            String name = InventoryTables.columnName(column);
            Integer jdbcType = integer(column.attributes().get("jdbcType"));
            if (name == null || jdbcType == null) {
                continue;
            }
            Long size = longValue(column.attributes().get("size"));
            types.put(lower(name), new SourceColumnType(jdbcType, column.attributes().get("nativeType"), size,
                    integer(column.attributes().get("scale"))));
        }
        return types;
    }

    private static TableContract contract(TargetSchemaFingerprint target, String qualified) {
        if (target == null || target.standard() == null) {
            return null;
        }
        String[] parts = qualified.trim().split("\\.", -1);
        if (parts.length != 2) {
            return null;
        }
        return target.standard().table(parts[0], parts[1]);
    }

    private static TableMetadata metadata(TargetSchemaFingerprint target, String qualified) {
        if (target == null) {
            return null;
        }
        String[] parts = qualified.trim().split("\\.", -1);
        String schema = parts.length > 1 ? parts[parts.length - 2] : null;
        String name = parts[parts.length - 1];
        TableMetadata found = null;
        for (TableMetadata table : target.tables()) {
            if (table.name().equalsIgnoreCase(name)
                    && (schema == null || (table.schema() != null && table.schema().equalsIgnoreCase(schema)))) {
                if (found != null) {
                    return null;
                }
                found = table;
            }
        }
        return found;
    }

    private static void add(List<DeclaredReference> references, String child, List<String> childColumns,
                            String parent, List<String> parentColumns, DeclaredReference.Origin origin) {
        try {
            references.add(new DeclaredReference(child, childColumns, parent, parentColumns, origin));
        } catch (IllegalArgumentException | NullPointerException malformed) {
            // 형식이 맞지 않는 선언은 검증기가 거부한다.
        }
    }

    private static List<String> trimmed(List<String> names) {
        List<String> trimmed = new ArrayList<>(names.size());
        for (String name : names) {
            trimmed.add(name == null ? null : name.trim());
        }
        return trimmed;
    }

    private static List<String> names(List<IdentityComponentSpec> components) {
        return components.stream().map(IdentityComponentSpec::column).toList();
    }

    private static Integer integer(String value) {
        try {
            return value == null ? null : Integer.valueOf(value.trim());
        } catch (NumberFormatException unreadable) {
            return null;
        }
    }

    private static Long longValue(String value) {
        try {
            return value == null ? null : Long.valueOf(value.trim());
        } catch (NumberFormatException unreadable) {
            return null;
        }
    }

    private static String lower(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
