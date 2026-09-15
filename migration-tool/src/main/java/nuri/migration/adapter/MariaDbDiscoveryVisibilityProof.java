package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * Direct database SELECT visibility under MariaDB Connector/J useCatalogTerm=SCHEMA.
 * Only the authenticated account's literal database grant with no active role is qualified.
 * Global, role, PUBLIC, wildcard, table and column grants do not establish this proof.
 * This does not prove read-only privileges or freeze concurrent source changes.
 */
final class MariaDbDiscoveryVisibilityProof {

    private static final Set<ObjectKind> RELATIONAL_KINDS = Set.of(
            ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY);
    private static final Set<String> SYSTEM_SCHEMAS = Set.of(
            "mysql", "information_schema", "performance_schema", "sys");

    static final String DATABASE_VISIBILITY_SQL = """
            SELECT DATABASE() AS current_schema_name,
                   CURRENT_USER() AS current_account,
                   CASE WHEN CURRENT_ROLE() IS NULL THEN 'NONE' ELSE CURRENT_ROLE() END AS current_role_state,
                   s.SCHEMA_NAME AS schema_name,
                   p.GRANTEE AS grantee,
                   p.TABLE_CATALOG AS grant_catalog_name,
                   p.TABLE_SCHEMA AS grant_schema_name,
                   p.PRIVILEGE_TYPE AS privilege_type
              FROM INFORMATION_SCHEMA.SCHEMATA s
              CROSS JOIN INFORMATION_SCHEMA.SCHEMA_PRIVILEGES p
             WHERE s.SCHEMA_NAME = ?
               AND p.TABLE_SCHEMA = ?
               AND p.TABLE_CATALOG = 'def'
               AND p.PRIVILEGE_TYPE = 'SELECT'
               AND CURRENT_ROLE() IS NULL
               AND p.GRANTEE = CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(), '@', 1)),
                                      '@', QUOTE(SUBSTRING_INDEX(CURRENT_USER(), '@', -1)))
            """;

    private MariaDbDiscoveryVisibilityProof() {}

    static DiscoveryVisibilityProof inspect(Connection connection, DiscoveryRequest request) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        if (!request.catalogs().isEmpty() || request.schemas().size() != 1
                || request.includeSystemObjects()
                || !RELATIONAL_KINDS.containsAll(request.objectKinds())) {
            return DiscoveryVisibilityProof.unproven();
        }
        String schema = request.schemas().iterator().next();
        if (SYSTEM_SCHEMAS.contains(schema.toLowerCase(Locale.ROOT))) {
            return DiscoveryVisibilityProof.unproven();
        }
        String grantSchema = literalGrantSchema(schema);
        try {
            DatabaseMetaData metadata = connection.getMetaData();
            if (!"MariaDB".equals(metadata.getDatabaseProductName())
                    || !"MariaDB Connector/J".equals(metadata.getDriverName())
                    || !"def".equals(connection.getCatalog())
                    || !schema.equals(connection.getSchema())) {
                return DiscoveryVisibilityProof.unproven();
            }
            try (PreparedStatement statement = connection.prepareStatement(DATABASE_VISIBILITY_SQL)) {
                statement.setString(1, schema);
                // SCHEMATA retains the actual name; the grant catalog retains literal pattern escapes.
                statement.setString(2, grantSchema);
                try (ResultSet rows = statement.executeQuery()) {
                    if (!rows.next()
                            || !schema.equals(rows.getString("current_schema_name"))
                            || !schema.equals(rows.getString("schema_name"))
                            || !"NONE".equals(rows.getString("current_role_state"))
                            || !"def".equals(rows.getString("grant_catalog_name"))
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
            // Preserve the baseline's fixed source-visibility-proof blocker without raw vendor details.
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
        // Quoted or ambiguous identities remain outside the exercised account route.
        return user.matches("[A-Za-z0-9_]+") && host.matches("[A-Za-z0-9_.:%-]+")
                && grantee.equals("'" + user + "'@'" + host + "'");
    }
}
