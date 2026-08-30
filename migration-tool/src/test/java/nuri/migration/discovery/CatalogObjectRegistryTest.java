package nuri.migration.discovery;

import nuri.migration.artifact.CatalogSnapshotDigester;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogObjectRegistryTest {

    @Test
    void exactSemanticDuplicatesAreDeduplicatedWithoutAVisibilityFinding() {
        List<VisibilityFinding> findings = new ArrayList<>();
        CatalogObjectRegistry registry = new CatalogObjectRegistry(findings);
        CatalogObject object = tableIndex("sha256:first");

        registry.add(object, "jdbc-get-index-info");
        registry.add(object, "jdbc-get-index-info");

        assertThat(registry.objects()).containsExactly(object);
        assertThat(findings).isEmpty();
    }

    @Test
    void differentContentForTheSameStableIdentityFailsClosedWithoutLeakingNames() {
        List<VisibilityFinding> findings = new ArrayList<>();
        CatalogObjectRegistry registry = new CatalogObjectRegistry(findings);
        CatalogObject first = tableIndex("sha256:first");
        CatalogObject conflicting = tableIndex("sha256:second");

        assertThat(first.stableId()).isEqualTo(conflicting.stableId());
        registry.add(first, "jdbc-get-index-info");
        registry.add(conflicting, "jdbc-get-index-info");

        assertThat(registry.objects()).hasSize(1);
        assertThat(findings).singleElement().satisfies(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.UNREADABLE);
            assertThat(finding.objectKind()).isEqualTo(ObjectKind.INDEX);
            assertThat(finding.operation()).isEqualTo("catalog-object-stable-id-collision");
            assertThat(finding.message())
                    .contains(first.stableId())
                    .doesNotContain("SECRET_INDEX", "SECRET_TABLE", "sha256:first", "sha256:second");
        });
    }

    @Test
    void baselineAndVendorEnrichmentMergeCanonicallyRegardlessOfQueryOrder() {
        CatalogObject baseline = new CatalogObject(
                ObjectKind.VIEW,
                "legacy",
                "sales",
                "SALES_VIEW",
                false,
                null,
                null,
                List.of(),
                Map.of("nativeTableType", "VIEW"));
        CatalogObject vendor = new CatalogObject(
                ObjectKind.VIEW,
                "legacy",
                "sales",
                "SALES_VIEW",
                false,
                null,
                "sha256:vendor-definition",
                List.of(),
                Map.of("metadataSource", "pg_catalog", "detail", "v"));

        RegistryResult baselineFirst = addInOrder(baseline, vendor);
        RegistryResult vendorFirst = addInOrder(vendor, baseline);

        assertThat(baseline.stableId()).isEqualTo(vendor.stableId());
        assertThat(baselineFirst.findings()).isEmpty();
        assertThat(vendorFirst.findings()).isEmpty();
        assertThat(baselineFirst.objects()).isEqualTo(vendorFirst.objects()).singleElement().satisfies(merged -> {
            assertThat(merged.definitionHash()).isEqualTo("sha256:vendor-definition");
            assertThat(merged.attributes()).containsAllEntriesOf(Map.of(
                    "nativeTableType", "VIEW",
                    "metadataSource", "pg_catalog",
                    "detail", "v"));
        });
    }

    @Test
    void conflictingAttributeValueForTheSameStableIdentityFailsClosed() {
        CatalogObject first = view(Map.of("metadataSource", "pg_catalog"));
        CatalogObject conflicting = view(Map.of("metadataSource", "information_schema"));
        RegistryResult firstOrder = addInOrder(first, conflicting);
        RegistryResult reverseOrder = addInOrder(conflicting, first);

        assertThat(firstOrder.objects()).isEqualTo(reverseOrder.objects()).hasSize(1);
        assertThat(firstOrder.findings()).singleElement().satisfies(finding ->
                assertThat(finding.operation()).isEqualTo(CatalogObjectRegistry.COLLISION_OPERATION));
        assertThat(reverseOrder.findings()).singleElement().satisfies(finding ->
                assertThat(finding.operation()).isEqualTo(CatalogObjectRegistry.COLLISION_OPERATION));
    }

    @Test
    void threeWayPartialEnrichmentAndConflictIsCanonicalRegardlessOfInputOrder() {
        CatalogObject first = table(Map.of("a", "1"));
        CatalogObject conflicting = table(Map.of("a", "4"));
        CatalogObject enrichment = table(Map.of("c", "1"));

        RegistryResult conflictBeforeEnrichment = addInOrder(first, conflicting, enrichment);
        RegistryResult enrichmentBeforeConflict = addInOrder(first, enrichment, conflicting);

        assertThat(conflictBeforeEnrichment.objects())
                .isEqualTo(enrichmentBeforeConflict.objects());
        assertThat(conflictBeforeEnrichment.findings())
                .isEqualTo(enrichmentBeforeConflict.findings())
                .singleElement()
                .extracting(VisibilityFinding::status)
                .isEqualTo(VisibilityStatus.UNREADABLE);
        assertThat(snapshotDigest(conflictBeforeEnrichment))
                .isEqualTo(snapshotDigest(enrichmentBeforeConflict));
    }

    private static CatalogObject tableIndex(String definitionHash) {
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

    private static CatalogObject view(Map<String, String> attributes) {
        return new CatalogObject(
                ObjectKind.VIEW,
                "legacy",
                "sales",
                "SALES_VIEW",
                false,
                null,
                null,
                List.of(),
                attributes);
    }

    private static CatalogObject table(Map<String, String> attributes) {
        return new CatalogObject(
                ObjectKind.TABLE,
                "db",
                "public",
                "t",
                false,
                null,
                null,
                List.of(),
                attributes);
    }

    private static RegistryResult addInOrder(CatalogObject... objects) {
        List<VisibilityFinding> findings = new ArrayList<>();
        CatalogObjectRegistry registry = new CatalogObjectRegistry(findings);
        for (int index = 0; index < objects.length; index++) {
            registry.add(objects[index], "query-" + index);
        }
        return new RegistryResult(registry.objects(), findings);
    }

    private static String snapshotDigest(RegistryResult result) {
        return CatalogSnapshotDigester.sha256(new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-31T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "driver", "1"),
                CatalogSnapshot.EnvironmentInfo.unknown(),
                SnapshotCapability.unknown(),
                result.objects(),
                result.findings()));
    }

    private record RegistryResult(List<CatalogObject> objects, List<VisibilityFinding> findings) {}
}
