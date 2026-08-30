package nuri.migration.postgres;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.postgres.TargetSchemaFingerprint.ColumnMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyColumn;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** MappingSpec가 쓰는 target table/column/PK만 실제 JDBC metadata에서 읽는 read-only fingerprinter. */
public final class PostgresTargetSchemaFingerprinter {

    public TargetSchemaFingerprint fingerprint(Connection connection, MappingSpec mapping) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(mapping, "mapping");
        DatabaseMetaData metadata = connection.getMetaData();
        Map<String, RequestedTable> requested = requests(connection, mapping.tables());
        if (requested.isEmpty()) {
            throw new IllegalArgumentException("fingerprint할 MappingSpec target table이 없습니다");
        }

        List<TableMetadata> tables = new ArrayList<>();
        for (RequestedTable request : requested.values()) {
            ActualTable actual = findTable(metadata, request);
            List<ColumnMetadata> columns = readColumns(metadata, actual, request.columns());
            PrimaryKeyMetadata primaryKey = readPrimaryKey(metadata, actual);
            tables.add(new TableMetadata(
                    actual.catalog(),
                    actual.schema(),
                    actual.name(),
                    actual.type(),
                    columns,
                    primaryKey));
        }
        return TargetSchemaFingerprint.create(
                metadata.getDatabaseProductName(),
                metadata.getDatabaseProductVersion(),
                tables);
    }

    private static Map<String, RequestedTable> requests(
            Connection connection,
            List<TableMapping> tableMappings) throws SQLException {
        Map<String, RequestedTable> requested = new LinkedHashMap<>();
        String defaultSchema = blankToNull(connection.getSchema());
        if (defaultSchema == null) {
            defaultSchema = "public";
        }
        for (TableMapping mapping : tableMappings) {
            Objects.requireNonNull(mapping, "tableMapping");
            QualifiedTarget target = parseTarget(mapping.target(), defaultSchema);
            String key = target.canonicalKey();
            RequestedTable table = requested.computeIfAbsent(
                    key,
                    ignored -> new RequestedTable(target.catalog(), target.schema(), target.name(), new LinkedHashSet<>()));
            for (ColumnMapping column : mapping.columns()) {
                Objects.requireNonNull(column, "columnMapping");
                addColumn(table.columns(), column.target());
            }
            if (mapping.idStrategy() != null) {
                addColumn(table.columns(), mapping.idStrategy().column());
            }
            if (mapping.identity() != null) {
                mapping.identity().targetComponents().stream()
                        .map(IdentityComponentSpec::column)
                        .forEach(column -> addColumn(table.columns(), column));
            }
            for (CompositeForeignKey foreignKey : mapping.foreignKeys()) {
                foreignKey.targetComponents().stream()
                        .map(IdentityComponentSpec::column)
                        .forEach(column -> addColumn(table.columns(), column));
            }
            addColumn(table.columns(), mapping.targetKey());
        }
        return Map.copyOf(requested);
    }

    private static void addColumn(Set<String> columns, String column) {
        if (column != null && !column.isBlank()) {
            columns.add(column);
        }
    }

    private static QualifiedTarget parseTarget(String declared, String defaultSchema) {
        if (declared == null || declared.isBlank()) {
            throw new IllegalArgumentException("MappingSpec target table이 비어 있습니다");
        }
        String[] parts = declared.trim().split("\\.", -1);
        for (String part : parts) {
            if (part.isBlank()) {
                throw new IllegalArgumentException("잘못된 MappingSpec target table: " + declared);
            }
        }
        return switch (parts.length) {
            case 1 -> new QualifiedTarget(null, defaultSchema, parts[0]);
            case 2 -> new QualifiedTarget(null, parts[0], parts[1]);
            case 3 -> new QualifiedTarget(parts[0], parts[1], parts[2]);
            default -> throw new IllegalArgumentException("잘못된 MappingSpec target table: " + declared);
        };
    }

    private static ActualTable findTable(DatabaseMetaData metadata, RequestedTable request) throws SQLException {
        List<ActualTable> matches = new ArrayList<>();
        try (ResultSet rows = metadata.getTables(null, null, "%", null)) {
            while (rows.next()) {
                ActualTable candidate = new ActualTable(
                        rows.getString("TABLE_CAT"),
                        rows.getString("TABLE_SCHEM"),
                        rows.getString("TABLE_NAME"),
                        rows.getString("TABLE_TYPE"));
                if (matches(request.catalog(), candidate.catalog())
                        && matches(request.schema(), candidate.schema())
                        && matches(request.name(), candidate.name())) {
                    matches.add(candidate);
                }
            }
        }
        if (matches.isEmpty()) {
            throw new IllegalArgumentException("실제 DB에 target table이 없습니다: " + request.qualifiedName());
        }
        if (matches.size() > 1) {
            throw new IllegalArgumentException("실제 DB target table이 모호합니다: " + request.qualifiedName());
        }
        return matches.getFirst();
    }

    private static List<ColumnMetadata> readColumns(
            DatabaseMetaData metadata,
            ActualTable table,
            Set<String> requestedColumns) throws SQLException {
        Map<String, List<ColumnMetadata>> actualByName = new LinkedHashMap<>();
        List<ColumnMetadata> allColumns = new ArrayList<>();
        try (ResultSet rows = metadata.getColumns(
                table.catalog(), table.schema(), table.name(), "%")) {
            while (rows.next()) {
                ColumnMetadata column = new ColumnMetadata(
                        rows.getString("COLUMN_NAME"),
                        rows.getInt("DATA_TYPE"),
                        rows.getString("TYPE_NAME"),
                        rows.getInt("COLUMN_SIZE"),
                        rows.getInt("DECIMAL_DIGITS"),
                        rows.getInt("NULLABLE"),
                        rows.getString("COLUMN_DEF"),
                        rows.getInt("ORDINAL_POSITION"),
                        "YES".equalsIgnoreCase(rows.getString("IS_AUTOINCREMENT")),
                        "YES".equalsIgnoreCase(rows.getString("IS_GENERATEDCOLUMN")));
                allColumns.add(column);
                actualByName.computeIfAbsent(normalize(column.name()), ignored -> new ArrayList<>()).add(column);
            }
        }

        for (String requested : requestedColumns) {
            List<ColumnMetadata> matches = actualByName.getOrDefault(normalize(requested), List.of());
            if (matches.isEmpty()) {
                throw new IllegalArgumentException("실제 DB에 target column이 없습니다: "
                        + table.qualifiedName() + "." + requested);
            }
            if (matches.size() > 1) {
                throw new IllegalArgumentException("실제 DB target column이 모호합니다: "
                        + table.qualifiedName() + "." + requested);
            }
        }
        return allColumns;
    }

    private static PrimaryKeyMetadata readPrimaryKey(
            DatabaseMetaData metadata,
            ActualTable table) throws SQLException {
        List<PrimaryKeyColumn> columns = new ArrayList<>();
        Set<String> names = new LinkedHashSet<>();
        try (ResultSet rows = metadata.getPrimaryKeys(table.catalog(), table.schema(), table.name())) {
            while (rows.next()) {
                columns.add(new PrimaryKeyColumn(
                        rows.getShort("KEY_SEQ"),
                        rows.getString("COLUMN_NAME")));
                String name = rows.getString("PK_NAME");
                if (name != null && !name.isBlank()) {
                    names.add(name);
                }
            }
        }
        if (columns.isEmpty()) {
            throw new IllegalArgumentException("실제 DB target table에 primary key가 없습니다: "
                    + table.qualifiedName());
        }
        if (names.size() > 1) {
            throw new IllegalArgumentException("실제 DB target primary key 이름이 모호합니다: "
                    + table.qualifiedName());
        }
        return new PrimaryKeyMetadata(names.stream().findFirst().orElse(null), columns);
    }

    private static boolean matches(String expected, String actual) {
        return expected == null || (actual != null && expected.equalsIgnoreCase(actual));
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private record QualifiedTarget(String catalog, String schema, String name) {
        String canonicalKey() {
            return String.join("\u0000", nullSafe(catalog), nullSafe(schema), name)
                    .toLowerCase(Locale.ROOT);
        }
    }

    private record RequestedTable(String catalog, String schema, String name, Set<String> columns) {
        String qualifiedName() {
            return joinName(catalog, schema, name);
        }
    }

    private record ActualTable(String catalog, String schema, String name, String type) {
        ActualTable {
            name = Objects.requireNonNull(name, "actual table name");
            type = Objects.requireNonNullElse(type, "UNKNOWN");
        }

        String qualifiedName() {
            return joinName(catalog, schema, name);
        }
    }

    private static String joinName(String catalog, String schema, String name) {
        return java.util.stream.Stream.of(catalog, schema, name)
                .filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining("."));
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
