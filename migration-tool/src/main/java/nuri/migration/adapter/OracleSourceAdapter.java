package nuri.migration.adapter;

import nuri.migration.adapter.DataStreamingStrategy.StreamingModel;
import nuri.migration.adapter.SnapshotStrategy.SnapshotModel;
import nuri.migration.discovery.DiscoveryRequest;
import java.sql.Connection;
import java.util.Map;
import java.util.Set;

/** Oracle catalog 정의. 버전별 commit 자격은 아직 UNVERIFIED다. */
public final class OracleSourceAdapter extends AbstractVendorSourceAdapter {

    @Override
    protected DiscoveryVisibilityProof visibilityProof(Connection connection, DiscoveryRequest request) {
        return OracleDiscoveryVisibilityProof.inspect(connection, request);
    }

    public OracleSourceAdapter() {
        super(
                new AdapterIdentity(
                        "oracle-catalog",
                        DatabaseFamily.ORACLE,
                        "Oracle",
                        Set.of("Oracle"),
                        "numeric driver product version required; supported range unverified",
                        EvidenceLevel.UNVERIFIED),
                VendorCatalogQueries.oracle(),
                Map.of(),
                Set.of(),
                new SnapshotStrategy(
                        SnapshotModel.SYSTEM_CHANGE_NUMBER,
                        true,
                        true,
                        "operator-selected SCN with consistent-query validation",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                new DataStreamingStrategy(
                        Set.of(StreamingModel.JDBC_FORWARD_ONLY, StreamingModel.KEYSET_PAGINATION),
                        true,
                        true,
                        "bounded BLOB/CLOB materialization within the source ResultSet and byte-budgeted pages",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                new SourceReadSessionPolicy(
                        SourceReadSessionPolicy.IsolationMode.READ_COMMITTED,
                        true,
                        false,
                        true,
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED,
                        "operator freeze plus one READ COMMITTED transaction; no automatic SCN pinning"));
    }
}
