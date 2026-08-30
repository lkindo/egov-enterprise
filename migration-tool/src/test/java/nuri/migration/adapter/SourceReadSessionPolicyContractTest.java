package nuri.migration.adapter;

import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static nuri.migration.adapter.SourceReadSessionPolicy.IsolationMode.READ_COMMITTED;
import static nuri.migration.adapter.SourceReadSessionPolicy.IsolationMode.REPEATABLE_READ;
import static nuri.migration.adapter.SourceReadSessionPolicy.IsolationMode.UNSUPPORTED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class SourceReadSessionPolicyContractTest {

    @Test
    void defaultPolicyRemainsUnsupportedForExistingSourceAdapterImplementations() {
        SourceAdapter minimal = new SourceAdapter() {
            @Override
            public String id() {
                return "minimal";
            }

            @Override
            public boolean supports(DatabaseMetaData metadata) {
                return true;
            }

            @Override
            public CatalogSnapshot discover(Connection connection, DiscoveryRequest request) {
                return CatalogSnapshot.of(
                        new CatalogSnapshot.DatabaseInfo("LegacyDB", "1", "driver", "1"),
                        List.of(),
                        List.of());
            }
        };

        SourceReadSessionPolicy policy = minimal.sourceReadSessionPolicy();

        assertThat(policy.isolationMode()).isEqualTo(UNSUPPORTED);
        assertThat(policy.supported()).isFalse();
        assertThat(policy.evidenceLevel()).isEqualTo(minimal.identity().evidenceLevel());
    }

    @Test
    void registryAdaptersExposeATotalVendorSpecificReadSessionPolicyMatrix() throws Exception {
        Map<Class<? extends SourceAdapter>, SourceReadSessionPolicy.IsolationMode> expected = Map.of(
                PostgreSqlSourceAdapter.class, REPEATABLE_READ,
                MySqlSourceAdapter.class, REPEATABLE_READ,
                MariaDbSourceAdapter.class, REPEATABLE_READ,
                OracleSourceAdapter.class, READ_COMMITTED,
                TiberoSourceAdapter.class, READ_COMMITTED,
                SqlServerSourceAdapter.class, READ_COMMITTED,
                JdbcMetadataSourceAdapter.class, UNSUPPORTED);
        SourceAdapterRegistry registry = SourceAdapterRegistry.defaults();
        List<SourceAdapter> resolved = List.of(
                registry.resolve(connection("PostgreSQL", "17.6")),
                registry.resolve(connection("Oracle", "19.24.0.0.0")),
                registry.resolve(connection("Tibero", "7.2.0")),
                registry.resolve(connection("MySQL", "8.4.3")),
                registry.resolve(connection("MariaDB", "11.4.4")),
                registry.resolve(connection("Microsoft SQL Server", "16.00.1140")),
                registry.resolve(connection("LegacyDB", "1.0")));
        Map<Class<? extends SourceAdapter>, SourceAdapter> adaptersByType = new LinkedHashMap<>();
        resolved.forEach(adapter -> adaptersByType.put(adapter.getClass(), adapter));

        assertThat(adaptersByType.keySet())
                .containsExactlyInAnyOrderElementsOf(expected.keySet());

        expected.forEach((adapterType, isolationMode) -> {
            SourceAdapter adapter = adaptersByType.get(adapterType);
            SourceReadSessionPolicy policy = adapter.sourceReadSessionPolicy();

            assertThat(policy.isolationMode()).as(adapter.id()).isEqualTo(isolationMode);
            assertThat(policy.evidenceLevel())
                    .as(adapter.id())
                    .isEqualTo(adapter.identity().evidenceLevel());
            if (isolationMode == UNSUPPORTED) {
                assertThat(policy.supported()).as(adapter.id()).isFalse();
                return;
            }
            assertThat(policy.supported()).as(adapter.id()).isTrue();
            assertThat(policy.sourceFreezeRequired()).as(adapter.id()).isTrue();
            assertThat(policy.quotedIdentifiersSupported()).as(adapter.id()).isFalse();
            assertThat(policy.lobStreamingSupported()).as(adapter.id()).isFalse();
            assertThat(policy.executionPolicy())
                    .as(adapter.id())
                    .isEqualTo(ExecutionPolicy.MANUAL_ONLY);
        });
    }

    private static Connection connection(String product, String version) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(metadata.getDatabaseProductName()).willReturn(product);
        given(metadata.getDatabaseProductVersion()).willReturn(version);
        return connection;
    }
}
