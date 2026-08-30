package nuri.migration.adapter;

import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class VendorSourceAdapterRegistryTest {

    @Test
    void resolvesEachJdbcProductToADistinctVendorAdapterUsingVersionEvidence() throws Exception {
        SourceAdapterRegistry registry = SourceAdapterRegistry.defaults();

        assertThat(registry.resolve(connection("PostgreSQL", "17.6")))
                .isInstanceOf(PostgreSqlSourceAdapter.class);
        assertThat(registry.resolve(connection("Oracle", "19.24.0.0.0")))
                .isInstanceOf(OracleSourceAdapter.class);
        assertThat(registry.resolve(connection("Tibero", "7.2.0")))
                .isInstanceOf(TiberoSourceAdapter.class);
        assertThat(registry.resolve(connection("MySQL", "8.4.3")))
                .isInstanceOf(MySqlSourceAdapter.class);
        assertThat(registry.resolve(connection("MariaDB", "11.4.4")))
                .isInstanceOf(MariaDbSourceAdapter.class);
        assertThat(registry.resolve(connection("Microsoft SQL Server", "16.00.1140")))
                .isInstanceOf(SqlServerSourceAdapter.class);
    }

    @Test
    void missingVersionEvidenceFallsBackToGenericInsteadOfGuessingAVendor() throws Exception {
        SourceAdapter resolved = SourceAdapterRegistry.defaults().resolve(connection("Oracle", ""));

        assertThat(resolved).isExactlyInstanceOf(JdbcMetadataSourceAdapter.class);
    }

    @Test
    void explicitAdapterSelectionIsExactAndFailsClosedOnUnknownOrMismatchedProducts() throws Exception {
        SourceAdapterRegistry registry = SourceAdapterRegistry.defaults();

        assertThat(registry.resolve(connection("Oracle", "19.0"), "oracle-catalog"))
                .isInstanceOf(OracleSourceAdapter.class);
        assertThatThrownBy(() -> registry.resolve(connection("Tibero", "7.2"), "oracle-catalog"))
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("oracle-catalog")
                .hasMessageContaining("does not match");
        assertThatThrownBy(() -> registry.resolve(connection("Oracle", "19.0"), "missing-adapter"))
                .isInstanceOf(SQLException.class)
                .hasMessage("Unknown source adapter id")
                .hasMessageNotContaining("missing-adapter");
        assertThatThrownBy(() -> registry.resolve(connection("Oracle", "19.0"), " "))
                .isInstanceOf(SQLException.class);
    }

    @Test
    void oracleAndTiberoNeverShareAnAliasOrCatalogDefinition() {
        SourceAdapter oracle = new OracleSourceAdapter();
        SourceAdapter tibero = new TiberoSourceAdapter();

        assertThat(oracle.identity().databaseFamily()).isEqualTo(DatabaseFamily.ORACLE);
        assertThat(tibero.identity().databaseFamily()).isEqualTo(DatabaseFamily.TIBERO);
        assertThat(oracle.id()).isNotEqualTo(tibero.id());
        assertThat(oracle.catalogQueries()).isNotEqualTo(tibero.catalogQueries());
    }

    private static Connection connection(String product, String version) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(metadata.getDatabaseProductName()).willReturn(product);
        given(metadata.getDatabaseProductVersion()).willReturn(version);
        given(metadata.getDriverName()).willReturn(product + " JDBC");
        given(metadata.getDriverVersion()).willReturn("test-driver");
        return connection;
    }
}
