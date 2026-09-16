package nuri.migration.adapter;

import nuri.migration.adapter.DataStreamingStrategy.StreamingModel;
import nuri.migration.adapter.SnapshotStrategy.SnapshotModel;
import nuri.migration.discovery.DiscoveryRequest;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.Set;

/** CUBRID 11.4 catalog and bounded rehearsal contracts; public COMMIT remains UNVERIFIED. */
public final class CubridSourceAdapter extends AbstractVendorSourceAdapter {

    static final String QUALIFIED_PRODUCT_VERSION = "11.4.6.1963";
    static final String QUALIFIED_DRIVER_NAME = "CUBRID JDBC Driver";
    static final String QUALIFIED_DRIVER_VERSION = "11.3.1.0050";

    public CubridSourceAdapter() {
        super(
                new AdapterIdentity(
                        "cubrid-catalog",
                        DatabaseFamily.CUBRID,
                        "CUBRID",
                        Set.of("CUBRID"),
                        "numeric JDBC product version required; local qualification is 11.4.6.1963 with JDBC 11.3.1.0050",
                        EvidenceLevel.UNVERIFIED),
                VendorCatalogQueries.cubrid(),
                Map.of(),
                Set.of(),
                new SnapshotStrategy(
                        SnapshotModel.MVCC_TRANSACTION,
                        true,
                        false,
                        "operator freeze plus one JDBC REPEATABLE READ transaction",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                new DataStreamingStrategy(
                        Set.of(StreamingModel.JDBC_FORWARD_ONLY, StreamingModel.KEYSET_PAGINATION),
                        true,
                        true,
                        "bounded java.sql.Blob/Clob detachment within byte-budgeted pages",
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED),
                new SourceReadSessionPolicy(
                        SourceReadSessionPolicy.IsolationMode.REPEATABLE_READ,
                        true,
                        false,
                        true,
                        ExecutionPolicy.MANUAL_ONLY,
                        EvidenceLevel.UNVERIFIED,
                        "operator freeze plus one REPEATABLE READ transaction; JDBC read-only is unsupported"));
    }

    @Override
    protected DiscoveryVisibilityProof visibilityProof(Connection connection, DiscoveryRequest request) {
        return CubridDiscoveryVisibilityProof.inspect(connection, request);
    }

    @Override
    protected String currentCatalog(Connection connection) {
        return null;
    }

    @Override
    protected String currentSchema(Connection connection) throws SQLException {
        String user = CubridSourcePrivilegeProof.currentUser(connection);
        return user == null ? null : user.toLowerCase(java.util.Locale.ROOT);
    }

    @Override
    protected String metadataTableName(String schema, String table) {
        return schema == null || schema.isBlank() ? table : schema + "." + table;
    }

    @Override
    protected String columnDefaultExpression(ResultSet row) throws SQLException {
        String value = row.getString("COLUMN_DEF");
        return value == null || "NULL".equalsIgnoreCase(value.trim()) ? null : value;
    }

    @Override
    protected String columnAutoIncrement(ResultSet row) {
        // JDBC 11.3.1.0050 exposes only the first 18 JDBC getColumns fields.
        return null;
    }

    @Override
    protected String columnGenerated(ResultSet row) {
        // JDBC 11.3.1.0050 exposes only the first 18 JDBC getColumns fields.
        return null;
    }

    @Override
    public AdapterPreflight preflight(Connection connection, DiscoveryRequest request) throws SQLException {
        AdapterPreflight report = super.preflight(connection, request);
        if (!report.adapterMatches() || report.connectionReadOnlySignal()
                || !isQualifiedDriver(connection.getMetaData())
                || !CubridSourcePrivilegeProof.inspect(connection, request).proven()) {
            return report;
        }
        var findings = report.findings().stream().map(finding ->
                finding.severity() == PreflightSeverity.BLOCKING
                        && "READ_ONLY_SIGNAL_MISSING".equals(finding.code())
                        ? new PreflightFinding(
                                PreflightSeverity.WARNING,
                                "CUBRID_INTERNAL_CATALOG_SELECT_ONLY",
                                "authoritative _db_class/_db_auth inspection proves SELECT-only access over the requested owner schema; JDBC read-only is unsupported")
                        : finding).toList();
        return new AdapterPreflight(report.identity(), report.database(), report.adapterMatches(), false, findings);
    }

    static boolean isQualifiedDriver(DatabaseMetaData metadata) throws SQLException {
        return "CUBRID".equals(metadata.getDatabaseProductName())
                && QUALIFIED_PRODUCT_VERSION.equals(metadata.getDatabaseProductVersion())
                && QUALIFIED_DRIVER_NAME.equals(metadata.getDriverName())
                && QUALIFIED_DRIVER_VERSION.equals(metadata.getDriverVersion());
    }
}
