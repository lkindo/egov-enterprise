package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.jdbc.JvmFailureBoundary;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * Relational metadata visibility for the rehearsed Microsoft driver and a current sysadmin context.
 * This route covers only dbo in the connected non-system database; ordinary grants remain unproven.
 * Sysadmin bypasses DENY. This proves neither read-only privileges nor operator freeze or load support.
 */
final class SqlServerDiscoveryVisibilityProof {
    private static final Set<ObjectKind> RELATIONAL_KINDS = Set.of(
            ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY);
    private static final Set<String> SYSTEM_DATABASES = Set.of("master", "model", "msdb", "tempdb");

    static final String DATABASE_VISIBILITY_SQL = """
            SELECT DB_NAME() AS current_catalog_name,
                   SCHEMA_NAME() AS current_schema_name,
                   ORIGINAL_LOGIN() AS original_login_name,
                   SUSER_SNAME() AS current_login_name,
                   USER_NAME() AS current_user_name,
                   IS_SRVROLEMEMBER('sysadmin') AS sysadmin_membership,
                   s.name AS schema_name
              FROM sys.schemas s
             WHERE s.name = ?
               AND DB_NAME() = ?
               AND SCHEMA_NAME() = ?
               AND IS_SRVROLEMEMBER('sysadmin') = 1
               AND ORIGINAL_LOGIN() = SUSER_SNAME()
               AND USER_NAME() = 'dbo'
            """;

    private SqlServerDiscoveryVisibilityProof() {}

    static DiscoveryVisibilityProof inspect(Connection connection, DiscoveryRequest request) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        if (!request.catalogs().isEmpty() || !request.schemas().equals(Set.of("dbo"))
                || request.includeSystemObjects()
                || !RELATIONAL_KINDS.containsAll(request.objectKinds())) {
            return DiscoveryVisibilityProof.unproven();
        }
        try {
            DatabaseMetaData metadata = connection.getMetaData();
            String catalog = connection.getCatalog();
            if (!"Microsoft SQL Server".equals(metadata.getDatabaseProductName())
                    || !"Microsoft JDBC Driver 13.6 for SQL Server".equals(metadata.getDriverName())
                    || !"13.6.0.0".equals(metadata.getDriverVersion())
                    || catalog == null || catalog.isBlank()
                    || SYSTEM_DATABASES.contains(catalog.toLowerCase(Locale.ROOT))
                    || !"dbo".equals(connection.getSchema())) {
                return DiscoveryVisibilityProof.unproven();
            }
            try (PreparedStatement statement = connection.prepareStatement(DATABASE_VISIBILITY_SQL)) {
                statement.setString(1, "dbo");
                statement.setString(2, catalog);
                statement.setString(3, "dbo");
                try (ResultSet rows = statement.executeQuery()) {
                    if (!rows.next()) return DiscoveryVisibilityProof.unproven();
                    // Read once from left to right under Microsoft's adaptive response buffering contract.
                    String actualCatalog = rows.getString("current_catalog_name");
                    String actualSchema = rows.getString("current_schema_name");
                    String originalLogin = rows.getString("original_login_name");
                    String currentLogin = rows.getString("current_login_name");
                    String currentUser = rows.getString("current_user_name");
                    int sysadminMembership = rows.getInt("sysadmin_membership");
                    String physicalSchema = rows.getString("schema_name");
                    if (!catalog.equals(actualCatalog)
                            || !"dbo".equals(actualSchema)
                            || !"dbo".equals(physicalSchema)
                            || !"dbo".equals(currentUser)
                            || sysadminMembership != 1
                            || !sameLogin(originalLogin, currentLogin)
                            || rows.next()) {
                        return DiscoveryVisibilityProof.unproven();
                    }
                    return DiscoveryVisibilityProof.forSchemas(request.schemas());
                }
            }
        } catch (SQLException failure) {
            JvmFailureBoundary.rethrowSuppressedFatal(failure);
            // Let the baseline publish its fixed blocker; never persist SQL or account/vendor details.
            return DiscoveryVisibilityProof.unproven();
        } catch (RuntimeException | Error failure) {
            JvmFailureBoundary.rethrowSuppressedFatal(failure);
            throw failure;
        }
    }

    private static boolean sameLogin(String original, String current) {
        return original != null && !original.isBlank() && original.equals(current);
    }
}
