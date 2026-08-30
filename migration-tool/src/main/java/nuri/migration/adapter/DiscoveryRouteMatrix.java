package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;

import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** 44개 ObjectKind의 terminal route를 누락 없이 만드는 단일 원본. */
final class DiscoveryRouteMatrix {

    private static final Set<ObjectKind> JDBC_OBJECT_KINDS = Set.of(
            ObjectKind.CATALOG,
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
            ObjectKind.ROUTINE,
            ObjectKind.TYPE,
            ObjectKind.SYNONYM,
            ObjectKind.COMMENT,
            ObjectKind.UNKNOWN);

    private DiscoveryRouteMatrix() {}

    static Map<ObjectKind, DiscoveryTerminalRoute> unsupported() {
        return total(Map.of());
    }

    static Map<ObjectKind, DiscoveryTerminalRoute> jdbcBaseline() {
        EnumMap<ObjectKind, DiscoveryTerminalRoute> routes = mutableUnsupported();
        JDBC_OBJECT_KINDS.forEach(kind -> routes.put(kind, DiscoveryTerminalRoute.OBJECTS));
        return immutable(routes);
    }

    static Map<ObjectKind, DiscoveryTerminalRoute> vendor(
            List<VendorCatalogQuery> queries,
            Set<ObjectKind> notApplicableKinds) {
        return vendor(queries, notApplicableKinds, Set.of());
    }

    static Map<ObjectKind, DiscoveryTerminalRoute> vendor(
            List<VendorCatalogQuery> queries,
            Set<ObjectKind> notApplicableKinds,
            Set<ObjectKind> partialKinds) {
        EnumMap<ObjectKind, DiscoveryTerminalRoute> routes = new EnumMap<>(jdbcBaseline());
        Objects.requireNonNull(queries, "queries")
                .forEach(query -> routes.put(
                        query.kind(),
                        query.partialScope()
                                ? DiscoveryTerminalRoute.PARTIAL_PROBE
                                : DiscoveryTerminalRoute.OBJECTS));
        Objects.requireNonNull(partialKinds, "partialKinds").forEach(kind -> {
            if (routes.get(kind) == DiscoveryTerminalRoute.UNSUPPORTED) {
                throw new IllegalArgumentException("partial route has no collector/query/probe: " + kind);
            }
            routes.put(kind, DiscoveryTerminalRoute.PARTIAL_PROBE);
        });
        Objects.requireNonNull(notApplicableKinds, "notApplicableKinds")
                .forEach(kind -> routes.put(kind, DiscoveryTerminalRoute.NOT_APPLICABLE));
        return immutable(routes);
    }

    static Map<ObjectKind, DiscoveryTerminalRoute> total(
            Map<ObjectKind, DiscoveryTerminalRoute> declared) {
        EnumMap<ObjectKind, DiscoveryTerminalRoute> routes = mutableUnsupported();
        Objects.requireNonNull(declared, "declared").forEach((kind, route) ->
                routes.put(Objects.requireNonNull(kind, "kind"), Objects.requireNonNull(route, "route")));
        return immutable(routes);
    }

    static boolean needsVisibilityProof(
            Map<ObjectKind, DiscoveryTerminalRoute> routes,
            Set<ObjectKind> requestedKinds) {
        Objects.requireNonNull(routes, "routes");
        Objects.requireNonNull(requestedKinds, "requestedKinds");
        return requestedKinds.stream().map(routes::get).anyMatch(route ->
                route == DiscoveryTerminalRoute.OBJECTS
                        || route == DiscoveryTerminalRoute.PARTIAL_PROBE);
    }

    private static EnumMap<ObjectKind, DiscoveryTerminalRoute> mutableUnsupported() {
        EnumMap<ObjectKind, DiscoveryTerminalRoute> routes = new EnumMap<>(ObjectKind.class);
        for (ObjectKind kind : ObjectKind.values()) {
            routes.put(kind, DiscoveryTerminalRoute.UNSUPPORTED);
        }
        return routes;
    }

    private static Map<ObjectKind, DiscoveryTerminalRoute> immutable(
            EnumMap<ObjectKind, DiscoveryTerminalRoute> routes) {
        return Collections.unmodifiableMap(new EnumMap<>(routes));
    }
}
