package nuri.migration.adapter;

import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class DiscoveryVisibilityProofTest {

    @Test
    void unboundedSuccessfulEmptyDiscoveryIsBlockingPartialWithoutVisibilityProof() throws Exception {
        Connection connection = emptyMetadataConnection();

        CatalogSnapshot snapshot = new JdbcMetadataSourceAdapter().discover(
                connection,
                DiscoveryRequest.allUserObjects());

        assertThat(snapshot.objects()).isEmpty();
        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.PARTIAL);
            assertThat(finding.objectKind()).isEqualTo(ObjectKind.SCHEMA);
            assertThat(finding.operation()).isEqualTo("source-visibility-proof");
        });
        assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
    }

    @Test
    void provenScopedSchemaMayBeLegitimatelyEmptyWithoutPartialFinding() throws Exception {
        Connection connection = emptyMetadataConnection();
        JdbcMetadataSourceAdapter adapter = new JdbcMetadataSourceAdapter() {
            @Override
            protected DiscoveryVisibilityProof visibilityProof(
                    Connection ignored,
                    DiscoveryRequest request) {
                return DiscoveryVisibilityProof.forSchemas(Set.of("EMPTY_SCHEMA"));
            }
        };

        CatalogSnapshot snapshot = adapter.discover(
                connection,
                new DiscoveryRequest(
                        Set.of(),
                        Set.of("EMPTY_SCHEMA"),
                        Set.of(ObjectKind.TABLE),
                        false));

        assertThat(snapshot.objects()).isEmpty();
        assertThat(snapshot.visibilityFindings())
                .noneMatch(finding -> finding.operation().equals("source-visibility-proof"));
    }

    @Test
    void notApplicableOnlyRequestNeedsNoVisibilityProof() throws Exception {
        CatalogSnapshot snapshot = new MySqlSourceAdapter().discover(
                emptyMetadataConnection(),
                new DiscoveryRequest(
                        Set.of(),
                        Set.of("legacy"),
                        Set.of(ObjectKind.MATERIALIZED_VIEW),
                        false));

        assertThat(snapshot.visibilityFindings()).singleElement().satisfies(finding ->
                assertThat(finding.status()).isEqualTo(VisibilityStatus.NOT_APPLICABLE));
    }

    private static Connection emptyMetadataConnection() throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        ResultSet catalogs = emptyRows();
        ResultSet schemas = emptyRows();
        ResultSet tables = emptyRows();
        ResultSet procedures = emptyRows();
        ResultSet functions = emptyRows();
        ResultSet types = emptyRows();
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn("legacy");
        given(connection.getSchema()).willReturn("legacy");
        given(metadata.getDatabaseProductName()).willReturn("UnknownDB");
        given(metadata.getDatabaseProductVersion()).willReturn("1.0");
        given(metadata.getDriverName()).willReturn("test-driver");
        given(metadata.getDriverVersion()).willReturn("1");
        given(metadata.getCatalogs()).willReturn(catalogs);
        given(metadata.getSchemas()).willReturn(schemas);
        given(metadata.getTables(isNull(), isNull(), anyString(), any())).willReturn(tables);
        given(metadata.getProcedures(isNull(), isNull(), anyString())).willReturn(procedures);
        given(metadata.getFunctions(isNull(), isNull(), anyString())).willReturn(functions);
        given(metadata.getUDTs(isNull(), isNull(), anyString(), any())).willReturn(types);
        return connection;
    }

    private static ResultSet emptyRows() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(false);
        return rows;
    }
}
