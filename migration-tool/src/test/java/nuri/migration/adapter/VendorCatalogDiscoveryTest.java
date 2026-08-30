package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class VendorCatalogDiscoveryTest {

    @Test
    void discoverBindsSelectedSchemaAndMapsCompositeIdentityWithHashOnlyDefinition() throws Exception {
        OracleSourceAdapter adapter = new OracleSourceAdapter();
        VendorCatalogQuery partitionQuery = query(adapter, ObjectKind.PARTITION);
        Connection connection = baselineConnection("Oracle", "19.0", "LEGACY_DB", "LEGACY");
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.prepareStatement(partitionQuery.sql())).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, true, false);
        given(rows.getString("TABLE_OWNER")).willReturn("LEGACY");
        given(rows.getString("PARTITION_NAME")).willReturn("P0", "P0");
        given(rows.getString("TABLE_NAME")).willReturn("ORDER_A", "ORDER_B");
        given(rows.getString("HIGH_VALUE")).willReturn("VALUES LESS THAN (100)");
        given(rows.getString("PARTITION_POSITION")).willReturn("1");

        CatalogSnapshot snapshot = adapter.discover(
                connection,
                new DiscoveryRequest(
                        Set.of(),
                        Set.of("LEGACY"),
                        Set.of(ObjectKind.PARTITION),
                        false));

        verify(statement).setFetchSize(250);
        verify(statement).setString(1, "LEGACY");
        verify(statement).setString(2, "LEGACY");
        assertThat(snapshot.objects()).hasSize(2);
        assertThat(snapshot.objects()).extracting(CatalogObject::stableId).doesNotHaveDuplicates();
        assertThat(snapshot.objects()).extracting(CatalogObject::name).doesNotHaveDuplicates();
        assertThat(snapshot.objects()).allSatisfy(object -> {
            assertThat(object.kind()).isEqualTo(ObjectKind.PARTITION);
            assertThat(object.catalog()).isEqualTo("LEGACY_DB");
            assertThat(object.schema()).isEqualTo("LEGACY");
            assertThat(object.name()).startsWith("P0#sha256:");
            assertThat(object.nativeDefinition()).isNull();
            assertThat(object.definitionHash()).startsWith("sha256:");
            assertThat(object.attributes()).containsKeys("parentTable", "partitionPosition");
            assertThat(object.attributes().values()).doesNotContain("VALUES LESS THAN (100)");
        });
        assertThat(snapshot.visibilityFindings())
                .noneSatisfy(finding -> {
                    assertThat(finding.objectKind()).isEqualTo(ObjectKind.PARTITION);
                    assertThat(finding.status()).isEqualTo(VisibilityStatus.UNSUPPORTED);
                });
        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.objectKind()).isEqualTo(ObjectKind.PARTITION);
            assertThat(finding.status()).isEqualTo(VisibilityStatus.PARTIAL);
            assertThat(finding.operation()).isEqualTo(partitionQuery.operation());
        });
    }

    @Test
    void conflictingVendorRowsFailClosedInsteadOfOverwriting() throws Exception {
        OracleSourceAdapter adapter = new OracleSourceAdapter();
        VendorCatalogQuery partitionQuery = query(adapter, ObjectKind.PARTITION);
        Connection connection = baselineConnection("Oracle", "19.0", "LEGACY_DB", "LEGACY");
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.prepareStatement(partitionQuery.sql())).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, true, false);
        given(rows.getString("TABLE_OWNER")).willReturn("LEGACY");
        given(rows.getString("PARTITION_NAME")).willReturn("P0");
        given(rows.getString("TABLE_NAME")).willReturn("ORDER_A");
        given(rows.getString("HIGH_VALUE")).willReturn("VALUES LESS THAN (100)", "VALUES LESS THAN (200)");
        given(rows.getString("PARTITION_POSITION")).willReturn("1");

        CatalogSnapshot snapshot = adapter.discover(
                connection,
                new DiscoveryRequest(
                        Set.of(), Set.of("LEGACY"), Set.of(ObjectKind.PARTITION), false));

        assertThat(snapshot.objects())
                .filteredOn(object -> object.kind() == ObjectKind.PARTITION)
                .hasSize(1);
        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.UNREADABLE);
            assertThat(finding.operation()).isEqualTo("catalog-object-stable-id-collision");
            assertThat(finding.message())
                    .doesNotContain("ORDER_A", "VALUES LESS THAN (100)", "VALUES LESS THAN (200)");
        });
    }

    @Test
    void queryFailureReplacesGenericUnsupportedWithAFailClosedVisibilityFinding() throws Exception {
        OracleSourceAdapter adapter = new OracleSourceAdapter();
        VendorCatalogQuery partitionQuery = query(adapter, ObjectKind.PARTITION);
        Connection connection = baselineConnection("Oracle", "19.0", "LEGACY_DB", "LEGACY");
        PreparedStatement statement = mock(PreparedStatement.class);
        given(connection.prepareStatement(partitionQuery.sql())).willReturn(statement);
        given(statement.executeQuery()).willThrow(new SQLException("raw vendor detail", "42501"));

        CatalogSnapshot snapshot = adapter.discover(
                connection,
                new DiscoveryRequest(Set.of(), Set.of("LEGACY"), Set.of(ObjectKind.PARTITION), false));

        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.objectKind()).isEqualTo(ObjectKind.PARTITION);
            assertThat(finding.status()).isEqualTo(VisibilityStatus.UNREADABLE);
            assertThat(finding.message()).doesNotContain("raw vendor detail");
        });
        assertThat(snapshot.visibilityFindings())
                .noneSatisfy(finding -> assertThat(finding.status()).isEqualTo(VisibilityStatus.UNSUPPORTED));
        assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
    }

    @Test
    void eachSelectedSchemaGetsItsOwnParameterizedRead() throws Exception {
        OracleSourceAdapter adapter = new OracleSourceAdapter();
        VendorCatalogQuery partitionQuery = query(adapter, ObjectKind.PARTITION);
        Connection connection = baselineConnection("Oracle", "19.0", "LEGACY_DB", "A");
        PreparedStatement first = emptyStatement();
        PreparedStatement second = emptyStatement();
        given(connection.prepareStatement(partitionQuery.sql())).willReturn(first, second);
        LinkedHashSet<String> schemas = new LinkedHashSet<>(List.of("A", "B"));

        adapter.discover(
                connection,
                new DiscoveryRequest(Set.of(), schemas, Set.of(ObjectKind.PARTITION), false));

        verify(first).setString(1, "A");
        verify(first).setString(2, "A");
        verify(second).setString(1, "B");
        verify(second).setString(2, "B");
    }

    @Test
    void knownVendorAbsenceIsPreservedButDoesNotBecomeAPlanBlockingVisibilityGap() throws Exception {
        MySqlSourceAdapter adapter = new MySqlSourceAdapter();
        Connection connection = baselineConnection("MySQL", "8.4", "legacy", "legacy");

        CatalogSnapshot snapshot = adapter.discover(
                connection,
                new DiscoveryRequest(
                        Set.of(),
                        Set.of("legacy"),
                        Set.of(ObjectKind.MATERIALIZED_VIEW),
                        false));

        assertThat(snapshot.visibilityFindings()).singleElement().satisfies(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.NOT_APPLICABLE);
            assertThat(finding.objectKind()).isEqualTo(ObjectKind.MATERIALIZED_VIEW);
        });
        assertThat(snapshot.hasBlockingVisibilityFindings()).isFalse();
    }

    @Test
    void sensitiveDatabaseUserIsHashedAndNeverStoredInTheSnapshot() throws Exception {
        SqlServerSourceAdapter adapter = new SqlServerSourceAdapter();
        VendorCatalogQuery userQuery = query(adapter, ObjectKind.USER);
        Connection connection = baselineConnection("Microsoft SQL Server", "16.0", "legacy", "dbo");
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.prepareStatement(userQuery.sql())).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("schema_name")).willReturn("dbo");
        given(rows.getString("name")).willReturn("source-login-secret");
        given(rows.getString("type_desc")).willReturn("SQL_USER");

        CatalogSnapshot snapshot = adapter.discover(
                connection,
                new DiscoveryRequest(Set.of(), Set.of("dbo"), Set.of(ObjectKind.USER), false));

        assertThat(snapshot.objects()).singleElement().satisfies(object -> {
            assertThat(object.name()).startsWith("redacted#sha256:");
            assertThat(object.attributes()).doesNotContainValue("source-login-secret");
        });
        assertThat(snapshot.toString()).doesNotContain("source-login-secret");
    }

    private static VendorCatalogQuery query(SourceAdapter adapter, ObjectKind kind) {
        return adapter.catalogQueries().stream()
                .filter(candidate -> candidate.kind() == kind)
                .findFirst()
                .orElseThrow();
    }

    private static PreparedStatement emptyStatement() throws Exception {
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(false);
        return statement;
    }

    private static Connection baselineConnection(
            String product,
            String version,
            String catalog,
            String schema) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        ResultSet emptyTables = mock(ResultSet.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn(catalog);
        given(connection.getSchema()).willReturn(schema);
        given(metadata.getDatabaseProductName()).willReturn(product);
        given(metadata.getDatabaseProductVersion()).willReturn(version);
        given(metadata.getDriverName()).willReturn(product + " JDBC");
        given(metadata.getDriverVersion()).willReturn("test");
        given(metadata.getTables(isNull(), isNull(), anyString(), any())).willReturn(emptyTables);
        given(emptyTables.next()).willReturn(false);
        return connection;
    }
}
