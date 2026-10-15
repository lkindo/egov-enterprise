package nuri.migration.plan;

import nuri.migration.artifact.CatalogSnapshotDigester;
import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.InventoryTables;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.TableMapping;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** 전체 inventory와 MappingSpec을 결합해 검토 가능한 객체 disposition plan을 만든다. */
public final class MigrationPlanner {

    private final MigrationPlanValidator validator;

    public MigrationPlanner() {
        this(new MigrationPlanValidator());
    }

    MigrationPlanner(MigrationPlanValidator validator) {
        this.validator = Objects.requireNonNull(validator, "validator");
    }

    public MigrationPlan plan(
            CatalogSnapshot snapshot,
            MappingSpec mapping,
            Map<String, DispositionDecision> decisions,
            String targetSchemaDigest) {
        return plan(snapshot, mapping, decisions, targetSchemaDigest,
                CatalogSnapshotDigester.sha256(snapshot));
    }

    /** artifact envelope의 source driver evidence까지 결속된 inventory digest를 사용한다. */
    public MigrationPlan plan(
            CatalogSnapshot snapshot,
            MappingSpec mapping,
            Map<String, DispositionDecision> decisions,
            String targetSchemaDigest,
            String sourceInventoryDigest) {
        return plan(snapshot, mapping, decisions, targetSchemaDigest, sourceInventoryDigest,
                MigrationPlan.LEGACY_UNBOUND_EXECUTION_CONTRACT_DIGEST);
    }

    /** 승인 실행에 사용될 core/adapter/transformer contract까지 plan에 결속한다. */
    public MigrationPlan plan(
            CatalogSnapshot snapshot,
            MappingSpec mapping,
            Map<String, DispositionDecision> decisions,
            String targetSchemaDigest,
            String sourceInventoryDigest,
            String executionContractDigest) {
        Objects.requireNonNull(snapshot, "snapshot");
        Objects.requireNonNull(mapping, "mapping");
        Objects.requireNonNull(decisions, "decisions");
        if (snapshot.schemaVersion() != CatalogSnapshot.CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("지원하지 않는 catalog snapshot schema version: "
                    + snapshot.schemaVersion());
        }
        if (targetSchemaDigest == null || targetSchemaDigest.isBlank()) {
            throw new IllegalArgumentException("targetSchemaDigest must not be blank");
        }
        if (sourceInventoryDigest == null || sourceInventoryDigest.isBlank()) {
            throw new IllegalArgumentException("sourceInventoryDigest must not be blank");
        }
        if (executionContractDigest == null
                || !executionContractDigest.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException(
                    "executionContractDigest must be a lowercase SHA-256 digest");
        }

        Set<String> discoveredIds = new HashSet<>();
        snapshot.objects().forEach(object -> discoveredIds.add(object.stableId()));
        decisions.forEach((id, decision) -> {
            if (id == null || id.isBlank()) {
                throw new IllegalArgumentException("disposition 결정의 객체 ID가 비어 있습니다");
            }
            Objects.requireNonNull(decision, "disposition decision for " + id);
        });
        Set<String> unknownDecisionIds = new HashSet<>(decisions.keySet());
        unknownDecisionIds.removeAll(discoveredIds);
        if (!unknownDecisionIds.isEmpty()) {
            throw new IllegalArgumentException("inventory에 없는 객체 disposition 결정: "
                    + unknownDecisionIds.stream().sorted().toList());
        }

        List<String> plannerBlockers = new ArrayList<>();
        Map<String, List<TableMapping>> resolvedMappings = resolveMappings(
                snapshot.objects(), mapping.tables(), plannerBlockers);
        Set<String> lookedUp = resolveLookups(snapshot.objects(), mapping.tables(), plannerBlockers);
        List<MigrationObjectPlan> objectPlans = snapshot.objects().stream()
                .map(object -> planObject(object, resolvedMappings.get(object.stableId()), decisions.get(object.stableId())))
                .toList();
        objectPlans.stream()
                .filter(MigrationObjectPlan::dataMappingPresent)
                .filter(object -> object.disposition() != ObjectDisposition.AUTO_DATA_LOAD)
                .forEach(object -> plannerBlockers.add(
                        "MappingSpec 데이터 매핑과 disposition 충돌: " + object.sourceObjectId()));
        // [ADR-0029 L3d] 조회만 하는 표는 검토자가 LOOKUP_INPUT 으로 밝혀야 하고, LOOKUP_INPUT 은 실제로 조회하는 표에만 단다.
        for (MigrationObjectPlan object : objectPlans) {
            boolean lookup = object.disposition() == ObjectDisposition.LOOKUP_INPUT;
            if (lookup && !lookedUp.contains(object.sourceObjectId())) {
                plannerBlockers.add("LOOKUP_INPUT 이지만 어떤 매핑도 조회하지 않는 객체: " + object.sourceObjectId());
            } else if (!lookup && !object.dataMappingPresent() && object.disposition() != null
                    && lookedUp.contains(object.sourceObjectId())) {
                plannerBlockers.add("조회 조인이 읽는 표의 disposition 은 LOOKUP_INPUT 이어야 합니다: "
                        + object.sourceObjectId());
            }
        }

        int unclassified = Math.toIntExact(objectPlans.stream()
                .filter(object -> object.disposition() == null)
                .count());
        int automatic = Math.toIntExact(objectPlans.stream()
                .filter(object -> object.disposition() == ObjectDisposition.AUTO_DATA_LOAD)
                .count());
        // UNREADABLE뿐 아니라 UNSUPPORTED/PARTIAL/QUERY_FAILED도 전수 discovery를 증명하지 못한다.
        int unreadable = Math.toIntExact(snapshot.visibilityFindings().stream()
                .filter(finding -> finding.status() != VisibilityStatus.NOT_APPLICABLE)
                .count());
        PlanCoverage coverage = new PlanCoverage(
                snapshot.objects().size(), unreadable, unclassified, automatic);
        PlanReadiness readiness = validator.validate(objectPlans, coverage, plannerBlockers);
        String product = snapshot.database().productName() + " " + snapshot.database().productVersion();

        return new MigrationPlan(
                MigrationPlan.CURRENT_SCHEMA_VERSION,
                sourceInventoryDigest,
                targetSchemaDigest,
                MappingSpecDigester.sha256(mapping),
                executionContractDigest,
                product.trim(),
                objectPlans,
                coverage,
                readiness);
    }

    /**
     * 매핑을 inventory 표로 푼다. [ADR-0029 L3c] 한 표를 나눈 매핑은 같은 표 아래 모두 모인다. 매핑 키(inventory stableId,
     * 매핑 id)의 중복·keymap 소유 매핑 둘·같은 표를 다르게 적은 표기는 {@link MappingIndex} 와 같은 판정으로 blocker 다.
     */
    private static Map<String, List<TableMapping>> resolveMappings(
            List<CatalogObject> objects,
            List<TableMapping> mappings,
            List<String> blockers) {
        List<CatalogObject> tables = objects.stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .toList();
        Map<String, List<TableMapping>> resolved = new HashMap<>();
        Map<String, String> stableIds = new HashMap<>();

        for (TableMapping mapping : mappings) {
            if (mapping.source() == null || mapping.source().isBlank()) {
                blockers.add("MappingSpec 소스 테이블 미지정");
                continue;
            }
            // [ADR-0029 L3a-2] 생성기·원장 coverage 와 같은 규칙으로 표를 찾는다.
            List<CatalogObject> matches = tables.stream()
                    .filter(table -> InventoryTables.matches(mapping.source(), table))
                    .toList();
            if (matches.isEmpty()) {
                blockers.add("MappingSpec 소스 테이블을 inventory에서 찾을 수 없음: " + mapping.source());
                continue;
            }
            if (matches.size() > 1) {
                blockers.add("MappingSpec 소스 테이블이 inventory에서 모호함: " + mapping.source());
                continue;
            }
            CatalogObject table = matches.getFirst();
            stableIds.put(mapping.source(), table.stableId());
            resolved.computeIfAbsent(table.stableId(), ignored -> new ArrayList<>()).add(mapping);
        }
        MappingIndex index = MappingIndex.of(mappings, stableIds::get);
        index.errors().forEach(error -> blockers.add("한 inventory 테이블의 MappingSpec 매핑 판정 실패: " + error));
        Map<String, List<TableMapping>> copy = new HashMap<>();
        resolved.forEach((id, list) -> copy.put(id, List.copyOf(list)));
        return Map.copyOf(copy);
    }

    /**
     * 조회 조인(lookups)이 읽는 표를 inventory 표로 푼다(ADR-0029 L3d). 찾지 못하거나 모호하면 blocker 다. 소스 표 해석과
     * 같은 규칙({@link InventoryTables#matches})이다.
     */
    private static Set<String> resolveLookups(
            List<CatalogObject> objects,
            List<TableMapping> mappings,
            List<String> blockers) {
        List<CatalogObject> tables = objects.stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .toList();
        Set<String> lookedUp = new HashSet<>();
        for (TableMapping mapping : mappings) {
            for (MappingSpec.Lookup lookup : mapping.lookups()) {
                if (lookup == null || lookup.source() == null || lookup.source().isBlank()) {
                    blockers.add("MappingSpec 조회 표 미지정: " + MappingIndex.label(mapping));
                    continue;
                }
                List<CatalogObject> matches = tables.stream()
                        .filter(table -> InventoryTables.matches(lookup.source(), table))
                        .toList();
                if (matches.size() != 1) {
                    blockers.add((matches.isEmpty() ? "MappingSpec 조회 표를 inventory에서 찾을 수 없음: "
                            : "MappingSpec 조회 표가 inventory에서 모호함: ") + lookup.source());
                    continue;
                }
                lookedUp.add(matches.getFirst().stableId());
            }
        }
        return lookedUp;
    }

    private static MigrationObjectPlan planObject(
            CatalogObject object,
            List<TableMapping> tableMappings,
            DispositionDecision decision) {
        // [ADR-0029 L3c] 나눈 표의 대상은 정렬해 ", " 로 잇는다. plan 형식(v3)은 그대로다.
        boolean mapped = tableMappings != null && !tableMappings.isEmpty();
        List<String> targets = mapped ? tableMappings.stream().map(TableMapping::target)
                .filter(Objects::nonNull).distinct().sorted().toList() : List.of();
        String mappedTarget = targets.isEmpty() ? null : String.join(", ", targets);
        if (decision != null) {
            boolean automatic = decision.disposition() == ObjectDisposition.AUTO_DATA_LOAD;
            String target = decision.targetObject();
            if (target == null && automatic && mapped) {
                target = mappedTarget;
            }
            return new MigrationObjectPlan(
                    object.stableId(),
                    object.kind(),
                    object.qualifiedName(),
                    decision.disposition(),
                    target,
                    decision.reviewed(),
                    automatic,
                    mapped,
                    decision.rationale());
        }

        if (object.kind() == ObjectKind.TABLE && mapped) {
            return new MigrationObjectPlan(
                    object.stableId(),
                    object.kind(),
                    object.qualifiedName(),
                    ObjectDisposition.AUTO_DATA_LOAD,
                    mappedTarget,
                    true,
                    true,
                    true,
                    "MappingSpec 테이블 매핑");
        }

        ObjectDisposition conservative = conservativeDisposition(object.kind());
        return new MigrationObjectPlan(
                object.stableId(),
                object.kind(),
                object.qualifiedName(),
                conservative,
                null,
                false,
                false,
                false,
                conservative == null ? "명시적 분류 필요" : "보수적 초안 disposition - 검토 필요");
    }

    private static ObjectDisposition conservativeDisposition(ObjectKind kind) {
        return switch (kind) {
            case TABLE -> null;
            case VIEW, MATERIALIZED_VIEW -> ObjectDisposition.RECREATE_VIA_FLYWAY;
            case ROUTINE, FUNCTION, PROCEDURE, PACKAGE, PACKAGE_BODY, TRIGGER, JOB, EVENT ->
                    ObjectDisposition.REIMPLEMENT_IN_APP;
            case SYNONYM, DATABASE_LINK, FOREIGN_DATA_WRAPPER, FOREIGN_SERVER, USER_MAPPING,
                    PUBLICATION, SUBSCRIPTION, EXTERNAL_OBJECT -> ObjectDisposition.EXTERNALIZE;
            case EXTENSION, POLICY -> ObjectDisposition.RECREATE_VIA_FLYWAY;
            case GRANT, CATALOG, ROLE, USER, TABLESPACE, COLLATION, CHARACTER_SET ->
                    ObjectDisposition.EXPORT_ONLY;
            case UNKNOWN -> ObjectDisposition.BLOCKED;
            case SCHEMA, PARTITION, COLUMN, PRIMARY_KEY, UNIQUE_KEY, FOREIGN_KEY,
                    CHECK_CONSTRAINT, DEFAULT_CONSTRAINT, INDEX, SEQUENCE, IDENTITY,
                    TYPE, DOMAIN, ENUM, COMMENT -> ObjectDisposition.TARGET_OWNED;
        };
    }
}
