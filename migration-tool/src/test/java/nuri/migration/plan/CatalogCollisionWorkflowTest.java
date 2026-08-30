package nuri.migration.plan;

import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObjectRegistry;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.model.MappingSpec;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogCollisionWorkflowTest {

    @Test
    void stableIdentityCollisionSurvivesTheArtifactAndBlocksThePlan() {
        List<VisibilityFinding> findings = new ArrayList<>();
        CatalogObjectRegistry registry = new CatalogObjectRegistry(findings);
        CatalogObject first = index("sha256:first");
        CatalogObject conflicting = index("sha256:second");
        registry.add(first, "jdbc-get-index-info");
        registry.add(conflicting, "jdbc-get-index-info");
        CatalogSnapshot discovered = new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-30T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("LegacyDB", "1", "legacy-driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("legacy", "sales", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(),
                registry.objects(),
                findings);

        CatalogSnapshot restored = new CatalogSnapshotArtifactCodec().read(
                new CatalogSnapshotArtifactCodec().write(discovered));
        MigrationPlan plan = new MigrationPlanner().plan(
                restored,
                new MappingSpec(null, null, List.of(), Map.of()),
                Map.of(first.stableId(), new DispositionDecision(
                        ObjectDisposition.APPROVED_IGNORE, null, true, "target index로 대체")),
                "a".repeat(64));

        assertThat(restored.visibilityFindings()).singleElement().satisfies(finding ->
                assertThat(finding.operation()).isEqualTo(CatalogObjectRegistry.COLLISION_OPERATION));
        assertThat(plan.coverage().unreadable()).isOne();
        assertThat(plan.commitReady()).isFalse();
        assertThat(plan.readiness().blockers()).anySatisfy(blocker ->
                assertThat(blocker).contains("판독", "1"));
    }

    private static CatalogObject index(String definitionHash) {
        return new CatalogObject(
                ObjectKind.INDEX,
                "legacy",
                "sales",
                "SECRET_INDEX",
                true,
                null,
                definitionHash,
                List.of(new CatalogObject.ObjectReference(
                        ObjectKind.TABLE, "legacy", "sales", "SECRET_TABLE")),
                Map.of("parentTable", "SECRET_TABLE", "columns", "ID"));
    }
}
