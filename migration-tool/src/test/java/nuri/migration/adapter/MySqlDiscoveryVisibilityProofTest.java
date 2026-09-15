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
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class MySqlDiscoveryVisibilityProofTest {

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"MariaDB Connector/J", "MySQL JDBC", "mysql connector/j"})
    void anotherOrUnidentifiedDriverCannotProveConnectorJSchemaProjectionEvenWithDatabaseSelect(String driver)
            throws Exception {
        Fixture fixture = fixture();
        given(fixture.metadata().getDriverName()).willReturn(driver);

        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @Test
    void directDatabaseSelectProvesOnlyTheExactRequestedSchema() throws Exception {
        Fixture fixture = fixture();
        DiscoveryRequest request = request("source");

        DiscoveryVisibilityProof proof = MySqlDiscoveryVisibilityProof.inspect(fixture.connection(), request);

        assertThat(proof.covers(request)).isTrue();
        assertThat(proof.wholeSource()).isFalse();
        assertThat(proof.covers(request("other"))).isFalse();
        verify(fixture.statement()).setString(1, "source");
        verify(fixture.statement()).setString(2, "source");
    }

    @Test
    void mysqlAdapterPublishesTheExactSchemaVisibilityProof() throws Exception {
        Fixture fixture = fixture();
        DiscoveryRequest request = request("source");

        DiscoveryVisibilityProof proof = new MySqlSourceAdapter().visibilityProof(fixture.connection(), request);

        assertThat(proof.covers(request)).isTrue();
    }

    @Test
    void literalUnderscoreGrantUsesItsEscapedPrivilegeCatalogSpelling() throws Exception {
        Fixture fixture = fixture("source_db");
        given(fixture.rows().getString("grant_schema_name")).willReturn("source\\_db");

        assertThat(MySqlDiscoveryVisibilityProof.inspect(fixture.connection(), request("source_db"))
                .covers(request("source_db"))).isTrue();
        verify(fixture.statement()).setString(1, "source_db");
        verify(fixture.statement()).setString(2, "source\\_db");
    }

    @ParameterizedTest
    @ValueSource(strings = {"source_db", "source%db", "source\\db"})
    void unescapedPatternCharactersCannotBeAcceptedAsAnExactDatabaseGrant(String schema) throws Exception {
        Fixture fixture = fixture(schema);

        assertThat(MySqlDiscoveryVisibilityProof.inspect(fixture.connection(), request(schema)))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @ParameterizedTest
    @ValueSource(strings = {"source%", "source_db", "source%db", "%", "source\\_%"})
    void broaderGrantPatternCannotBecomeAnExactSchemaProof(String grantSchema) throws Exception {
        Fixture fixture = fixture("source_db");
        given(fixture.rows().getString("grant_schema_name")).willReturn(grantSchema);

        assertThat(MySqlDiscoveryVisibilityProof.inspect(fixture.connection(), request("source_db")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @ParameterizedTest
    @ValueSource(strings = {"current_schema_name", "schema_name", "grant_schema_name"})
    void everyDatabaseIdentityMustMatchExactly(String column) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString(column)).willReturn("SOURCE");

        assertUnproven(fixture);
    }

    @ParameterizedTest
    @ValueSource(strings = {"current_schema_name", "current_account", "schema_name", "grantee", "partial_revokes_enabled",
            "grant_schema_name", "privilege_type"})
    void missingEvidenceCannotProveVisibility(String column) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString(column)).willReturn(null);

        assertUnproven(fixture);
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "true", ""})
    void enabledOrUnrecognizedPartialRevokesModeCannotProveLiteralGrantSpelling(String mode) throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString("partial_revokes_enabled")).willReturn(mode);

        assertUnproven(fixture);
    }

    @Test
    void anotherAccountsDatabaseGrantCannotProveTheAuthenticatedAccountsVisibility() throws Exception {
        Fixture fixture = fixture();
        given(fixture.rows().getString("grantee")).willReturn("'owner'@'%'");

        assertUnproven(fixture);
    }

    @ParameterizedTest
    @ValueSource(strings = {"user@part@%", "'user'@%", "user@", "@%", "user\\part@%"})
    void unqualifiedQuotedOrAmbiguousAccountSyntaxCannotMatchAnotherGrantee(String account) throws Exception {
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
        }
    }

    @Test
    void defaultCatalogModeCannotTurnFilteredEmptyMetadataIntoProof() throws Exception {
        Fixture fixture = fixture();
        given(fixture.connection().getSchema()).willReturn(null);

        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @Test
    void currentDatabaseMustMatchTheRequestedScope() throws Exception {
        Fixture fixture = fixture();
        given(fixture.connection().getSchema()).willReturn("another");

        assertUnproven(fixture);
        verifyNoInteractions(fixture.statement(), fixture.rows());
    }

    @Test
    void broaderOrUnqualifiedObjectScopesAreRejectedBeforeReadingMetadata() {
        Connection connection = mock(Connection.class);
        for (DiscoveryRequest request : Set.of(
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("source", "other"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of("def"), Set.of("source"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("source"), Set.of(ObjectKind.TABLE), true),
                new DiscoveryRequest(Set.of(), Set.of("source"), Set.of(ObjectKind.TABLE, ObjectKind.VIEW), false))) {
            assertThat(MySqlDiscoveryVisibilityProof.inspect(connection, request))
                    .isEqualTo(DiscoveryVisibilityProof.unproven());
        }
        verifyNoInteractions(connection);
    }

    @ParameterizedTest
    @ValueSource(strings = {"mysql", "information_schema", "performance_schema", "sys", "MYSQL"})
    void systemDatabaseCannotProveOrdinarySourceVisibility(String schema) {
        Connection connection = mock(Connection.class);

        assertThat(MySqlDiscoveryVisibilityProof.inspect(connection, request(schema)))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
        verifyNoInteractions(connection);
    }

    @Test
    void jdbcDriverSchemaOrPrivilegeReadFailureCannotBecomeProof() throws Exception {
        Fixture driverFailure = fixture();
        given(driverFailure.metadata().getDriverName()).willThrow(new SQLException("sensitive details", "42000"));
        Fixture schemaFailure = fixture();
        given(schemaFailure.connection().getSchema()).willThrow(new SQLException("sensitive details", "42000"));
        Fixture grantFailure = fixture();
        given(grantFailure.statement().executeQuery()).willThrow(new SQLException("sensitive details", "42000"));

        assertUnproven(driverFailure);
        assertUnproven(schemaFailure);
        assertUnproven(grantFailure);
    }

    private static void assertUnproven(Fixture fixture) {
        assertThat(MySqlDiscoveryVisibilityProof.inspect(fixture.connection(), request("source")))
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
        given(metadata.getDriverName()).willReturn("MySQL Connector/J");
        given(connection.getSchema()).willReturn(schema);
        given(connection.prepareStatement(MySqlDiscoveryVisibilityProof.DATABASE_VISIBILITY_SQL))
                .willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, false);
        for (String column : Set.of("current_schema_name", "schema_name", "grant_schema_name")) {
            given(rows.getString(column)).willReturn(schema);
        }
        given(rows.getString("current_account")).willReturn("reader@%");
        given(rows.getString("grantee")).willReturn("'reader'@'%'");
        given(rows.getString("privilege_type")).willReturn("SELECT");
        given(rows.getString("partial_revokes_enabled")).willReturn("0");
        return new Fixture(connection, metadata, statement, rows);
    }

    private static DiscoveryRequest request(String schema) {
        return new DiscoveryRequest(Set.of(), Set.of(schema),
                Set.of(ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
    }

    private record Fixture(Connection connection, DatabaseMetaData metadata, PreparedStatement statement, ResultSet rows) {}
}
