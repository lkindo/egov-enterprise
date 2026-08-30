package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class JdbcMetadataSourceAdapterEdgeTest {

    @Test
    void filtersOutOfScopeAndSystemRowsWhileClassifyingEveryPortableTableShape() throws Exception {
        MetadataFixture fixture = fixture();
        fixture.catalogs(List.of(
                row("TABLE_CAT", null),
                row("TABLE_CAT", "other"),
                row("TABLE_CAT", "legacy")));
        fixture.schemas(List.of(
                row("TABLE_CATALOG", "legacy", "TABLE_SCHEM", null),
                row("TABLE_CATALOG", "other", "TABLE_SCHEM", "app"),
                row("TABLE_CATALOG", "legacy", "TABLE_SCHEM", "pg_catalog"),
                row("TABLE_CATALOG", "legacy", "TABLE_SCHEM", "app")));
        fixture.tables(List.of(
                table(null, "TABLE"),
                row("TABLE_CAT", "other", "TABLE_SCHEM", "app", "TABLE_NAME", "other_catalog", "TABLE_TYPE", "TABLE"),
                row("TABLE_CAT", "legacy", "TABLE_SCHEM", "other", "TABLE_NAME", "other_schema", "TABLE_TYPE", "TABLE"),
                row("TABLE_CAT", "legacy", "TABLE_SCHEM", "pg_toast7", "TABLE_NAME", "toast_table", "TABLE_TYPE", "TABLE"),
                table("system_table", "SYSTEM TABLE"),
                table("unknown_shape", null),
                table("plain_table", "TABLE"),
                table("plain_view", "VIEW"),
                table("materialized", "MATERIALIZED VIEW"),
                table("synonym", "SYNONYM"),
                table("alias", "ALIAS"),
                table("sequence", "SEQUENCE"),
                table("foreign_table", "FOREIGN TABLE"),
                table("external_table", "EXTERNAL TABLE")));

        DiscoveryRequest request = new DiscoveryRequest(
                Set.of("legacy"), Set.of("app"), EnumSet.allOf(ObjectKind.class), false);
        CatalogSnapshot snapshot = new JdbcMetadataSourceAdapter().discover(fixture.connection(), request);

        assertThat(snapshot.objects()).extracting(CatalogObject::name)
                .contains("legacy", "app", "unknown_shape", "plain_table", "plain_view",
                        "materialized", "synonym", "alias", "sequence", "foreign_table", "external_table")
                .doesNotContain("other", "other_catalog", "other_schema", "toast_table", "system_table");
        assertThat(snapshot.objects()).extracting(CatalogObject::kind)
                .contains(ObjectKind.CATALOG, ObjectKind.SCHEMA, ObjectKind.UNKNOWN,
                        ObjectKind.TABLE, ObjectKind.VIEW, ObjectKind.MATERIALIZED_VIEW,
                        ObjectKind.SYNONYM, ObjectKind.SEQUENCE, ObjectKind.EXTERNAL_OBJECT);
        assertThat(snapshot.objects())
                .filteredOn(object -> object.name().equals("plain_table"))
                .singleElement().satisfies(object -> assertThat(object.quoted()).isFalse());
    }

    @Test
    void everyKnownSystemNamespaceFamilyIsExcludedFromUnboundedUserDiscovery() throws Exception {
        MetadataFixture fixture = fixture();
        List<String> systemSchemas = List.of(
                "information_schema", "pg_catalog", "pg_toast7", "pg_temp_4",
                "sys", "system", "mysql", "performance_schema");
        List<Map<String, Object>> schemas = new java.util.ArrayList<>();
        List<Map<String, Object>> tables = new java.util.ArrayList<>();
        for (String schema : systemSchemas) {
            schemas.add(row("TABLE_CATALOG", "legacy", "TABLE_SCHEM", schema));
            tables.add(row("TABLE_CAT", "legacy", "TABLE_SCHEM", schema,
                    "TABLE_NAME", "hidden_" + schema, "TABLE_TYPE", "TABLE"));
        }
        schemas.add(row("TABLE_CATALOG", "legacy", "TABLE_SCHEM", "user_app"));
        tables.add(row("TABLE_CAT", "legacy", "TABLE_SCHEM", "user_app",
                "TABLE_NAME", "visible_table", "TABLE_TYPE", "TABLE"));
        fixture.schemas(schemas);
        fixture.tables(tables);

        CatalogSnapshot snapshot = new JdbcMetadataSourceAdapter().discover(
                fixture.connection(), new DiscoveryRequest(
                        Set.of(), Set.of(), EnumSet.of(ObjectKind.SCHEMA, ObjectKind.TABLE), false));

        assertThat(snapshot.objects()).extracting(CatalogObject::name)
                .contains("user_app", "visible_table")
                .noneMatch(name -> name.startsWith("hidden_"));
        assertThat(snapshot.objects()).extracting(CatalogObject::schema)
                .doesNotContainAnyElementsOf(systemSchemas);
    }

    @Test
    void capturesColumnEvidenceAndHashesDefaultsAndCommentsWithoutPersistingRawDefinitions() throws Exception {
        MetadataFixture fixture = fixture();
        fixture.tables(List.of(table("Mixed_Table", "TABLE")));
        fixture.columns(List.of(
                row("TABLE_NAME", "different", "COLUMN_NAME", "ignored"),
                row("TABLE_NAME", "Mixed_Table", "COLUMN_NAME", null),
                row("TABLE_NAME", "Mixed_Table", "COLUMN_NAME", "Id_Col",
                        "TYPE_NAME", "BIGINT", "DATA_TYPE", Types.BIGINT,
                        "COLUMN_SIZE", 19L, "DECIMAL_DIGITS", 0,
                        "NULLABLE", DatabaseMetaData.columnNoNulls, "ORDINAL_POSITION", 1,
                        "IS_GENERATEDCOLUMN", "YES", "IS_AUTOINCREMENT", "YES",
                        "COLUMN_DEF", "nextval('private_sequence')", "REMARKS", "private column comment"),
                row("TABLE_NAME", "Mixed_Table", "COLUMN_NAME", "plain_col",
                        "TYPE_NAME", "VARCHAR", "DATA_TYPE", Types.VARCHAR,
                        "COLUMN_SIZE", 50L, "DECIMAL_DIGITS", 0,
                        "NULLABLE", DatabaseMetaData.columnNullable, "ORDINAL_POSITION", 2,
                        "IS_GENERATEDCOLUMN", null, "IS_AUTOINCREMENT", "NO",
                        "COLUMN_DEF", null, "REMARKS", null)));

        CatalogSnapshot snapshot = new JdbcMetadataSourceAdapter().discover(
                fixture.connection(),
                new DiscoveryRequest(Set.of("legacy"), Set.of("app"), EnumSet.of(
                        ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.DEFAULT_CONSTRAINT,
                        ObjectKind.IDENTITY, ObjectKind.COMMENT), false));

        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN)
                .hasSize(2).allSatisfy(column -> assertThat(column.quoted()).isTrue());
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN
                        && object.name().endsWith("Id_Col"))
                .singleElement().satisfies(column -> assertThat(column.attributes())
                        .containsEntry("jdbcType", Integer.toString(Types.BIGINT))
                        .containsEntry("generated", "true")
                        .containsEntry("nullable", "false"));
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.IDENTITY)
                .singleElement().satisfies(identity -> assertThat(identity.attributes())
                        .containsEntry("strategy", "AUTO_INCREMENT"));
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.DEFAULT_CONSTRAINT
                        || object.kind() == ObjectKind.COMMENT)
                .hasSize(2).allSatisfy(definition -> {
                    assertThat(definition.nativeDefinition()).isNull();
                    assertThat(definition.definitionHash()).startsWith("sha256:");
                });
        assertThat(snapshot.toString()).doesNotContain("private_sequence", "private column comment");
    }

    @Test
    void synthesizesUnnamedKeysAndSeparatesPkUniqueExpressionAndRoutineTypeEvidence() throws Exception {
        MetadataFixture fixture = fixture();
        fixture.tables(List.of(table("orders", "TABLE")));
        fixture.primaryKeys(List.of(
                row("PK_NAME", " ", "KEY_SEQ", (short) 2, "COLUMN_NAME", "order_no"),
                row("PK_NAME", null, "KEY_SEQ", (short) 1, "COLUMN_NAME", "tenant_id")));
        fixture.foreignKeys(List.of(
                row("FK_NAME", null, "PKTABLE_CAT", "legacy", "PKTABLE_SCHEM", "app",
                        "PKTABLE_NAME", "tenant", "UPDATE_RULE", (short) 3, "DELETE_RULE", (short) 1,
                        "KEY_SEQ", (short) 1, "FKCOLUMN_NAME", "tenant_id", "PKCOLUMN_NAME", "id")));
        fixture.indexes(List.of(
                row("TYPE", DatabaseMetaData.tableIndexStatistic, "INDEX_NAME", "statistics"),
                row("TYPE", DatabaseMetaData.tableIndexOther, "INDEX_NAME", " "),
                index("pk_orders", false, (short) 2, "order_no", null),
                index("pk_orders", false, (short) 1, "tenant_id", null),
                index("uk_orders_code", false, (short) 1, "code", "code IS NOT NULL"),
                index("ix_expression", true, (short) 1, null, null)));
        fixture.procedures(List.of(
                routine("PROCEDURE", null, "app", "p_null", null),
                routine("PROCEDURE", "legacy", "sys", "p_system", null),
                routine("PROCEDURE", "legacy", "app", "p_visible", " ")));
        fixture.functions(List.of(
                routine("FUNCTION", "legacy", "app", "f_visible", "f_visible#1")));
        fixture.types(List.of(
                row("TYPE_CAT", "legacy", "TYPE_SCHEM", "app", "TYPE_NAME", null),
                row("TYPE_CAT", "legacy", "TYPE_SCHEM", "information_schema", "TYPE_NAME", "hidden"),
                row("TYPE_CAT", "legacy", "TYPE_SCHEM", "app", "TYPE_NAME", "order_type",
                        "DATA_TYPE", Types.STRUCT, "CLASS_NAME", null)));

        CatalogSnapshot snapshot = new JdbcMetadataSourceAdapter().discover(
                fixture.connection(),
                new DiscoveryRequest(Set.of("legacy"), Set.of("app"), EnumSet.of(
                        ObjectKind.TABLE, ObjectKind.PRIMARY_KEY, ObjectKind.FOREIGN_KEY,
                        ObjectKind.INDEX, ObjectKind.UNIQUE_KEY, ObjectKind.ROUTINE, ObjectKind.TYPE), false));

        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.PRIMARY_KEY)
                .singleElement().satisfies(key -> {
                    assertThat(key.name()).isEqualTo("orders#PRIMARY_KEY");
                    assertThat(key.attributes()).containsEntry("columns", "tenant_id,order_no");
                });
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.FOREIGN_KEY)
                .singleElement().satisfies(key -> {
                    assertThat(key.name()).startsWith("orders#FOREIGN_KEY#sha256:")
                            .doesNotContain("tenant");
                    assertThat(key.attributes()).containsEntry("referencedTable", "tenant");
                });
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.UNIQUE_KEY)
                .extracting(CatalogObject::name).containsExactly("uk_orders_code");
        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.PARTIAL);
            assertThat(finding.objectKind()).isEqualTo(ObjectKind.INDEX);
            assertThat(finding.operation()).isEqualTo("jdbc-get-index-info");
        });
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.ROUTINE)
                .extracting(CatalogObject::name).containsExactlyInAnyOrder("p_visible", "f_visible#1");
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TYPE)
                .singleElement().satisfies(type -> assertThat(type.attributes())
                        .containsEntry("javaClass", ""));
    }

    @Test
    void everyJdbcMetadataFailureBecomesSanitizedVisibilityEvidenceInsteadOfAbsence() throws Exception {
        MetadataFixture fixture = fixture();
        SQLException failure = new SQLException("secret catalog detail", "42501");
        given(fixture.metadata().getCatalogs()).willThrow(failure);
        given(fixture.metadata().getSchemas()).willThrow(failure);
        given(fixture.metadata().getTables(null, null, "%", null)).willThrow(failure);
        given(fixture.metadata().getProcedures(null, null, "%")).willThrow(failure);
        given(fixture.metadata().getFunctions(null, null, "%")).willThrow(failure);
        given(fixture.metadata().getUDTs(isNull(), isNull(), eq("%"), any(int[].class)))
                .willThrow(failure);
        given(fixture.connection().getCatalog()).willThrow(failure);
        given(fixture.connection().getSchema()).willThrow(failure);

        CatalogSnapshot snapshot = new JdbcMetadataSourceAdapter().discover(
                fixture.connection(), DiscoveryRequest.allUserObjects());

        assertThat(snapshot.objects()).isEmpty();
        assertThat(snapshot.visibilityFindings()).extracting(finding -> finding.operation())
                .contains("jdbc-get-catalogs", "jdbc-get-schemas", "jdbc-get-tables",
                        "jdbc-get-procedures", "jdbc-get-functions", "jdbc-get-udts",
                        "jdbc-get-current-catalog", "jdbc-get-current-schema");
        assertThat(snapshot.visibilityFindings())
                .filteredOn(finding -> finding.sqlState() != null)
                .allSatisfy(finding -> {
                    assertThat(finding.status()).isEqualTo(VisibilityStatus.UNREADABLE);
                    assertThat(finding.message()).doesNotContain("secret catalog detail");
                });
    }

    private static Map<String, Object> table(String name, String type) {
        return row("TABLE_CAT", "legacy", "TABLE_SCHEM", "app", "TABLE_NAME", name,
                "TABLE_TYPE", type, "REMARKS", null);
    }

    private static Map<String, Object> index(
            String name, boolean nonUnique, short ordinal, String column, String filter) {
        return row("TYPE", DatabaseMetaData.tableIndexOther, "INDEX_NAME", name,
                "NON_UNIQUE", nonUnique, "FILTER_CONDITION", filter,
                "COLUMN_NAME", column, "ORDINAL_POSITION", ordinal);
    }

    private static Map<String, Object> routine(
            String prefix, String catalog, String schema, String name, String specific) {
        return row(prefix + "_CAT", catalog, prefix + "_SCHEM", schema,
                prefix + "_NAME", name, "SPECIFIC_NAME", specific);
    }

    private static Map<String, Object> row(Object... pairs) {
        LinkedHashMap<String, Object> row = new LinkedHashMap<>();
        for (int index = 0; index < pairs.length; index += 2) {
            row.put((String) pairs[index], pairs[index + 1]);
        }
        return row;
    }

    private static ResultSet rows(List<Map<String, Object>> source) throws Exception {
        ResultSet result = mock(ResultSet.class);
        AtomicInteger cursor = new AtomicInteger(-1);
        given(result.next()).willAnswer(ignored -> cursor.incrementAndGet() < source.size());
        given(result.getString(anyString())).willAnswer(invocation -> {
            Object value = source.get(cursor.get()).get(invocation.getArgument(0));
            return value == null ? null : String.valueOf(value);
        });
        given(result.getInt(anyString())).willAnswer(invocation -> number(source, cursor, invocation.getArgument(0)).intValue());
        given(result.getLong(anyString())).willAnswer(invocation -> number(source, cursor, invocation.getArgument(0)).longValue());
        given(result.getShort(anyString())).willAnswer(invocation -> number(source, cursor, invocation.getArgument(0)).shortValue());
        given(result.getBoolean(anyString())).willAnswer(invocation -> {
            Object value = source.get(cursor.get()).get(invocation.getArgument(0));
            return value instanceof Boolean bool && bool;
        });
        return result;
    }

    private static Number number(List<Map<String, Object>> source, AtomicInteger cursor, String column) {
        Object value = source.get(cursor.get()).get(column);
        return value instanceof Number number ? number : 0;
    }

    private static MetadataFixture fixture() throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn("legacy");
        given(connection.getSchema()).willReturn("app");
        given(metadata.getDatabaseProductName()).willReturn("Synthetic JDBC");
        given(metadata.getDatabaseProductVersion()).willReturn("1.0");
        given(metadata.getDriverName()).willReturn("synthetic-driver");
        given(metadata.getDriverVersion()).willReturn("1");
        given(metadata.storesLowerCaseIdentifiers()).willReturn(true);
        given(metadata.storesUpperCaseIdentifiers()).willReturn(false);
        given(metadata.getSearchStringEscape()).willReturn("\\");
        MetadataFixture fixture = new MetadataFixture(connection, metadata);
        fixture.catalogs(List.of());
        fixture.schemas(List.of());
        fixture.tables(List.of());
        fixture.columns(List.of());
        fixture.primaryKeys(List.of());
        fixture.foreignKeys(List.of());
        fixture.indexes(List.of());
        fixture.procedures(List.of());
        fixture.functions(List.of());
        fixture.types(List.of());
        return fixture;
    }

    private record MetadataFixture(Connection connection, DatabaseMetaData metadata) {
        void catalogs(List<Map<String, Object>> source) throws Exception {
            given(metadata.getCatalogs()).willAnswer(ignored -> rows(source));
        }

        void schemas(List<Map<String, Object>> source) throws Exception {
            given(metadata.getSchemas()).willAnswer(ignored -> rows(source));
        }

        void tables(List<Map<String, Object>> source) throws Exception {
            given(metadata.getTables(null, null, "%", null)).willAnswer(ignored -> rows(source));
        }

        void columns(List<Map<String, Object>> source) throws Exception {
            given(metadata.getColumns(any(), any(), anyString(), anyString()))
                    .willAnswer(ignored -> rows(source));
        }

        void primaryKeys(List<Map<String, Object>> source) throws Exception {
            given(metadata.getPrimaryKeys(any(), any(), anyString()))
                    .willAnswer(ignored -> rows(source));
        }

        void foreignKeys(List<Map<String, Object>> source) throws Exception {
            given(metadata.getImportedKeys(any(), any(), anyString()))
                    .willAnswer(ignored -> rows(source));
        }

        void indexes(List<Map<String, Object>> source) throws Exception {
            given(metadata.getIndexInfo(any(), any(), anyString(), anyBoolean(), anyBoolean()))
                    .willAnswer(ignored -> rows(source));
        }

        void procedures(List<Map<String, Object>> source) throws Exception {
            given(metadata.getProcedures(null, null, "%")).willAnswer(ignored -> rows(source));
        }

        void functions(List<Map<String, Object>> source) throws Exception {
            given(metadata.getFunctions(null, null, "%")).willAnswer(ignored -> rows(source));
        }

        void types(List<Map<String, Object>> source) throws Exception {
            given(metadata.getUDTs(isNull(), isNull(), eq("%"), any(int[].class)))
                    .willAnswer(ignored -> rows(source));
        }
    }
}
