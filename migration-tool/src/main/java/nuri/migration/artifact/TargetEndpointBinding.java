package nuri.migration.artifact;

import nuri.migration.model.MappingSpec.DbConfig;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;

/** 접속 위치·클러스터·DB identity를 결속하며 원문 접속정보는 artifact에 넣지 않는다. */
public final class TargetEndpointBinding {
    private TargetEndpointBinding() { }

    public static String capture(Connection connection, DbConfig endpoint) throws SQLException {
        if (endpoint == null || endpoint.endpointId() == null || endpoint.endpointId().isBlank()) {
            throw new IllegalArgumentException("target endpointId is required");
        }
        if (!"PostgreSQL".equals(connection.getMetaData().getDatabaseProductName())) {
            throw new IllegalArgumentException("target identity requires PostgreSQL");
        }
        // pg_control_system EXECUTE 권한이 없으면 약한 식별자로 폴백하지 않고 중단한다.
        try (var statement = connection.prepareStatement("""
                SELECT c.system_identifier::text, d.oid::text, d.datname, current_schema()
                FROM pg_catalog.pg_control_system() c
                JOIN pg_catalog.pg_database d ON d.datname = current_database()
                """); var rows = statement.executeQuery()) {
            if (!rows.next()) throw new SQLException("target identity is unavailable");
            String cluster = rows.getString(1);
            String databaseOid = rows.getString(2);
            String database = rows.getString(3);
            String schema = rows.getString(4);
            if (cluster == null || databaseOid == null || database == null || schema == null || rows.next()) {
                throw new SQLException("target identity is incomplete");
            }
            DbConfig actual = new DbConfig(connection.getMetaData().getURL(), null, null, null);
            return CanonicalArtifactDigest.sha256(Map.of(
                    "version", 1, "purpose", "migration-target-environment",
                    "endpointId", endpoint.endpointId(),
                    "locationDigest", JdbcEndpointIdentity.digest(endpoint),
                    "connectedLocationDigest", JdbcEndpointIdentity.digest(actual),
                    "cluster", cluster, "databaseOid", databaseOid, "database", database, "schema", schema));
        }
    }
}
