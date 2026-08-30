package nuri.migration.adapter;

import nuri.migration.adapter.DataStreamingStrategy.StreamingModel;
import nuri.migration.adapter.SnapshotStrategy.SnapshotModel;
import java.util.Map;
import java.util.Set;

/** Tibero 전용 catalog 정의. Oracle adapter의 alias가 아니다. */
public final class TiberoSourceAdapter extends AbstractVendorSourceAdapter {

    public TiberoSourceAdapter() {
        super(
                new AdapterIdentity(
                        "tibero-catalog",
                        DatabaseFamily.TIBERO,
                        "Tibero",
                        Set.of("Tibero"),
                        "numeric tbJDBC product version required; supported range unverified",
                        EvidenceLevel.UNVERIFIED),
                VendorCatalogQueries.tibero(),
                Map.of(),
                Set.of(),
                new SnapshotStrategy(
                        SnapshotModel.SYSTEM_CHANGE_NUMBER,
                        true,
                        true,
                        "operator-selected Tibero SCN; semantics require version-specific proof",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                new DataStreamingStrategy(
                        Set.of(StreamingModel.JDBC_FORWARD_ONLY, StreamingModel.KEYSET_PAGINATION),
                        true,
                        false,
                        "tbJDBC fetch and LOB streams; driver behavior requires rehearsal",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                SourceReadSessionPolicy.operatorFrozenReadCommitted(
                        EvidenceLevel.UNVERIFIED,
                        "operator freeze plus one READ COMMITTED transaction; no automatic SCN pinning"));
    }
}
