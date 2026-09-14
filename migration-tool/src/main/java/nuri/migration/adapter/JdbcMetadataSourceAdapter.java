package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogObjectRegistry;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.discovery.VisibilityStatus;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * JDBC {@link DatabaseMetaData}만 사용하는 공통 객체 discovery baseline이다.
 *
 * <p>표준 API로 표현할 수 없는 객체는 빈 결과로 위장하지 않고
 * {@link VisibilityStatus#UNSUPPORTED} finding을 남긴다. 벤더 adapter는
 * {@link #discoveryRoutes()}와 읽기 전용 catalog 질의로 보강한다.</p>
 */
public class JdbcMetadataSourceAdapter implements SourceAdapter {

    private static final AdapterIdentity IDENTITY = new AdapterIdentity(
            "jdbc-metadata",
            DatabaseFamily.GENERIC_JDBC,
            "Generic JDBC metadata",
            Set.of(),
            "driver-reported product/version; vendor semantics unverified",
            EvidenceLevel.EXPERIMENTAL);

    @Override
    public String id() {
        return IDENTITY.adapterId();
    }

    @Override
    public AdapterIdentity identity() {
        return IDENTITY;
    }

    @Override
    public AdapterCapabilities capabilities() {
        return AdapterCapabilities.jdbcBaseline(EvidenceLevel.EXPERIMENTAL);
    }

    @Override
    public Map<ObjectKind, DiscoveryTerminalRoute> discoveryRoutes() {
        return DiscoveryRouteMatrix.jdbcBaseline();
    }

    @Override
    public boolean supports(DatabaseMetaData metadata) throws SQLException {
        Objects.requireNonNull(metadata, "metadata");
        return true;
    }

    @Override
    public CatalogSnapshot discover(Connection connection, DiscoveryRequest request) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");

        DatabaseMetaData metadata = connection.getMetaData();
        IdentifierRules identifierRules = IdentifierRules.from(metadata);
        DiscoveryAccumulator accumulator = new DiscoveryAccumulator();
        DiscoveryVisibilityProof visibilityProof = visibilityProof(connection, request);

        collectCatalogs(metadata, request, identifierRules, accumulator);
        collectSchemas(metadata, request, identifierRules, accumulator);

        List<TableRef> tables = collectTables(metadata, request, identifierRules, accumulator);
        for (TableRef table : tables) {
            collectColumns(metadata, request, identifierRules, table, accumulator);
            List<String> primaryKeyColumns = collectPrimaryKeys(metadata, request, identifierRules, table, accumulator);
            collectForeignKeys(metadata, request, identifierRules, table, accumulator);
            collectIndexes(metadata, request, identifierRules, table, primaryKeyColumns, accumulator);
        }

        collectProcedures(metadata, request, identifierRules, accumulator);
        collectFunctions(metadata, request, identifierRules, accumulator);
        collectTypes(metadata, request, identifierRules, accumulator);
        recordUnsupportedKinds(request, accumulator);
        recordUnprovenVisibility(request, visibilityProof, accumulator);

        CatalogSnapshot.DatabaseInfo database = new CatalogSnapshot.DatabaseInfo(
                metadata.getDatabaseProductName(),
                metadata.getDatabaseProductVersion(),
                metadata.getDriverName(),
                metadata.getDriverVersion());
        CatalogSnapshot.EnvironmentInfo environment = environment(connection, accumulator);
        return new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.now(),
                database,
                environment,
                SnapshotCapability.unknown(),
                accumulator.objects(),
                accumulator.findings());
    }

    /** 실제 vendor별 read-only privilege census가 구현되기 전에는 전수 가시성을 추정하지 않는다. */
    protected DiscoveryVisibilityProof visibilityProof(
            Connection connection,
            DiscoveryRequest request) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        return DiscoveryVisibilityProof.unproven();
    }

    private void collectCatalogs(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.CATALOG)) {
            return;
        }
        try (ResultSet rows = metadata.getCatalogs()) {
            while (rows.next()) {
                String catalog = rows.getString("TABLE_CAT");
                if (catalog == null || !request.acceptsCatalog(catalog)) {
                    continue;
                }
                accumulator.add(object(
                        ObjectKind.CATALOG,
                        catalog,
                        null,
                        catalog,
                        identifierRules.requiresQuoting(catalog),
                        List.of(),
                        Map.of()));
            }
        } catch (SQLException failure) {
            accumulator.failure(ObjectKind.CATALOG, null, null, "jdbc-get-catalogs", failure);
        }
    }

    private void collectSchemas(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.SCHEMA)) {
            return;
        }
        try (ResultSet rows = metadata.getSchemas()) {
            while (rows.next()) {
                String catalog = rows.getString("TABLE_CATALOG");
                String schema = rows.getString("TABLE_SCHEM");
                if (schema == null
                        || !request.acceptsCatalog(catalog)
                        || !request.acceptsSchema(schema)
                        || (!request.includeSystemObjects() && isSystemSchema(schema))) {
                    continue;
                }
                accumulator.add(object(
                        ObjectKind.SCHEMA,
                        catalog,
                        schema,
                        schema,
                        identifierRules.requiresQuoting(schema),
                        List.of(),
                        Map.of()));
            }
        } catch (SQLException failure) {
            accumulator.failure(ObjectKind.SCHEMA, null, null, "jdbc-get-schemas", failure);
        }
    }

    private List<TableRef> collectTables(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            DiscoveryAccumulator accumulator) {
        List<TableRef> tables = new ArrayList<>();
        for (String schemaPattern : schemaPatterns(metadata, request)) {
        try (ResultSet rows = metadata.getTables(null, schemaPattern, "%", null)) {
            while (rows.next()) {
                String catalog = rows.getString("TABLE_CAT");
                String schema = rows.getString("TABLE_SCHEM");
                String name = rows.getString("TABLE_NAME");
                String nativeType = rows.getString("TABLE_TYPE");
                if (name == null
                        || !request.acceptsCatalog(catalog)
                        || !request.acceptsSchema(schema)
                        || (!request.includeSystemObjects()
                        && (isSystemSchema(schema) || isSystemTableType(nativeType)))) {
                    continue;
                }
                ObjectKind kind = tableKind(nativeType);
                TableRef table = new TableRef(
                        catalog,
                        schema,
                        name,
                        nativeType,
                        identifierRules.requiresQuoting(name));
                if (isColumnBearing(kind)) {
                    tables.add(table);
                }
                if (request.includes(kind)) {
                    accumulator.add(object(
                            kind,
                            catalog,
                            schema,
                            name,
                            table.quoted(),
                            List.of(),
                            attributes("nativeTableType", nativeType)));
                }
                String remarks = rows.getString("REMARKS");
                if (remarks != null && request.includes(ObjectKind.COMMENT)) {
                    accumulator.add(CatalogObject.hashOnlyDefinition(
                            ObjectKind.COMMENT,
                            catalog,
                            schema,
                            name,
                            table.quoted(),
                            remarks,
                            List.of(reference(kind, table)),
                            attributes("parentKind", kind.name())));
                }
            }
        } catch (SQLException failure) {
            for (ObjectKind kind : tableDependentKinds(request)) {
                accumulator.failure(kind, null, null, "jdbc-get-tables", failure);
            }
        }
        }
        return tables;
    }

    /**
     * 요청이 스키마를 지정하면 JDBC 메타데이터 조회에 스키마 패턴을 넘긴다(아래 필터는 그대로 정확 일치로 거른다).
     *
     * <p>[2026-09-14 Oracle 26ai 실측] 스키마를 null 로 두면 드라이버가 전체 딕셔너리를 훑는다. 스키마 하나를
     * 요청했는데 {@code getProcedures(null, null, "%")} 가 380초를 넘겼고, 같은 호출에 스키마를 주면 266ms 였다.
     * 운영 원천은 사용자·시스템 객체가 훨씬 많으므로 이 차이가 곧 탐색 가능 여부다. LIKE 와일드카드는 이스케이프한다.
     */
    private static List<String> schemaPatterns(DatabaseMetaData metadata, DiscoveryRequest request) {
        if (request.schemas().isEmpty()) {
            return java.util.Collections.singletonList(null);
        }
        List<String> patterns = new ArrayList<>();
        try {
            for (String schema : request.schemas()) {
                patterns.add(escapedPattern(metadata, schema));
            }
        } catch (SQLException unavailableEscape) {
            // 이스케이프 문자를 알 수 없으면 좁히지 않는다 — 느려질 뿐 결과는 아래 정확 일치 필터가 같게 만든다.
            return java.util.Collections.singletonList(null);
        }
        return patterns;
    }

    private void collectColumns(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            TableRef table,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.COLUMN)
                && !request.includes(ObjectKind.DEFAULT_CONSTRAINT)
                && !request.includes(ObjectKind.IDENTITY)
                && !request.includes(ObjectKind.COMMENT)) {
            return;
        }
        try (ResultSet rows = metadata.getColumns(
                table.catalog(),
                table.schema(),
                escapedPattern(metadata, table.name()),
                "%")) {
            while (rows.next()) {
                // [2026-09-14 Oracle 26ai 실측] 열은 반드시 ResultSet 순서(왼쪽→오른쪽)대로 한 번씩 읽는다.
                //   Oracle 은 COLUMN_DEF(13번)를 LONG 스트림으로 주므로, ORDINAL_POSITION(17)·IS_GENERATEDCOLUMN(24)을
                //   먼저 읽으면 ORA-17027(스트림이 이미 닫힘)로 실패해 기본값이 있는 테이블의 컬럼이 중간에서 끊겼다.
                //   JDBC 명세도 이식성을 위해 이 순서를 권고한다. 속성 기록 순서는 산출물 호환을 위해 종전 그대로 둔다.
                String actualTable = rows.getString("TABLE_NAME");
                if (!table.name().equals(actualTable)) {
                    continue;
                }
                String column = rows.getString("COLUMN_NAME");
                if (column == null) {
                    continue;
                }
                int dataType = rows.getInt("DATA_TYPE");
                String typeName = rows.getString("TYPE_NAME");
                long columnSize = rows.getLong("COLUMN_SIZE");
                int decimalDigits = rows.getInt("DECIMAL_DIGITS");
                int nullability = rows.getInt("NULLABLE");
                String remarks = rows.getString("REMARKS");
                String defaultExpression = rows.getString("COLUMN_DEF");
                int ordinal = rows.getInt("ORDINAL_POSITION");
                String autoIncrement = rows.getString("IS_AUTOINCREMENT");
                String generated = rows.getString("IS_GENERATEDCOLUMN");

                String path = childName(table.name(), column);
                LinkedHashMap<String, String> columnAttributes = new LinkedHashMap<>();
                columnAttributes.put("parentTable", table.name());
                columnAttributes.put("originalName", column);
                put(columnAttributes, "jdbcType", dataType);
                put(columnAttributes, "nativeType", typeName);
                put(columnAttributes, "size", columnSize);
                put(columnAttributes, "scale", decimalDigits);
                put(columnAttributes, "nullable", nullability != DatabaseMetaData.columnNoNulls);
                put(columnAttributes, "ordinal", ordinal);
                if (generated != null) {
                    put(columnAttributes, "generated", "YES".equalsIgnoreCase(generated));
                }

                if (request.includes(ObjectKind.COLUMN)) {
                    accumulator.add(object(
                            ObjectKind.COLUMN,
                            table.catalog(),
                            table.schema(),
                            path,
                            table.quoted() || identifierRules.requiresQuoting(column),
                            List.of(reference(ObjectKind.TABLE, table)),
                            columnAttributes));
                }

                if (defaultExpression != null && request.includes(ObjectKind.DEFAULT_CONSTRAINT)) {
                    accumulator.add(CatalogObject.hashOnlyDefinition(
                            ObjectKind.DEFAULT_CONSTRAINT,
                            table.catalog(),
                            table.schema(),
                            path,
                            table.quoted() || identifierRules.requiresQuoting(column),
                            defaultExpression,
                            List.of(reference(ObjectKind.COLUMN, table.catalog(), table.schema(), path)),
                            attributes("parentTable", table.name(), "column", column)));
                }

                if ("YES".equalsIgnoreCase(autoIncrement)
                        && request.includes(ObjectKind.IDENTITY)) {
                    accumulator.add(object(
                            ObjectKind.IDENTITY,
                            table.catalog(),
                            table.schema(),
                            path,
                            table.quoted() || identifierRules.requiresQuoting(column),
                            List.of(reference(ObjectKind.COLUMN, table.catalog(), table.schema(), path)),
                            attributes("parentTable", table.name(), "column", column, "strategy", "AUTO_INCREMENT")));
                }

                if (remarks != null && request.includes(ObjectKind.COMMENT)) {
                    accumulator.add(CatalogObject.hashOnlyDefinition(
                            ObjectKind.COMMENT,
                            table.catalog(),
                            table.schema(),
                            path,
                            table.quoted() || identifierRules.requiresQuoting(column),
                            remarks,
                            List.of(reference(ObjectKind.COLUMN, table.catalog(), table.schema(), path)),
                            attributes("parentKind", ObjectKind.COLUMN.name())));
                }
            }
        } catch (SQLException failure) {
            for (ObjectKind kind : List.of(
                    ObjectKind.COLUMN,
                    ObjectKind.DEFAULT_CONSTRAINT,
                    ObjectKind.IDENTITY,
                    ObjectKind.COMMENT)) {
                if (request.includes(kind)) {
                    accumulator.failure(kind, table.catalog(), table.schema(), "jdbc-get-columns", failure);
                }
            }
        }
    }

    private List<String> collectPrimaryKeys(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            TableRef table,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.PRIMARY_KEY) && !request.includes(ObjectKind.INDEX)
                && !request.includes(ObjectKind.UNIQUE_KEY)) {
            return List.of();
        }
        LinkedHashMap<String, OrderedColumns> keys = new LinkedHashMap<>();
        try (ResultSet rows = metadata.getPrimaryKeys(table.catalog(), table.schema(), table.name())) {
            while (rows.next()) {
                String keyName = rows.getString("PK_NAME");
                if (keyName == null || keyName.isBlank()) {
                    keyName = table.name() + "#PRIMARY_KEY";
                }
                keys.computeIfAbsent(keyName, ignored -> new OrderedColumns())
                        .add(rows.getShort("KEY_SEQ"), rows.getString("COLUMN_NAME"));
            }
        } catch (SQLException failure) {
            if (request.includes(ObjectKind.PRIMARY_KEY)) {
                accumulator.failure(
                        ObjectKind.PRIMARY_KEY,
                        table.catalog(),
                        table.schema(),
                        "jdbc-get-primary-keys",
                        failure);
            }
            return List.of();
        }

        List<String> primaryColumns = new ArrayList<>();
        for (Map.Entry<String, OrderedColumns> entry : keys.entrySet()) {
            List<String> columns = entry.getValue().names();
            primaryColumns.addAll(columns);
            if (request.includes(ObjectKind.PRIMARY_KEY)) {
                accumulator.add(object(
                        ObjectKind.PRIMARY_KEY,
                        table.catalog(),
                        table.schema(),
                        entry.getKey(),
                        identifierRules.requiresQuoting(entry.getKey()),
                        List.of(reference(ObjectKind.TABLE, table)),
                        attributes("parentTable", table.name(), "columns", String.join(",", columns))));
            }
        }
        return List.copyOf(primaryColumns);
    }

    private void collectForeignKeys(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            TableRef table,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.FOREIGN_KEY)) {
            return;
        }
        LinkedHashMap<String, ForeignKeyParts> keys = new LinkedHashMap<>();
        LinkedHashMap<UnnamedForeignKeyBase, UnnamedForeignKeyOccurrences> unnamedOccurrences =
                new LinkedHashMap<>();
        try (ResultSet rows = metadata.getImportedKeys(table.catalog(), table.schema(), table.name())) {
            while (rows.next()) {
                String keyName = rows.getString("FK_NAME");
                String pkCatalog = rows.getString("PKTABLE_CAT");
                String pkSchema = rows.getString("PKTABLE_SCHEM");
                String pkTable = rows.getString("PKTABLE_NAME");
                short keySequence = rows.getShort("KEY_SEQ");
                short updateRule = rows.getShort("UPDATE_RULE");
                short deleteRule = rows.getShort("DELETE_RULE");
                if (keyName == null || keyName.isBlank()) {
                    UnnamedForeignKeyBase base = new UnnamedForeignKeyBase(
                            pkCatalog,
                            pkSchema,
                            pkTable,
                            rows.getString("PK_NAME"),
                            updateRule,
                            deleteRule);
                    int occurrence = unnamedOccurrences
                            .computeIfAbsent(base, ignored -> new UnnamedForeignKeyOccurrences())
                            .next(keySequence);
                    keyName = unnamedForeignKeyName(table, base, occurrence);
                }
                ForeignKeyParts parts = keys.get(keyName);
                if (parts == null) {
                    parts = new ForeignKeyParts(
                            pkCatalog,
                            pkSchema,
                            pkTable,
                            updateRule,
                            deleteRule);
                    keys.put(keyName, parts);
                }
                parts.add(
                        keySequence,
                        rows.getString("FKCOLUMN_NAME"),
                        rows.getString("PKCOLUMN_NAME"));
            }
        } catch (SQLException failure) {
            accumulator.failure(
                    ObjectKind.FOREIGN_KEY,
                    table.catalog(),
                    table.schema(),
                    "jdbc-get-imported-keys",
                    failure);
            return;
        }

        if (unnamedOccurrences.values().stream().anyMatch(UnnamedForeignKeyOccurrences::ambiguous)) {
            accumulator.partial(
                    ObjectKind.FOREIGN_KEY,
                    table.catalog(),
                    table.schema(),
                    "jdbc-get-imported-keys-unnamed-grouping",
                    "multiple unnamed composite foreign keys require vendor-specific identity proof");
        }

        for (Map.Entry<String, ForeignKeyParts> entry : keys.entrySet()) {
            ForeignKeyParts parts = entry.getValue();
            accumulator.add(object(
                    ObjectKind.FOREIGN_KEY,
                    table.catalog(),
                    table.schema(),
                    entry.getKey(),
                    identifierRules.requiresQuoting(entry.getKey()),
                    List.of(
                            reference(ObjectKind.TABLE, table),
                            reference(ObjectKind.TABLE, parts.pkCatalog, parts.pkSchema, parts.pkTable)),
                    attributes(
                            "parentTable", table.name(),
                            "columns", String.join(",", parts.fkColumns.names()),
                            "referencedTable", nullToEmpty(parts.pkTable),
                            "referencedColumns", String.join(",", parts.pkColumns.names()),
                            "updateRule", Short.toString(parts.updateRule),
                            "deleteRule", Short.toString(parts.deleteRule))));
        }
    }

    private static String unnamedForeignKeyName(
            TableRef table,
            UnnamedForeignKeyBase base,
            int occurrence) {
        StringBuilder material = new StringBuilder();
        appendLengthPrefixed(material, new ObjectReference(
                ObjectKind.TABLE, base.pkCatalog(), base.pkSchema(), base.pkTable()).stableId());
        appendLengthPrefixed(material, base.pkName());
        appendLengthPrefixed(material, Short.toString(base.updateRule()));
        appendLengthPrefixed(material, Short.toString(base.deleteRule()));
        return table.name() + "#FOREIGN_KEY#"
                + CatalogObject.definitionHash(material.toString()) + '#' + occurrence;
    }

    private static void appendLengthPrefixed(StringBuilder target, String value) {
        if (value == null) {
            target.append("-1:");
            return;
        }
        target.append(value.length()).append(':').append(value);
    }

    private void collectIndexes(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            TableRef table,
            List<String> primaryKeyColumns,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.INDEX) && !request.includes(ObjectKind.UNIQUE_KEY)) {
            return;
        }
        LinkedHashMap<String, IndexParts> indexes = new LinkedHashMap<>();
        // approximate=true 여야 한다. [2026-09-14 Oracle 26ai 실측] false 로 두면 Oracle 드라이버가 인덱스 조회 전에
        //   DBMS_STATS.GATHER_TABLE_STATS 를 실행해 **원천 테이블의 통계를 바꿨고**(LAST_ANALYZED 갱신), 읽기 전용
        //   연결에서는 그 수집이 실패해 인덱스 조회 자체가 72000 으로 끊겼다. 이 SPI 는 원천에 쓰기를 하지 않는다.
        //   인덱스 구조(이름·열·유일성)는 approximate 와 무관하며, 통계 행(tableIndexStatistic)은 아래에서 버린다.
        try (ResultSet rows = metadata.getIndexInfo(table.catalog(), table.schema(), table.name(), false, true)) {
            while (rows.next()) {
                short type = rows.getShort("TYPE");
                String name = rows.getString("INDEX_NAME");
                if (type == DatabaseMetaData.tableIndexStatistic || name == null || name.isBlank()) {
                    continue;
                }
                IndexParts parts = indexes.get(name);
                if (parts == null) {
                    parts = new IndexParts(
                            !rows.getBoolean("NON_UNIQUE"),
                            type,
                            rows.getString("FILTER_CONDITION"));
                    indexes.put(name, parts);
                }
                String column = rows.getString("COLUMN_NAME");
                if (column != null) {
                    parts.columns.add(rows.getShort("ORDINAL_POSITION"), column);
                } else {
                    parts.expressionColumnMissing = true;
                }
            }
        } catch (SQLException failure) {
            if (request.includes(ObjectKind.INDEX)) {
                accumulator.failure(ObjectKind.INDEX, table.catalog(), table.schema(), "jdbc-get-index-info", failure);
            }
            if (request.includes(ObjectKind.UNIQUE_KEY)) {
                accumulator.failure(
                        ObjectKind.UNIQUE_KEY,
                        table.catalog(),
                        table.schema(),
                        "jdbc-get-index-info",
                        failure);
            }
            return;
        }

        for (Map.Entry<String, IndexParts> entry : indexes.entrySet()) {
            IndexParts parts = entry.getValue();
            List<String> columns = parts.columns.names();
            LinkedHashMap<String, String> indexAttributes = new LinkedHashMap<>();
            indexAttributes.put("parentTable", table.name());
            indexAttributes.put("columns", String.join(",", columns));
            indexAttributes.put("unique", Boolean.toString(parts.unique));
            indexAttributes.put("nativeIndexType", Short.toString(parts.type));
            put(indexAttributes, "filterHash", parts.filter == null ? null : CatalogObject.definitionHash(parts.filter));
            put(indexAttributes, "expressionMetadataPartial", parts.expressionColumnMissing);

            if (request.includes(ObjectKind.INDEX)) {
                accumulator.add(object(
                        ObjectKind.INDEX,
                        table.catalog(),
                        table.schema(),
                        entry.getKey(),
                        identifierRules.requiresQuoting(entry.getKey()),
                        List.of(reference(ObjectKind.TABLE, table)),
                        indexAttributes));
            }
            if (parts.unique
                    && !sameColumns(columns, primaryKeyColumns)
                    && request.includes(ObjectKind.UNIQUE_KEY)) {
                accumulator.add(object(
                        ObjectKind.UNIQUE_KEY,
                        table.catalog(),
                        table.schema(),
                        entry.getKey(),
                        identifierRules.requiresQuoting(entry.getKey()),
                        List.of(reference(ObjectKind.TABLE, table)),
                        indexAttributes));
            }
            if (parts.expressionColumnMissing) {
                ObjectKind affected = parts.unique ? ObjectKind.UNIQUE_KEY : ObjectKind.INDEX;
                if (request.includes(affected)) {
                    accumulator.partial(
                            affected,
                            table.catalog(),
                            table.schema(),
                            "jdbc-get-index-info",
                            "the JDBC driver omitted an expression index definition");
                }
            }
        }
    }

    private void collectProcedures(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.ROUTINE)) {
            return;
        }
        for (String schemaPattern : schemaPatterns(metadata, request)) {
            try (ResultSet rows = metadata.getProcedures(null, schemaPattern, "%")) {
                while (rows.next()) {
                    addRoutine(
                            request,
                            identifierRules,
                            accumulator,
                            rows.getString("PROCEDURE_CAT"),
                            rows.getString("PROCEDURE_SCHEM"),
                            rows.getString("PROCEDURE_NAME"),
                            rows.getString("SPECIFIC_NAME"),
                            "PROCEDURE");
                }
            } catch (SQLException failure) {
                accumulator.failure(ObjectKind.ROUTINE, null, null, "jdbc-get-procedures", failure);
            }
        }
    }

    private void collectFunctions(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.ROUTINE)) {
            return;
        }
        for (String schemaPattern : schemaPatterns(metadata, request)) {
            try (ResultSet rows = metadata.getFunctions(null, schemaPattern, "%")) {
                while (rows.next()) {
                    addRoutine(
                            request,
                            identifierRules,
                            accumulator,
                            rows.getString("FUNCTION_CAT"),
                            rows.getString("FUNCTION_SCHEM"),
                            rows.getString("FUNCTION_NAME"),
                            rows.getString("SPECIFIC_NAME"),
                            "FUNCTION");
                }
            } catch (SQLException failure) {
                accumulator.failure(ObjectKind.ROUTINE, null, null, "jdbc-get-functions", failure);
            }
        }
    }

    private void addRoutine(
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            DiscoveryAccumulator accumulator,
            String catalog,
            String schema,
            String routineName,
            String specificName,
            String routineType) {
        if (routineName == null
                || !request.acceptsCatalog(catalog)
                || !request.acceptsSchema(schema)
                || (!request.includeSystemObjects() && isSystemSchema(schema))) {
            return;
        }
        String identityName = specificName == null || specificName.isBlank() ? routineName : specificName;
        accumulator.add(object(
                ObjectKind.ROUTINE,
                catalog,
                schema,
                identityName,
                identifierRules.requiresQuoting(routineName),
                List.of(),
                attributes("originalName", routineName, "routineType", routineType)));
    }

    private void collectTypes(
            DatabaseMetaData metadata,
            DiscoveryRequest request,
            IdentifierRules identifierRules,
            DiscoveryAccumulator accumulator) {
        if (!request.includes(ObjectKind.TYPE)) {
            return;
        }
        int[] jdbcTypes = {Types.STRUCT, Types.DISTINCT, Types.JAVA_OBJECT, Types.ARRAY};
        try (ResultSet rows = metadata.getUDTs(null, null, "%", jdbcTypes)) {
            while (rows.next()) {
                String catalog = rows.getString("TYPE_CAT");
                String schema = rows.getString("TYPE_SCHEM");
                String name = rows.getString("TYPE_NAME");
                if (name == null
                        || !request.acceptsCatalog(catalog)
                        || !request.acceptsSchema(schema)
                        || (!request.includeSystemObjects() && isSystemSchema(schema))) {
                    continue;
                }
                accumulator.add(object(
                        ObjectKind.TYPE,
                        catalog,
                        schema,
                        name,
                        identifierRules.requiresQuoting(name),
                        List.of(),
                        attributes(
                                "jdbcType", Integer.toString(rows.getInt("DATA_TYPE")),
                                "javaClass", nullToEmpty(rows.getString("CLASS_NAME")))));
            }
        } catch (SQLException failure) {
            accumulator.failure(ObjectKind.TYPE, null, null, "jdbc-get-udts", failure);
        }
    }

    private void recordUnsupportedKinds(DiscoveryRequest request, DiscoveryAccumulator accumulator) {
        Map<ObjectKind, DiscoveryTerminalRoute> routes = discoveryRoutes();
        for (ObjectKind kind : ObjectKind.values()) {
            if (request.includes(kind) && routes.get(kind) == DiscoveryTerminalRoute.UNSUPPORTED) {
                accumulator.unsupported(
                        kind,
                        "jdbc-portable-baseline",
                        "the JDBC baseline has no complete portable catalog for " + kind.name());
            }
        }
    }

    private void recordUnprovenVisibility(
            DiscoveryRequest request,
            DiscoveryVisibilityProof proof,
            DiscoveryAccumulator accumulator) {
        if (DiscoveryRouteMatrix.needsVisibilityProof(discoveryRoutes(), request.objectKinds())
                && !proof.covers(request)) {
            accumulator.partial(
                    ObjectKind.SCHEMA,
                    null,
                    request.schemas().size() == 1 ? request.schemas().iterator().next() : null,
                    "source-visibility-proof",
                    "complete metadata visibility was not proven; an empty result cannot prove absence");
        }
    }

    private static CatalogSnapshot.EnvironmentInfo environment(
            Connection connection,
            DiscoveryAccumulator accumulator) {
        String catalog = null;
        String schema = null;
        try {
            catalog = connection.getCatalog();
        } catch (SQLException failure) {
            accumulator.failure(ObjectKind.CATALOG, null, null, "jdbc-get-current-catalog", failure);
        }
        try {
            schema = connection.getSchema();
        } catch (SQLException failure) {
            accumulator.failure(ObjectKind.SCHEMA, catalog, null, "jdbc-get-current-schema", failure);
        }
        return new CatalogSnapshot.EnvironmentInfo(catalog, schema, "unknown", "unknown", "unknown");
    }

    private static CatalogObject object(
            ObjectKind kind,
            String catalog,
            String schema,
            String name,
            boolean quoted,
            List<ObjectReference> dependencies,
            Map<String, String> attributes) {
        return new CatalogObject(kind, catalog, schema, name, quoted, null, null, dependencies, attributes);
    }

    private static ObjectReference reference(ObjectKind kind, TableRef table) {
        return reference(kind, table.catalog(), table.schema(), table.name());
    }

    private static ObjectReference reference(
            ObjectKind kind,
            String catalog,
            String schema,
            String name) {
        return new ObjectReference(kind, catalog, schema, name);
    }

    private static String escapedPattern(DatabaseMetaData metadata, String literal) throws SQLException {
        String escape = metadata.getSearchStringEscape();
        if (escape == null || escape.isEmpty()) {
            return literal;
        }
        return literal
                .replace(escape, escape + escape)
                .replace("_", escape + "_")
                .replace("%", escape + "%");
    }

    private static ObjectKind tableKind(String nativeType) {
        if (nativeType == null) {
            return ObjectKind.UNKNOWN;
        }
        return switch (nativeType.toUpperCase(Locale.ROOT)) {
            case "VIEW" -> ObjectKind.VIEW;
            case "MATERIALIZED VIEW" -> ObjectKind.MATERIALIZED_VIEW;
            case "SYNONYM", "ALIAS" -> ObjectKind.SYNONYM;
            case "SEQUENCE" -> ObjectKind.SEQUENCE;
            case "FOREIGN TABLE", "EXTERNAL TABLE" -> ObjectKind.EXTERNAL_OBJECT;
            default -> ObjectKind.TABLE;
        };
    }

    private static boolean isColumnBearing(ObjectKind kind) {
        return kind == ObjectKind.TABLE
                || kind == ObjectKind.VIEW
                || kind == ObjectKind.MATERIALIZED_VIEW
                || kind == ObjectKind.EXTERNAL_OBJECT;
    }

    private static boolean isSystemTableType(String nativeType) {
        return nativeType != null && nativeType.toUpperCase(Locale.ROOT).contains("SYSTEM");
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

    private static Set<ObjectKind> tableDependentKinds(DiscoveryRequest request) {
        EnumSet<ObjectKind> kinds = EnumSet.noneOf(ObjectKind.class);
        for (ObjectKind kind : List.of(
                ObjectKind.TABLE,
                ObjectKind.VIEW,
                ObjectKind.MATERIALIZED_VIEW,
                ObjectKind.SYNONYM,
                ObjectKind.EXTERNAL_OBJECT,
                ObjectKind.COLUMN,
                ObjectKind.DEFAULT_CONSTRAINT,
                ObjectKind.IDENTITY,
                ObjectKind.COMMENT,
                ObjectKind.PRIMARY_KEY,
                ObjectKind.UNIQUE_KEY,
                ObjectKind.FOREIGN_KEY,
                ObjectKind.INDEX)) {
            if (request.includes(kind)) {
                kinds.add(kind);
            }
        }
        return kinds;
    }

    private static boolean sameColumns(List<String> left, List<String> right) {
        if (left.size() != right.size()) {
            return false;
        }
        for (int index = 0; index < left.size(); index++) {
            if (!left.get(index).equalsIgnoreCase(right.get(index))) {
                return false;
            }
        }
        return true;
    }

    private static String childName(String parent, String child) {
        return parent + "." + child;
    }

    private static Map<String, String> attributes(String... pairs) {
        if (pairs.length % 2 != 0) {
            throw new IllegalArgumentException("attribute pairs must be even");
        }
        LinkedHashMap<String, String> attributes = new LinkedHashMap<>();
        for (int index = 0; index < pairs.length; index += 2) {
            if (pairs[index + 1] != null) {
                attributes.put(pairs[index], pairs[index + 1]);
            }
        }
        return attributes;
    }

    private static void put(Map<String, String> target, String key, Object value) {
        if (value != null) {
            target.put(key, String.valueOf(value));
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private record TableRef(String catalog, String schema, String name, String nativeType, boolean quoted) {}

    private record IdentifierRules(boolean storesLower, boolean storesUpper) {
        static IdentifierRules from(DatabaseMetaData metadata) throws SQLException {
            return new IdentifierRules(
                    metadata.storesLowerCaseIdentifiers(),
                    metadata.storesUpperCaseIdentifiers());
        }

        boolean requiresQuoting(String identifier) {
            if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_$]*")) {
                return true;
            }
            if (storesLower && !identifier.equals(identifier.toLowerCase(Locale.ROOT))) {
                return true;
            }
            return storesUpper && !identifier.equals(identifier.toUpperCase(Locale.ROOT));
        }
    }

    private static final class OrderedColumns {
        private final List<OrderedColumn> columns = new ArrayList<>();

        void add(int ordinal, String name) {
            if (name != null) {
                columns.add(new OrderedColumn(ordinal, name));
            }
        }

        List<String> names() {
            return columns.stream()
                    .sorted(Comparator.comparingInt(OrderedColumn::ordinal))
                    .map(OrderedColumn::name)
                    .toList();
        }
    }

    private record OrderedColumn(int ordinal, String name) {}

    private record UnnamedForeignKeyBase(
            String pkCatalog,
            String pkSchema,
            String pkTable,
            String pkName,
            short updateRule,
            short deleteRule) {}

    private static final class UnnamedForeignKeyOccurrences {
        private final Map<Short, Integer> countsByKeySequence = new LinkedHashMap<>();

        int next(short keySequence) {
            return countsByKeySequence.merge(keySequence, 1, Integer::sum);
        }

        boolean ambiguous() {
            if (countsByKeySequence.size() <= 1) {
                return false;
            }
            int first = countsByKeySequence.values().iterator().next();
            return first > 1 || countsByKeySequence.values().stream().anyMatch(count -> count != first);
        }
    }

    private static final class ForeignKeyParts {
        private final String pkCatalog;
        private final String pkSchema;
        private final String pkTable;
        private final short updateRule;
        private final short deleteRule;
        private final OrderedColumns fkColumns = new OrderedColumns();
        private final OrderedColumns pkColumns = new OrderedColumns();

        private ForeignKeyParts(
                String pkCatalog,
                String pkSchema,
                String pkTable,
                short updateRule,
                short deleteRule) {
            this.pkCatalog = pkCatalog;
            this.pkSchema = pkSchema;
            this.pkTable = pkTable;
            this.updateRule = updateRule;
            this.deleteRule = deleteRule;
        }

        void add(int ordinal, String fkColumn, String pkColumn) {
            fkColumns.add(ordinal, fkColumn);
            pkColumns.add(ordinal, pkColumn);
        }
    }

    private static final class IndexParts {
        private final boolean unique;
        private final short type;
        private final String filter;
        private final OrderedColumns columns = new OrderedColumns();
        private boolean expressionColumnMissing;

        private IndexParts(boolean unique, short type, String filter) {
            this.unique = unique;
            this.type = type;
            this.filter = filter;
        }
    }

    private static final class DiscoveryAccumulator {
        private final List<VisibilityFinding> findings = new ArrayList<>();
        private final CatalogObjectRegistry objects = new CatalogObjectRegistry(findings);

        void add(CatalogObject object) {
            objects.add(object, "jdbc-metadata-accumulator");
        }

        void failure(
                ObjectKind kind,
                String catalog,
                String schema,
                String operation,
                SQLException failure) {
            findings.add(VisibilityFinding.fromFailure(kind, catalog, schema, operation, failure));
        }

        void unsupported(ObjectKind kind, String operation, String message) {
            findings.add(new VisibilityFinding(
                    VisibilityStatus.UNSUPPORTED,
                    kind,
                    null,
                    null,
                    operation,
                    message,
                    null));
        }

        void partial(
                ObjectKind kind,
                String catalog,
                String schema,
                String operation,
                String message) {
            findings.add(new VisibilityFinding(
                    VisibilityStatus.PARTIAL,
                    kind,
                    catalog,
                    schema,
                    operation,
                    message,
                    null));
        }

        List<CatalogObject> objects() {
            return objects.objects();
        }

        List<VisibilityFinding> findings() {
            return List.copyOf(findings);
        }
    }

}
