package nuri.migration.adapter;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

/** 벤더 adapter를 우선 선택하고 마지막에 portable JDBC baseline으로 안전하게 fallback한다. */
public final class SourceAdapterRegistry {

    private final List<SourceAdapter> adapters;

    public SourceAdapterRegistry(List<SourceAdapter> adapters) {
        this.adapters = List.copyOf(Objects.requireNonNull(adapters, "adapters"));
        if (this.adapters.isEmpty()) {
            throw new IllegalArgumentException("at least one source adapter is required");
        }
        Set<String> ids = new LinkedHashSet<>();
        for (SourceAdapter adapter : this.adapters) {
            if (!ids.add(adapter.id())) {
                throw new IllegalArgumentException("duplicate source adapter id: " + adapter.id());
            }
        }
    }

    public static SourceAdapterRegistry defaults() {
        return new SourceAdapterRegistry(List.of(
                new PostgreSqlSourceAdapter(),
                new OracleSourceAdapter(),
                new TiberoSourceAdapter(),
                new MySqlSourceAdapter(),
                new MariaDbSourceAdapter(),
                new SqlServerSourceAdapter(),
                new JdbcMetadataSourceAdapter()));
    }

    /** artifact에 결속된 안정 adapter ID를 JDBC 재접속 없이 plan 단계에서 해석한다. */
    public SourceAdapter byId(String adapterId) {
        if (adapterId == null || adapterId.isBlank()) {
            throw new IllegalArgumentException("source adapter id must not be blank");
        }
        return adapters.stream()
                .filter(adapter -> adapter.id().equals(adapterId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("source adapter id is not registered"));
    }

    public SourceAdapter resolve(Connection connection) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        DatabaseMetaData metadata = connection.getMetaData();
        for (SourceAdapter adapter : adapters) {
            if (adapter.supports(metadata)) {
                return adapter;
            }
        }
        throw new SQLException("No source adapter supports the database product");
    }

    /** 명시 선택은 ID와 JDBC product/version이 모두 일치할 때만 허용한다. */
    public SourceAdapter resolve(Connection connection, String explicitAdapterId) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        if (explicitAdapterId == null) {
            return resolve(connection);
        }
        if (explicitAdapterId.isBlank()) {
            throw new SQLException("Explicit source adapter id must not be blank");
        }
        SourceAdapter selected;
        try {
            selected = byId(explicitAdapterId);
        } catch (IllegalArgumentException failure) {
            throw new SQLException("Unknown source adapter id");
        }
        DatabaseMetaData metadata = connection.getMetaData();
        if (!selected.supports(metadata)) {
            throw new SQLException("Source adapter " + explicitAdapterId
                    + " does not match JDBC product/version evidence");
        }
        return selected;
    }

    public CatalogDiscovery discover(Connection connection, nuri.migration.discovery.DiscoveryRequest request)
            throws SQLException {
        SourceAdapter adapter = resolve(connection);
        return new CatalogDiscovery(adapter.id(), adapter.discover(connection, request));
    }

    public CatalogDiscovery discover(
            Connection connection,
            nuri.migration.discovery.DiscoveryRequest request,
            String explicitAdapterId) throws SQLException {
        SourceAdapter adapter = resolve(connection, explicitAdapterId);
        return new CatalogDiscovery(adapter.id(), adapter.discover(connection, request));
    }

    public record CatalogDiscovery(String adapterId, nuri.migration.discovery.CatalogSnapshot snapshot) {
        public CatalogDiscovery {
            adapterId = Objects.requireNonNull(adapterId, "adapterId");
            snapshot = Objects.requireNonNull(snapshot, "snapshot");
        }
    }
}
