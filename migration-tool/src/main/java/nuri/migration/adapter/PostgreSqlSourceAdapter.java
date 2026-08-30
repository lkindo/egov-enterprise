package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogObjectRegistry;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.discovery.VisibilityStatus;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/** PostgreSQL의 {@code pg_catalog}를 읽기 전용으로 보강하는 source adapter. */
public final class PostgreSqlSourceAdapter extends JdbcMetadataSourceAdapter {

    private static final String ENVIRONMENT_SQL = """
            SELECT pg_catalog.pg_encoding_to_char(d.encoding) AS charset,
                   d.datcollate AS collation,
                   pg_catalog.current_setting('TimeZone') AS timezone
              FROM pg_catalog.pg_database d
             WHERE d.datname = pg_catalog.current_database()
            """;
    private static final String SCHEMA_VISIBILITY_SQL = """
            SELECT n.oid IS NOT NULL AS schema_exists,
                   COALESCE(pg_catalog.has_schema_privilege(n.oid, 'USAGE'), false) AS has_usage
              FROM (SELECT CAST(? AS text) AS schema_name) requested
              LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = requested.schema_name
            """;
    private static final String USER_SCHEMAS_SQL = """
            SELECT n.nspname AS schema_name
              FROM pg_catalog.pg_namespace n
             WHERE n.nspname <> 'pg_catalog'
               AND n.nspname <> 'information_schema'
               AND LEFT(n.nspname, 8) <> 'pg_toast'
               AND LEFT(n.nspname, 7) <> 'pg_temp'
             ORDER BY n.nspname
            """;
    private static final Set<ObjectKind> POSTGRES_NOT_APPLICABLE_KINDS = Set.of(
            ObjectKind.PACKAGE,
            ObjectKind.PACKAGE_BODY,
            ObjectKind.DATABASE_LINK,
            ObjectKind.CHARACTER_SET,
            ObjectKind.EVENT);
    private static final Set<ObjectKind> POSTGRES_SCHEMA_GLOBAL_KINDS = Set.of(
            ObjectKind.ROLE,
            ObjectKind.USER,
            ObjectKind.TABLESPACE,
            ObjectKind.FOREIGN_DATA_WRAPPER,
            ObjectKind.FOREIGN_SERVER,
            ObjectKind.USER_MAPPING,
            ObjectKind.PUBLICATION,
            ObjectKind.SUBSCRIPTION);
    private static final AdapterIdentity IDENTITY = new AdapterIdentity(
            "postgresql-pg-catalog",
            DatabaseFamily.POSTGRESQL,
            "PostgreSQL",
            Set.of("PostgreSQL"),
            "numeric PostgreSQL product version required; real pg_catalog evidence is experimental",
            EvidenceLevel.EXPERIMENTAL);
    private static final List<VendorCatalogQuery> QUERY_CONTRACTS = PostgreSqlCatalogQueries.queries().stream()
            .map(query -> new VendorCatalogQuery(
                    query.kind(),
                    query.operation(),
                    query.sql(),
                    query.schemaParameterCount(),
                    switch (query.kind()) {
                        case ROUTINE, FUNCTION, PROCEDURE, TRIGGER, POLICY, JOB, EXTERNAL_OBJECT ->
                                ObjectSupportGrade.MANUAL;
                        case TYPE, DOMAIN, ENUM, COLLATION, EXTENSION, DEFAULT_CONSTRAINT ->
                                ObjectSupportGrade.TRANSFORMED;
                        default -> ObjectSupportGrade.METADATA_ONLY;
                    }))
            .collect(Collectors.toUnmodifiableList());
    private static final AdapterCapabilities CAPABILITIES = postgresCapabilities();
    private static final Map<ObjectKind, DiscoveryTerminalRoute> DISCOVERY_ROUTES =
            DiscoveryRouteMatrix.vendor(QUERY_CONTRACTS, POSTGRES_NOT_APPLICABLE_KINDS);

    @Override
    public String id() {
        return IDENTITY.adapterId();
    }

    @Override
    public boolean supports(DatabaseMetaData metadata) throws SQLException {
        Objects.requireNonNull(metadata, "metadata");
        return IDENTITY.recognizesProduct(metadata.getDatabaseProductName())
                && AbstractVendorSourceAdapter.hasVersionEvidence(metadata.getDatabaseProductVersion());
    }

    @Override
    public AdapterIdentity identity() {
        return IDENTITY;
    }

    @Override
    public AdapterCapabilities capabilities() {
        return CAPABILITIES;
    }

    @Override
    public SnapshotStrategy snapshotStrategy() {
        return new SnapshotStrategy(
                SnapshotStrategy.SnapshotModel.MVCC_TRANSACTION,
                true,
                true,
                "operator-managed REPEATABLE READ transaction and optional exported snapshot",
                ExecutionPolicy.MANUAL_ONLY,
                EvidenceLevel.EXPERIMENTAL);
    }

    @Override
    public DataStreamingStrategy dataStreamingStrategy() {
        return new DataStreamingStrategy(
                Set.of(DataStreamingStrategy.StreamingModel.SERVER_SIDE_CURSOR,
                        DataStreamingStrategy.StreamingModel.KEYSET_PAGINATION),
                true,
                true,
                "fetch-size cursor requires an explicit transaction; no automatic session changes",
                ExecutionPolicy.MANUAL_ONLY,
                EvidenceLevel.EXPERIMENTAL);
    }

    @Override
    public SourceReadSessionPolicy sourceReadSessionPolicy() {
        return SourceReadSessionPolicy.repeatableRead(
                EvidenceLevel.EXPERIMENTAL,
                "operator freeze plus one PostgreSQL REPEATABLE READ transaction");
    }

    @Override
    public List<VendorCatalogQuery> catalogQueries() {
        return QUERY_CONTRACTS;
    }

    @Override
    public Map<ObjectKind, DiscoveryTerminalRoute> discoveryRoutes() {
        return DISCOVERY_ROUTES;
    }

    @Override
    public DiscoveryScope discoveryScope(DiscoveryRequest request) {
        return DiscoveryScope.capture(
                id(),
                request,
                POSTGRES_NOT_APPLICABLE_KINDS,
                POSTGRES_SCHEMA_GLOBAL_KINDS);
    }

    @Override
    protected DiscoveryVisibilityProof visibilityProof(
            Connection connection,
            DiscoveryRequest request) {
        if (!request.catalogs().isEmpty() || request.includeSystemObjects()) {
            return DiscoveryVisibilityProof.unproven();
        }
        try {
            Set<String> schemas = request.schemas();
            if (schemas.isEmpty()) {
                schemas = new LinkedHashSet<>(enumerateUserSchemas(connection));
                if (schemas.isEmpty()) {
                    return DiscoveryVisibilityProof.unproven();
                }
            }
            for (String schema : schemas) {
                if (!hasSchemaVisibility(connection, schema)) {
                    return DiscoveryVisibilityProof.unproven();
                }
            }
            return request.schemas().isEmpty()
                    ? DiscoveryVisibilityProof.completeSource()
                    : DiscoveryVisibilityProof.forSchemas(request.schemas());
        } catch (SQLException failure) {
            // 후속 verifySchemaVisibility가 안전한 blocking finding으로 상세 상태를 기록한다.
            return DiscoveryVisibilityProof.unproven();
        }
    }

    @Override
    public CatalogSnapshot discover(Connection connection, DiscoveryRequest request) throws SQLException {
        CatalogSnapshot baseline = super.discover(connection, baselineRequest(request));
        List<VisibilityFinding> findings = new ArrayList<>(baseline.visibilityFindings());
        CatalogObjectRegistry objects = new CatalogObjectRegistry(findings);
        baseline.objects().forEach(object -> objects.add(object, "postgres-jdbc-baseline"));

        for (PostgreSqlCatalogQueries.Query query : PostgreSqlCatalogQueries.queries()) {
            if (!request.includes(query.kind())) {
                continue;
            }
            if (query.global() && !request.schemas().isEmpty()) {
                continue;
            }
            List<String> schemas = query.global() || request.schemas().isEmpty()
                    ? java.util.Collections.singletonList(null)
                    : List.copyOf(request.schemas());
            for (String schema : schemas) {
                enrich(connection, query, schema, request.includeSystemObjects(), objects, findings);
            }
        }

        verifySchemaVisibility(connection, request, objects.objects(), findings);
        CatalogSnapshot.EnvironmentInfo environment = readEnvironment(
                connection,
                baseline.environment(),
                findings);
        return new CatalogSnapshot(
                baseline.schemaVersion(),
                baseline.discoveredAt(),
                baseline.database(),
                environment,
                new SnapshotCapability(true, true, "REPEATABLE_READ/pg_export_snapshot"),
                objects.objects(),
                findings);
    }

    private static void enrich(
            Connection connection,
            PostgreSqlCatalogQueries.Query query,
            String schema,
            boolean includeSystemObjects,
            CatalogObjectRegistry objects,
            List<VisibilityFinding> findings) {
        try (PreparedStatement statement = connection.prepareStatement(query.sql(includeSystemObjects))) {
            statement.setFetchSize(250);
            bindSchema(statement, query.schemaParameterCount(), schema);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    if (query.capabilityProbe()) {
                        continue;
                    }
                    CatalogObject object = mapObject(rows, query, includeSystemObjects);
                    if (object != null) {
                        objects.add(object, query.operation());
                    }
                }
            }
            recordPartialScope(query, schema, findings);
        } catch (SQLException failure) {
            findings.add(VisibilityFinding.fromFailure(
                    query.kind(),
                    null,
                    schema,
                    query.operation(),
                    failure));
        }
    }

    private static CatalogObject mapObject(
            ResultSet rows,
            PostgreSqlCatalogQueries.Query query,
            boolean includeSystemObjects) throws SQLException {
        String catalog = rows.getString("object_catalog");
        String schema = rows.getString("object_schema");
        if (!includeSystemObjects && isPostgresSystemSchema(schema)) {
            return null;
        }
        String name = rows.getString("object_name");
        if (query.kind() == ObjectKind.GRANT) {
            String identityDetail = rows.getString("identity_detail");
            if (identityDetail == null || identityDetail.isBlank()) {
                throw new SQLException("grant identity projection was absent", "02000");
            }
            name = name + "#" + CatalogObject.definitionHash(
                    nullToEmpty(catalog) + '\u0000'
                            + nullToEmpty(schema) + '\u0000'
                            + nullToEmpty(name) + '\u0000'
                            + identityDetail);
        }
        String definition = rows.getString("native_definition");
        String dependencySchema = rows.getString("dependency_schema");
        String dependencyName = rows.getString("dependency_name");
        String detail = rows.getString("detail");
        List<ObjectReference> dependencies = dependencyName == null || query.dependencyKind() == null
                ? List.of()
                : List.of(new ObjectReference(
                        query.dependencyKind(),
                        catalog,
                        dependencySchema,
                        dependencyName));
        LinkedHashMap<String, String> attributes = new LinkedHashMap<>();
        attributes.put("metadataSource", "pg_catalog");
        if (detail != null) {
            attributes.put("detail", detail);
        }
        return CatalogObject.hashOnlyDefinition(
                query.kind(),
                catalog,
                schema,
                name,
                requiresQuoting(name),
                definition,
                dependencies,
                attributes);
    }

    private static void recordPartialScope(
            PostgreSqlCatalogQueries.Query query,
            String schema,
            List<VisibilityFinding> findings) {
        String message = query.partialScopeMessage();
        if (message != null) {
            findings.add(new VisibilityFinding(
                    VisibilityStatus.PARTIAL,
                    query.kind(),
                    null,
                    schema,
                    query.operation(),
                    message,
                    null));
        }
    }

    private static DiscoveryRequest baselineRequest(DiscoveryRequest request) {
        EnumSet<ObjectKind> kinds = request.objectKinds().isEmpty()
                ? EnumSet.noneOf(ObjectKind.class)
                : EnumSet.copyOf(request.objectKinds());
        if (request.includes(ObjectKind.FUNCTION) || request.includes(ObjectKind.PROCEDURE)) {
            kinds.remove(ObjectKind.ROUTINE);
        }
        if (request.includes(ObjectKind.DOMAIN) || request.includes(ObjectKind.ENUM)) {
            kinds.remove(ObjectKind.TYPE);
        }
        if (kinds.equals(request.objectKinds())) {
            return request;
        }
        return new DiscoveryRequest(
                request.catalogs(),
                request.schemas(),
                kinds,
                request.includeSystemObjects());
    }

    private static void bindSchema(PreparedStatement statement, int parameterCount, String schema)
            throws SQLException {
        for (int parameter = 1; parameter <= parameterCount; parameter++) {
            if (schema == null) {
                statement.setNull(parameter, Types.VARCHAR);
            } else {
                statement.setString(parameter, schema);
            }
        }
    }

    private static CatalogSnapshot.EnvironmentInfo readEnvironment(
            Connection connection,
            CatalogSnapshot.EnvironmentInfo fallback,
            List<VisibilityFinding> findings) {
        try (PreparedStatement statement = connection.prepareStatement(ENVIRONMENT_SQL);
             ResultSet rows = statement.executeQuery()) {
            if (rows.next()) {
                return new CatalogSnapshot.EnvironmentInfo(
                        fallback.defaultCatalog(),
                        fallback.defaultSchema(),
                        rows.getString("charset"),
                        rows.getString("collation"),
                        rows.getString("timezone"));
            }
            findings.add(new VisibilityFinding(
                    VisibilityStatus.PARTIAL,
                    ObjectKind.CATALOG,
                    fallback.defaultCatalog(),
                    fallback.defaultSchema(),
                    "postgres-environment",
                    "the PostgreSQL environment query returned no database row",
                    null));
        } catch (SQLException failure) {
            findings.add(VisibilityFinding.fromFailure(
                    ObjectKind.CATALOG,
                    fallback.defaultCatalog(),
                    fallback.defaultSchema(),
                    "postgres-environment",
                    failure));
        }
        return fallback;
    }

    private static void verifySchemaVisibility(
            Connection connection,
            DiscoveryRequest request,
            Iterable<CatalogObject> objects,
            List<VisibilityFinding> findings) {
        LinkedHashSet<String> schemas = new LinkedHashSet<>(request.schemas());
        if (schemas.isEmpty()) {
            try {
                schemas.addAll(enumerateUserSchemas(connection));
                if (schemas.isEmpty()) {
                    findings.add(new VisibilityFinding(
                            VisibilityStatus.PARTIAL,
                            ObjectKind.SCHEMA,
                            null,
                            null,
                            "postgres-schema-enumeration",
                            "the PostgreSQL user-schema census returned no visible schema",
                            null));
                    return;
                }
            } catch (SQLException failure) {
                findings.add(VisibilityFinding.fromFailure(
                        ObjectKind.SCHEMA,
                        null,
                        null,
                        "postgres-schema-enumeration",
                        failure));
                return;
            }
        }
        for (String schema : schemas) {
            try (PreparedStatement statement = connection.prepareStatement(SCHEMA_VISIBILITY_SQL)) {
                statement.setString(1, schema);
                try (ResultSet rows = statement.executeQuery()) {
                    if (!rows.next()
                            || !rows.getBoolean("schema_exists")
                            || !rows.getBoolean("has_usage")) {
                        findings.add(new VisibilityFinding(
                                VisibilityStatus.UNREADABLE,
                                ObjectKind.SCHEMA,
                                null,
                                schema,
                                "postgres-schema-visibility",
                                "schema metadata is not visible to the source account",
                                null));
                    }
                }
            } catch (SQLException failure) {
                findings.add(VisibilityFinding.fromFailure(
                        ObjectKind.SCHEMA,
                        null,
                        schema,
                        "postgres-schema-visibility",
                        failure));
            }
        }
    }

    private static boolean hasSchemaVisibility(Connection connection, String schema)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(SCHEMA_VISIBILITY_SQL)) {
            statement.setString(1, schema);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next()
                        && rows.getBoolean("schema_exists")
                        && rows.getBoolean("has_usage");
            }
        }
    }

    private static List<String> enumerateUserSchemas(Connection connection) throws SQLException {
        List<String> schemas = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(USER_SCHEMAS_SQL)) {
            statement.setFetchSize(250);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    String schema = rows.getString("schema_name");
                    if (schema != null && !schema.isBlank() && !isPostgresSystemSchema(schema)) {
                        schemas.add(schema);
                    }
                }
            }
        }
        return List.copyOf(schemas);
    }

    private static boolean requiresQuoting(String identifier) {
        if (identifier == null || !identifier.matches("[a-z_][a-z0-9_$]*(?:[.(][a-zA-Z0-9_$, ]*[)]?)?")) {
            return true;
        }
        return !identifier.equals(identifier.toLowerCase(Locale.ROOT));
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static boolean isPostgresSystemSchema(String schema) {
        if (schema == null) {
            return false;
        }
        String normalized = schema.toLowerCase(Locale.ROOT);
        return normalized.equals("information_schema")
                || normalized.equals("pg_catalog")
                || normalized.startsWith("pg_toast")
                || normalized.startsWith("pg_temp");
    }

    private static AdapterCapabilities postgresCapabilities() {
        AdapterCapabilities.Builder builder = AdapterCapabilities.builder(EvidenceLevel.EXPERIMENTAL)
                .limitation("pg_catalog queries require real PostgreSQL version/privilege validation")
                .limitation("job extensions and external resources remain manual");
        for (VendorCatalogQuery query : QUERY_CONTRACTS) {
            builder.support(query.kind(), query.supportGrade());
        }
        return builder.build();
    }
}
