package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VendorCatalogBoundaryValidationTest {

    @Test
    void queryContractRejectsNonPositiveUnboundMutatingAndUnsupportedDefinitions() {
        assertThatThrownBy(() -> query("query", "SELECT ? AS schema_filter", 0,
                ObjectSupportGrade.METADATA_ONLY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positive");
        assertThatThrownBy(() -> query("query", "DELETE FROM catalog WHERE schema_name = ?", 1,
                ObjectSupportGrade.METADATA_ONLY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("SELECT or WITH");
        assertThatThrownBy(() -> query("query", "SELECT ? AS schema_filter;", 1,
                ObjectSupportGrade.METADATA_ONLY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("single read-only");
        assertThatThrownBy(() -> query("query", "SELECT * FROM catalog FOR UPDATE WHERE schema_name = ?", 1,
                ObjectSupportGrade.METADATA_ONLY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("single read-only");
        assertThatThrownBy(() -> query("query", "SELECT 1", 1,
                ObjectSupportGrade.METADATA_ONLY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("placeholders");
        assertThatThrownBy(() -> query("query", "SELECT ? AS schema_filter", 1,
                ObjectSupportGrade.UNSUPPORTED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("UNSUPPORTED");

        VendorCatalogQuery withQuery = query(
                "with-query",
                "  WITH scoped AS (SELECT ? AS schema_filter) SELECT * FROM scoped",
                1,
                ObjectSupportGrade.MANUAL);
        assertThat(withQuery.sql()).startsWith("  WITH");
    }

    @Test
    void queryContractRejectsMissingRequiredIdentityFields() {
        assertThatThrownBy(() -> new VendorCatalogQuery(
                null, "query", "SELECT ?", 1, ObjectSupportGrade.MANUAL, safeProjection()))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("kind");
        assertThatThrownBy(() -> new VendorCatalogQuery(
                ObjectKind.TABLE, null, "SELECT ?", 1, ObjectSupportGrade.MANUAL, safeProjection()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("operation");
        assertThatThrownBy(() -> new VendorCatalogQuery(
                ObjectKind.TABLE, " ", "SELECT ?", 1, ObjectSupportGrade.MANUAL, safeProjection()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("operation");
        assertThatThrownBy(() -> new VendorCatalogQuery(
                ObjectKind.TABLE, "query", null, 1, ObjectSupportGrade.MANUAL, safeProjection()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sql");
        assertThatThrownBy(() -> new VendorCatalogQuery(
                ObjectKind.TABLE, "query", "SELECT ?", 1, null, safeProjection()))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("supportGrade");
        assertThatThrownBy(() -> new VendorCatalogQuery(
                ObjectKind.TABLE, "query", "SELECT ?", 1, ObjectSupportGrade.MANUAL, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("projection");
    }

    @Test
    void everyPartialQueryKindPublishesAnExplicitCompletenessWarning() {
        assertThat(query(ObjectKind.PARTITION).partialScopeMessage()).contains("partition");
        assertThat(query(ObjectKind.GRANT).partialScopeMessage()).contains("privilege");
        assertThat(query(ObjectKind.JOB).partialScopeMessage()).contains("job inventory");
        assertThat(query(ObjectKind.TABLE).partialScopeMessage()).isNull();
        assertThat(query(ObjectKind.PARTITION).partialScope()).isTrue();
        assertThat(query(ObjectKind.GRANT).partialScope()).isTrue();
        assertThat(query(ObjectKind.JOB).partialScope()).isTrue();
        assertThat(query(ObjectKind.TABLE).partialScope()).isFalse();
    }

    @Test
    void resultAndDefinitionProjectionRejectContradictoryCaptureContracts() {
        assertThatThrownBy(() -> new ResultColumnProjection(true, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("label");
        assertThatThrownBy(() -> new ResultColumnProjection(true, " "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("label");
        assertThatThrownBy(() -> new ResultColumnProjection(false, "unexpected"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("absent");
        assertThatThrownBy(() -> new DefinitionProjection(
                DefinitionCaptureMode.NONE,
                ResultColumnProjection.column("definition")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("NONE");
        assertThatThrownBy(() -> new DefinitionProjection(
                DefinitionCaptureMode.HASH_ONLY,
                ResultColumnProjection.absent()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("HASH_ONLY");
    }

    @Test
    void dependencyProjectionRejectsHalfDeclaredReferences() {
        assertThatThrownBy(() -> new DependencyProjection(
                true,
                null,
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent(),
                ResultColumnProjection.column("parent_name")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("requires kind and name");
        assertThatThrownBy(() -> new DependencyProjection(
                true,
                ObjectKind.TABLE,
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("requires kind and name");
        assertThatThrownBy(() -> new DependencyProjection(
                false,
                ObjectKind.TABLE,
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must not declare");
    }

    @Test
    void rowProjectionRejectsMissingOrBlankIdentityColumns() {
        assertThatThrownBy(() -> projection(
                ResultColumnProjection.absent(), List.of("object_name"), Map.of(), Set.of(), false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name projection");
        assertThatThrownBy(() -> projection(
                ResultColumnProjection.column("object_name"), List.of(), Map.of(), Set.of(), false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("identity column");
        assertThatThrownBy(() -> projection(
                ResultColumnProjection.column("object_name"), List.of(" "), Map.of(), Set.of(), false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("identity column");
        assertThatThrownBy(() -> projection(
                ResultColumnProjection.column("object_name"),
                java.util.Collections.singletonList(null), Map.of(), Set.of(), false))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void rowProjectionRejectsBlankAttributeNamesAndResultLabels() {
        LinkedHashMap<String, String> nullKey = new LinkedHashMap<>();
        nullKey.put(null, "result_label");
        LinkedHashMap<String, String> nullLabel = new LinkedHashMap<>();
        nullLabel.put("attribute", null);

        assertInvalidAttribute(nullKey);
        assertInvalidAttribute(Map.of(" ", "result_label"));
        assertInvalidAttribute(nullLabel);
        assertInvalidAttribute(Map.of("attribute", " "));
    }

    @Test
    void rowProjectionCannotExposeSensitiveIdentityThroughNamesOrAttributes() {
        assertThatThrownBy(() -> projection(
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                Map.of(),
                Set.of("secret_identity"),
                true))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must be identity columns");
        assertThatThrownBy(() -> projection(
                ResultColumnProjection.column("object_name"),
                List.of("object_name", "secret_identity"),
                Map.of("unsafe", "secret_identity"),
                Set.of("secret_identity"),
                true))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be attributes");
        assertThatThrownBy(() -> projection(
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                Map.of(),
                Set.of("object_name"),
                false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must be redacted");
    }

    private static void assertInvalidAttribute(Map<String, String> attributes) {
        assertThatThrownBy(() -> projection(
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                attributes,
                Set.of(),
                false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("attribute names");
    }

    private static VendorCatalogQuery query(String operation, String sql, int parameterCount,
                                            ObjectSupportGrade supportGrade) {
        return new VendorCatalogQuery(
                ObjectKind.TABLE,
                operation,
                sql,
                parameterCount,
                supportGrade,
                safeProjection());
    }

    private static VendorCatalogQuery query(ObjectKind kind) {
        return new VendorCatalogQuery(
                kind,
                "query-" + kind.name().toLowerCase(),
                "SELECT ? AS schema_filter",
                1,
                ObjectSupportGrade.MANUAL,
                safeProjection());
    }

    private static VendorRowProjection safeProjection() {
        return projection(
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                Map.of(),
                Set.of(),
                false);
    }

    private static VendorRowProjection projection(
            ResultColumnProjection name,
            List<String> identityColumns,
            Map<String, String> attributes,
            Set<String> sensitiveIdentityColumns,
            boolean redactName) {
        return new VendorRowProjection(
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent(),
                name,
                identityColumns,
                DefinitionProjection.none(),
                attributes,
                sensitiveIdentityColumns,
                redactName,
                DependencyProjection.none());
    }
}
