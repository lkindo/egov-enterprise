package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** A database READ_ONLY observation replaces only the unavailable JDBC hint, not privilege evidence. */
class SqlServerPreflightTest {
    @Test
    void physicalReadOnlyDatabaseQualifiesWhileJdbcSignalStaysFalse() throws Exception {
        Fixture fixture = fixture();
        SqlServerSourceAdapter adapter = new SqlServerSourceAdapter();

        AdapterPreflight report = adapter.preflight(fixture.connection(), request());

        assertThat(report.identity()).isEqualTo(adapter.identity());
        assertThat(report.identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        assertThat(report.database().productName()).isEqualTo("Microsoft SQL Server");
        assertThat(report.database().driverName()).isEqualTo("Microsoft JDBC Driver 13.6 for SQL Server");
        assertThat(report.database().driverVersion()).isEqualTo("13.6.0.0");
        assertThat(report.adapterMatches()).isTrue();
        assertThat(report.connectionReadOnlySignal()).isFalse();
        assertThat(report.hasBlockingFindings()).isFalse();
        assertThat(report.findings()).extracting(PreflightFinding::code)
                .containsExactlyInAnyOrder("SQLSERVER_DATABASE_READ_ONLY", "PRIVILEGE_PROOF_REQUIRED",
                        "UNVERIFIED_VENDOR_EVIDENCE");
        assertThat(report.findings()).allMatch(finding -> finding.severity() == PreflightSeverity.WARNING);
        var reads = inOrder(fixture.rows());
        reads.verify(fixture.rows()).next();
        reads.verify(fixture.rows()).getString("current_catalog_name");
        reads.verify(fixture.rows()).getString("updateability");
        reads.verify(fixture.rows()).next();
        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
        verify(fixture.connection(), never()).setReadOnly(true);
        verify(fixture.connection(), never()).setCatalog(anyString());
        verify(fixture.connection(), never()).createStatement();
        verify(fixture.statement(), never()).executeUpdate();
        verify(fixture.statement(), never()).executeBatch();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"READ_WRITE", "", " ", "read_only", "READ_ONLY ", "UNKNOWN"})
    void updateabilityMustBeExactReadOnly(String updateability) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString("updateability")).willReturn(updateability);

        assertReadOnlyBlocked(preflight(fixture));

        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "other_database", "MIGRATION_FIXTURE"})
    void physicalCatalogMustMatchTheConnectedCatalogExactly(String physicalCatalog) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString("current_catalog_name")).willReturn(physicalCatalog);

        assertReadOnlyBlocked(preflight(fixture));
    }

    @Test
    void absentPhysicalRowsRemainBlocked() throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().next()).willReturn(false);

        assertReadOnlyBlocked(preflight(fixture));

        verify(fixture.rows(), never()).getString(anyString());
        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @Test
    void duplicatePhysicalRowsCannotQualifyEvenWhenTheFirstRowMatches() throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().next()).willReturn(true, true, false);

        assertReadOnlyBlocked(preflight(fixture));

        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "master", "model", "msdb", "tempdb", "MASTER"})
    void unidentifiedOrSystemConnectedCatalogCannotUseThePhysicalRoute(String catalog) throws Exception {
        Fixture fixture = fixture();
        given(fixture.connection().getCatalog()).willReturn(catalog);

        assertReadOnlyBlocked(preflight(fixture));

        verify(fixture.connection(), never()).prepareStatement(anyString());
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "Microsoft SQL", "MySQL", "Oracle"})
    void anotherProductKeepsBothBaselineBlockers(String product) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDatabaseProductName()).willReturn(product);

        AdapterPreflight report = preflight(fixture);

        assertReadOnlyBlocked(report);
        assertThat(report.adapterMatches()).isFalse();
        assertThat(report.findings()).filteredOn(finding -> finding.severity() == PreflightSeverity.BLOCKING)
                .extracting(PreflightFinding::code)
                .containsExactlyInAnyOrder("ADAPTER_PRODUCT_MISMATCH", "READ_ONLY_SIGNAL_MISSING");
        verify(fixture.connection(), never()).prepareStatement(anyString());
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @Test
    void caseVariantMatchesTheFamilyButCannotUseTheExactPhysicalReadOnlyRoute() throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDatabaseProductName()).willReturn("Microsoft sql server");

        AdapterPreflight report = preflight(fixture);

        assertThat(report.adapterMatches()).isTrue();
        assertReadOnlyBlocked(report);
        assertThat(report.findings()).filteredOn(finding -> finding.severity() == PreflightSeverity.BLOCKING)
                .extracting(PreflightFinding::code).containsExactly("READ_ONLY_SIGNAL_MISSING");
        verify(fixture.connection(), never()).prepareStatement(anyString());
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "Microsoft JDBC Driver for SQL Server",
            "Microsoft JDBC Driver 13.4 for SQL Server", "jTDS"})
    void anotherOrUnidentifiedDriverCannotUseThePhysicalRoute(String driverName) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDriverName()).willReturn(driverName);

        assertReadOnlyBlocked(preflight(fixture));

        verify(fixture.connection(), never()).prepareStatement(anyString());
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "13.6.0", "13.6.1.0", "13.5.0.0"})
    void unrehearsedDriverPatchCannotUseThePhysicalRoute(String driverVersion) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDriverVersion()).willReturn(driverVersion);

        assertReadOnlyBlocked(preflight(fixture));

        verify(fixture.connection(), never()).prepareStatement(anyString());
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "unknown"})
    void missingProductVersionRetainsAdapterMismatchAndReadOnlyBlockers(String version) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDatabaseProductVersion()).willReturn(version);

        AdapterPreflight report = preflight(fixture);

        assertReadOnlyBlocked(report);
        assertThat(report.adapterMatches()).isFalse();
        assertThat(report.findings()).filteredOn(finding -> finding.severity() == PreflightSeverity.BLOCKING)
                .extracting(PreflightFinding::code)
                .containsExactlyInAnyOrder("ADAPTER_PRODUCT_MISMATCH", "READ_ONLY_SIGNAL_MISSING");
        verify(fixture.connection(), never()).prepareStatement(anyString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"catalog", "prepare", "query", "next", "catalog_field", "updateability_field",
            "last_next", "rows_close", "statement_close"})
    void physicalJdbcFailuresReturnTheUnchangedSafeBaselineBlocker(String failurePoint) throws Exception {
        Fixture fixture = fixture();
        SQLException failure = new SQLException("sensitive fixture account and SQL details", "42000");
        switch (failurePoint) {
            case "catalog" -> given(fixture.connection().getCatalog()).willThrow(failure);
            case "prepare" -> given(fixture.connection().prepareStatement(SqlServerSourceAdapter.DATABASE_READ_ONLY_SQL))
                    .willThrow(failure);
            case "query" -> given(fixture.statement().executeQuery()).willThrow(failure);
            case "next" -> given(fixture.rows().next()).willThrow(failure);
            case "catalog_field" -> given(fixture.rows().getString("current_catalog_name")).willThrow(failure);
            case "updateability_field" -> given(fixture.rows().getString("updateability")).willThrow(failure);
            case "last_next" -> given(fixture.rows().next()).willReturn(true).willThrow(failure);
            case "rows_close" -> doThrow(failure).when(fixture.rows()).close();
            case "statement_close" -> doThrow(failure).when(fixture.statement()).close();
            default -> throw new IllegalArgumentException("unknown fixture failure point");
        }

        AdapterPreflight report = preflight(fixture);

        assertReadOnlyBlocked(report);
        assertThat(report.findings()).extracting(PreflightFinding::message)
                .noneMatch(message -> message.contains("sensitive") || message.contains("42000"));
        if (!Set.of("catalog", "prepare").contains(failurePoint)) verify(fixture.statement()).close();
        if (!Set.of("catalog", "prepare", "query").contains(failurePoint)) verify(fixture.rows()).close();
    }

    @Test
    void fatalPhysicalFailureIsNotTurnedIntoABaselineReport() throws Exception {
        Fixture fixture = fixture();
        OutOfMemoryError fatal = new OutOfMemoryError("injected fatal physical proof failure");
        given(fixture.rows().next()).willThrow(fatal);

        assertThatThrownBy(() -> preflight(fixture)).isSameAs(fatal);

        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @Test
    void fatalCloseFailureSuppressedBySqlFailureStillPropagates() throws Exception {
        Fixture fixture = fixture();
        SQLException queryFailure = new SQLException("injected physical query failure", "42000");
        OutOfMemoryError fatal = new OutOfMemoryError("injected fatal physical close failure");
        given(fixture.statement().executeQuery()).willThrow(queryFailure);
        doThrow(fatal).when(fixture.statement()).close();

        assertThatThrownBy(() -> preflight(fixture)).isSameAs(fatal);

        verify(fixture.statement()).close();
    }

    @Test
    void fatalCloseFailureSuppressedByRuntimeFailureStillPropagates() throws Exception {
        Fixture fixture = fixture();
        IllegalStateException rowFailure = new IllegalStateException("injected physical row failure");
        OutOfMemoryError fatal = new OutOfMemoryError("injected fatal physical close failure");
        given(fixture.rows().next()).willThrow(rowFailure);
        doThrow(fatal).when(fixture.statement()).close();

        assertThatThrownBy(() -> preflight(fixture)).isSameAs(fatal);

        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @Test
    void existingJdbcReadOnlySignalPreservesBaselineWithoutPhysicalSql() throws Exception {
        Fixture fixture = fixture();
        given(fixture.connection().isReadOnly()).willReturn(true);
        given(fixture.rows().getString("updateability")).willReturn("READ_WRITE");

        AdapterPreflight report = preflight(fixture);

        assertThat(report.adapterMatches()).isTrue();
        assertThat(report.connectionReadOnlySignal()).isTrue();
        assertThat(report.hasBlockingFindings()).isFalse();
        assertThat(report.findings()).extracting(PreflightFinding::code)
                .containsExactly("PRIVILEGE_PROOF_REQUIRED", "UNVERIFIED_VENDOR_EVIDENCE");
        verify(fixture.connection(), never()).prepareStatement(anyString());
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @Test
    void existingTrueHintDoesNotRemoveAnotherProductBlocker() throws Exception {
        Fixture fixture = fixture();
        given(fixture.connection().isReadOnly()).willReturn(true);
        given(fixture.metadata().getDatabaseProductName()).willReturn("MySQL");

        AdapterPreflight report = preflight(fixture);

        assertThat(report.connectionReadOnlySignal()).isTrue();
        assertThat(report.adapterMatches()).isFalse();
        assertThat(report.hasBlockingFindings()).isTrue();
        assertThat(report.findings()).extracting(PreflightFinding::code)
                .containsExactly("ADAPTER_PRODUCT_MISMATCH", "PRIVILEGE_PROOF_REQUIRED",
                        "UNVERIFIED_VENDOR_EVIDENCE");
        verify(fixture.connection(), never()).prepareStatement(anyString());
    }

    @Test
    void genericAdapterKeepsMissingReadOnlySignalBlockedForTheSameMicrosoftConnection() throws Exception {
        Fixture fixture = fixture();

        AdapterPreflight report = new JdbcMetadataSourceAdapter().preflight(fixture.connection(), request());

        assertReadOnlyBlocked(report);
        verify(fixture.connection(), never()).prepareStatement(anyString());
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    private static AdapterPreflight preflight(Fixture fixture) throws SQLException {
        return new SqlServerSourceAdapter().preflight(fixture.connection(), request());
    }

    private static void assertReadOnlyBlocked(AdapterPreflight report) {
        assertThat(report.connectionReadOnlySignal()).isFalse();
        assertThat(report.hasBlockingFindings()).isTrue();
        assertThat(report.findings()).filteredOn(finding -> finding.code().equals("READ_ONLY_SIGNAL_MISSING"))
                .singleElement().satisfies(finding -> {
                    assertThat(finding.severity()).isEqualTo(PreflightSeverity.BLOCKING);
                    assertThat(finding.message()).isEqualTo(
                            "source connection is not marked read-only; the adapter will not change it automatically");
                });
        assertThat(report.findings()).extracting(PreflightFinding::code)
                .contains("PRIVILEGE_PROOF_REQUIRED").doesNotContain("SQLSERVER_DATABASE_READ_ONLY");
    }

    private static DiscoveryRequest request() {
        return new DiscoveryRequest(Set.of(), Set.of("dbo"),
                Set.of(ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
    }

    private static Fixture fixture() throws SQLException {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.isReadOnly()).willReturn(false);
        given(connection.getCatalog()).willReturn("migration_fixture");
        given(metadata.getDatabaseProductName()).willReturn("Microsoft SQL Server");
        given(metadata.getDatabaseProductVersion()).willReturn("16.00.4295");
        given(metadata.getDriverName()).willReturn("Microsoft JDBC Driver 13.6 for SQL Server");
        given(metadata.getDriverVersion()).willReturn("13.6.0.0");
        given(connection.prepareStatement(SqlServerSourceAdapter.DATABASE_READ_ONLY_SQL)).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("current_catalog_name")).willReturn("migration_fixture");
        given(rows.getString("updateability")).willReturn("READ_ONLY");
        return new Fixture(connection, metadata, statement, rows);
    }

    private record Fixture(Connection connection, DatabaseMetaData metadata, PreparedStatement statement,
                           ResultSet rows) {}
}
