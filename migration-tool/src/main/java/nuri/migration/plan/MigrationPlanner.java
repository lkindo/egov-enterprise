package nuri.migration.plan;

import nuri.migration.artifact.CatalogSnapshotDigester;
import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.InventoryTables;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
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
        Map<String, TableMapping> resolvedMappings = resolveMappings(
                snapshot.objects(), mapping.tables(), plannerBlockers);
        List<MigrationObjectPlan> objectPlans = snapshot.objects().stream()
                .map(object -> planObject(object, resolvedMappings.get(object.stableId()), decisions.get(object.stableId())))
                .toList();
        objectPlans.stream()
                .filter(MigrationObjectPlan::dataMappingPresent)
                .filter(object -> object.disposition() != ObjectDisposition.AUTO_DATA_LOAD)
                .forEach(object -> plannerBlockers.add(
                        "MappingSpec 데이터 매핑과 disposition 충돌: " + object.sourceObjectId()));
        // [ADR-0029 L3e] 덤프만 하는 표는 적재하지 않고 보관만 한다 — 검토자가 EXPORT_ONLY 로 명시해야 한다.
        Set<String> dumpOnly = resolveDumpOnlyTables(snapshot.objects(), mapping, resolvedMappings, plannerBlockers);
        objectPlans.stream()
                .filter(object -> dumpOnly.contains(object.sourceObjectId()))
                .filter(object -> object.disposition() != ObjectDisposition.EXPORT_ONLY || !object.reviewed())
                .forEach(object -> plannerBlockers.add(
                        "보관만 하는 표는 review 에서 EXPORT_ONLY 로 정해야 합니다: " + object.sourceObjectId()));

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

    private static Map<String, TableMapping> resolveMappings(
            List<CatalogObject> objects,
            List<TableMapping> mappings,
            List<String> blockers) {
        List<CatalogObject> tables = objects.stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .toList();
        Map<String, TableMapping> resolved = new HashMap<>();

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
            TableMapping previous = resolved.putIfAbsent(table.stableId(), mapping);
            if (previous != null) {
                blockers.add("한 inventory 테이블에 MappingSpec 매핑이 중복됨: " + table.stableId());
            }
        }
        return Map.copyOf(resolved);
    }

    /**
     * 보관 선언의 소스 표 가운데 표 매핑이 읽지 않는 표(덤프만 하는 표)의 inventory stableId. 표를 찾지 못하거나 모호하면
     * blocker 다. 매핑된 표인지는 inventory 의 같은 표로 정한다 — 표기만 다른 선언은 원장 coverage 가 따로 막는다.
     */
    private static Set<String> resolveDumpOnlyTables(
            List<CatalogObject> objects,
            MappingSpec mapping,
            Map<String, TableMapping> resolvedMappings,
            List<String> blockers) {
        List<CatalogObject> tables = objects.stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .toList();
        Set<String> dumpOnly = new HashSet<>();
        for (MappingSpec.ArchiveDump archive : mapping.archives()) {
            if (archive == null || archive.source() == null || archive.source().isBlank()) {
                blockers.add("MappingSpec 보관 선언 소스 테이블 미지정");
                continue;
            }
            List<CatalogObject> matches = tables.stream()
                    .filter(table -> InventoryTables.matches(archive.source(), table))
                    .toList();
            if (matches.size() != 1) {
                blockers.add((matches.isEmpty()
                        ? "MappingSpec 보관 선언 소스 테이블을 inventory에서 찾을 수 없음: "
                        : "MappingSpec 보관 선언 소스 테이블이 inventory에서 모호함: ") + archive.source());
                continue;
            }
            String id = matches.getFirst().stableId();
            if (!resolvedMappings.containsKey(id)) {
                dumpOnly.add(id);
            }
        }
        return dumpOnly;
    }

    private static MigrationObjectPlan planObject(
            CatalogObject object,
            TableMapping tableMapping,
            DispositionDecision decision) {
        if (decision != null) {
            boolean automatic = decision.disposition() == ObjectDisposition.AUTO_DATA_LOAD;
            String target = decision.targetObject();
            if (target == null && automatic && tableMapping != null) {
                target = tableMapping.target();
            }
            return new MigrationObjectPlan(
                    object.stableId(),
                    object.kind(),
                    object.qualifiedName(),
                    decision.disposition(),
                    target,
                    decision.reviewed(),
                    automatic,
                    tableMapping != null,
                    decision.rationale());
        }

        if (object.kind() == ObjectKind.TABLE && tableMapping != null) {
            return new MigrationObjectPlan(
                    object.stableId(),
                    object.kind(),
                    object.qualifiedName(),
                    ObjectDisposition.AUTO_DATA_LOAD,
                    tableMapping.target(),
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
