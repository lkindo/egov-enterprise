package nuri.migration.adapter;

import nuri.migration.adapter.DataStreamingStrategy.StreamingModel;
import nuri.migration.adapter.SnapshotStrategy.SnapshotModel;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.jdbc.JvmFailureBoundary;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** SQL Server catalog and bounded rehearsal contracts; public COMMIT remains UNVERIFIED. */
public final class SqlServerSourceAdapter extends AbstractVendorSourceAdapter {

    static final String DATABASE_READ_ONLY_SQL = "SELECT DB_NAME() AS current_catalog_name, "
            + "CONVERT(varchar(20),DATABASEPROPERTYEX(DB_NAME(), 'Updateability')) AS updateability";

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

    @Override
    protected DiscoveryVisibilityProof visibilityProof(Connection connection, DiscoveryRequest request) {
        return SqlServerDiscoveryVisibilityProof.inspect(connection, request);
    }

    @Override
    public AdapterPreflight preflight(Connection connection, DiscoveryRequest request) throws SQLException {
        AdapterPreflight report = super.preflight(connection, request);
        // Microsoft's setter is unsupported and isReadOnly always returns false. Require a physical
        // READ_ONLY database before replacing that missing hint; a writable source remains blocking.
        if (!report.adapterMatches() || report.connectionReadOnlySignal()
                || !"Microsoft SQL Server".equals(report.database().productName())
                || !"Microsoft JDBC Driver 13.6 for SQL Server".equals(report.database().driverName())
                || !"13.6.0.0".equals(report.database().driverVersion())
                || !databaseReadOnly(connection)) {
            return report;
        }
        var findings = report.findings().stream().map(finding ->
                finding.severity() == PreflightSeverity.BLOCKING && "READ_ONLY_SIGNAL_MISSING".equals(finding.code())
                        ? new PreflightFinding(PreflightSeverity.WARNING, "SQLSERVER_DATABASE_READ_ONLY",
                                "current database READ_ONLY confirmed; JDBC read-only hint is unsupported")
                        : finding).toList();
        return new AdapterPreflight(report.identity(), report.database(), report.adapterMatches(), false, findings);
    }

    private static boolean databaseReadOnly(Connection connection) {
        try {
            String catalog = connection.getCatalog();
            if (catalog == null || catalog.isBlank()
                    || Set.of("master", "model", "msdb", "tempdb").contains(catalog.toLowerCase(Locale.ROOT))) {
                return false;
            }
            try (var statement = connection.prepareStatement(DATABASE_READ_ONLY_SQL);
                 var rows = statement.executeQuery()) {
                if (!rows.next()) return false;
                String actualCatalog = rows.getString("current_catalog_name");
                String updateability = rows.getString("updateability");
                return catalog.equals(actualCatalog) && "READ_ONLY".equals(updateability) && !rows.next();
            }
        } catch (SQLException failure) {
            JvmFailureBoundary.rethrowSuppressedFatal(failure);
            return false;
        } catch (RuntimeException | Error failure) {
            JvmFailureBoundary.rethrowSuppressedFatal(failure);
            throw failure;
        }
    }
}
