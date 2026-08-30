package nuri.migration.plan;

import nuri.migration.artifact.CatalogSnapshotDigester;
import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.TableMapping;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
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
            List<CatalogObject> matches = tables.stream()
                    .filter(table -> matches(mapping.source(), table))
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

    private static boolean matches(String declaredSource, CatalogObject table) {
        String[] parts = declaredSource.trim().split("\\.", -1);
        if (parts.length < 1 || parts.length > 3) {
            return false;
        }
        boolean caseSensitive = table.quoted();
        if (parts.length == 1) {
            return identifierEquals(parts[0], table.name(), caseSensitive);
        }
        if (parts.length == 2) {
            return identifierEquals(parts[0], table.schema(), caseSensitive)
                    && identifierEquals(parts[1], table.name(), caseSensitive);
        }
        return identifierEquals(parts[0], table.catalog(), caseSensitive)
                && identifierEquals(parts[1], table.schema(), caseSensitive)
                && identifierEquals(parts[2], table.name(), caseSensitive);
    }

    private static boolean identifierEquals(String declared, String actual, boolean caseSensitive) {
        if (actual == null) {
            return false;
        }
        return caseSensitive
                ? declared.equals(actual)
                : declared.toLowerCase(Locale.ROOT).equals(actual.toLowerCase(Locale.ROOT));
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
