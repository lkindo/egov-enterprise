package nuri.migration.workflow;

import nuri.migration.plan.DispositionDecision;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.regex.Pattern;

/** 사람이 승인한 disposition을 inventory/target/mapping 세 digest에 결속한 strict YAML 모델. */
public record WorkflowReview(
        int schemaVersion,
        String sourceInventoryDigest,
        String targetSchemaDigest,
        String mappingDigest,
        String executionContractDigest,
        Map<String, DispositionDecision> decisions
) {

    public static final int CURRENT_SCHEMA_VERSION = 2;
    private static final Pattern SHA256 = Pattern.compile("[0-9a-f]{64}");
    private static final Pattern STABLE_ID = Pattern.compile("urn:migration-object:sha256:[0-9a-f]{64}");

    public WorkflowReview {
        if (schemaVersion != CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("unsupported workflow review schema version");
        }
        sourceInventoryDigest = requireDigest(sourceInventoryDigest, "sourceInventoryDigest");
        targetSchemaDigest = requireDigest(targetSchemaDigest, "targetSchemaDigest");
        mappingDigest = requireDigest(mappingDigest, "mappingDigest");
        executionContractDigest = requireDigest(
                executionContractDigest, "executionContractDigest");
        TreeMap<String, DispositionDecision> sorted = new TreeMap<>();
        Objects.requireNonNull(decisions, "decisions").forEach((objectId, decision) -> {
            if (objectId == null || !STABLE_ID.matcher(objectId).matches()) {
                throw new IllegalArgumentException("review decision key must be a CatalogObject stableId");
            }
            sorted.put(objectId, Objects.requireNonNull(decision, "decision"));
        });
        decisions = Collections.unmodifiableMap(new LinkedHashMap<>(sorted));
    }

    public void requireBindings(
            String sourceInventory,
            String targetSchema,
            String mapping,
            String executionContract
    ) {
        requireEqual(sourceInventoryDigest, sourceInventory, "sourceInventoryDigest");
        requireEqual(targetSchemaDigest, targetSchema, "targetSchemaDigest");
        requireEqual(mappingDigest, mapping, "mappingDigest");
        requireEqual(executionContractDigest, executionContract, "executionContractDigest");
    }

    private static String requireDigest(String value, String field) {
        if (value == null || !SHA256.matcher(value).matches()) {
            throw new IllegalArgumentException(field + " must be a lowercase SHA-256 digest");
        }
        return value;
    }

    private static void requireEqual(String expected, String actual, String field) {
        if (!expected.equals(actual)) {
            throw new IllegalArgumentException("workflow review " + field + " binding mismatch");
        }
    }
}
