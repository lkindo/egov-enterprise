package nuri.migration.postgres;

import nuri.migration.artifact.CanonicalArtifactDigest;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** 실제 target JDBC metadata에서 얻은 mapped schema의 credential-free canonical fingerprint. */
public record TargetSchemaFingerprint(
        int schemaVersion,
        String databaseProduct,
        String databaseVersion,
        String digest,
        List<TableMetadata> tables) {

    public static final int CURRENT_SCHEMA_VERSION = 1;

    public TargetSchemaFingerprint {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be positive");
        }
        databaseProduct = requireText(databaseProduct, "databaseProduct");
        databaseVersion = requireText(databaseVersion, "databaseVersion");
        digest = requireText(digest, "digest");
        tables = canonicalTables(tables);
    }

    public static TargetSchemaFingerprint create(
            String databaseProduct,
            String databaseVersion,
            List<TableMetadata> tables) {
        List<TableMetadata> canonicalTables = canonicalTables(tables);
        FingerprintMaterial material = new FingerprintMaterial(
                CURRENT_SCHEMA_VERSION,
                requireText(databaseProduct, "databaseProduct"),
                requireText(databaseVersion, "databaseVersion"),
                canonicalTables);
        return new TargetSchemaFingerprint(
                CURRENT_SCHEMA_VERSION,
                material.databaseProduct(),
                material.databaseVersion(),
                CanonicalArtifactDigest.sha256(material),
                canonicalTables);
    }

    private static List<TableMetadata> canonicalTables(List<TableMetadata> tables) {
        return Objects.requireNonNull(tables, "tables").stream()
                .map(table -> Objects.requireNonNull(table, "table"))
                .sorted(Comparator.comparing(TableMetadata::canonicalName))
                .toList();
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }

    private record FingerprintMaterial(
            int schemaVersion,
            String databaseProduct,
            String databaseVersion,
            List<TableMetadata> tables) {}

    public record TableMetadata(
            String catalog,
            String schema,
            String name,
            String tableType,
            List<ColumnMetadata> columns,
            PrimaryKeyMetadata primaryKey) {

        public TableMetadata {
            name = requireText(name, "table.name");
            tableType = requireText(tableType, "table.tableType");
            columns = Objects.requireNonNull(columns, "table.columns").stream()
                    .map(column -> Objects.requireNonNull(column, "column"))
                    .sorted(Comparator.comparing(ColumnMetadata::canonicalName))
                    .toList();
            if (columns.isEmpty()) {
                throw new IllegalArgumentException("target table columns must not be empty: " + name);
            }
            primaryKey = Objects.requireNonNull(primaryKey, "table.primaryKey");
        }

        String canonicalName() {
            return String.join("\u0000", nullSafe(catalog), nullSafe(schema), name).toLowerCase(java.util.Locale.ROOT);
        }
    }

    public record ColumnMetadata(
            String name,
            int jdbcType,
            String nativeType,
            int size,
            int decimalDigits,
            int nullable,
            String defaultValue,
            int ordinalPosition,
            boolean autoIncrement,
            boolean generated) {

        public ColumnMetadata {
            name = requireText(name, "column.name");
            nativeType = requireText(nativeType, "column.nativeType");
            if (size < 0 || decimalDigits < 0 || ordinalPosition <= 0) {
                throw new IllegalArgumentException("invalid target column metadata: " + name);
            }
        }

        String canonicalName() {
            return name.toLowerCase(java.util.Locale.ROOT) + '\u0000' + name;
        }
    }

    public record PrimaryKeyMetadata(
            String name,
            List<PrimaryKeyColumn> columns) {

        public PrimaryKeyMetadata {
            columns = Objects.requireNonNull(columns, "primaryKey.columns").stream()
                    .map(column -> Objects.requireNonNull(column, "primaryKey.column"))
                    .sorted(Comparator.comparingInt(PrimaryKeyColumn::keySequence)
                            .thenComparing(PrimaryKeyColumn::name))
                    .toList();
            if (columns.isEmpty()) {
                throw new IllegalArgumentException("target primary key columns must not be empty");
            }
        }
    }

    public record PrimaryKeyColumn(short keySequence, String name) {
        public PrimaryKeyColumn {
            if (keySequence <= 0) {
                throw new IllegalArgumentException("primary key sequence must be positive");
            }
            name = requireText(name, "primaryKey.column.name");
        }
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
