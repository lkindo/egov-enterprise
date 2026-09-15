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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class MariaDbDiscoveryVisibilityProofTest {

    @Test
    void directDatabaseSelectProvesOnlyTheExactRequestedSchemaAndClosesResources() throws Exception {
        Fixture fixture = fixture();
        DiscoveryRequest request = request("source");

        DiscoveryVisibilityProof proof = MariaDbDiscoveryVisibilityProof.inspect(fixture.connection(), request);

        assertThat(proof.covers(request)).isTrue();
        assertThat(proof.wholeSource()).isFalse();
        assertThat(proof.covers(request("other"))).isFalse();
        verify(fixture.statement()).setString(1, "source");
        verify(fixture.statement()).setString(2, "source");
        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    @Test
    void mariaDbAdapterPublishesTheExactSchemaVisibilityProof() throws Exception {
        Fixture fixture = fixture();
        DiscoveryRequest request = request("source");

        assertThat(new MariaDbSourceAdapter().visibilityProof(fixture.connection(), request).covers(request)).isTrue();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"MySQL Connector/J", "MariaDB JDBC", "mariadb connector/j"})
    void anotherOrUnidentifiedDriverCannotQualifyTheSchemaProjection(String driver) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDriverName()).willReturn(driver);

        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"MySQL", "MariaDB Server", "mariadb"})
    void anotherOrUnidentifiedProductCannotUseTheMariaDbGrantProof(String product) throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDatabaseProductName()).willReturn(product);

        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @ParameterizedTest
    @ValueSource(strings = {"source_db", "source%db"})
    void literalPatternCharactersUseExactEscapedGrantCatalogSpelling(String schema) throws Exception {
        Fixture fixture = fixture(schema);
        String escaped = schema.replace("_", "\\_").replace("%", "\\%");
        given(fixture.rows().getString("grant_schema_name")).willReturn(escaped);

        assertThat(MariaDbDiscoveryVisibilityProof.inspect(fixture.connection(), request(schema)).covers(request(schema)))
                .isTrue();
        verify(fixture.statement()).setString(1, schema);
        verify(fixture.statement()).setString(2, escaped);
    }

    @ParameterizedTest
    @ValueSource(strings = {"source_db", "source%db", "source\\db"})
    void unescapedGrantPatternsAreNotExactLiteralDatabaseGrants(String schema) throws Exception {
        Fixture fixture = fixture(schema);

        assertThat(MariaDbDiscoveryVisibilityProof.inspect(fixture.connection(), request(schema)))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @ParameterizedTest
    @ValueSource(strings = {"source%", "source_db", "source%db", "%", "source\\_%"})
    void broaderDatabaseGrantPatternCannotBecomeAnExactSchemaProof(String grantSchema) throws Exception {
        Fixture fixture = fixture("source_db");
        given(fixture.rows().getString("grant_schema_name")).willReturn(grantSchema);

        assertThat(MariaDbDiscoveryVisibilityProof.inspect(fixture.connection(), request("source_db")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @ParameterizedTest
    @ValueSource(strings = {"current_schema_name", "schema_name", "grant_schema_name", "grant_catalog_name"})
    void everyDatabaseIdentityMustMatchExactly(String column) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString(column)).willReturn("SOURCE");

        assertUnproven(fixture);
    }

    @ParameterizedTest
    @ValueSource(strings = {"current_schema_name", "current_account", "current_role_state", "schema_name", "grantee",
            "grant_catalog_name", "grant_schema_name", "privilege_type"})
    void missingEvidenceCannotProveVisibility(String column) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString(column)).willReturn(null);

        assertUnproven(fixture);
    }

    @ParameterizedTest
    @ValueSource(strings = {"reader_role", "none", ""})
    void activeOrUnrecognizedRoleStateCannotUseTheDirectAccountRoute(String roleState) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString("current_role_state")).willReturn(roleState);

        assertUnproven(fixture);
    }

    @Test
    void anotherAccountsOrRolesDatabaseGrantCannotImpersonateTheAuthenticatedAccount() throws Exception {
        for (String grantee : Set.of("'owner'@'%'", "'reader_role'@''", "PUBLIC")) {
            Fixture fixture = fixture();
            given(fixture.rows().getString("grantee")).willReturn(grantee);

            assertUnproven(fixture);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"user@part@%", "'user'@%", "user@", "@%", "user\\part@%"})
    void quotedOrAmbiguousAccountSyntaxCannotMatchAnotherGrantee(String account) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString("current_account")).willReturn(account);

        assertUnproven(fixture);
    }

    @Test
    void nonSelectPrivilegesAndAbsentOrDuplicateGrantRowsRemainUnproven() throws Exception {
        Fixture nonSelect = fixture();
        given(nonSelect.rows().getString("privilege_type")).willReturn("INSERT");
        Fixture absent = fixture();
        given(absent.rows().next()).willReturn(false);
        Fixture duplicate = fixture();
        given(duplicate.rows().next()).willReturn(true, true, false);

        for (Fixture fixture : Set.of(nonSelect, absent, duplicate)) {
            assertUnproven(fixture);
            verify(fixture.rows()).close();
            verify(fixture.statement()).close();
        }
    }

    @Test
    void catalogModeOrMismatchedConnectionDefaultsRemainUnprovenBeforePrivilegeQueries() throws Exception {
        Fixture catalogMode = fixture();
        given(catalogMode.connection().getCatalog()).willReturn("source");
        given(catalogMode.connection().getSchema()).willReturn(null);
        Fixture catalogMismatch = fixture();
        given(catalogMismatch.connection().getCatalog()).willReturn(null);
        Fixture schemaMismatch = fixture();
        given(schemaMismatch.connection().getSchema()).willReturn("another");

        for (Fixture fixture : Set.of(catalogMode, catalogMismatch, schemaMismatch)) {
            assertUnproven(fixture);
            verifyNoInteractions(fixture.statement(), fixture.rows());
        }
    }

    @Test
    void broaderObjectAndDatabaseScopesAreRejectedBeforeReadingMetadata() {
        Connection connection = mock(Connection.class);
        for (DiscoveryRequest request : Set.of(
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("source", "other"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of("def"), Set.of("source"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("source"), Set.of(ObjectKind.TABLE), true),
                new DiscoveryRequest(Set.of(), Set.of("source"), Set.of(ObjectKind.TABLE, ObjectKind.VIEW), false))) {
            assertThat(MariaDbDiscoveryVisibilityProof.inspect(connection, request))
                    .isEqualTo(DiscoveryVisibilityProof.unproven());
        }
        verifyNoInteractions(connection);
    }

    @ParameterizedTest
    @ValueSource(strings = {"mysql", "information_schema", "performance_schema", "sys", "MYSQL"})
    void systemDatabaseCannotProveOrdinarySourceVisibility(String schema) {
        Connection connection = mock(Connection.class);

        assertThat(MariaDbDiscoveryVisibilityProof.inspect(connection, request(schema)))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
        verifyNoInteractions(connection);
    }

    @Test
    void jdbcAndPrivilegeReadFailuresCannotBecomeProofAndAcquiredResourcesClose() throws Exception {
        Fixture metadataFailure = fixture();
        given(metadataFailure.metadata().getDriverName()).willThrow(new SQLException("sensitive details", "42000"));
        Fixture schemaFailure = fixture();
        given(schemaFailure.connection().getSchema()).willThrow(new SQLException("sensitive details", "42000"));
        Fixture grantFailure = fixture();
        given(grantFailure.statement().executeQuery()).willThrow(new SQLException("sensitive details", "42000"));
        Fixture rowFailure = fixture();
        given(rowFailure.rows().getString("schema_name")).willThrow(new SQLException("sensitive details", "42000"));
        Fixture closeFailure = fixture();
        doThrow(new SQLException("sensitive details", "42000"))
                .when(closeFailure.rows()).close();

        for (Fixture fixture : Set.of(metadataFailure, schemaFailure, grantFailure, rowFailure, closeFailure)) {
            assertUnproven(fixture);
        }
        verify(grantFailure.statement()).close();
        verify(rowFailure.rows()).close();
        verify(rowFailure.statement()).close();
        verify(closeFailure.statement()).close();
    }

    @Test
    void fatalJdbcFailurePropagatesAndClosesAcquiredResources() throws Exception {
        Fixture fixture = fixture();
        OutOfMemoryError fatal = new OutOfMemoryError("injected fatal JDBC failure");
        given(fixture.rows().next()).willThrow(fatal);

        assertThatThrownBy(() -> MariaDbDiscoveryVisibilityProof.inspect(fixture.connection(), request("source")))
                .isSameAs(fatal);
        verify(fixture.rows()).close();
        verify(fixture.statement()).close();
    }

    private static void assertUnproven(Fixture fixture) {
        assertThat(MariaDbDiscoveryVisibilityProof.inspect(fixture.connection(), request("source")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    private static Fixture fixture() throws Exception {
        return fixture("source");
    }

    private static Fixture fixture(String schema) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(metadata.getDatabaseProductName()).willReturn("MariaDB");
        given(metadata.getDriverName()).willReturn("MariaDB Connector/J");
        given(connection.getCatalog()).willReturn("def");
        given(connection.getSchema()).willReturn(schema);
        given(connection.prepareStatement(MariaDbDiscoveryVisibilityProof.DATABASE_VISIBILITY_SQL)).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, false);
        for (String column : Set.of("current_schema_name", "schema_name", "grant_schema_name")) {
            given(rows.getString(column)).willReturn(schema);
        }
        given(rows.getString("current_account")).willReturn("reader@%");
        given(rows.getString("grantee")).willReturn("'reader'@'%'");
        given(rows.getString("current_role_state")).willReturn("NONE");
        given(rows.getString("grant_catalog_name")).willReturn("def");
        given(rows.getString("privilege_type")).willReturn("SELECT");
        return new Fixture(connection, metadata, statement, rows);
    }

    private static DiscoveryRequest request(String schema) {
        return new DiscoveryRequest(Set.of(), Set.of(schema),
                Set.of(ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
    }

    private record Fixture(Connection connection, DatabaseMetaData metadata, PreparedStatement statement, ResultSet rows) {}
}
