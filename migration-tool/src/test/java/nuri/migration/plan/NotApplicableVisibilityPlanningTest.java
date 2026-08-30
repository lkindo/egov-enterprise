package nuri.migration.plan;

import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.discovery.VisibilityStatus;
import nuri.migration.model.MappingSpec;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class NotApplicableVisibilityPlanningTest {

    @Test
    void notApplicableFindingStaysInSnapshotButIsExcludedFromIncompleteDiscoveryCount() {
        VisibilityFinding notApplicable = new VisibilityFinding(
                VisibilityStatus.NOT_APPLICABLE,
                ObjectKind.MATERIALIZED_VIEW,
                "legacy",
                "legacy",
                "mysql-not-applicable",
                "MySQL has no materialized-view object kind",
                null);
        CatalogSnapshot snapshot = new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-30T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("MySQL", "8.4", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("legacy", "legacy", "utf8mb4", "unknown", "UTC"),
                SnapshotCapability.unknown(),
                List.of(),
                List.of(notApplicable));

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot,
                new MappingSpec(null, null, List.of(), Map.of()),
                Map.of(),
                "a".repeat(64));

        assertThat(snapshot.visibilityFindings()).containsExactly(notApplicable);
        assertThat(plan.coverage().unreadable()).isZero();
        assertThat(plan.readiness().blockers())
                .noneMatch(blocker -> blocker.contains("판독 불가 또는 불완전"));
    }
}
