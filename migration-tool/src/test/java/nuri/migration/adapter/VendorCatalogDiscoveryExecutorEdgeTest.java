package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class VendorCatalogDiscoveryExecutorEdgeTest {

    @Test
    void exactCatalogAndSchemaScopeRejectsOutOfBoundaryRowsBeforeReadingTheirIdentity() throws Exception {
        VendorCatalogQuery query = query(ObjectKind.TABLE, projection(
                ResultColumnProjection.column("catalog_name"),
                ResultColumnProjection.column("schema_name"),
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                DefinitionProjection.none(),
                Map.of(),
                DependencyProjection.none()));
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.prepareStatement(query.sql())).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, true, false);
        given(rows.getString("catalog_name")).willReturn("outside_db", "legacy_db");
        given(rows.getString("schema_name")).willReturn("sales", "outside_schema");

        CatalogSnapshot snapshot = VendorCatalogDiscoveryExecutor.enrich(
                baseline("legacy_db", "sales", List.of()),
                connection,
                new DiscoveryRequest(
                        Set.of("legacy_db"),
                        Set.of("sales"),
                        Set.of(ObjectKind.TABLE),
                        false),
                "edge-adapter",
                List.of(query),
                Set.of());

        assertThat(snapshot.objects()).isEmpty();
        assertThat(snapshot.visibilityFindings()).isEmpty();
        verify(statement).setString(1, "sales");
        verify(rows, never()).getString("object_name");
    }

    @Test
    void everyKnownSystemNamespaceIsFilteredCaseInsensitively() throws Exception {
        VendorCatalogQuery query = query(ObjectKind.TABLE, projection(
                ResultColumnProjection.absent(),
                ResultColumnProjection.column("schema_name"),
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                DefinitionProjection.none(),
                Map.of(),
                DependencyProjection.none()));
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.prepareStatement(query.sql())).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, true, true, true, true, true, true, true, false);
        given(rows.getString("schema_name")).willReturn(
                "information_schema",
                "pg_catalog",
                "pg_toast_42",
                "pg_temp_3",
                "sys",
                "system",
                "mysql",
                "performance_schema");

        CatalogSnapshot snapshot = VendorCatalogDiscoveryExecutor.enrich(
                baseline("legacy_db", "sales", List.of()),
                connection,
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false),
                "edge-adapter",
                List.of(query),
                Set.of());

        assertThat(snapshot.objects()).isEmpty();
        verify(statement).setNull(1, Types.VARCHAR);
        verify(rows, never()).getString("object_name");
    }

    @Test
    void explicitlyIncludedSystemObjectKeepsItsPlainSingleColumnIdentity() throws Exception {
        VendorCatalogQuery query = query(ObjectKind.TABLE, projection(
                ResultColumnProjection.absent(),
                ResultColumnProjection.column("schema_name"),
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                DefinitionProjection.none(),
                Map.of(),
                DependencyProjection.none()));
        Connection connection = connection(query);
        ResultSet rows = rows(connection, query);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("schema_name")).willReturn("sys");
        given(rows.getString("object_name")).willReturn("visible_object");

        CatalogSnapshot snapshot = VendorCatalogDiscoveryExecutor.enrich(
                baseline("legacy_db", "sales", List.of()),
                connection,
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), true),
                "edge-adapter",
                List.of(query),
                Set.of());

        assertThat(snapshot.objects()).singleElement().satisfies(object -> {
            assertThat(object.catalog()).isEqualTo("legacy_db");
            assertThat(object.schema()).isEqualTo("sys");
            assertThat(object.name()).isEqualTo("visible_object");
            assertThat(object.definitionHash()).isNull();
            assertThat(object.dependencies()).isEmpty();
        });
    }

    @Test
    void nullableCompositeIdentityAndOptionalDependencyAreMappedWithoutLeakingDefinitions() throws Exception {
        VendorRowProjection projection = projection(
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent(),
                ResultColumnProjection.column("constraint_name"),
                List.of("table_name", "constraint_name"),
                DefinitionProjection.none(),
                Map.of("owner", "owner_label", "optional", "optional_label"),
                DependencyProjection.of(
                        ObjectKind.TABLE,
                        ResultColumnProjection.absent(),
                        ResultColumnProjection.absent(),
                        ResultColumnProjection.column("parent_name")));
        VendorCatalogQuery query = query(ObjectKind.CHECK_CONSTRAINT, projection);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.prepareStatement(query.sql())).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, true, false);
        given(rows.getString("constraint_name"))
                .willReturn("check_a", "check_a", "check_b", "check_b");
        given(rows.getString("table_name")).willReturn(null);
        given(rows.getString("owner_label")).willReturn("source-owner");
        given(rows.getString("optional_label")).willReturn(null);
        given(rows.getString("parent_name")).willReturn("orders", " ");

        CatalogSnapshot snapshot = VendorCatalogDiscoveryExecutor.enrich(
                baseline(null, null, List.of()),
                connection,
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.CHECK_CONSTRAINT), false),
                "edge-adapter",
                List.of(query),
                Set.of());

        verify(statement).setNull(1, Types.VARCHAR);
        assertThat(snapshot.objects()).hasSize(2).allSatisfy(object -> {
            assertThat(object.name()).matches("check_[ab]#sha256:[0-9a-f]{64}");
            assertThat(object.nativeDefinition()).isNull();
            assertThat(object.definitionHash()).isNull();
            assertThat(object.attributes())
                    .containsEntry("owner", "source-owner")
                    .doesNotContainKey("optional");
        });
        CatalogObject withParent = snapshot.objects().stream()
                .filter(object -> object.name().startsWith("check_a#"))
                .findFirst()
                .orElseThrow();
        assertThat(withParent.dependencies()).singleElement().satisfies(parent -> {
            assertThat(parent.kind()).isEqualTo(ObjectKind.TABLE);
            assertThat(parent.catalog()).isNull();
            assertThat(parent.schema()).isNull();
            assertThat(parent.name()).isEqualTo("orders");
        });
        assertThat(snapshot.objects()).filteredOn(object -> object.name().startsWith("check_b#"))
                .singleElement()
                .satisfies(object -> assertThat(object.dependencies()).isEmpty());
    }

    @Test
    void blankProjectedNameFailsClosedAsASanitizedVisibilityFinding() throws Exception {
        VendorCatalogQuery query = query(ObjectKind.TYPE, projection(
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent(),
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                DefinitionProjection.none(),
                Map.of(),
                DependencyProjection.none()));
        Connection connection = connection(query);
        ResultSet rows = rows(connection, query);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("object_name")).willReturn(" ");

        CatalogSnapshot snapshot = VendorCatalogDiscoveryExecutor.enrich(
                baseline("legacy_db", "sales", List.of()),
                connection,
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TYPE), false),
                "edge-adapter",
                List.of(query),
                Set.of());

        assertThat(snapshot.objects()).isEmpty();
        assertThat(snapshot.visibilityFindings()).singleElement().satisfies(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.QUERY_FAILED);
            assertThat(finding.operation()).isEqualTo(query.operation());
            assertThat(finding.sqlState()).isEqualTo("02000");
            assertThat(finding.message())
                    .doesNotContain("object name")
                    .doesNotContain("projected vendor row");
        });
    }

    @Test
    void baselineUnsupportedIsReplacedOnlyForExecutableOrNotApplicableKinds() throws Exception {
        VisibilityFinding executable = finding(
                VisibilityStatus.UNSUPPORTED, ObjectKind.TABLE, "jdbc-portable-baseline");
        VisibilityFinding notApplicable = finding(
                VisibilityStatus.UNSUPPORTED, ObjectKind.USER, "jdbc-portable-baseline");
        VisibilityFinding unselected = finding(
                VisibilityStatus.UNSUPPORTED, ObjectKind.VIEW, "jdbc-portable-baseline");
        VisibilityFinding nonBaseline = finding(
                VisibilityStatus.UNSUPPORTED, ObjectKind.TABLE, "vendor-specific-query");
        VisibilityFinding partial = finding(
                VisibilityStatus.PARTIAL, ObjectKind.TABLE, "jdbc-portable-baseline");
        VendorCatalogQuery query = query(ObjectKind.TABLE, projection(
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent(),
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                DefinitionProjection.none(),
                Map.of(),
                DependencyProjection.none()));
        Connection connection = connection(query);
        ResultSet rows = rows(connection, query);
        given(rows.next()).willReturn(false);

        CatalogSnapshot snapshot = VendorCatalogDiscoveryExecutor.enrich(
                baseline("legacy_db", "sales", List.of(
                        executable, notApplicable, unselected, nonBaseline, partial)),
                connection,
                new DiscoveryRequest(
                        Set.of(), Set.of(), Set.of(ObjectKind.TABLE, ObjectKind.USER), false),
                "edge-adapter",
                List.of(query),
                Set.of(ObjectKind.USER));

        assertThat(snapshot.visibilityFindings())
                .contains(unselected, nonBaseline, partial)
                .doesNotContain(executable, notApplicable);
        assertThat(snapshot.visibilityFindings()).filteredOn(
                finding -> finding.status() == VisibilityStatus.NOT_APPLICABLE)
                .singleElement()
                .satisfies(finding -> {
                    assertThat(finding.objectKind()).isEqualTo(ObjectKind.USER);
                    assertThat(finding.operation()).isEqualTo("edge-adapter-not-applicable");
                });
    }

    private static Connection connection(VendorCatalogQuery query) throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        given(connection.prepareStatement(query.sql())).willReturn(statement);
        return connection;
    }

    private static ResultSet rows(Connection connection, VendorCatalogQuery query) throws Exception {
        PreparedStatement statement = connection.prepareStatement(query.sql());
        ResultSet rows = mock(ResultSet.class);
        given(statement.executeQuery()).willReturn(rows);
        return rows;
    }

    private static VendorCatalogQuery query(ObjectKind kind, VendorRowProjection projection) {
        return new VendorCatalogQuery(
                kind,
                "edge-" + kind.name().toLowerCase(),
                "SELECT ? AS schema_filter",
                1,
                ObjectSupportGrade.METADATA_ONLY,
                projection);
    }

    private static VendorRowProjection projection(
            ResultColumnProjection catalog,
            ResultColumnProjection schema,
            ResultColumnProjection name,
            List<String> identityColumns,
            DefinitionProjection definition,
            Map<String, String> attributes,
            DependencyProjection dependency) {
        return new VendorRowProjection(
                catalog,
                schema,
                name,
                identityColumns,
                definition,
                attributes,
                Set.of(),
                false,
                dependency);
    }

    private static CatalogSnapshot baseline(
            String catalog,
            String schema,
            List<VisibilityFinding> findings) {
        return new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-30T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("EdgeDB", "1", "Edge JDBC", "1"),
                new CatalogSnapshot.EnvironmentInfo(catalog, schema, "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(),
                List.of(),
                findings);
    }

    private static VisibilityFinding finding(
            VisibilityStatus status,
            ObjectKind kind,
            String operation) {
        return new VisibilityFinding(
                status,
                kind,
                "legacy_db",
                "sales",
                operation,
                "safe finding",
                null);
    }
}
