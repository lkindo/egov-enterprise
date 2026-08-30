package nuri.migration.artifact;

import nuri.migration.discovery.DiscoveryScope;

import java.util.Objects;

/** catalog inventory payload의 version·무결성·semantic identity envelope. */
public record CatalogSnapshotArtifactEnvelope(
        int schemaVersion,
        String artifactType,
        String digestAlgorithm,
        String payloadDigest,
        String semanticDigest,
        SourceEndpointBinding sourceEndpointBinding,
        SourceDriverEvidence sourceDriverEvidence,
        DiscoveryScope discoveryScope,
        CatalogSnapshotArtifactPayload payload) {

    public CatalogSnapshotArtifactEnvelope {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be positive");
        }
        artifactType = requireText(artifactType, "artifactType");
        digestAlgorithm = requireText(digestAlgorithm, "digestAlgorithm");
        payloadDigest = requireText(payloadDigest, "payloadDigest");
        semanticDigest = requireText(semanticDigest, "semanticDigest");
        sourceEndpointBinding = Objects.requireNonNull(
                sourceEndpointBinding, "sourceEndpointBinding");
        sourceDriverEvidence = Objects.requireNonNull(sourceDriverEvidence, "sourceDriverEvidence");
        discoveryScope = Objects.requireNonNull(discoveryScope, "discoveryScope");
        payload = Objects.requireNonNull(payload, "payload");
    }

    /** endpoint binding 도입 전 직접 생성하던 단위 테스트 호환 생성자. */
    public CatalogSnapshotArtifactEnvelope(
            int schemaVersion,
            String artifactType,
            String digestAlgorithm,
            String payloadDigest,
            String semanticDigest,
            SourceDriverEvidence sourceDriverEvidence,
            DiscoveryScope discoveryScope,
            CatalogSnapshotArtifactPayload payload
    ) {
        this(schemaVersion, artifactType, digestAlgorithm, payloadDigest, semanticDigest,
                SourceEndpointBinding.unbound(), sourceDriverEvidence, discoveryScope, payload);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }
}
