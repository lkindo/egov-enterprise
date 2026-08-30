package nuri.migration.artifact;

import nuri.migration.plan.MigrationPlan;

import java.util.Objects;

/** versioned migration plan artifact의 외부 envelope. */
public record MigrationPlanArtifactEnvelope(
        int schemaVersion,
        String artifactType,
        String digestAlgorithm,
        String payloadDigest,
        MigrationPlan payload) {

    public MigrationPlanArtifactEnvelope {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be positive");
        }
        artifactType = requireText(artifactType, "artifactType");
        digestAlgorithm = requireText(digestAlgorithm, "digestAlgorithm");
        payloadDigest = requireText(payloadDigest, "payloadDigest");
        payload = Objects.requireNonNull(payload, "payload");
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }
}
