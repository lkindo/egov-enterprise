package nuri.migration.artifact;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;
import org.junit.jupiter.api.Test;

import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ArtifactRecordValidationTest {

    @Test
    void catalogPayloadRejectsMalformedClockMissingEvidenceAndNullCollectionElements() {
        CatalogSnapshot.DatabaseInfo database = database();
        CatalogSnapshot.EnvironmentInfo environment = environment();
        SnapshotCapability capability = SnapshotCapability.unknown();

        assertThatThrownBy(() -> payload(0, "2026-08-30T00:00:00Z", database, environment,
                capability, List.of(), List.of()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("positive");
        assertThatThrownBy(() -> payload(1, " ", database, environment,
                capability, List.of(), List.of()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("discoveredAt");
        assertThatThrownBy(() -> payload(1, "not-an-instant", database, environment,
                capability, List.of(), List.of()))
                .isInstanceOf(DateTimeParseException.class);
        assertThatThrownBy(() -> payload(1, "2026-08-30T00:00:00Z", null, environment,
                capability, List.of(), List.of())).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> payload(1, "2026-08-30T00:00:00Z", database, null,
                capability, List.of(), List.of())).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> payload(1, "2026-08-30T00:00:00Z", database, environment,
                null, List.of(), List.of())).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> payload(1, "2026-08-30T00:00:00Z", database, environment,
                capability, null, List.of())).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> payload(1, "2026-08-30T00:00:00Z", database, environment,
                capability, List.of(), null)).isInstanceOf(NullPointerException.class);

        List<CatalogSnapshotArtifactPayload.SafeCatalogObject> objects = new ArrayList<>();
        objects.add(null);
        assertThatThrownBy(() -> payload(1, "2026-08-30T00:00:00Z", database, environment,
                capability, objects, List.of())).isInstanceOf(NullPointerException.class)
                .hasMessageContaining("object");
        List<VisibilityFinding> findings = new ArrayList<>();
        findings.add(null);
        assertThatThrownBy(() -> payload(1, "2026-08-30T00:00:00Z", database, environment,
                capability, List.of(), findings)).isInstanceOf(NullPointerException.class)
                .hasMessageContaining("visibilityFinding");
    }

    @Test
    void safeCatalogObjectRejectsMissingIdentityDependenciesAndAttributes() {
        CatalogSnapshotArtifactPayload.SafeCatalogObject valid = safeObject(
                ObjectKind.TABLE, "orders", List.of(), Map.of("z", "2", "a", "1"));

        assertThat(valid.attributes().keySet()).containsExactly("a", "z");
        assertThatThrownBy(() -> valid.attributes().put("b", "3"))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> safeObject(null, "orders", List.of(), Map.of()))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> safeObject(ObjectKind.TABLE, " ", List.of(), Map.of()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("name");
        assertThatThrownBy(() -> safeObject(ObjectKind.TABLE, "orders", null, Map.of()))
                .isInstanceOf(NullPointerException.class);
        List<CatalogObject.ObjectReference> dependencies = new ArrayList<>();
        dependencies.add(null);
        assertThatThrownBy(() -> safeObject(ObjectKind.TABLE, "orders", dependencies, Map.of()))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("dependency");
        assertThatThrownBy(() -> safeObject(ObjectKind.TABLE, "orders", List.of(), null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void catalogEnvelopeRejectsBlankContractFieldsAndMissingBoundRecords() {
        CatalogSnapshotArtifactPayload payload = payload(
                1, "2026-08-30T00:00:00Z", database(), environment(),
                SnapshotCapability.unknown(), List.of(), List.of());
        SourceDriverEvidence evidence = SourceDriverEvidence.bundled("org.example.Driver");
        DiscoveryScope scope = DiscoveryScope.unbound(new DiscoveryRequest(
                Set.of(), Set.of(), Set.of(), false));

        CatalogSnapshotArtifactEnvelope valid = envelope(
                1, "catalog-inventory", "SHA-256", "a".repeat(64), "b".repeat(64),
                evidence, scope, payload);
        assertThat(valid.payload()).isSameAs(payload);
        assertThatThrownBy(() -> envelope(
                0, "catalog-inventory", "SHA-256", "a", "b", evidence, scope, payload))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("positive");
        for (int blankField = 0; blankField < 4; blankField++) {
            String artifactType = blankField == 0 ? " " : "catalog-inventory";
            String algorithm = blankField == 1 ? null : "SHA-256";
            String payloadDigest = blankField == 2 ? "" : "a".repeat(64);
            String semanticDigest = blankField == 3 ? "\t" : "b".repeat(64);
            assertThatThrownBy(() -> envelope(
                    1, artifactType, algorithm, payloadDigest, semanticDigest,
                    evidence, scope, payload)).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> envelope(
                1, "catalog-inventory", "SHA-256", "a", "b", null, scope, payload))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> envelope(
                1, "catalog-inventory", "SHA-256", "a", "b", evidence, null, payload))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> envelope(
                1, "catalog-inventory", "SHA-256", "a", "b", evidence, scope, null))
                .isInstanceOf(NullPointerException.class);
    }

    private static CatalogSnapshotArtifactPayload payload(
            int schemaVersion,
            String discoveredAt,
            CatalogSnapshot.DatabaseInfo database,
            CatalogSnapshot.EnvironmentInfo environment,
            SnapshotCapability capability,
            List<CatalogSnapshotArtifactPayload.SafeCatalogObject> objects,
            List<VisibilityFinding> findings) {
        return new CatalogSnapshotArtifactPayload(
                schemaVersion, discoveredAt, database, environment, capability, objects, findings);
    }

    private static CatalogSnapshotArtifactPayload.SafeCatalogObject safeObject(
            ObjectKind kind,
            String name,
            List<CatalogObject.ObjectReference> dependencies,
            Map<String, String> attributes) {
        return new CatalogSnapshotArtifactPayload.SafeCatalogObject(
                kind, "legacy", "app", name, false, null, dependencies, attributes);
    }

    private static CatalogSnapshotArtifactEnvelope envelope(
            int schemaVersion,
            String artifactType,
            String algorithm,
            String payloadDigest,
            String semanticDigest,
            SourceDriverEvidence evidence,
            DiscoveryScope scope,
            CatalogSnapshotArtifactPayload payload) {
        return new CatalogSnapshotArtifactEnvelope(
                schemaVersion, artifactType, algorithm, payloadDigest, semanticDigest,
                evidence, scope, payload);
    }

    private static CatalogSnapshot.DatabaseInfo database() {
        return new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "pgjdbc", "42");
    }

    private static CatalogSnapshot.EnvironmentInfo environment() {
        return new CatalogSnapshot.EnvironmentInfo("legacy", "app", "UTF-8", "C", "UTC");
    }
}
