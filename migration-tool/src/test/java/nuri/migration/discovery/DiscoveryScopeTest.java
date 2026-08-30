package nuri.migration.discovery;

import nuri.migration.adapter.PostgreSqlSourceAdapter;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DiscoveryScopeTest {

    @Test
    void canonicalScopePreservesTheRequestedBoundaryAndClassifiesEveryObjectKind() {
        DiscoveryRequest request = new DiscoveryRequest(
                new LinkedHashSet<>(List.of("z_catalog", "a_catalog")),
                new LinkedHashSet<>(List.of("z_schema", "a_schema")),
                new LinkedHashSet<>(List.of(
                        ObjectKind.USER,
                        ObjectKind.PACKAGE,
                        ObjectKind.TABLE)),
                false);

        DiscoveryScope scope = new PostgreSqlSourceAdapter().discoveryScope(request);

        assertThat(scope.schemaVersion()).isEqualTo(DiscoveryScope.CURRENT_SCHEMA_VERSION);
        assertThat(scope.adapterId()).isEqualTo("postgresql-pg-catalog");
        assertThat(scope.catalogs()).containsExactly("a_catalog", "z_catalog");
        assertThat(scope.schemas()).containsExactly("a_schema", "z_schema");
        assertThat(scope.objectKinds())
                .containsExactly(ObjectKind.PACKAGE, ObjectKind.TABLE, ObjectKind.USER);
        assertThat(scope.status(ObjectKind.TABLE)).isEqualTo(DiscoveryScopeStatus.REQUESTED);
        assertThat(scope.status(ObjectKind.USER)).isEqualTo(DiscoveryScopeStatus.NOT_REQUESTED);
        assertThat(scope.status(ObjectKind.PACKAGE)).isEqualTo(DiscoveryScopeStatus.NOT_APPLICABLE);
        assertThat(scope.status(ObjectKind.SCHEMA)).isEqualTo(DiscoveryScopeStatus.NOT_REQUESTED);
        assertThat(scope.objectScopeManifest()).hasSize(ObjectKind.values().length);
        assertThat(scope.effectiveRequest().objectKinds()).containsExactly(ObjectKind.TABLE);
    }

    @Test
    void exactComparisonRejectsEveryScopeDimensionAndAdapterDrift() {
        DiscoveryRequest expected = new DiscoveryRequest(
                Set.of("legacy_db"),
                Set.of("legacy"),
                Set.of(ObjectKind.TABLE, ObjectKind.COLUMN),
                false);
        DiscoveryScope scope = new PostgreSqlSourceAdapter().discoveryScope(expected);

        assertThat(scope.matches("postgresql-pg-catalog", expected)).isTrue();
        assertThat(scope.matches("jdbc-metadata", expected)).isFalse();
        assertThat(scope.matches("postgresql-pg-catalog", new DiscoveryRequest(
                Set.of("other_db"), expected.schemas(), expected.objectKinds(), false))).isFalse();
        assertThat(scope.matches("postgresql-pg-catalog", new DiscoveryRequest(
                expected.catalogs(), Set.of("other"), expected.objectKinds(), false))).isFalse();
        assertThat(scope.matches("postgresql-pg-catalog", new DiscoveryRequest(
                expected.catalogs(), expected.schemas(), Set.of(ObjectKind.TABLE), false))).isFalse();
        assertThat(scope.matches("postgresql-pg-catalog", new DiscoveryRequest(
                expected.catalogs(), expected.schemas(), expected.objectKinds(), true))).isFalse();
        assertThatThrownBy(() -> scope.requireExact("jdbc-metadata", expected))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("scope");
    }
}
