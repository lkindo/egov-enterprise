package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;

import java.util.Objects;

/** Vendor row가 가리키는 상위 객체를 명시적으로 매핑한다. */
public record DependencyProjection(
        boolean present,
        ObjectKind kind,
        ResultColumnProjection catalog,
        ResultColumnProjection schema,
        ResultColumnProjection name) {

    public DependencyProjection {
        catalog = Objects.requireNonNull(catalog, "catalog");
        schema = Objects.requireNonNull(schema, "schema");
        name = Objects.requireNonNull(name, "name");
        if (present && (kind == null || !name.present())) {
            throw new IllegalArgumentException("present dependency requires kind and name");
        }
        if (!present && kind != null) {
            throw new IllegalArgumentException("absent dependency must not declare a kind");
        }
    }

    public static DependencyProjection none() {
        return new DependencyProjection(
                false,
                null,
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent(),
                ResultColumnProjection.absent());
    }

    public static DependencyProjection of(
            ObjectKind kind,
            ResultColumnProjection catalog,
            ResultColumnProjection schema,
            ResultColumnProjection name) {
        return new DependencyProjection(true, kind, catalog, schema, name);
    }
}
