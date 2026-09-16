package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;

import java.sql.Connection;
import java.util.Objects;
import java.util.Set;

/** Visibility proof for CUBRID relational metadata under one explicitly granted owner schema. */
final class CubridDiscoveryVisibilityProof {

    private static final Set<ObjectKind> RELATIONAL_KINDS = Set.of(
            ObjectKind.SCHEMA,
            ObjectKind.TABLE,
            ObjectKind.COLUMN,
            ObjectKind.PRIMARY_KEY,
            ObjectKind.UNIQUE_KEY,
            ObjectKind.FOREIGN_KEY,
            ObjectKind.DEFAULT_CONSTRAINT,
            ObjectKind.INDEX,
            ObjectKind.IDENTITY,
            ObjectKind.VIEW,
            ObjectKind.COMMENT);

    private CubridDiscoveryVisibilityProof() {}

    static DiscoveryVisibilityProof inspect(Connection connection, DiscoveryRequest request) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        if (!RELATIONAL_KINDS.containsAll(request.objectKinds())) {
            return DiscoveryVisibilityProof.unproven();
        }
        CubridSourcePrivilegeProof.Result result = CubridSourcePrivilegeProof.inspect(connection, request);
        return result.proven()
                ? DiscoveryVisibilityProof.forSchemas(request.schemas())
                : DiscoveryVisibilityProof.unproven();
    }
}
