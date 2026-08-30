package nuri.migration.artifact;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.model.MappingSpec.DbConfig;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

/** 발견 시각과 원본 DDL을 제외하고 inventory 의미만 결속하는 canonical digest. */
public final class CatalogSnapshotDigester {

    private CatalogSnapshotDigester() {}

    public static String sha256(CatalogSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        SnapshotMaterial material = new SnapshotMaterial(
                snapshot.schemaVersion(),
                snapshot.database(),
                snapshot.environment(),
                snapshot.snapshotCapability(),
                snapshot.objects().stream()
                        .map(CatalogSnapshotDigester::objectMaterial)
                        .sorted(Comparator.comparing(ObjectMaterial::stableId))
                        .toList(),
                snapshot.visibilityFindings().stream()
                        .map(CatalogSnapshotDigester::visibilityMaterial)
                        .sorted(Comparator.comparing(VisibilityMaterial::sortKey))
                        .toList());
        return CanonicalSha256.digest(CanonicalJsonSupport.bytes(material));
    }

    /** inventory 의미와 source driver 실행 evidence를 함께 canonical 결속한다. */
    public static String sha256(
            CatalogSnapshot snapshot,
            SourceDriverEvidence sourceDriverEvidence
    ) {
        Objects.requireNonNull(sourceDriverEvidence, "sourceDriverEvidence");
        if (!sourceDriverEvidence.bound()) {
            throw new IllegalArgumentException("bound source driver evidence가 필요합니다");
        }
        return CanonicalSha256.digest(CanonicalJsonSupport.bytes(new BoundSnapshotMaterial(
                sha256(snapshot), sourceDriverEvidence)));
    }

    /** inventory 의미와 명시된 discovery scope를 함께 결속한다. */
    public static String sha256(CatalogSnapshot snapshot, DiscoveryScope discoveryScope) {
        Objects.requireNonNull(discoveryScope, "discoveryScope");
        return CanonicalSha256.digest(CanonicalJsonSupport.bytes(new ScopedSnapshotMaterial(
                sha256(snapshot), discoveryScope)));
    }

    /** inventory·scope·source driver 실행 evidence를 하나의 semantic digest로 결속한다. */
    public static String sha256(
            CatalogSnapshot snapshot,
            SourceDriverEvidence sourceDriverEvidence,
            DiscoveryScope discoveryScope
    ) {
        Objects.requireNonNull(sourceDriverEvidence, "sourceDriverEvidence");
        if (!sourceDriverEvidence.bound()) {
            throw new IllegalArgumentException("bound source driver evidence가 필요합니다");
        }
        return CanonicalSha256.digest(CanonicalJsonSupport.bytes(new BoundSnapshotMaterial(
                sha256(snapshot, discoveryScope), sourceDriverEvidence)));
    }

    /** inventory·scope·driver·discovery source endpoint를 함께 결속한다. */
    public static String sha256(
            CatalogSnapshot snapshot,
            SourceDriverEvidence sourceDriverEvidence,
            DiscoveryScope discoveryScope,
            DbConfig sourceEndpoint
    ) {
        return bindSourceEndpoint(
                sha256(snapshot, sourceDriverEvidence, discoveryScope),
                SourceEndpointBinding.capture(sourceEndpoint));
    }

    static String bindSourceEndpoint(
            String inventorySemanticDigest,
            SourceEndpointBinding sourceEndpointBinding
    ) {
        Objects.requireNonNull(inventorySemanticDigest, "inventorySemanticDigest");
        Objects.requireNonNull(sourceEndpointBinding, "sourceEndpointBinding");
        if (!sourceEndpointBinding.bound()) {
            throw new IllegalArgumentException("bound source endpoint가 필요합니다");
        }
        return CanonicalSha256.digest(CanonicalJsonSupport.bytes(new EndpointBoundSnapshotMaterial(
                inventorySemanticDigest, sourceEndpointBinding)));
    }

    private static ObjectMaterial objectMaterial(CatalogObject object) {
        String definitionHash = object.definitionHash();
        if (definitionHash == null && object.nativeDefinition() != null) {
            definitionHash = CatalogObject.definitionHash(object.nativeDefinition());
        }
        Map<String, String> attributes = new TreeMap<>(object.attributes());
        List<String> dependencies = object.dependencies().stream()
                .map(CatalogObject.ObjectReference::stableId)
                .sorted()
                .toList();
        return new ObjectMaterial(
                object.stableId(),
                object.kind().name(),
                object.catalog(),
                object.schema(),
                object.name(),
                object.quoted(),
                definitionHash,
                dependencies,
                attributes);
    }

    private static VisibilityMaterial visibilityMaterial(VisibilityFinding finding) {
        return new VisibilityMaterial(
                finding.status().name(),
                finding.objectKind().name(),
                finding.catalog(),
                finding.schema(),
                finding.operation(),
                finding.message(),
                finding.sqlState());
    }

    private record SnapshotMaterial(
            int schemaVersion,
            CatalogSnapshot.DatabaseInfo database,
            CatalogSnapshot.EnvironmentInfo environment,
            nuri.migration.discovery.SnapshotCapability snapshotCapability,
            List<ObjectMaterial> objects,
            List<VisibilityMaterial> visibilityFindings) {}

    private record BoundSnapshotMaterial(
            String snapshotSemanticDigest,
            SourceDriverEvidence sourceDriverEvidence) {}

    private record ScopedSnapshotMaterial(
            String snapshotSemanticDigest,
            DiscoveryScope discoveryScope) {}

    private record EndpointBoundSnapshotMaterial(
            String inventorySemanticDigest,
            SourceEndpointBinding sourceEndpointBinding) {}

    private record ObjectMaterial(
            String stableId,
            String kind,
            String catalog,
            String schema,
            String name,
            boolean quoted,
            String definitionHash,
            List<String> dependencies,
            Map<String, String> attributes) {}

    private record VisibilityMaterial(
            String status,
            String objectKind,
            String catalog,
            String schema,
            String operation,
            String message,
            String sqlState) {

        String sortKey() {
            return String.join("\u0000",
                    nullSafe(status),
                    nullSafe(objectKind),
                    nullSafe(catalog),
                    nullSafe(schema),
                    nullSafe(operation),
                    nullSafe(sqlState),
                    nullSafe(message));
        }

        private static String nullSafe(String value) {
            return value == null ? "" : value;
        }
    }
}
