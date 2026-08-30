package nuri.migration.artifact;

import nuri.migration.adapter.PostgreSqlSourceAdapter;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CatalogInventoryScopeBindingTest {

    private final CatalogSnapshotArtifactCodec codec = new CatalogSnapshotArtifactCodec();

    @Test
    void currentEnvelopeExplicitlyBindsCanonicalDiscoveryScopeIntoTheSemanticDigest() {
        CatalogSnapshot snapshot = emptySnapshot();
        SourceDriverEvidence evidence = SourceDriverEvidence.bundled("org.postgresql.Driver");
        DiscoveryScope app = new PostgreSqlSourceAdapter().discoveryScope(new DiscoveryRequest(
                Set.of("legacy_db"), Set.of("app"), Set.of(ObjectKind.TABLE), false));
        DiscoveryScope audit = new PostgreSqlSourceAdapter().discoveryScope(new DiscoveryRequest(
                Set.of("legacy_db"), Set.of("audit"), Set.of(ObjectKind.TABLE), false));

        CatalogSnapshotArtifactEnvelope appEnvelope = codec.readEnvelope(
                codec.write(snapshot, evidence, app));
        CatalogSnapshotArtifactEnvelope auditEnvelope = codec.readEnvelope(
                codec.write(snapshot, evidence, audit));

        assertThat(CatalogSnapshotArtifactCodec.CURRENT_ENVELOPE_VERSION).isEqualTo(4);
        assertThat(appEnvelope.discoveryScope()).isEqualTo(app);
        assertThat(auditEnvelope.semanticDigest()).isNotEqualTo(appEnvelope.semanticDigest());
        assertThat(auditEnvelope.payloadDigest()).isEqualTo(appEnvelope.payloadDigest());
    }

    @Test
    void scopeTamperingAndThePreviousInventoryEnvelopeVersionAreRejected() {
        DiscoveryScope scope = new PostgreSqlSourceAdapter().discoveryScope(new DiscoveryRequest(
                Set.of(), Set.of("app"), Set.of(ObjectKind.TABLE), false));
        String artifact = codec.write(
                emptySnapshot(),
                SourceDriverEvidence.bundled("org.postgresql.Driver"),
                scope);

        String tamperedScope = artifact.replace("\"schemas\":[\"app\"]", "\"schemas\":[\"other\"]");
        assertThat(tamperedScope).isNotEqualTo(artifact);
        assertThatThrownBy(() -> codec.readEnvelope(tamperedScope))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("semantic digest");

        String previousEnvelope = artifact.replace("\"schemaVersion\":4", "\"schemaVersion\":3");
        assertThat(previousEnvelope).isNotEqualTo(artifact);
        assertThatThrownBy(() -> codec.readEnvelope(previousEnvelope))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("envelope version");
    }

    private static CatalogSnapshot emptySnapshot() {
        return new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-30T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("legacy_db", "app", "UTF8", "C", "UTC"),
                SnapshotCapability.unknown(),
                List.of(),
                List.of());
    }
}
