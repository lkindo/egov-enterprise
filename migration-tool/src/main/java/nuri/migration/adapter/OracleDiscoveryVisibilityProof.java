package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Objects;
import java.util.Set;

/**
 * Explicit local-owner schema visibility, without a DBA privilege or global catalog claim.
 * USER_OBJECTS covers objects owned by CURRENT_USER; ALL_* success alone only covers accessible objects.
 * This proves metadata visibility, not SELECT-only privileges or a frozen data snapshot.
 *
 * @see <a href="https://docs.oracle.com/en/database/oracle/oracle-database/26/refrn/USER_OBJECTS.html">USER_OBJECTS</a>
 * @see <a href="https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/SYS_CONTEXT.html">SYS_CONTEXT</a>
 */
final class OracleDiscoveryVisibilityProof {

    // Only the local-owner relational inventory exercised by the workflow is qualified here.
    // Other Oracle routes retain their partial scope or unsupported findings until separately verified.
    private static final Set<ObjectKind> OWNER_RELATIONAL_KINDS = Set.of(
            ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY);

    static final String OWNER_VISIBILITY_SQL = """
            SELECT SYS_CONTEXT('USERENV', 'SESSION_USER') AS session_user_name,
                   SYS_CONTEXT('USERENV', 'CURRENT_USER') AS current_user_name,
                   SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS current_schema_name,
                   u.USERNAME AS owner_name, u.ORACLE_MAINTAINED, u.COMMON,
                   (SELECT COUNT(*) FROM SYS.USER_OBJECTS) AS object_count
              FROM SYS.USER_USERS u
            """;

    private OracleDiscoveryVisibilityProof() {}

    static DiscoveryVisibilityProof inspect(Connection connection, DiscoveryRequest request) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        if (!request.catalogs().isEmpty() || request.schemas().size() != 1
                || request.includeSystemObjects()
                || !OWNER_RELATIONAL_KINDS.containsAll(request.objectKinds())) {
            return DiscoveryVisibilityProof.unproven();
        }
        String schema = request.schemas().iterator().next();
        try (PreparedStatement statement = connection.prepareStatement(OWNER_VISIBILITY_SQL);
             ResultSet rows = statement.executeQuery()) {
            if (!rows.next()
                    || !schema.equals(rows.getString("session_user_name"))
                    || !schema.equals(rows.getString("current_user_name"))
                    || !schema.equals(rows.getString("current_schema_name"))
                    || !schema.equals(rows.getString("owner_name"))
                    || !"N".equals(rows.getString("ORACLE_MAINTAINED"))
                    || !"NO".equals(rows.getString("COMMON"))) {
                return DiscoveryVisibilityProof.unproven();
            }
            long objectCount = rows.getLong("object_count");
            if (rows.wasNull() || objectCount < 0 || rows.next()) {
                return DiscoveryVisibilityProof.unproven();
            }
            return DiscoveryVisibilityProof.forSchemas(request.schemas());
        } catch (SQLException failure) {
            // The JDBC baseline retains its blocking source-visibility-proof finding without raw SQL details.
            return DiscoveryVisibilityProof.unproven();
        }
    }
}
