package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** 실제 vendor 드라이버 타입에 compile-time 의존하지 않는 설명형 adapter 기반. */
abstract class AbstractVendorSourceAdapter extends JdbcMetadataSourceAdapter {

    private final AdapterIdentity identity;
    private final AdapterCapabilities capabilities;
    private final SnapshotStrategy snapshotStrategy;
    private final DataStreamingStrategy dataStreamingStrategy;
    private final SourceReadSessionPolicy sourceReadSessionPolicy;
    private final List<VendorCatalogQuery> catalogQueries;
    private final Set<ObjectKind> notApplicableKinds;
    private final Map<ObjectKind, DiscoveryTerminalRoute> discoveryRoutes;

    protected AbstractVendorSourceAdapter(
            AdapterIdentity identity,
            List<VendorCatalogQuery> catalogQueries,
            Map<ObjectKind, ObjectSupportGrade> additionalSupport,
            Set<ObjectKind> notApplicableKinds,
            SnapshotStrategy snapshotStrategy,
            DataStreamingStrategy dataStreamingStrategy,
            SourceReadSessionPolicy sourceReadSessionPolicy) {
        this.identity = Objects.requireNonNull(identity, "identity");
        this.catalogQueries = List.copyOf(Objects.requireNonNull(catalogQueries, "catalogQueries"));
        this.notApplicableKinds = Set.copyOf(Objects.requireNonNull(notApplicableKinds, "notApplicableKinds"));
        this.discoveryRoutes = DiscoveryRouteMatrix.vendor(this.catalogQueries, this.notApplicableKinds);
        this.snapshotStrategy = Objects.requireNonNull(snapshotStrategy, "snapshotStrategy");
        this.dataStreamingStrategy = Objects.requireNonNull(dataStreamingStrategy, "dataStreamingStrategy");
        this.sourceReadSessionPolicy = Objects.requireNonNull(
                sourceReadSessionPolicy, "sourceReadSessionPolicy");
        if (sourceReadSessionPolicy.evidenceLevel() != identity.evidenceLevel()) {
            throw new IllegalArgumentException(
                    "source read session evidence must match adapter identity: "
                            + identity.adapterId());
        }
        AdapterCapabilities.Builder builder = AdapterCapabilities.builder(identity.evidenceLevel())
                .limitation("vendor catalog definitions are compile-time contracts without real-database evidence")
                .limitation("snapshot and streaming strategies are declarations and are never started automatically");
        for (VendorCatalogQuery query : this.catalogQueries) {
            builder.support(query.kind(), query.supportGrade());
        }
        Objects.requireNonNull(additionalSupport, "additionalSupport").forEach((kind, grade) -> {
            if (grade != ObjectSupportGrade.UNSUPPORTED
                    && discoveryRoutes.get(kind) == DiscoveryTerminalRoute.UNSUPPORTED) {
                throw new IllegalArgumentException(
                        "supported capability has no discovery route: " + identity.adapterId() + " -> " + kind);
            }
            builder.support(kind, grade);
        });
        this.capabilities = builder.build();
    }

    @Override
    public final String id() {
        return identity.adapterId();
    }

    @Override
    public final AdapterIdentity identity() {
        return identity;
    }

    @Override
    public final AdapterCapabilities capabilities() {
        return capabilities;
    }

    @Override
    public final SnapshotStrategy snapshotStrategy() {
        return snapshotStrategy;
    }

    @Override
    public final DataStreamingStrategy dataStreamingStrategy() {
        return dataStreamingStrategy;
    }

    @Override
    public final SourceReadSessionPolicy sourceReadSessionPolicy() {
        return sourceReadSessionPolicy;
    }

    @Override
    public final List<VendorCatalogQuery> catalogQueries() {
        return catalogQueries;
    }

    @Override
    public final Map<ObjectKind, DiscoveryTerminalRoute> discoveryRoutes() {
        return discoveryRoutes;
    }

    @Override
    public final CatalogSnapshot discover(Connection connection, DiscoveryRequest request) throws SQLException {
        CatalogSnapshot baseline = super.discover(connection, request);
        return VendorCatalogDiscoveryExecutor.enrich(
                baseline,
                connection,
                request,
                id(),
                catalogQueries,
                notApplicableKinds);
    }

    @Override
    public final boolean supports(DatabaseMetaData metadata) throws SQLException {
        Objects.requireNonNull(metadata, "metadata");
        return identity.recognizesProduct(metadata.getDatabaseProductName())
                && hasVersionEvidence(metadata.getDatabaseProductVersion());
    }

    static boolean hasVersionEvidence(String productVersion) {
        if (productVersion == null || productVersion.isBlank()) {
            return false;
        }
        for (int index = 0; index < productVersion.length(); index++) {
            if (Character.isDigit(productVersion.charAt(index))) {
                return true;
            }
        }
        return false;
    }
}
