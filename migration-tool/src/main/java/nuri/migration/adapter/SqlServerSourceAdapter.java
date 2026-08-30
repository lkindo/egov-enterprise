package nuri.migration.adapter;

import nuri.migration.adapter.DataStreamingStrategy.StreamingModel;
import nuri.migration.adapter.SnapshotStrategy.SnapshotModel;
import java.util.Map;
import java.util.Set;

/** Microsoft SQL Server catalog 정의. 실제 SQL Server 검증 전까지 UNVERIFIED다. */
public final class SqlServerSourceAdapter extends AbstractVendorSourceAdapter {

    public SqlServerSourceAdapter() {
        super(
                new AdapterIdentity(
                        "sqlserver-catalog",
                        DatabaseFamily.SQL_SERVER,
                        "Microsoft SQL Server",
                        Set.of("Microsoft SQL Server"),
                        "numeric JDBC product version required; supported range unverified",
                        EvidenceLevel.UNVERIFIED),
                VendorCatalogQueries.sqlServer(),
                Map.of(),
                Set.of(),
                new SnapshotStrategy(
                        SnapshotModel.DATABASE_SNAPSHOT_ISOLATION,
                        true,
                        false,
                        "operator-verified SNAPSHOT isolation database option and transaction",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                new DataStreamingStrategy(
                        Set.of(StreamingModel.JDBC_FORWARD_ONLY, StreamingModel.ADAPTIVE_BUFFERING,
                                StreamingModel.KEYSET_PAGINATION),
                        true,
                        false,
                        "Microsoft JDBC adaptive buffering and response streaming require rehearsal",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                SourceReadSessionPolicy.operatorFrozenReadCommitted(
                        EvidenceLevel.UNVERIFIED,
                        "operator freeze plus one READ COMMITTED transaction; snapshot option is not automated"));
    }
}
