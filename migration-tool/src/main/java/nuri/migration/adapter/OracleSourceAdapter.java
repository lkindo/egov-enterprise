package nuri.migration.adapter;

import nuri.migration.adapter.DataStreamingStrategy.StreamingModel;
import nuri.migration.adapter.SnapshotStrategy.SnapshotModel;
import java.util.Map;
import java.util.Set;

/** Oracle catalog 정의. 실제 Oracle DB 검증 전까지 UNVERIFIED다. */
public final class OracleSourceAdapter extends AbstractVendorSourceAdapter {

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
                        false,
                        "JDBC fetch size and LOB streams; driver behavior requires rehearsal",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                SourceReadSessionPolicy.operatorFrozenReadCommitted(
                        EvidenceLevel.UNVERIFIED,
                        "operator freeze plus one READ COMMITTED transaction; no automatic SCN pinning"));
    }
}
