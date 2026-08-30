package nuri.migration.adapter;

import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class SourceAdapterRegistryTest {

    @Test
    void postgresUsesItsEnricherWhileUnknownProductsUseTheJdbcBaseline() throws Exception {
        SourceAdapterRegistry registry = SourceAdapterRegistry.defaults();
        Connection postgres = connectionWithProduct("PostgreSQL");
        Connection unknown = connectionWithProduct("LegacyDB");

        assertThat(registry.resolve(postgres)).isInstanceOf(PostgreSqlSourceAdapter.class);
        assertThat(registry.resolve(unknown)).isExactlyInstanceOf(JdbcMetadataSourceAdapter.class);
    }

    private static Connection connectionWithProduct(String productName) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(metadata.getDatabaseProductName()).willReturn(productName);
        given(metadata.getDatabaseProductVersion()).willReturn("1.0");
        return connection;
    }
}
