package nuri.migration.discovery;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** 한 번의 객체 discovery 결과. schemaVersion으로 영속 산출물 호환성을 판정한다. */
public record CatalogSnapshot(
        int schemaVersion,
        Instant discoveredAt,
        DatabaseInfo database,
        EnvironmentInfo environment,
        SnapshotCapability snapshotCapability,
        List<CatalogObject> objects,
        List<VisibilityFinding> visibilityFindings) {

    public static final int CURRENT_SCHEMA_VERSION = 1;

    public CatalogSnapshot {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be positive");
        }
        discoveredAt = Objects.requireNonNull(discoveredAt, "discoveredAt");
        database = Objects.requireNonNull(database, "database");
        environment = Objects.requireNonNull(environment, "environment");
        snapshotCapability = Objects.requireNonNull(snapshotCapability, "snapshotCapability");
        objects = List.copyOf(Objects.requireNonNull(objects, "objects"));
        visibilityFindings = List.copyOf(Objects.requireNonNull(visibilityFindings, "visibilityFindings"));
    }

    public static CatalogSnapshot of(
            DatabaseInfo database,
            List<CatalogObject> objects,
            List<VisibilityFinding> visibilityFindings) {
        return new CatalogSnapshot(
                CURRENT_SCHEMA_VERSION,
                Instant.now(),
                database,
                EnvironmentInfo.unknown(),
                SnapshotCapability.unknown(),
                objects,
                visibilityFindings);
    }

    public boolean hasBlockingVisibilityFindings() {
        return visibilityFindings.stream()
                .anyMatch(finding -> finding.status() != VisibilityStatus.NOT_APPLICABLE);
    }

    public long unreadableFindingCount() {
        return visibilityFindingCount(VisibilityStatus.UNREADABLE);
    }

    public long visibilityFindingCount(VisibilityStatus status) {
        return visibilityFindings.stream().filter(finding -> finding.status() == status).count();
    }

    public record DatabaseInfo(
            String productName,
            String productVersion,
            String driverName,
            String driverVersion) {

        public DatabaseInfo {
            productName = unknownIfBlank(productName);
            productVersion = unknownIfBlank(productVersion);
            driverName = unknownIfBlank(driverName);
            driverVersion = unknownIfBlank(driverVersion);
        }
    }

    public record EnvironmentInfo(
            String defaultCatalog,
            String defaultSchema,
            String charset,
            String collation,
            String timezone) {

        public EnvironmentInfo {
            charset = unknownIfBlank(charset);
            collation = unknownIfBlank(collation);
            timezone = unknownIfBlank(timezone);
        }

        public static EnvironmentInfo unknown() {
            return new EnvironmentInfo(null, null, "unknown", "unknown", "unknown");
        }
    }

    private static String unknownIfBlank(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }
}
