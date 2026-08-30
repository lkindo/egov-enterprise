package nuri.migration.artifact;

import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.model.MappingSpec.DbConfig;

import java.util.Objects;

/** CatalogSnapshot을 raw DDL 없는 canonical JSON envelope로 write/read한다. */
public final class CatalogSnapshotArtifactCodec {

    public static final int CURRENT_ENVELOPE_VERSION = 4;
    public static final String ARTIFACT_TYPE = "catalog-inventory";
    public static final String DIGEST_ALGORITHM = "SHA-256";

    public String write(CatalogSnapshot snapshot) {
        return write(snapshot, SourceDriverEvidence.unbound(),
                DiscoveryScope.unbound(DiscoveryRequest.allUserObjects()));
    }

    public String write(CatalogSnapshot snapshot, SourceDriverEvidence sourceDriverEvidence) {
        return write(snapshot, sourceDriverEvidence,
                DiscoveryScope.unbound(DiscoveryRequest.allUserObjects()));
    }

    public String write(
            CatalogSnapshot snapshot,
            SourceDriverEvidence sourceDriverEvidence,
            DiscoveryScope discoveryScope
    ) {
        return write(snapshot, sourceDriverEvidence, discoveryScope, SourceEndpointBinding.unbound());
    }

    public String write(
            CatalogSnapshot snapshot,
            SourceDriverEvidence sourceDriverEvidence,
            DiscoveryScope discoveryScope,
            DbConfig sourceEndpoint
    ) {
        return write(snapshot, sourceDriverEvidence, discoveryScope,
                SourceEndpointBinding.capture(sourceEndpoint));
    }

    private String write(
            CatalogSnapshot snapshot,
            SourceDriverEvidence sourceDriverEvidence,
            DiscoveryScope discoveryScope,
            SourceEndpointBinding sourceEndpointBinding
    ) {
        CatalogSnapshotArtifactPayload payload = CatalogSnapshotArtifactPayload.from(
                Objects.requireNonNull(snapshot, "snapshot"));
        Objects.requireNonNull(sourceDriverEvidence, "sourceDriverEvidence");
        Objects.requireNonNull(discoveryScope, "discoveryScope");
        Objects.requireNonNull(sourceEndpointBinding, "sourceEndpointBinding");
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(payload));
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(sourceDriverEvidence));
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(discoveryScope));
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(sourceEndpointBinding));
        byte[] payloadBytes = CanonicalJsonSupport.bytes(payload);
        CatalogSnapshot sanitized = payload.toSnapshot();
        CatalogSnapshotArtifactEnvelope envelope = new CatalogSnapshotArtifactEnvelope(
                CURRENT_ENVELOPE_VERSION,
                ARTIFACT_TYPE,
                DIGEST_ALGORITHM,
                CanonicalSha256.digest(payloadBytes),
                semanticDigest(sanitized, sourceDriverEvidence, discoveryScope, sourceEndpointBinding),
                sourceEndpointBinding,
                sourceDriverEvidence,
                discoveryScope,
                payload);
        return CanonicalJsonSupport.string(envelope);
    }

    public CatalogSnapshot read(String artifact) {
        return readEnvelope(artifact).payload().toSnapshot();
    }

    public CatalogSnapshotArtifactEnvelope readEnvelope(String artifact) {
        CatalogSnapshotArtifactEnvelope envelope = CanonicalJsonSupport.read(
                Objects.requireNonNull(artifact, "artifact"),
                CatalogSnapshotArtifactEnvelope.class);
        validateEnvelope(envelope);
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(envelope.payload()));
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(envelope.sourceEndpointBinding()));
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(envelope.sourceDriverEvidence()));
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(envelope.discoveryScope()));
        String actualPayloadDigest = CanonicalSha256.digest(CanonicalJsonSupport.bytes(envelope.payload()));
        if (!CanonicalSha256.equalsHex(envelope.payloadDigest(), actualPayloadDigest)) {
            throw new IllegalArgumentException("catalog inventory artifact payload digest 불일치");
        }
        String actualSemanticDigest = semanticDigest(
                envelope.payload().toSnapshot(),
                envelope.sourceDriverEvidence(),
                envelope.discoveryScope(),
                envelope.sourceEndpointBinding());
        if (!CanonicalSha256.equalsHex(envelope.semanticDigest(), actualSemanticDigest)) {
            throw new IllegalArgumentException("catalog inventory artifact semantic digest 불일치");
        }
        return envelope;
    }

    private static String semanticDigest(
            CatalogSnapshot snapshot,
            SourceDriverEvidence sourceDriverEvidence,
            DiscoveryScope discoveryScope,
            SourceEndpointBinding sourceEndpointBinding
    ) {
        String inventoryDigest = sourceDriverEvidence.bound()
                ? CatalogSnapshotDigester.sha256(snapshot, sourceDriverEvidence, discoveryScope)
                : CatalogSnapshotDigester.sha256(snapshot, discoveryScope);
        return sourceEndpointBinding.bound()
                ? CatalogSnapshotDigester.bindSourceEndpoint(inventoryDigest, sourceEndpointBinding)
                : inventoryDigest;
    }

    private static void validateEnvelope(CatalogSnapshotArtifactEnvelope envelope) {
        if (envelope.schemaVersion() != CURRENT_ENVELOPE_VERSION) {
            throw new IllegalArgumentException("지원하지 않는 catalog inventory envelope version: "
                    + envelope.schemaVersion());
        }
        if (!ARTIFACT_TYPE.equals(envelope.artifactType())) {
            throw new IllegalArgumentException("잘못된 artifact type: " + envelope.artifactType());
        }
        if (!DIGEST_ALGORITHM.equals(envelope.digestAlgorithm())) {
            throw new IllegalArgumentException("지원하지 않는 digest algorithm: "
                    + envelope.digestAlgorithm());
        }
        if (envelope.discoveryScope().schemaVersion() != DiscoveryScope.CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("지원하지 않는 discovery scope schema version: "
                    + envelope.discoveryScope().schemaVersion());
        }
        if (envelope.sourceEndpointBinding().schemaVersion()
                != SourceEndpointBinding.CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("지원하지 않는 source endpoint binding schema version: "
                    + envelope.sourceEndpointBinding().schemaVersion());
        }
        if (envelope.payload().snapshotSchemaVersion() != CatalogSnapshot.CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("지원하지 않는 catalog snapshot schema version: "
                    + envelope.payload().snapshotSchemaVersion());
        }
    }
}
