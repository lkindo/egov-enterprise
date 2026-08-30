package nuri.migration.adapter;

import nuri.migration.adapter.DataStreamingStrategy.StreamingModel;
import nuri.migration.adapter.SnapshotStrategy.SnapshotModel;
import nuri.migration.discovery.ObjectKind;

import java.util.Map;
import java.util.Set;

/** MySQL 전용 catalog 정의. MariaDB와 별도 선택된다. */
public final class MySqlSourceAdapter extends AbstractVendorSourceAdapter {

    public MySqlSourceAdapter() {
        super(
                new AdapterIdentity(
                        "mysql-catalog",
                        DatabaseFamily.MYSQL,
                        "MySQL",
                        Set.of("MySQL"),
                        "numeric MySQL product version required; supported range unverified",
                        EvidenceLevel.UNVERIFIED),
                VendorCatalogQueries.mysql(),
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
                        "Connector/J cursor and fetch configuration requires driver-specific rehearsal",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                SourceReadSessionPolicy.repeatableRead(
                        EvidenceLevel.UNVERIFIED,
                        "operator freeze plus one InnoDB REPEATABLE READ transaction"));
    }

}
