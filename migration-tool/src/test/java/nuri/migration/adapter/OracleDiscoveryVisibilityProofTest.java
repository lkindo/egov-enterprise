package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class OracleDiscoveryVisibilityProofTest {

    @Test
    void explicitLocalOwnerMayHaveZeroObjectsWithoutBeingUnproven() throws Exception {
        Fixture fixture = fixture("APP");
        DiscoveryRequest request = request("APP");

        DiscoveryVisibilityProof proof = OracleDiscoveryVisibilityProof.inspect(fixture.connection(), request);

        assertThat(proof.covers(request)).isTrue();
        assertThat(proof.wholeSource()).isFalse();
        assertThat(proof.covers(request("OTHER"))).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"session_user_name", "current_user_name", "current_schema_name", "owner_name"})
    void everyOwnerIdentityMustMatchExactly(String column) throws Exception {
        Fixture fixture = fixture("APP");
        given(fixture.rows().getString(column)).willReturn("app");

        assertThat(OracleDiscoveryVisibilityProof.inspect(fixture.connection(), request("APP")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @ParameterizedTest
    @ValueSource(strings = {"session_user_name", "current_user_name", "current_schema_name", "owner_name",
            "ORACLE_MAINTAINED", "COMMON"})
    void missingIdentityOrAccountClassificationCannotProveVisibility(String column) throws Exception {
        Fixture fixture = fixture("APP");
        given(fixture.rows().getString(column)).willReturn(null);

        assertThat(OracleDiscoveryVisibilityProof.inspect(fixture.connection(), request("APP")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @Test
    void quotedOwnerIdentityIsNotUppercased() throws Exception {
        Fixture fixture = fixture("Mixed_Case");

        assertThat(OracleDiscoveryVisibilityProof.inspect(fixture.connection(), request("Mixed_Case"))
                .covers(request("Mixed_Case"))).isTrue();
    }

    @Test
    void otherSchemaWithAccessibleObjectsStillCannotBeProven() throws Exception {
        Fixture fixture = fixture("READER");
        given(fixture.rows().getLong("object_count")).willReturn(100L);

        assertThat(OracleDiscoveryVisibilityProof.inspect(fixture.connection(), request("OWNER")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @Test
    void systemAndCommonAccountsCannotProveAnOrdinaryLocalOwnerScope() throws Exception {
        Fixture system = fixture("SYS");
        given(system.rows().getString("ORACLE_MAINTAINED")).willReturn("Y");
        Fixture common = fixture("C##APP");
        given(common.rows().getString("COMMON")).willReturn("YES");

        assertThat(OracleDiscoveryVisibilityProof.inspect(system.connection(), request("SYS")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
        assertThat(OracleDiscoveryVisibilityProof.inspect(common.connection(), request("C##APP")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @Test
    void broaderAndUnqualifiedObjectScopesAreRejectedBeforeReadingAnyCatalog() {
        Connection connection = mock(Connection.class);
        for (DiscoveryRequest request : Set.of(
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("APP", "OTHER"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of("DB"), Set.of("APP"), Set.of(ObjectKind.TABLE), false),
                new DiscoveryRequest(Set.of(), Set.of("APP"), Set.of(ObjectKind.TABLE), true),
                new DiscoveryRequest(Set.of(), Set.of("APP"), Set.of(ObjectKind.TABLE, ObjectKind.POLICY), false))) {
            assertThat(OracleDiscoveryVisibilityProof.inspect(connection, request))
                    .isEqualTo(DiscoveryVisibilityProof.unproven());
        }
        verifyNoInteractions(connection);
    }

    @Test
    void failedCatalogReadCannotBecomeSuccessfulEmptyProof() throws Exception {
        Connection connection = mock(Connection.class);
        given(connection.prepareStatement(OracleDiscoveryVisibilityProof.OWNER_VISIBILITY_SQL))
                .willThrow(new SQLException("sensitive vendor details", "42501"));

        assertThat(OracleDiscoveryVisibilityProof.inspect(connection, request("APP")))
                .isEqualTo(DiscoveryVisibilityProof.unproven());
    }

    @Test
    void absentDuplicateAndNullCensusRowsCannotProveVisibility() throws Exception {
        Fixture absent = fixture("APP");
        given(absent.rows().next()).willReturn(false);
        Fixture duplicate = fixture("APP");
        given(duplicate.rows().next()).willReturn(true, true, false);
        Fixture missingCount = fixture("APP");
        given(missingCount.rows().wasNull()).willReturn(true);
        Fixture invalidCount = fixture("APP");
        given(invalidCount.rows().getLong("object_count")).willReturn(-1L);

        for (Fixture fixture : Set.of(absent, duplicate, missingCount, invalidCount)) {
            assertThat(OracleDiscoveryVisibilityProof.inspect(fixture.connection(), request("APP")))
                    .isEqualTo(DiscoveryVisibilityProof.unproven());
        }
    }

    private static Fixture fixture(String owner) throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        given(connection.prepareStatement(OracleDiscoveryVisibilityProof.OWNER_VISIBILITY_SQL)).willReturn(statement);
        given(statement.executeQuery()).willReturn(rows);
        given(rows.next()).willReturn(true, false);
        for (String column : Set.of("session_user_name", "current_user_name", "current_schema_name", "owner_name")) {
            given(rows.getString(column)).willReturn(owner);
        }
        given(rows.getString("ORACLE_MAINTAINED")).willReturn("N");
        given(rows.getString("COMMON")).willReturn("NO");
        given(rows.getLong("object_count")).willReturn(0L);
        return new Fixture(connection, rows);
    }

    private static DiscoveryRequest request(String schema) {
        return new DiscoveryRequest(Set.of(), Set.of(schema),
                Set.of(ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
    }

    private record Fixture(Connection connection, ResultSet rows) {}
}
