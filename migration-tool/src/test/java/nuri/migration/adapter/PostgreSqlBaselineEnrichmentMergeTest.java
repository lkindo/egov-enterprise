package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class PostgreSqlBaselineEnrichmentMergeTest {

    @Test
    void jdbcAndPgCatalogIdentityDefaultAndIndexRowsMergeIntoOneLogicalObjectEach()
            throws Exception {
        Connection connection = connection();

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(
                connection,
                new DiscoveryRequest(
                        Set.of(),
                        Set.of("app"),
                        Set.of(ObjectKind.IDENTITY, ObjectKind.DEFAULT_CONSTRAINT, ObjectKind.INDEX),
                        false));

        assertThat(snapshot.objects())
                .filteredOn(object -> Set.of(
                        ObjectKind.IDENTITY,
                        ObjectKind.DEFAULT_CONSTRAINT,
                        ObjectKind.INDEX).contains(object.kind()))
                .extracting(CatalogObject::kind, CatalogObject::name)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(ObjectKind.IDENTITY, "orders.id"),
                        org.assertj.core.groups.Tuple.tuple(ObjectKind.DEFAULT_CONSTRAINT, "orders.id"),
                        org.assertj.core.groups.Tuple.tuple(ObjectKind.INDEX, "ix_orders_id"));
        assertThat(snapshot.visibilityFindings())
                .noneMatch(finding -> finding.operation().equals(
                        nuri.migration.discovery.CatalogObjectRegistry.COLLISION_OPERATION));
    }

    private static Connection connection() throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn("legacy");
        given(connection.getSchema()).willReturn("app");
        given(metadata.storesLowerCaseIdentifiers()).willReturn(true);
        given(metadata.storesUpperCaseIdentifiers()).willReturn(false);
        given(metadata.getSearchStringEscape()).willReturn("\\");
        given(metadata.getDatabaseProductName()).willReturn("PostgreSQL");
        given(metadata.getDatabaseProductVersion()).willReturn("17.1");
        given(metadata.getDriverName()).willReturn("PostgreSQL JDBC Driver");
        given(metadata.getDriverVersion()).willReturn("test");
        ResultSet tableRows = tableRow();
        ResultSet columnRows = columnRow();
        ResultSet primaryKeyRows = emptyRows();
        ResultSet indexRows = indexRow();
        given(metadata.getTables(null, null, "%", null)).willReturn(tableRows);
        given(metadata.getColumns(eq("legacy"), eq("app"), eq("orders"), eq("%")))
                .willReturn(columnRows);
        given(metadata.getPrimaryKeys("legacy", "app", "orders")).willReturn(primaryKeyRows);
        given(metadata.getIndexInfo("legacy", "app", "orders", false, false))
                .willReturn(indexRows);

        given(connection.prepareStatement(anyString())).willAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            PreparedStatement statement = mock(PreparedStatement.class);
            if (sql.contains("schema_exists")) {
                ResultSet proof = schemaProof();
                given(statement.executeQuery()).willReturn(proof);
            } else if (sql.contains("FROM pg_catalog.pg_database")) {
                ResultSet environment = environmentRow();
                given(statement.executeQuery()).willReturn(environment);
            } else if (sql.contains("FROM pg_catalog.pg_attribute a")) {
                ResultSet object = pgObjectRow("orders.id", "d", "orders.id", "id");
                given(statement.executeQuery()).willReturn(object);
            } else if (sql.contains("FROM pg_catalog.pg_attrdef d")) {
                ResultSet object = pgObjectRow("orders.id", "42", "orders.id", "id");
                given(statement.executeQuery()).willReturn(object);
            } else if (sql.contains("FROM pg_catalog.pg_index x")) {
                ResultSet object = pgObjectRow(
                        "ix_orders_id", "CREATE INDEX", "orders", "false");
                given(statement.executeQuery()).willReturn(object);
            } else {
                ResultSet empty = emptyRows();
                given(statement.executeQuery()).willReturn(empty);
            }
            return statement;
        });
        return connection;
    }

    private static ResultSet tableRow() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("TABLE_CAT")).willReturn("legacy");
        given(rows.getString("TABLE_SCHEM")).willReturn("app");
        given(rows.getString("TABLE_NAME")).willReturn("orders");
        given(rows.getString("TABLE_TYPE")).willReturn("TABLE");
        return rows;
    }

    private static ResultSet columnRow() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("TABLE_NAME")).willReturn("orders");
        given(rows.getString("COLUMN_NAME")).willReturn("id");
        given(rows.getString("TYPE_NAME")).willReturn("integer");
        given(rows.getInt("DATA_TYPE")).willReturn(Types.INTEGER);
        given(rows.getLong("COLUMN_SIZE")).willReturn(10L);
        given(rows.getInt("DECIMAL_DIGITS")).willReturn(0);
        given(rows.getInt("NULLABLE")).willReturn(DatabaseMetaData.columnNoNulls);
        given(rows.getInt("ORDINAL_POSITION")).willReturn(1);
        given(rows.getString("COLUMN_DEF")).willReturn("42");
        given(rows.getString("IS_AUTOINCREMENT")).willReturn("YES");
        return rows;
    }

    private static ResultSet indexRow() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(true, false);
        given(rows.getShort("TYPE")).willReturn(DatabaseMetaData.tableIndexOther);
        given(rows.getString("INDEX_NAME")).willReturn("ix_orders_id");
        given(rows.getBoolean("NON_UNIQUE")).willReturn(true);
        given(rows.getString("COLUMN_NAME")).willReturn("id");
        given(rows.getShort("ORDINAL_POSITION")).willReturn((short) 1);
        return rows;
    }

    private static ResultSet schemaProof() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(true, false);
        given(rows.getBoolean("schema_exists")).willReturn(true);
        given(rows.getBoolean("has_usage")).willReturn(true);
        return rows;
    }

    private static ResultSet environmentRow() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("charset")).willReturn("UTF8");
        given(rows.getString("collation")).willReturn("C");
        given(rows.getString("timezone")).willReturn("UTC");
        return rows;
    }

    private static ResultSet pgObjectRow(
            String name,
            String definition,
            String dependency,
            String detail
    ) throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("object_catalog")).willReturn("legacy");
        given(rows.getString("object_schema")).willReturn("app");
        given(rows.getString("object_name")).willReturn(name);
        given(rows.getString("native_definition")).willReturn(definition);
        given(rows.getString("dependency_schema")).willReturn("app");
        given(rows.getString("dependency_name")).willReturn(dependency);
        given(rows.getString("detail")).willReturn(detail);
        return rows;
    }

    private static ResultSet emptyRows() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(false);
        return rows;
    }
}
