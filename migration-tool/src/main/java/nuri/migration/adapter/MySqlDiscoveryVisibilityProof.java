package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * Narrow database-level relational visibility under Connector/J databaseTerm=SCHEMA.
 * A visible database or one table grant cannot establish a complete table/column inventory.
 * Only an explicit SELECT grant on this database to the authenticated account is accepted;
 * Only partial_revokes=0 has qualified literal grant spelling; global, role, wildcard-pattern
 * and catalog-mode qualification remain outside this proof.
 * This does not prove read-only privileges or freeze concurrent source changes.
 *
 * @see <a href="https://dev.mysql.com/doc/refman/8.4/en/information-schema-schema-privileges-table.html">SCHEMA_PRIVILEGES</a>
 * @see <a href="https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-connection.html">databaseTerm</a>
 */
final class MySqlDiscoveryVisibilityProof {

    private static final Set<ObjectKind> RELATIONAL_KINDS = Set.of(
            ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY);
    private static final Set<String> SYSTEM_SCHEMAS = Set.of(
            "mysql", "information_schema", "performance_schema", "sys");

    static final String DATABASE_VISIBILITY_SQL = """
            SELECT DATABASE() AS current_schema_name,
                   CURRENT_USER() AS current_account,
                   @@GLOBAL.partial_revokes AS partial_revokes_enabled,
                   s.SCHEMA_NAME AS schema_name,
                   p.GRANTEE AS grantee,
                   p.TABLE_SCHEMA AS grant_schema_name,
                   p.PRIVILEGE_TYPE AS privilege_type
              FROM INFORMATION_SCHEMA.SCHEMATA s
              CROSS JOIN INFORMATION_SCHEMA.SCHEMA_PRIVILEGES p
             WHERE s.SCHEMA_NAME = ?
               AND p.TABLE_SCHEMA = ?
               AND p.PRIVILEGE_TYPE = 'SELECT'
               AND @@GLOBAL.partial_revokes = 0
               AND p.GRANTEE = CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(), '@', 1)),
                                      '@', QUOTE(SUBSTRING_INDEX(CURRENT_USER(), '@', -1)))
            """;

    private MySqlDiscoveryVisibilityProof() {}

    static DiscoveryVisibilityProof inspect(Connection connection, DiscoveryRequest request) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        if (!request.catalogs().isEmpty() || request.schemas().size() != 1
                || request.includeSystemObjects()
                || !RELATIONAL_KINDS.containsAll(request.objectKinds())) {
            return DiscoveryVisibilityProof.unproven();
        }
        String schema = request.schemas().iterator().next();
        String grantSchema = literalGrantSchema(schema);
        if (SYSTEM_SCHEMAS.contains(schema.toLowerCase(Locale.ROOT))) {
            return DiscoveryVisibilityProof.unproven();
        }
        try {
            if (!"MySQL Connector/J".equals(connection.getMetaData().getDriverName())) {
                return DiscoveryVisibilityProof.unproven();
            }
            // In Connector/J's default CATALOG mode getSchema() is a no-op returning null.
            // Proving that mode would leave schema-filtered JDBC rows empty and is unsafe.
            if (!schema.equals(connection.getSchema())) {
                return DiscoveryVisibilityProof.unproven();
            }
            try (PreparedStatement statement = connection.prepareStatement(DATABASE_VISIBILITY_SQL)) {
                statement.setString(1, schema);
                // MySQL stores literal '_'/'%' escapes in mysql.db and SCHEMA_PRIVILEGES,
                // while SCHEMATA and JDBC TABLE_SCHEM retain the actual database name.
                // Exact escaped spelling accepts a literal database grant, never a LIKE match.
                statement.setString(2, grantSchema);
                try (ResultSet rows = statement.executeQuery()) {
                    if (!rows.next()
                            || !schema.equals(rows.getString("current_schema_name"))
                            || !schema.equals(rows.getString("schema_name"))
                            || !"0".equals(rows.getString("partial_revokes_enabled"))
                            || !grantSchema.equals(rows.getString("grant_schema_name"))
                            || !"SELECT".equals(rows.getString("privilege_type"))
                            || !matchesAccount(rows.getString("current_account"), rows.getString("grantee"))
                            || rows.next()) {
                        return DiscoveryVisibilityProof.unproven();
                    }
                    return DiscoveryVisibilityProof.forSchemas(request.schemas());
                }
            }
        } catch (SQLException failure) {
            // Keep the baseline's fixed source-visibility-proof blocker, without raw vendor details.
            return DiscoveryVisibilityProof.unproven();
        }
    }

    private static String literalGrantSchema(String schema) {
        StringBuilder pattern = new StringBuilder(schema.length());
        for (int index = 0; index < schema.length(); index++) {
            char character = schema.charAt(index);
            if (character == '\\' || character == '_' || character == '%') {
                pattern.append('\\');
            }
            pattern.append(character);
        }
        return pattern.toString();
    }

    private static boolean matchesAccount(String account, String grantee) {
        if (account == null || grantee == null) {
            return false;
        }
        int separator = account.indexOf('@');
        if (separator <= 0 || separator != account.lastIndexOf('@')) {
            return false;
        }
        String user = account.substring(0, separator);
        String host = account.substring(separator + 1);
        // Complex quoted identities are not qualified by this narrowly exercised account route.
        return user.matches("[A-Za-z0-9_]+") && host.matches("[A-Za-z0-9_.:%-]+")
                && grantee.equals("'" + user + "'@'" + host + "'");
    }
}
