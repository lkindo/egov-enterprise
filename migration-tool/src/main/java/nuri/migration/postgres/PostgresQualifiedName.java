package nuri.migration.postgres;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/** catalog/schema/object segment를 raw dot parsing 없이 보존하는 PostgreSQL 이름. */
public final class PostgresQualifiedName {

    private final List<PostgresIdentifier> segments;

    private PostgresQualifiedName(List<PostgresIdentifier> segments) {
        this.segments = List.copyOf(Objects.requireNonNull(segments, "segments"));
        if (this.segments.isEmpty() || this.segments.size() > 3) {
            throw new IllegalArgumentException("PostgreSQL qualified name requires one to three segments");
        }
        if (this.segments.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("PostgreSQL qualified name contains null segment");
        }
    }

    public static PostgresQualifiedName of(String... segments) {
        Objects.requireNonNull(segments, "segments");
        return new PostgresQualifiedName(Arrays.stream(segments)
                .map(PostgresIdentifier::of)
                .toList());
    }

    public static PostgresQualifiedName of(PostgresIdentifier... segments) {
        Objects.requireNonNull(segments, "segments");
        return new PostgresQualifiedName(Arrays.asList(segments.clone()));
    }

    public List<PostgresIdentifier> segments() {
        return segments;
    }

    public String sql() {
        return segments.stream().map(PostgresIdentifier::sql).collect(Collectors.joining("."));
    }

    /** PreparedStatement의 regclass 파라미터로 전달할 quoted qualified name. */
    public String regclassText() {
        return sql();
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof PostgresQualifiedName that && segments.equals(that.segments);
    }

    @Override
    public int hashCode() {
        return segments.hashCode();
    }

    @Override
    public String toString() {
        return sql();
    }
}
