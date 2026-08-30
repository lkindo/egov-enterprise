package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogObjectRegistry;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.discovery.VisibilityStatus;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/** 명시적 projection만 사용해 vendor catalog SELECT를 baseline snapshot에 합친다. */
final class VendorCatalogDiscoveryExecutor {

    static final int FETCH_SIZE = 250;

    private VendorCatalogDiscoveryExecutor() {}

    static CatalogSnapshot enrich(
            CatalogSnapshot baseline,
            Connection connection,
            DiscoveryRequest request,
            String adapterId,
            List<VendorCatalogQuery> queries,
            Set<ObjectKind> notApplicableKinds) {
        Objects.requireNonNull(baseline, "baseline");
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(adapterId, "adapterId");
        Objects.requireNonNull(queries, "queries");
        Objects.requireNonNull(notApplicableKinds, "notApplicableKinds");

        Set<ObjectKind> executableKinds = new LinkedHashSet<>();
        queries.stream()
                .filter(query -> request.includes(query.kind()))
                .forEach(query -> executableKinds.add(query.kind()));
        Set<ObjectKind> requestedNotApplicable = new LinkedHashSet<>();
        notApplicableKinds.stream()
                .filter(request::includes)
                .forEach(requestedNotApplicable::add);

        List<VisibilityFinding> findings = new ArrayList<>();
        baseline.visibilityFindings().stream()
                .filter(finding -> !isReplacedBaselineUnsupported(
                        finding, executableKinds, requestedNotApplicable))
                .forEach(findings::add);
        CatalogObjectRegistry objects = new CatalogObjectRegistry(findings);
        baseline.objects().forEach(object -> objects.add(object, "vendor-jdbc-baseline"));
        requestedNotApplicable.forEach(kind -> findings.add(notApplicable(kind, adapterId)));

        List<String> selectedSchemas = request.schemas().isEmpty()
                ? java.util.Collections.singletonList(null)
                : List.copyOf(request.schemas());
        for (VendorCatalogQuery query : queries) {
            if (!request.includes(query.kind())) {
                continue;
            }
            for (String selectedSchema : selectedSchemas) {
                discoverQuery(
                        baseline,
                        connection,
                        request,
                        adapterId,
                        query,
                        selectedSchema,
                        objects,
                        findings);
            }
        }

        return new CatalogSnapshot(
                baseline.schemaVersion(),
                baseline.discoveredAt(),
                baseline.database(),
                baseline.environment(),
                baseline.snapshotCapability(),
                objects.objects(),
                findings);
    }

    private static void discoverQuery(
            CatalogSnapshot baseline,
            Connection connection,
            DiscoveryRequest request,
            String adapterId,
            VendorCatalogQuery query,
            String selectedSchema,
            CatalogObjectRegistry objects,
            List<VisibilityFinding> findings) {
        try (PreparedStatement statement = connection.prepareStatement(query.sql())) {
            statement.setFetchSize(FETCH_SIZE);
            bindSchema(statement, query.schemaParameterCount(), selectedSchema);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    CatalogObject object = mapRow(baseline, request, adapterId, query, selectedSchema, rows);
                    if (object != null) {
                        objects.add(object, query.operation());
                    }
                }
            }
            if (query.partialScopeMessage() != null) {
                findings.add(new VisibilityFinding(
                        VisibilityStatus.PARTIAL,
                        query.kind(),
                        baseline.environment().defaultCatalog(),
                        selectedSchema,
                        query.operation(),
                        query.partialScopeMessage(),
                        null));
            }
        } catch (SQLException failure) {
            findings.add(VisibilityFinding.fromFailure(
                    query.kind(),
                    baseline.environment().defaultCatalog(),
                    selectedSchema,
                    query.operation(),
                    failure));
        }
    }

    private static void bindSchema(
            PreparedStatement statement,
            int parameterCount,
            String selectedSchema) throws SQLException {
        for (int index = 1; index <= parameterCount; index++) {
            if (selectedSchema == null) {
                statement.setNull(index, Types.VARCHAR);
            } else {
                statement.setString(index, selectedSchema);
            }
        }
    }

    private static CatalogObject mapRow(
            CatalogSnapshot baseline,
            DiscoveryRequest request,
            String adapterId,
            VendorCatalogQuery query,
            String selectedSchema,
            ResultSet rows) throws SQLException {
        VendorRowProjection projection = query.projection();
        String catalog = value(rows, projection.catalog());
        if (catalog == null) {
            catalog = baseline.environment().defaultCatalog();
        }
        String schema = value(rows, projection.schema());
        if (schema == null) {
            schema = selectedSchema != null ? selectedSchema : baseline.environment().defaultSchema();
        }
        if (!request.acceptsCatalog(catalog) || !request.acceptsSchema(schema)) {
            return null;
        }
        if (!request.includeSystemObjects() && isSystemSchema(schema)) {
            return null;
        }

        String rawName = requiredValue(rows, projection.name(), "object name");
        List<IdentityPart> identity = new ArrayList<>();
        for (String column : projection.identityColumns()) {
            identity.add(new IdentityPart(column, rows.getString(column)));
        }
        String identityDigest = digestIdentity(query, identity);
        boolean composite = projection.identityColumns().size() != 1
                || !projection.identityColumns().getFirst().equals(projection.name().column());
        String storedName = projection.redactName()
                ? "redacted#" + identityDigest
                : composite ? rawName + "#" + identityDigest : rawName;

        LinkedHashMap<String, String> attributes = new LinkedHashMap<>();
        for (Map.Entry<String, String> attribute : projection.attributes().entrySet()) {
            String value = rows.getString(attribute.getValue());
            if (value != null) {
                attributes.put(attribute.getKey(), value);
            }
        }
        attributes.put("adapterId", adapterId);
        attributes.put("metadataSource", query.operation());
        attributes.put("supportGrade", query.supportGrade().name());
        attributes.put("identityDigest", identityDigest);

        List<ObjectReference> dependencies = dependency(
                baseline, selectedSchema, rows, projection.dependency());
        if (projection.definition().mode() == DefinitionCaptureMode.HASH_ONLY) {
            String definition = value(rows, projection.definition().source());
            return CatalogObject.hashOnlyDefinition(
                    query.kind(), catalog, schema, storedName, true,
                    definition, dependencies, attributes);
        }
        return new CatalogObject(
                query.kind(), catalog, schema, storedName, true,
                null, null, dependencies, attributes);
    }

    private static List<ObjectReference> dependency(
            CatalogSnapshot baseline,
            String selectedSchema,
            ResultSet rows,
            DependencyProjection projection) throws SQLException {
        if (!projection.present()) {
            return List.of();
        }
        String name = value(rows, projection.name());
        if (name == null || name.isBlank()) {
            return List.of();
        }
        String catalog = value(rows, projection.catalog());
        if (catalog == null) {
            catalog = baseline.environment().defaultCatalog();
        }
        String schema = value(rows, projection.schema());
        if (schema == null) {
            schema = selectedSchema != null ? selectedSchema : baseline.environment().defaultSchema();
        }
        return List.of(new ObjectReference(projection.kind(), catalog, schema, name));
    }

    private static String requiredValue(
            ResultSet rows,
            ResultColumnProjection projection,
            String label) throws SQLException {
        String value = value(rows, projection);
        if (value == null || value.isBlank()) {
            throw new SQLException(label + " was absent from the projected vendor row", "02000");
        }
        return value;
    }

    private static String value(ResultSet rows, ResultColumnProjection projection) throws SQLException {
        return projection.present() ? rows.getString(projection.column()) : null;
    }

    private static String digestIdentity(VendorCatalogQuery query, List<IdentityPart> identity) {
        StringBuilder material = new StringBuilder();
        appendLengthPrefixed(material, query.kind().name());
        appendLengthPrefixed(material, query.operation());
        for (IdentityPart part : identity) {
            appendLengthPrefixed(material, part.column());
            appendLengthPrefixed(material, part.value());
        }
        return CatalogObject.definitionHash(material.toString());
    }

    private static void appendLengthPrefixed(StringBuilder target, String value) {
        if (value == null) {
            target.append("-1:");
            return;
        }
        target.append(value.length()).append(':').append(value);
    }

    private static boolean isReplacedBaselineUnsupported(
            VisibilityFinding finding,
            Set<ObjectKind> executableKinds,
            Set<ObjectKind> notApplicableKinds) {
        return finding.status() == VisibilityStatus.UNSUPPORTED
                && "jdbc-portable-baseline".equals(finding.operation())
                && (executableKinds.contains(finding.objectKind())
                || notApplicableKinds.contains(finding.objectKind()));
    }

    private static VisibilityFinding notApplicable(ObjectKind kind, String adapterId) {
        return new VisibilityFinding(
                VisibilityStatus.NOT_APPLICABLE,
                kind,
                null,
                null,
                adapterId + "-not-applicable",
                "the vendor has no native object kind for " + kind.name(),
                null);
    }

    private static boolean isSystemSchema(String schema) {
        if (schema == null) {
            return false;
        }
        String normalized = schema.toUpperCase(Locale.ROOT);
        return normalized.equals("INFORMATION_SCHEMA")
                || normalized.equals("PG_CATALOG")
                || normalized.startsWith("PG_TOAST")
                || normalized.startsWith("PG_TEMP")
                || normalized.equals("SYS")
                || normalized.equals("SYSTEM")
                || normalized.equals("MYSQL")
                || normalized.equals("PERFORMANCE_SCHEMA");
    }

    private record IdentityPart(String column, String value) {}
}
