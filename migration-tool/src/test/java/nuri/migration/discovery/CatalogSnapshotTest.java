package nuri.migration.discovery;

import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogSnapshotTest {

    @Test
    void catalogObjectPreservesOriginalIdentityAndOwnsImmutableMetadata() {
        List<CatalogObject.ObjectReference> dependencies = new ArrayList<>();
        dependencies.add(new CatalogObject.ObjectReference(
                ObjectKind.TABLE, "legacy", "sales", "Customer"));
        Map<String, String> attributes = new LinkedHashMap<>();
        attributes.put("nativeType", "NUMBER(19)");

        CatalogObject object = new CatalogObject(
                ObjectKind.FOREIGN_KEY,
                "legacy",
                "sales",
                "FK_Order_Customer",
                true,
                null,
                "sha256:abc",
                dependencies,
                attributes);

        dependencies.clear();
        attributes.clear();

        assertThat(object.catalog()).isEqualTo("legacy");
        assertThat(object.schema()).isEqualTo("sales");
        assertThat(object.name()).isEqualTo("FK_Order_Customer");
        assertThat(object.qualifiedName()).isEqualTo("\"legacy\".\"sales\".\"FK_Order_Customer\"");
        assertThat(object.dependencies()).hasSize(1);
        assertThat(object.attributes()).containsEntry("nativeType", "NUMBER(19)");
        assertThat(object.stableId()).startsWith("urn:migration-object:sha256:");
        assertThat(object.stableId()).isEqualTo(object.stableId());
    }

    @Test
    void tableScopedObjectsWithTheSameNativeNameHaveDifferentStableIds() {
        CatalogObject first = tableScopedObject(
                ObjectKind.PRIMARY_KEY,
                "PK_SHARED",
                "CUSTOMER",
                Map.of("parentTable", "CUSTOMER", "columns", "ID"));
        CatalogObject second = tableScopedObject(
                ObjectKind.PRIMARY_KEY,
                "PK_SHARED",
                "ORDER_HEADER",
                Map.of("parentTable", "ORDER_HEADER", "columns", "ID"));

        assertThat(first.stableId()).isNotEqualTo(second.stableId());
    }

    @Test
    void multipleUnnamedForeignKeysBetweenTheSameTablesUseTheirColumnsAsStructuralIdentity() {
        List<CatalogObject.ObjectReference> dependencies = List.of(
                new CatalogObject.ObjectReference(ObjectKind.TABLE, "legacy", "sales", "CHILD"),
                new CatalogObject.ObjectReference(ObjectKind.TABLE, "legacy", "sales", "PARENT"));
        CatalogObject first = object(
                ObjectKind.FOREIGN_KEY,
                "CHILD#FOREIGN_KEY#PARENT",
                dependencies,
                Map.of(
                        "parentTable", "CHILD",
                        "columns", "PRIMARY_PARENT_ID",
                        "referencedTable", "PARENT",
                        "referencedColumns", "ID"));
        CatalogObject second = object(
                ObjectKind.FOREIGN_KEY,
                "CHILD#FOREIGN_KEY#PARENT",
                dependencies,
                Map.of(
                        "parentTable", "CHILD",
                        "columns", "SECONDARY_PARENT_ID",
                        "referencedTable", "PARENT",
                        "referencedColumns", "ID"));

        assertThat(first.stableId()).isNotEqualTo(second.stableId());
    }

    @Test
    void structuralIdentityIsCanonicalAndDoesNotExposeRawMetadata() {
        Map<String, String> firstAttributes = new LinkedHashMap<>();
        firstAttributes.put("parentTable", "SECRET_PARENT");
        firstAttributes.put("columns", "SECRET_COLUMN");
        Map<String, String> reversedAttributes = new LinkedHashMap<>();
        reversedAttributes.put("columns", "SECRET_COLUMN");
        reversedAttributes.put("parentTable", "SECRET_PARENT");
        CatalogObject first = object(
                ObjectKind.INDEX,
                "SECRET_INDEX",
                List.of(new CatalogObject.ObjectReference(
                        ObjectKind.TABLE, "legacy", "sales", "SECRET_PARENT")),
                firstAttributes);
        CatalogObject second = object(
                ObjectKind.INDEX,
                "SECRET_INDEX",
                List.of(new CatalogObject.ObjectReference(
                        ObjectKind.TABLE, "legacy", "sales", "SECRET_PARENT")),
                reversedAttributes);

        assertThat(first.stableId()).isEqualTo(second.stableId());
        assertThat(first.stableId())
                .doesNotContain("SECRET_INDEX", "SECRET_PARENT", "SECRET_COLUMN");
    }

    @Test
    void objectReferenceMatchesOnlyTheExplicitBaseReferenceIdentity() {
        CatalogObject table = new CatalogObject(
                ObjectKind.TABLE,
                "legacy",
                "sales",
                "CUSTOMER",
                true,
                null,
                null,
                List.of(),
                Map.of("nativeTableType", "TABLE"));
        CatalogObject.ObjectReference reference = new CatalogObject.ObjectReference(
                ObjectKind.TABLE, "legacy", "sales", "CUSTOMER");

        assertThat(table.referenceId()).isEqualTo(reference.stableId());
        assertThat(table.stableId()).isNotEqualTo(reference.stableId());
    }

    @Test
    void collectorSpecificEnrichmentAttributesDoNotSplitTheSameIndexIdentity() {
        CatalogObject.ObjectReference parent = new CatalogObject.ObjectReference(
                ObjectKind.TABLE, "legacy", "sales", "CUSTOMER");
        CatalogObject jdbc = object(
                ObjectKind.INDEX,
                "IX_CUSTOMER_EMAIL",
                List.of(parent),
                Map.of("parentTable", "CUSTOMER", "columns", "EMAIL", "unique", "true"));
        CatalogObject vendor = object(
                ObjectKind.INDEX,
                "IX_CUSTOMER_EMAIL",
                List.of(parent),
                Map.of("metadataSource", "pg_catalog", "detail", "true"));

        assertThat(jdbc.stableId()).isEqualTo(vendor.stableId());
    }

    @Test
    void snapshotMakesEveryVisibilityGapBlockingAndCountable() {
        VisibilityFinding unreadable = new VisibilityFinding(
                VisibilityStatus.UNREADABLE,
                ObjectKind.TRIGGER,
                "legacy",
                "sales",
                "discover-triggers",
                "metadata is not visible to the source account",
                "42501");
        VisibilityFinding unsupported = new VisibilityFinding(
                VisibilityStatus.UNSUPPORTED,
                ObjectKind.JOB,
                "legacy",
                "sales",
                "discover-jobs",
                "the JDBC baseline has no portable job catalog",
                null);

        CatalogSnapshot snapshot = new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-30T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "PostgreSQL JDBC Driver", "42.7"),
                new CatalogSnapshot.EnvironmentInfo("legacy", "sales", "UTF8", "C", "UTC"),
                new SnapshotCapability(true, true, "pg_export_snapshot"),
                List.of(),
                List.of(unreadable, unsupported));

        assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
        assertThat(snapshot.unreadableFindingCount()).isEqualTo(1);
        assertThat(snapshot.visibilityFindingCount(VisibilityStatus.UNSUPPORTED)).isEqualTo(1);
    }

    @Test
    void failureClassificationNeverTurnsPermissionOrUnsupportedMetadataIntoAbsence() {
        VisibilityFinding denied = VisibilityFinding.fromFailure(
                ObjectKind.GRANT,
                "legacy",
                "sales",
                "discover-grants",
                new SQLException("sensitive vendor text must not be retained", "42501"));
        VisibilityFinding unsupported = VisibilityFinding.fromFailure(
                ObjectKind.JOB,
                null,
                null,
                "discover-jobs",
                new SQLFeatureNotSupportedException("not available"));

        assertThat(denied.status()).isEqualTo(VisibilityStatus.UNREADABLE);
        assertThat(denied.message()).doesNotContain("sensitive vendor text");
        assertThat(unsupported.status()).isEqualTo(VisibilityStatus.UNSUPPORTED);
    }

    @Test
    void objectKindsCoverPortableAndVendorSpecificDatabaseObjects() {
        assertThat(ObjectKind.values()).contains(
                ObjectKind.CATALOG,
                ObjectKind.SCHEMA,
                ObjectKind.TABLE,
                ObjectKind.PARTITION,
                ObjectKind.COLUMN,
                ObjectKind.PRIMARY_KEY,
                ObjectKind.UNIQUE_KEY,
                ObjectKind.FOREIGN_KEY,
                ObjectKind.CHECK_CONSTRAINT,
                ObjectKind.DEFAULT_CONSTRAINT,
                ObjectKind.INDEX,
                ObjectKind.SEQUENCE,
                ObjectKind.IDENTITY,
                ObjectKind.VIEW,
                ObjectKind.MATERIALIZED_VIEW,
                ObjectKind.ROUTINE,
                ObjectKind.TRIGGER,
                ObjectKind.TYPE,
                ObjectKind.SYNONYM,
                ObjectKind.COMMENT,
                ObjectKind.GRANT,
                ObjectKind.JOB,
                ObjectKind.EXTERNAL_OBJECT);
    }

    private static CatalogObject tableScopedObject(
            ObjectKind kind,
            String name,
            String table,
            Map<String, String> attributes) {
        return object(
                kind,
                name,
                List.of(new CatalogObject.ObjectReference(ObjectKind.TABLE, "legacy", "sales", table)),
                attributes);
    }

    private static CatalogObject object(
            ObjectKind kind,
            String name,
            List<CatalogObject.ObjectReference> dependencies,
            Map<String, String> attributes) {
        return new CatalogObject(
                kind,
                "legacy",
                "sales",
                name,
                true,
                null,
                null,
                dependencies,
                attributes);
    }
}
