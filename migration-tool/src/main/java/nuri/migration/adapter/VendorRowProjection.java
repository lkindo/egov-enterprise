package nuri.migration.adapter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** ResultSet의 모든 소비 column을 query별로 고정한 명시적 projection 계약. */
public record VendorRowProjection(
        ResultColumnProjection catalog,
        ResultColumnProjection schema,
        ResultColumnProjection name,
        List<String> identityColumns,
        DefinitionProjection definition,
        Map<String, String> attributes,
        Set<String> sensitiveIdentityColumns,
        boolean redactName,
        DependencyProjection dependency) {

    public VendorRowProjection {
        catalog = Objects.requireNonNull(catalog, "catalog");
        schema = Objects.requireNonNull(schema, "schema");
        name = Objects.requireNonNull(name, "name");
        if (!name.present()) {
            throw new IllegalArgumentException("vendor object name projection is required");
        }
        identityColumns = List.copyOf(Objects.requireNonNull(identityColumns, "identityColumns"));
        if (identityColumns.isEmpty() || identityColumns.stream().anyMatch(value -> value == null || value.isBlank())) {
            throw new IllegalArgumentException("at least one non-blank identity column is required");
        }
        definition = Objects.requireNonNull(definition, "definition");
        attributes = Collections.unmodifiableMap(new LinkedHashMap<>(
                Objects.requireNonNull(attributes, "attributes")));
        if (attributes.entrySet().stream().anyMatch(entry -> entry.getKey() == null
                || entry.getKey().isBlank()
                || entry.getValue() == null
                || entry.getValue().isBlank())) {
            throw new IllegalArgumentException("attribute names and result labels must not be blank");
        }
        sensitiveIdentityColumns = Collections.unmodifiableSet(new LinkedHashSet<>(
                Objects.requireNonNull(sensitiveIdentityColumns, "sensitiveIdentityColumns")));
        if (!identityColumns.containsAll(sensitiveIdentityColumns)) {
            throw new IllegalArgumentException("sensitive columns must be identity columns");
        }
        if (attributes.values().stream().anyMatch(sensitiveIdentityColumns::contains)) {
            throw new IllegalArgumentException("sensitive identity columns cannot be attributes");
        }
        if (sensitiveIdentityColumns.contains(name.column()) && !redactName) {
            throw new IllegalArgumentException("sensitive name column must be redacted");
        }
        dependency = Objects.requireNonNull(dependency, "dependency");
    }

    public Set<String> requiredResultLabels() {
        LinkedHashSet<String> labels = new LinkedHashSet<>();
        add(labels, catalog);
        add(labels, schema);
        add(labels, name);
        labels.addAll(identityColumns);
        add(labels, definition.source());
        labels.addAll(attributes.values());
        if (dependency.present()) {
            add(labels, dependency.catalog());
            add(labels, dependency.schema());
            add(labels, dependency.name());
        }
        return Collections.unmodifiableSet(labels);
    }

    public static VendorRowProjection standard() {
        return new VendorRowProjection(
                ResultColumnProjection.column("object_catalog"),
                ResultColumnProjection.column("object_schema"),
                ResultColumnProjection.column("object_name"),
                List.of("object_name"),
                DefinitionProjection.hashOnly("native_definition"),
                Map.of("detail", "detail"),
                Set.of(),
                false,
                DependencyProjection.none());
    }

    private static void add(Set<String> target, ResultColumnProjection projection) {
        if (projection.present()) {
            target.add(projection.column());
        }
    }
}
