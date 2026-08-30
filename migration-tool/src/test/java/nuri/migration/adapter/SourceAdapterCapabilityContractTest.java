package nuri.migration.adapter;

import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class SourceAdapterCapabilityContractTest {

    @Test
    void existingImplementationsRemainSourceCompatibleThroughConservativeDefaults() throws Exception {
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

        assertThat(minimal.identity().adapterId()).isEqualTo("minimal");
        assertThat(minimal.identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        assertThat(minimal.capabilities().objectSupport()).containsKeys(ObjectKind.values());
        assertThat(minimal.snapshotStrategy().executionPolicy()).isEqualTo(ExecutionPolicy.MANUAL_ONLY);
        assertThat(minimal.dataStreamingStrategy().executionPolicy()).isEqualTo(ExecutionPolicy.MANUAL_ONLY);
        assertThat(minimal.catalogQueries()).isEmpty();
    }

    @Test
    void everyVendorCapabilityIsTotalManualAndHonestAboutEvidence() {
        List<SourceAdapter> adapters = List.of(
                new PostgreSqlSourceAdapter(),
                new OracleSourceAdapter(),
                new TiberoSourceAdapter(),
                new MySqlSourceAdapter(),
                new MariaDbSourceAdapter(),
                new SqlServerSourceAdapter(),
                new JdbcMetadataSourceAdapter());

        for (SourceAdapter adapter : adapters) {
            assertThat(adapter.capabilities().objectSupport().keySet())
                    .as(adapter.id())
                    .containsExactlyInAnyOrder(ObjectKind.values());
            assertThat(adapter.snapshotStrategy().executionPolicy())
                    .as(adapter.id())
                    .isEqualTo(ExecutionPolicy.MANUAL_ONLY);
            assertThat(adapter.dataStreamingStrategy().executionPolicy())
                    .as(adapter.id())
                    .isEqualTo(ExecutionPolicy.MANUAL_ONLY);
            assertThat(adapter.identity().evidenceLevel())
                    .as(adapter.id())
                    .isIn(EvidenceLevel.EXPERIMENTAL, EvidenceLevel.UNVERIFIED);
        }
    }

    @Test
    void preflightReadsOnlyMetadataAndTreatsReadOnlyFlagAsASignalNotPrivilegeProof() throws Exception {
        SourceAdapter adapter = new OracleSourceAdapter();
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.isReadOnly()).willReturn(true);
        given(metadata.getDatabaseProductName()).willReturn("Oracle");
        given(metadata.getDatabaseProductVersion()).willReturn("19.0");
        given(metadata.getDriverName()).willReturn("Oracle JDBC");
        given(metadata.getDriverVersion()).willReturn("test");

        AdapterPreflight report = adapter.preflight(connection, DiscoveryRequest.allUserObjects());

        assertThat(report.adapterMatches()).isTrue();
        assertThat(report.connectionReadOnlySignal()).isTrue();
        assertThat(report.findings())
                .extracting(PreflightFinding::code)
                .contains("PRIVILEGE_PROOF_REQUIRED", "UNVERIFIED_VENDOR_EVIDENCE");
        assertThat(report.hasBlockingFindings()).isFalse();
        verify(connection, never()).prepareStatement(anyString());
        verify(connection, never()).createStatement();
    }

    @Test
    void absentReadOnlySignalBlocksPreflightWithoutAttemptingToEnableIt() throws Exception {
        SourceAdapter adapter = new MySqlSourceAdapter();
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.isReadOnly()).willReturn(false);
        given(metadata.getDatabaseProductName()).willReturn("MySQL");
        given(metadata.getDatabaseProductVersion()).willReturn("8.4");
        given(metadata.getDriverName()).willReturn("MySQL JDBC");
        given(metadata.getDriverVersion()).willReturn("test");

        AdapterPreflight report = adapter.preflight(connection, DiscoveryRequest.allUserObjects());

        assertThat(report.hasBlockingFindings()).isTrue();
        assertThat(report.findings())
                .filteredOn(finding -> finding.severity() == PreflightSeverity.BLOCKING)
                .extracting(PreflightFinding::code)
                .contains("READ_ONLY_SIGNAL_MISSING");
        verify(connection, never()).setReadOnly(true);
    }
}
