package nuri.migration.discovery;

import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

/** 읽기 전용 객체 inventory 범위를 지정한다. 빈 catalog/schema 집합은 전체 범위를 뜻한다. */
public record DiscoveryRequest(
        Set<String> catalogs,
        Set<String> schemas,
        Set<ObjectKind> objectKinds,
        boolean includeSystemObjects) {

    public DiscoveryRequest {
        catalogs = immutableTextSet(catalogs, "catalogs");
        schemas = immutableTextSet(schemas, "schemas");
        objectKinds = immutableKinds(objectKinds);
    }

    public static DiscoveryRequest allUserObjects() {
        return new DiscoveryRequest(Set.of(), Set.of(), EnumSet.allOf(ObjectKind.class), false);
    }

    public static DiscoveryRequest forSchemas(Set<String> schemas) {
        return new DiscoveryRequest(Set.of(), schemas, EnumSet.allOf(ObjectKind.class), false);
    }

    public boolean includes(ObjectKind kind) {
        return objectKinds.contains(kind);
    }

    public boolean acceptsCatalog(String catalog) {
        return catalogs.isEmpty() || containsExact(catalogs, catalog);
    }

    public boolean acceptsSchema(String schema) {
        return schemas.isEmpty() || containsExact(schemas, schema);
    }

    private static boolean containsExact(Set<String> values, String candidate) {
        if (candidate == null) {
            return false;
        }
        return values.contains(candidate);
    }

    private static Set<String> immutableTextSet(Set<String> source, String name) {
        Objects.requireNonNull(source, name);
        LinkedHashSet<String> copy = new LinkedHashSet<>();
        for (String value : source) {
            if (value == null || value.isBlank()) {
                throw new IllegalArgumentException(name + " must not contain blank values");
            }
            copy.add(value);
        }
        return Collections.unmodifiableSet(copy);
    }

    private static Set<ObjectKind> immutableKinds(Set<ObjectKind> source) {
        Objects.requireNonNull(source, "objectKinds");
        if (source.isEmpty()) {
            return Set.of();
        }
        return Collections.unmodifiableSet(EnumSet.copyOf(source));
    }
}
