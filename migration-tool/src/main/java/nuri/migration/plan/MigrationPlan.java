package nuri.migration.plan;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** discovery inventory에 결속된 불변·versioned 마이그레이션 계획. */
public record MigrationPlan(
        int schemaVersion,
        String sourceInventoryDigest,
        String targetSchemaDigest,
        String mappingDigest,
        String executionContractDigest,
        String sourceProduct,
        List<MigrationObjectPlan> objects,
        PlanCoverage coverage,
        PlanReadiness readiness) {

    public static final int CURRENT_SCHEMA_VERSION = 3;
    public static final String LEGACY_UNBOUND_MAPPING_DIGEST = "legacy-unbound";
    public static final String LEGACY_UNBOUND_EXECUTION_CONTRACT_DIGEST = "0".repeat(64);

    /** schema v2 Java source compatibility. 승인 workflow에서는 v3만 허용한다. */
    public MigrationPlan(
            int schemaVersion,
            String sourceInventoryDigest,
            String targetSchemaDigest,
            String mappingDigest,
            String sourceProduct,
            List<MigrationObjectPlan> objects,
            PlanCoverage coverage,
            PlanReadiness readiness
    ) {
        this(schemaVersion, sourceInventoryDigest, targetSchemaDigest, mappingDigest,
                LEGACY_UNBOUND_EXECUTION_CONTRACT_DIGEST,
                sourceProduct, objects, coverage, readiness);
    }

    /** schema v1 Java fixture/source compatibility. 승인 workflow에서는 v3만 허용한다. */
    public MigrationPlan(
            int schemaVersion,
            String sourceInventoryDigest,
            String targetSchemaDigest,
            String sourceProduct,
            List<MigrationObjectPlan> objects,
            PlanCoverage coverage,
            PlanReadiness readiness
    ) {
        this(schemaVersion, sourceInventoryDigest, targetSchemaDigest,
                LEGACY_UNBOUND_MAPPING_DIGEST, LEGACY_UNBOUND_EXECUTION_CONTRACT_DIGEST,
                sourceProduct, objects, coverage, readiness);
    }

    public MigrationPlan {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be positive");
        }
        sourceInventoryDigest = requireText(sourceInventoryDigest, "sourceInventoryDigest");
        targetSchemaDigest = requireText(targetSchemaDigest, "targetSchemaDigest");
        mappingDigest = requireText(mappingDigest, "mappingDigest");
        executionContractDigest = requireText(executionContractDigest, "executionContractDigest");
        if (schemaVersion >= CURRENT_SCHEMA_VERSION
                && !executionContractDigest.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException(
                    "executionContractDigest must be a lowercase SHA-256 digest");
        }
        sourceProduct = requireText(sourceProduct, "sourceProduct");
        objects = Objects.requireNonNull(objects, "objects").stream()
                .map(object -> Objects.requireNonNull(object, "object"))
                .sorted(Comparator.comparing(MigrationObjectPlan::sourceObjectId))
                .toList();
        coverage = Objects.requireNonNull(coverage, "coverage");
        readiness = Objects.requireNonNull(readiness, "readiness");
    }

    public boolean executable() {
        return readiness.executable();
    }

    public boolean commitReady() {
        return readiness.commitReady();
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }
}
