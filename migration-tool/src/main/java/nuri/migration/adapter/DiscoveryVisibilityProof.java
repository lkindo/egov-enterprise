package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

/** 성공-empty를 실제 부재로 판정할 때 필요한 metadata visibility 범위 증거. */
public record DiscoveryVisibilityProof(
        boolean wholeSource,
        Set<String> catalogs,
        Set<String> schemas) {

    public DiscoveryVisibilityProof {
        catalogs = immutableText(catalogs, "catalogs");
        schemas = immutableText(schemas, "schemas");
    }

    public static DiscoveryVisibilityProof unproven() {
        return new DiscoveryVisibilityProof(false, Set.of(), Set.of());
    }

    public static DiscoveryVisibilityProof completeSource() {
        return new DiscoveryVisibilityProof(true, Set.of(), Set.of());
    }

    public static DiscoveryVisibilityProof forSchemas(Set<String> schemas) {
        return new DiscoveryVisibilityProof(false, Set.of(), schemas);
    }

    public boolean covers(DiscoveryRequest request) {
        Objects.requireNonNull(request, "request");
        if (wholeSource) {
            return true;
        }
        if (request.catalogs().isEmpty() && request.schemas().isEmpty()) {
            return false;
        }
        boolean catalogsCovered = request.catalogs().isEmpty() || catalogs.containsAll(request.catalogs());
        boolean schemasCovered = request.schemas().isEmpty() || schemas.containsAll(request.schemas());
        return catalogsCovered && schemasCovered;
    }

    private static Set<String> immutableText(Set<String> values, String name) {
        Objects.requireNonNull(values, name);
        LinkedHashSet<String> copy = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null || value.isBlank()) {
                throw new IllegalArgumentException(name + " must not contain blank values");
            }
            copy.add(value);
        }
        return Set.copyOf(copy);
    }
}
