package nuri.migration.validate;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.lookup.LookupRef;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 실행 직전 실제 source/target JDBC metadata를 대조해 매핑 선언의 테이블·컬럼·조회 키·identity 컴포넌트 정합성을 검증한다.
 */
public final class MappingLiveMetadataValidator {

    private MappingLiveMetadataValidator() {
    }

    /**
     * 실행 전에 실제 source JDBC metadata를 대조한다. 모든 source table, column 및
     * {@code idStrategy.sourceKey}가 확인된 뒤에만 타깃 쓰기 단계로 진행할 수 있다.
     */
    public static ValidationResult validateLiveSource(MappingSpec spec, JdbcTemplate source) {
        List<String> errors = new ArrayList<>();
        source.execute((Connection connection) -> {
            connection.setReadOnly(true);
            DatabaseMetaData metadata = connection.getMetaData();
            boolean cubridDriver = "CUBRID".equals(metadata.getDatabaseProductName())
                    && "CUBRID JDBC Driver".equals(metadata.getDriverName());
            String defaultCatalog = connection.getCatalog();
            if (cubridDriver && "".equals(defaultCatalog)) {
                // CUBRID reports an empty connection catalog but null TABLE_CAT in metadata.
                defaultCatalog = null;
            }
            String defaultSchema;
            try {
                defaultSchema = connection.getSchema();
            } catch (SQLException failure) {
                // The official driver wraps UnsupportedOperationException for getSchema().
                // Do not disguise connection failures or another driver's metadata failure.
                if (!cubridDriver || (!(failure instanceof SQLFeatureNotSupportedException)
                        && !(failure.getCause() instanceof UnsupportedOperationException))) {
                    throw failure;
                }
                defaultSchema = null;
            }
            boolean mysqlSchemaMode = defaultCatalog == null && !isBlank(defaultSchema)
                    && "MySQL".equals(metadata.getDatabaseProductName())
                    && "MySQL Connector/J".equals(metadata.getDriverName());
            boolean mariaDbSchemaMode = "def".equals(defaultCatalog) && !isBlank(defaultSchema)
                    && "MariaDB".equals(metadata.getDatabaseProductName())
                    && "MariaDB Connector/J".equals(metadata.getDriverName());
            if (mysqlSchemaMode) {
                // Connector/J databaseTerm=SCHEMA makes getCatalog() a null no-op,
                // but getColumns() still reports the fixed INFORMATION_SCHEMA catalog "def".
                // Resolve only the missing metadata default; MySQL source SQL accepts
                // table or schema.table, so an explicit catalog qualification is rejected.
                defaultCatalog = "def";
            }
            for (MappingSpec.TableMapping table : spec.tables()) {
                if ((mysqlSchemaMode || mariaDbSchemaMode) && table.source().split("\\.", -1).length > 2) {
                    errors.add(mysqlSchemaMode ? "MYSQL_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED"
                            : "MARIADB_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED");
                    continue;
                }
                QualifiedName name = qualifiedName(table.source(), defaultCatalog, defaultSchema);
                Map<String, ColumnMetadata> liveColumns = metadataColumnInfo(
                        metadata, name.catalog(), name.schema(), name.table(), cubridDriver);
                if (liveColumns.isEmpty()) {
                    errors.add("실 source에 없는 테이블 또는 metadata 접근 불가: " + table.source());
                    continue;
                }
                for (MappingSpec.ColumnMapping column : table.columns()) {
                    // 조회 컬럼(alias.COLUMN)은 조회 표에서 따로 본다(ADR-0029 L3d).
                    if (!isBlank(column.source()) && LookupRef.parse(column.source()) == null
                            && !liveColumns.containsKey(normalize(column.source()))) {
                        errors.add("실 source에 없는 컬럼: " + table.source() + "." + column.source());
                    }
                }
                MappingSpec.IdStrategy id = table.idStrategy();
                if (id != null && !isBlank(id.sourceKey())
                        && !liveColumns.containsKey(normalize(id.sourceKey()))) {
                    errors.add("실 source에 없는 idStrategy.sourceKey: "
                            + table.source() + "." + id.sourceKey());
                }
                for (String orderKey : table.effectiveOrderKeys()) {
                    if (!liveColumns.containsKey(normalize(orderKey))) {
                        errors.add("실 source에 없는 order key: " + table.source() + "." + orderKey);
                    }
                }
                if (table.identity() != null) {
                    validateLiveComponents(
                            "source", table.source(), "identity source",
                            table.identity().sourceComponents(), liveColumns, errors);
                }
                for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
                    validateLiveComponents(
                            "source", table.source(), "foreign key source",
                            foreignKey.sourceComponents(), liveColumns, errors);
                }
                for (MappingSpec.Lookup lookup : table.lookups()) {
                    if (lookup == null || lookup.key() == null || isBlank(lookup.source())) {
                        continue; // 정적 규칙(LookupRules)이 알린다.
                    }
                    if ((mysqlSchemaMode || mariaDbSchemaMode) && lookup.source().split("\\.", -1).length > 2) {
                        errors.add(mysqlSchemaMode ? "MYSQL_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED"
                                : "MARIADB_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED");
                        continue;
                    }
                    QualifiedName lookupName = qualifiedName(lookup.source(), defaultCatalog, defaultSchema);
                    validateLiveLookup(table, lookup, liveColumns, metadataColumnInfo(metadata,
                            lookupName.catalog(), lookupName.schema(), lookupName.table(), cubridDriver), errors);
                }
            }
            return null;
        });
        return new ValidationResult(errors, List.of());
    }

    /**
     * [ADR-0029 L3d] 조회 표와 그 컬럼이 실재하고, 조회 키 두 컬럼이 같은 계열(가변 길이 문자 또는 정수·고정소수)인지
     * 본다. CHAR 키는 공백 채움 비교가 DBMS 마다 달라 받지 않는다. 문구는 표·컬럼 이름과 타입 이름뿐이다.
     */
    private static void validateLiveLookup(MappingSpec.TableMapping table, MappingSpec.Lookup lookup,
                                           Map<String, ColumnMetadata> mainColumns,
                                           Map<String, ColumnMetadata> lookupColumns, List<String> errors) {
        if (lookupColumns.isEmpty()) {
            errors.add("실 source에 없는 조회 표 또는 metadata 접근 불가: " + lookup.source());
            return;
        }
        ColumnMetadata from = mainColumns.get(normalize(lookup.key().from()));
        ColumnMetadata to = lookupColumns.get(normalize(lookup.key().to()));
        if (from == null) {
            errors.add("실 source에 없는 조회 키 컬럼: " + table.source() + "." + lookup.key().from());
        }
        if (to == null) {
            errors.add("실 source에 없는 조회 키 컬럼: " + lookup.source() + "." + lookup.key().to());
        }
        for (MappingSpec.ColumnMapping column : table.columns()) {
            LookupRef ref = LookupRef.parse(column.source());
            if (ref != null && ref.alias().equals(lookup.alias())
                    && !lookupColumns.containsKey(normalize(ref.column()))) {
                errors.add("실 source에 없는 조회 컬럼: " + lookup.source() + "." + ref.column());
            }
        }
        if (from == null || to == null) {
            return;
        }
        String at = MappingIndex.label(table) + ".lookups[" + lookup.alias() + "]";
        Boolean fromNumeric = lookupKeyFamily(from.jdbcType());
        Boolean toNumeric = lookupKeyFamily(to.jdbcType());
        if (fromNumeric == null || toNumeric == null) {
            errors.add(at + ": 조회 키는 가변 길이 문자(VARCHAR 계열)나 정수·고정소수 컬럼이어야 합니다 — CHAR 는 공백 채움"
                    + " 비교가 DBMS 마다 달라 받지 않습니다: " + from.typeName() + " / " + to.typeName());
        } else if (!fromNumeric.equals(toNumeric)) {
            errors.add(at + ": 조회 키 두 컬럼의 계열(문자·수)이 다릅니다: " + from.typeName() + " / " + to.typeName());
        }
    }

    /** 조회 키 계열 — 수면 true, 가변 길이 문자면 false, 받지 않는 타입이면 null. */
    private static Boolean lookupKeyFamily(int jdbcType) {
        return switch (jdbcType) {
            case Types.VARCHAR, Types.NVARCHAR -> false;
            case Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT, Types.NUMERIC, Types.DECIMAL -> true;
            default -> null;
        };
    }

    /**
     * commit 직전 실제 target JDBC metadata를 대조한다. 정적 표준 snapshot과 별개로,
     * 현재 접속 대상에 매핑 table/column이 모두 존재하지 않으면 쓰기를 시작하지 않는다.
     */
    public static ValidationResult validateLiveTarget(MappingSpec spec, JdbcTemplate target) {
        List<String> errors = new ArrayList<>();
        target.execute((Connection connection) -> {
            DatabaseMetaData metadata = connection.getMetaData();
            String defaultCatalog = connection.getCatalog();
            String defaultSchema = connection.getSchema();
            for (MappingSpec.TableMapping table : spec.tables()) {
                String qualified = table.target();
                if (isBlank(qualified)) {
                    continue;
                }
                QualifiedName name = qualifiedName(qualified, defaultCatalog, defaultSchema);
                Map<String, ColumnMetadata> liveColumns = metadataColumnInfo(
                        metadata, name.catalog(), name.schema(), name.table(), false);
                if (liveColumns.isEmpty()) {
                    errors.add("실 target에 없는 테이블 또는 metadata 접근 불가: " + qualified);
                    continue;
                }
                MappingSpec.IdStrategy id = table.idStrategy();
                if (id != null && !isBlank(id.column()) && !liveColumns.containsKey(normalize(id.column()))) {
                    errors.add("실 target에 없는 idStrategy 컬럼: " + qualified + "." + id.column());
                }
                if (!isBlank(table.targetKey()) && !liveColumns.containsKey(normalize(table.targetKey()))) {
                    errors.add("실 target에 없는 targetKey: " + qualified + "." + table.targetKey());
                }
                for (MappingSpec.ColumnMapping column : table.columns()) {
                    if (!isBlank(column.target()) && !liveColumns.containsKey(normalize(column.target()))) {
                        errors.add("실 target에 없는 컬럼: " + qualified + "." + column.target());
                    }
                }
                if (table.identity() != null) {
                    validateLiveComponents(
                            "target", qualified, "identity target",
                            table.identity().targetComponents(), liveColumns, errors);
                }
                for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
                    validateLiveComponents(
                            "target", qualified, "foreign key target",
                            foreignKey.targetComponents(), liveColumns, errors);
                }
            }
            return null;
        });
        return new ValidationResult(errors, List.of());
    }

    private static Map<String, ColumnMetadata> metadataColumnInfo(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table,
            boolean ownerQualifiedTablePattern
    ) throws SQLException {
        Map<String, ColumnMetadata> columns = new LinkedHashMap<>();
        List<String> schemas = caseVariants(schema);
        List<String> tables = caseVariants(table);
        for (String schemaVariant : schemas) {
            for (String tableVariant : tables) {
                // CUBRID ignores schemaPattern; its table pattern must carry the owner.
                // Returned owner/catalog/table still pass the same exact identity check below.
                String tablePattern = ownerQualifiedTablePattern && schemaVariant != null
                        ? schemaVariant + "." + tableVariant : tableVariant;
                try (ResultSet result = metadata.getColumns(catalog, schemaVariant, tablePattern, null)) {
                    while (result.next()) {
                        if (!metadataIdentityMatches(result, catalog, schema, table)) {
                            continue;
                        }
                        String column = result.getString("COLUMN_NAME");
                        if (column != null) {
                            columns.put(normalize(column), new ColumnMetadata(
                                     result.getInt("DATA_TYPE"), result.getString("TYPE_NAME")));
                        }
                    }
                }
                if (!columns.isEmpty()) {
                    return columns;
                }
            }
        }
        return columns;
    }

    private record ColumnMetadata(int jdbcType, String typeName) {}

    private static void validateLiveComponents(
            String side,
            String table,
            String label,
            List<MappingSpec.IdentityComponentSpec> components,
            Map<String, ColumnMetadata> liveColumns,
            List<String> errors
    ) {
        for (MappingSpec.IdentityComponentSpec component : components) {
            ColumnMetadata metadata = liveColumns.get(normalize(component.column()));
            if (metadata == null) {
                errors.add("실 " + side + "에 없는 " + label + " 컬럼: "
                        + table + "." + component.column());
                continue;
            }
            if (!jdbcTypeCompatible(component.type(), metadata)) {
                errors.add(label + " type 불일치: " + table + "." + component.column()
                        + " declared=" + component.type().externalName()
                        + " jdbc=" + metadata.typeName() + "(" + metadata.jdbcType() + ")");
            }
        }
    }

    private static boolean jdbcTypeCompatible(IdentityValueType type, ColumnMetadata metadata) {
        int jdbcType = metadata.jdbcType();
        return switch (type) {
            case TEXT -> jdbcType == Types.CHAR
                    || jdbcType == Types.VARCHAR
                    || jdbcType == Types.LONGVARCHAR
                    || jdbcType == Types.NCHAR
                    || jdbcType == Types.NVARCHAR
                    || jdbcType == Types.LONGNVARCHAR;
            case SIGNED_INTEGER, UNSIGNED_INTEGER, DECIMAL -> jdbcType == Types.TINYINT
                    || jdbcType == Types.SMALLINT
                    || jdbcType == Types.INTEGER
                    || jdbcType == Types.BIGINT
                    || jdbcType == Types.NUMERIC
                    || jdbcType == Types.DECIMAL;
            case BOOLEAN -> jdbcType == Types.BOOLEAN || jdbcType == Types.BIT;
            case UUID -> isUuidType(metadata.typeName())
                    || jdbcType == Types.CHAR
                    || jdbcType == Types.VARCHAR
                    || jdbcType == Types.NCHAR
                    || jdbcType == Types.NVARCHAR;
            case DATE -> jdbcType == Types.DATE;
            case TIME -> jdbcType == Types.TIME;
            case LOCAL_TIMESTAMP -> jdbcType == Types.TIMESTAMP;
            case OFFSET_TIMESTAMP -> jdbcType == Types.TIMESTAMP_WITH_TIMEZONE;
            case BINARY -> jdbcType == Types.BINARY
                    || jdbcType == Types.VARBINARY
                    || jdbcType == Types.LONGVARBINARY;
        };
    }

    private static boolean isUuidType(String typeName) {
        return typeName != null && typeName.equalsIgnoreCase("uuid");
    }

    /**
     * JDBC metadata의 schema/table 인자는 검색 패턴이라 {@code _}/{@code %}를 wildcard로 해석한다.
     * 드라이버가 돌려준 실제 identity를 다시 exact-match해 이름이 비슷한 다른 테이블의 컬럼을
     * 요청한 테이블의 컬럼으로 오인하지 않는다.
     */
    private static boolean metadataIdentityMatches(ResultSet result, String catalog,
                                                   String schema, String table) throws SQLException {
        return equalsNullableIgnoreCase(catalog, result.getString("TABLE_CAT"))
                && equalsNullableIgnoreCase(schema, result.getString("TABLE_SCHEM"))
                && table.equalsIgnoreCase(result.getString("TABLE_NAME"));
    }

    private static boolean equalsNullableIgnoreCase(String expected, String actual) {
        return expected == null ? actual == null : actual != null && expected.equalsIgnoreCase(actual);
    }

    private static QualifiedName qualifiedName(String qualified, String defaultCatalog, String defaultSchema) {
        String[] parts = qualified.split("\\.", -1);
        String table = parts[parts.length - 1];
        String schema = parts.length >= 2 ? parts[parts.length - 2] : defaultSchema;
        String catalog = parts.length >= 3 ? parts[parts.length - 3] : defaultCatalog;
        return new QualifiedName(catalog, schema, table);
    }

    private record QualifiedName(String catalog, String schema, String table) {}

    private static List<String> caseVariants(String value) {
        if (value == null || value.isBlank()) {
            List<String> variants = new ArrayList<>();
            variants.add(null);
            return variants;
        }
        return value.equals(value.toLowerCase(Locale.ROOT)) && value.equals(value.toUpperCase(Locale.ROOT))
                ? List.of(value)
                : List.of(value, value.toLowerCase(Locale.ROOT), value.toUpperCase(Locale.ROOT))
                        .stream().distinct().toList();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }
}
