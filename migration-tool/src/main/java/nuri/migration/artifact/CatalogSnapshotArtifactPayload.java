package nuri.migration.artifact;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;

import java.time.Instant;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

/** 원본 definition을 포함하지 않는 inventory artifact payload. */
public record CatalogSnapshotArtifactPayload(
        int snapshotSchemaVersion,
        String discoveredAt,
        CatalogSnapshot.DatabaseInfo database,
        CatalogSnapshot.EnvironmentInfo environment,
        SnapshotCapability snapshotCapability,
        List<SafeCatalogObject> objects,
        List<VisibilityFinding> visibilityFindings) {

    public CatalogSnapshotArtifactPayload {
        if (snapshotSchemaVersion <= 0) {
            throw new IllegalArgumentException("snapshotSchemaVersion must be positive");
        }
        discoveredAt = requireText(discoveredAt, "discoveredAt");
        // 생성 시점에 형식을 검증해 malformed clock이 digest 경계를 통과하지 못하게 한다.
        Instant.parse(discoveredAt);
        database = Objects.requireNonNull(database, "database");
        environment = Objects.requireNonNull(environment, "environment");
        snapshotCapability = Objects.requireNonNull(snapshotCapability, "snapshotCapability");
        objects = Objects.requireNonNull(objects, "objects").stream()
                .map(object -> Objects.requireNonNull(object, "object"))
                .sorted(Comparator.comparing(SafeCatalogObject::stableId))
                .toList();
        visibilityFindings = Objects.requireNonNull(visibilityFindings, "visibilityFindings").stream()
                .map(finding -> Objects.requireNonNull(finding, "visibilityFinding"))
                .sorted(Comparator.comparing(CatalogSnapshotArtifactPayload::visibilitySortKey))
                .toList();
    }

    public static CatalogSnapshotArtifactPayload from(CatalogSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        return new CatalogSnapshotArtifactPayload(
                snapshot.schemaVersion(),
                snapshot.discoveredAt().toString(),
                snapshot.database(),
                snapshot.environment(),
                snapshot.snapshotCapability(),
                snapshot.objects().stream().map(SafeCatalogObject::from).toList(),
                snapshot.visibilityFindings());
    }

    public CatalogSnapshot toSnapshot() {
        return new CatalogSnapshot(
                snapshotSchemaVersion,
                Instant.parse(discoveredAt),
                database,
                environment,
                snapshotCapability,
                objects.stream().map(SafeCatalogObject::toCatalogObject).toList(),
                visibilityFindings);
    }

    private static String visibilitySortKey(VisibilityFinding finding) {
        return String.join("\u0000",
                finding.status().name(),
                finding.objectKind().name(),
                nullSafe(finding.catalog()),
                nullSafe(finding.schema()),
                finding.operation(),
                nullSafe(finding.sqlState()),
                finding.message());
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }

    /** nativeDefinition 필드 자체를 artifact schema에서 제거한 객체 표현. */
    public record SafeCatalogObject(
            ObjectKind kind,
            String catalog,
            String schema,
            String name,
            boolean quoted,
            String definitionHash,
            List<CatalogObject.ObjectReference> dependencies,
            Map<String, String> attributes) {

        public SafeCatalogObject {
            kind = Objects.requireNonNull(kind, "kind");
            name = requireText(name, "name");
            dependencies = Objects.requireNonNull(dependencies, "dependencies").stream()
                    .map(dependency -> Objects.requireNonNull(dependency, "dependency"))
                    .sorted(Comparator.comparing(CatalogObject.ObjectReference::stableId))
                    .toList();
            attributes = Collections.unmodifiableMap(new LinkedHashMap<>(
                    new TreeMap<>(Objects.requireNonNull(attributes, "attributes"))));
        }

        static SafeCatalogObject from(CatalogObject object) {
            String safeHash = object.definitionHash();
            if (object.nativeDefinition() != null) {
                String actualHash = CatalogObject.definitionHash(object.nativeDefinition());
                if (safeHash != null && !safeHash.equals(actualHash)) {
                    throw new IllegalArgumentException(
                            "CatalogObject native definition과 definitionHash 불일치: " + object.stableId());
                }
                safeHash = actualHash;
            }
            return new SafeCatalogObject(
                    object.kind(),
                    object.catalog(),
                    object.schema(),
                    object.name(),
                    object.quoted(),
                    safeHash,
                    object.dependencies(),
                    object.attributes());
        }

        CatalogObject toCatalogObject() {
            return new CatalogObject(
                    kind,
                    catalog,
                    schema,
                    name,
                    quoted,
                    null,
                    definitionHash,
                    dependencies,
                    attributes);
        }

        String stableId() {
            return toCatalogObject().stableId();
        }
    }
}
