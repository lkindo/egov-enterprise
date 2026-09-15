package nuri.migration.adapter;

import nuri.migration.adapter.DataStreamingStrategy.StreamingModel;
import nuri.migration.adapter.SnapshotStrategy.SnapshotModel;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;

import java.sql.Connection;
import java.util.Map;
import java.util.Set;

/** MariaDB 전용 catalog 정의. MySQL adapter와 별도 선택된다. */
public final class MariaDbSourceAdapter extends AbstractVendorSourceAdapter {

    public MariaDbSourceAdapter() {
        super(
                new AdapterIdentity(
                        "mariadb-catalog",
                        DatabaseFamily.MARIADB,
                        "MariaDB",
                        Set.of("MariaDB"),
                        "numeric MariaDB product version required; supported range unverified",
                        EvidenceLevel.UNVERIFIED),
                VendorCatalogQueries.mariaDb(),
                Map.of(),
                Set.of(ObjectKind.MATERIALIZED_VIEW),
                new SnapshotStrategy(
                        SnapshotModel.MVCC_TRANSACTION,
                        true,
                        false,
                        "operator-managed InnoDB consistent transaction snapshot",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                new DataStreamingStrategy(
                        Set.of(StreamingModel.JDBC_FORWARD_ONLY, StreamingModel.KEYSET_PAGINATION),
                        true,
                        true,
                        "Connector/J row streaming with bounded LONGTEXT/LONGBLOB materialization",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                new SourceReadSessionPolicy(
                        SourceReadSessionPolicy.IsolationMode.REPEATABLE_READ,
                        true,
                        false,
                        false,
                        true,
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED,
                        "operator freeze plus one InnoDB REPEATABLE READ transaction"));
    }

    @Override
    protected DiscoveryVisibilityProof visibilityProof(Connection connection, DiscoveryRequest request) {
        return MariaDbDiscoveryVisibilityProof.inspect(connection, request);
    }

}
