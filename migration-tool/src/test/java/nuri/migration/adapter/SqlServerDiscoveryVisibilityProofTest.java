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
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class SqlServerDiscoveryVisibilityProofTest {
    @Test
    void currentSysadminProvesOnlyRequestedDboAndClosesResources() throws Exception {
        Fixture fixture = fixture();
        DiscoveryVisibilityProof proof = SqlServerDiscoveryVisibilityProof.inspect(fixture.connection(), request());
        assertThat(proof.covers(request())).isTrue();
        assertThat(proof.wholeSource()).isFalse();
        assertThat(proof.catalogs()).isEmpty();
        assertThat(proof.schemas()).containsExactly("dbo");
        verify(fixture.statement()).setString(1, "dbo");
        verify(fixture.statement()).setString(2, "migration_fixture");
        verify(fixture.statement()).setString(3, "dbo");
        var reads = inOrder(fixture.rows());
        reads.verify(fixture.rows()).next();
        reads.verify(fixture.rows()).getString("current_catalog_name");
        reads.verify(fixture.rows()).getString("current_schema_name");
        reads.verify(fixture.rows()).getString("original_login_name");
        reads.verify(fixture.rows()).getString("current_login_name");
        reads.verify(fixture.rows()).getString("current_user_name");
        reads.verify(fixture.rows()).getInt("sysadmin_membership");
        reads.verify(fixture.rows()).getString("schema_name");
        reads.verify(fixture.rows()).next();
        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @Test
    void adapterPublishesTheQualifiedSysadminProof() throws Exception {
        Fixture fixture = fixture();
        assertThat(new SqlServerSourceAdapter().visibilityProof(fixture.connection(), request()).covers(request())).isTrue();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"Microsoft SQL", "Microsoft sql server", "MySQL"})
    void wrongOrUnidentifiedProductRemainsUnproven(String product) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDatabaseProductName()).willReturn(product);
        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"Microsoft JDBC Driver for SQL Server", "Microsoft JDBC Driver 13.4 for SQL Server", "jTDS"})
    void anotherDriverCannotReuseQualifiedServerMetadata(String driver) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDriverName()).willReturn(driver);
        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "13.6.1.0", "13.6.0", "13.5.0.0"})
    void unrehearsedDriverVersionRemainsUnproven(String version) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDriverVersion()).willReturn(version);
        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "master", "model", "msdb", "tempdb", "MASTER"})
    void unidentifiedOrSystemCatalogIsRejected(String catalog) throws Exception {
        Fixture fixture = fixture();
        given(fixture.connection().getCatalog()).willReturn(catalog);
        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "DBO", "other"})
    void connectionSchemaMustBeExactDbo(String schema) throws Exception {
        Fixture fixture = fixture();
        given(fixture.connection().getSchema()).willReturn(schema);
        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @ValueSource(strings = {"current_catalog_name", "current_schema_name", "schema_name", "current_user_name"})
    void physicalCatalogSchemaAndUserMustMatchExactly(String column) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString(column)).willReturn("OTHER");
        assertUnproven(fixture);
    }

    @ParameterizedTest
    @ValueSource(strings = {"current_catalog_name", "current_schema_name", "schema_name", "current_user_name",
            "original_login_name", "current_login_name"})
    void nullPhysicalEvidenceCannotProveVisibility(String column) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString(column)).willReturn(null);
        assertUnproven(fixture);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "fixture_reader"})
    void impersonatedOrUnidentifiedLoginRemainsUnproven(String currentLogin) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString("current_login_name")).willReturn(currentLogin);
        assertUnproven(fixture);
    }

    @Test
    void matchingButBlankLoginNamesCannotProveVisibility() throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString("original_login_name")).willReturn(" ");
        given(fixture.rows().getString("current_login_name")).willReturn(" ");
        assertUnproven(fixture);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, 2})
    void onlyExactCurrentSysadminMembershipQualifies(int membership) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getInt("sysadmin_membership")).willReturn(membership);
        assertUnproven(fixture);
    }

    @Test
    void absentOrDuplicatePhysicalSchemaRowsRemainUnproven() throws Exception {
        Fixture absent = fixture();
        given(absent.rows().next()).willReturn(false);
        Fixture duplicate = fixture();
        given(duplicate.rows().next()).willReturn(true, true, false);
        for (Fixture fixture : Set.of(absent, duplicate)) {
            assertUnproven(fixture);
            verify(fixture.rows()).close();
            verify(fixture.statement()).close();
        }
    }

    @Test
    void broaderRequestsNeverReadMetadata() {
        Connection connection = mock(Connection.class);
        for (DiscoveryRequest request : Set.of(
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("dbo", "other"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("DBO"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of("migration_fixture"), Set.of("dbo"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("dbo"), Set.of(ObjectKind.TABLE), true),
                new DiscoveryRequest(Set.of(), Set.of("dbo"), Set.of(ObjectKind.TABLE, ObjectKind.VIEW), false))) {
            assertThat(SqlServerDiscoveryVisibilityProof.inspect(connection, request)).isEqualTo(DiscoveryVisibilityProof.unproven());
        }
        verifyNoInteractions(connection);
    }

    @Test
    void jdbcFailuresStayUnprovenAndAcquiredResourcesClose() throws Exception {
        Fixture metadata = fixture();
        given(metadata.metadata().getDriverName()).willThrow(new SQLException("sensitive fixture details", "42000"));
        Fixture catalog = fixture();
        given(catalog.connection().getCatalog()).willThrow(new SQLException("sensitive fixture details", "42000"));
        Fixture prepare = fixture();
        given(prepare.connection().prepareStatement(SqlServerDiscoveryVisibilityProof.DATABASE_VISIBILITY_SQL))
                .willThrow(new SQLException("sensitive fixture details", "42000"));
        Fixture query = fixture();
        given(query.statement().executeQuery()).willThrow(new SQLException("sensitive fixture details", "42000"));
        Fixture row = fixture();
        given(row.rows().getString("schema_name")).willThrow(new SQLException("sensitive fixture details", "42000"));
        Fixture close = fixture();
        doThrow(new SQLException("sensitive fixture details", "42000")).when(close.rows()).close();
        for (Fixture fixture : Set.of(metadata, catalog, prepare, query, row, close)) assertUnproven(fixture);
        verify(query.statement()).close();
        verify(row.rows()).close();
        verify(row.statement()).close();
        verify(close.statement()).close();
    }

    @Test
    void fatalRowFailurePropagatesAfterResourcesClose() throws Exception {
        Fixture fixture = fixture();
        OutOfMemoryError fatal = new OutOfMemoryError("injected fatal JDBC failure");
        given(fixture.rows().next()).willThrow(fatal);
        assertThatThrownBy(() -> SqlServerDiscoveryVisibilityProof.inspect(fixture.connection(), request())).isSameAs(fatal);
        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @Test
    void fatalCloseFailureSuppressedBySqlFailureStillPropagates() throws Exception {
        Fixture fixture = fixture();
        SQLException rowFailure = new SQLException("injected JDBC row failure", "42000");
        OutOfMemoryError fatal = new OutOfMemoryError("injected fatal JDBC close failure");
        given(fixture.rows().getString("schema_name")).willThrow(rowFailure);
        doThrow(fatal).when(fixture.rows()).close();

        assertThatThrownBy(() -> SqlServerDiscoveryVisibilityProof.inspect(fixture.connection(), request()))
                .isSameAs(fatal);

        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @Test
    void fatalCloseFailureSuppressedByRuntimeFailureStillPropagates() throws Exception {
        Fixture fixture = fixture();
        IllegalStateException rowFailure = new IllegalStateException("injected JDBC row failure");
        OutOfMemoryError fatal = new OutOfMemoryError("injected fatal JDBC close failure");
        given(fixture.rows().getString("schema_name")).willThrow(rowFailure);
        doThrow(fatal).when(fixture.rows()).close();

        assertThatThrownBy(() -> SqlServerDiscoveryVisibilityProof.inspect(fixture.connection(), request()))
                .isSameAs(fatal);

        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    private static void assertUnproven(Fixture fixture) {
        assertThat(SqlServerDiscoveryVisibilityProof.inspect(fixture.connection(), request())).isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    private static Fixture fixture() throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(metadata.getDatabaseProductName()).willReturn("Microsoft SQL Server");
        given(metadata.getDriverName()).willReturn("Microsoft JDBC Driver 13.6 for SQL Server");
        given(metadata.getDriverVersion()).willReturn("13.6.0.0");
        given(connection.getCatalog()).willReturn("migration_fixture");
        given(connection.getSchema()).willReturn("dbo");
        given(connection.prepareStatement(SqlServerDiscoveryVisibilityProof.DATABASE_VISIBILITY_SQL)).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("current_catalog_name")).willReturn("migration_fixture");
        for (String column : Set.of("current_schema_name", "schema_name", "current_user_name")) {
            given(rows.getString(column)).willReturn("dbo");
        }
        given(rows.getString("original_login_name")).willReturn("fixture_admin");
        given(rows.getString("current_login_name")).willReturn("fixture_admin");
        given(rows.getInt("sysadmin_membership")).willReturn(1);
        return new Fixture(connection, metadata, statement, rows);
    }

    private static DiscoveryRequest request() {
        return new DiscoveryRequest(Set.of(), Set.of("dbo"),
                Set.of(ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
    }

    private record Fixture(Connection connection, DatabaseMetaData metadata, PreparedStatement statement, ResultSet rows) {}
}
