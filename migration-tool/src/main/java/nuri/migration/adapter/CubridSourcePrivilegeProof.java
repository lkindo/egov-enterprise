package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.jdbc.JvmFailureBoundary;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Exact, read-only catalog proof for one CUBRID owner schema and a non-owner login.
 *
 * <p>The public {@code db_class}/{@code db_auth} views are authorization-filtered and cannot prove
 * that an ungranted or write-only object is absent. The migration login must therefore have direct
 * SELECT access to {@code _db_class} and {@code _db_auth}; failure to read either internal catalog
 * makes this proof fail closed.</p>
 */
final class CubridSourcePrivilegeProof {

    static final String CURRENT_USER_SQL = "SELECT CURRENT_USER AS current_user_name";
    static final String DIRECT_GROUPS_SQL = """
            SELECT g.name AS group_name
              FROM db_user u, TABLE(u.direct_groups) AS t(g)
             WHERE u.name = CURRENT_USER
             ORDER BY g.name
            """;
    static final String SOURCE_OBJECTS_SQL = """
            SELECT CAST(c.owner.name AS VARCHAR(255)) AS owner_name,
                   c.class_name,
                   CASE c.class_type WHEN 0 THEN 'CLASS' WHEN 1 THEN 'VCLASS' ELSE 'UNKNOWN' END AS class_type
              FROM _db_class c
             WHERE UPPER(c.owner.name) = UPPER(?)
               AND MOD(c.is_system_class, 2) = 0
               AND c.class_type IN (0, 1)
             ORDER BY c.class_name
            """;
    static final String SOURCE_GRANTS_SQL = """
            SELECT CAST(c.owner.name AS VARCHAR(255)) AS owner_name,
                   c.class_name AS object_name,
                   CASE c.class_type WHEN 0 THEN 'CLASS' WHEN 1 THEN 'VCLASS' ELSE 'UNKNOWN' END AS object_type,
                   CAST(a.grantee.name AS VARCHAR(255)) AS grantee_name,
                   a.auth_type,
                   CASE a.is_grantable WHEN 0 THEN 'NO' ELSE 'YES' END AS is_grantable
              FROM _db_auth a, _db_class c
             WHERE a.object_of = c.class_of
               AND a.object_type = 0
               AND UPPER(c.owner.name) = UPPER(?)
               AND MOD(c.is_system_class, 2) = 0
               AND (UPPER(a.grantee.name) = UPPER(?) OR a.grantee.name = 'PUBLIC')
             ORDER BY c.class_name, a.grantee.name, a.auth_type
            """;

    private CubridSourcePrivilegeProof() {}

    static Result inspect(Connection connection, DiscoveryRequest request) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        if (!request.catalogs().isEmpty() || request.schemas().size() != 1
                || request.includeSystemObjects()) {
            return Result.unproven();
        }
        String schema = request.schemas().iterator().next();
        try {
            if (!CubridSourceAdapter.isQualifiedDriver(connection.getMetaData())) {
                return Result.unproven();
            }
            String currentUser = currentUser(connection);
            if (currentUser == null || currentUser.equalsIgnoreCase(schema)
                    || "DBA".equalsIgnoreCase(currentUser)
                    || "PUBLIC".equalsIgnoreCase(currentUser)
                    || !hasOnlyPublicGroup(connection)) {
                return Result.unproven();
            }
            Map<ObjectIdentity, Boolean> selected = sourceObjects(connection, schema);
            if (selected.isEmpty() || !applyEffectiveGrants(connection, schema, currentUser, selected)
                    || selected.values().stream().anyMatch(value -> !value)) {
                return Result.unproven();
            }
            return new Result(true, currentUser, schema);
        } catch (SQLException failure) {
            JvmFailureBoundary.rethrowSuppressedFatal(failure);
            return Result.unproven();
        } catch (RuntimeException | Error failure) {
            JvmFailureBoundary.rethrowSuppressedFatal(failure);
            throw failure;
        }
    }

    static String currentUser(Connection connection) throws SQLException {
        try (var statement = connection.prepareStatement(CURRENT_USER_SQL);
             var rows = statement.executeQuery()) {
            if (!rows.next()) return null;
            String user = rows.getString("current_user_name");
            return rows.next() || user == null || user.isBlank() ? null : user;
        }
    }

    private static boolean hasOnlyPublicGroup(Connection connection) throws SQLException {
        Set<String> groups = new LinkedHashSet<>();
        try (var statement = connection.prepareStatement(DIRECT_GROUPS_SQL);
             var rows = statement.executeQuery()) {
            while (rows.next()) {
                String group = rows.getString("group_name");
                if (group == null || group.isBlank()) return false;
                groups.add(group.toUpperCase(Locale.ROOT));
            }
        }
        return groups.equals(Set.of("PUBLIC"));
    }

    private static Map<ObjectIdentity, Boolean> sourceObjects(
            Connection connection,
            String schema) throws SQLException {
        Map<ObjectIdentity, Boolean> objects = new LinkedHashMap<>();
        try (PreparedStatement statement = connection.prepareStatement(SOURCE_OBJECTS_SQL)) {
            statement.setString(1, schema);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    ObjectIdentity identity = identity(
                            rows.getString("owner_name"),
                            rows.getString("class_name"),
                            rows.getString("class_type"));
                    if (identity == null || objects.put(identity, false) != null) {
                        return Map.of();
                    }
                }
            }
        }
        return objects;
    }

    private static boolean applyEffectiveGrants(
            Connection connection,
            String schema,
            String currentUser,
            Map<ObjectIdentity, Boolean> objects) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(SOURCE_GRANTS_SQL)) {
            statement.setString(1, schema);
            statement.setString(2, currentUser);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    ObjectIdentity identity = identity(
                            rows.getString("owner_name"),
                            rows.getString("object_name"),
                            rows.getString("object_type"));
                    if (identity == null) {
                        return false;
                    }
                    if (!objects.containsKey(identity)) {
                        return false;
                    }
                    if (!"SELECT".equalsIgnoreCase(rows.getString("auth_type"))
                            || !"NO".equalsIgnoreCase(rows.getString("is_grantable"))) {
                        return false;
                    }
                    String grantee = rows.getString("grantee_name");
                    if (!currentUser.equalsIgnoreCase(grantee) && !"PUBLIC".equalsIgnoreCase(grantee)) {
                        return false;
                    }
                    objects.put(identity, true);
                }
            }
        }
        return true;
    }

    private static ObjectIdentity identity(String owner, String name, String type) {
        if (owner == null || owner.isBlank() || name == null || name.isBlank()
                || type == null || type.isBlank()) {
            return null;
        }
        return new ObjectIdentity(
                owner.toUpperCase(Locale.ROOT),
                name.toUpperCase(Locale.ROOT),
                type.toUpperCase(Locale.ROOT));
    }

    record Result(boolean proven, String currentUser, String schema) {
        static Result unproven() {
            return new Result(false, null, null);
        }
    }

    private record ObjectIdentity(String owner, String name, String type) {}
}
