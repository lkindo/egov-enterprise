package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class PostgreSqlSourceAdapterTest {

    private static final Set<ObjectKind> NEW_SCHEMA_KINDS = Set.of(
            ObjectKind.COLLATION,
            ObjectKind.EXTENSION,
            ObjectKind.POLICY);
    private static final Set<ObjectKind> GLOBAL_KINDS = Set.of(
            ObjectKind.ROLE,
            ObjectKind.USER,
            ObjectKind.TABLESPACE,
            ObjectKind.FOREIGN_DATA_WRAPPER,
            ObjectKind.FOREIGN_SERVER,
            ObjectKind.USER_MAPPING,
            ObjectKind.PUBLICATION,
            ObjectKind.SUBSCRIPTION);

    @Test
    void includeSystemObjectsControlsBothSqlScopeAndMappedRows() throws Exception {
        DiscoveryRun userOnly = discoverFunctions(false);

        assertThat(userOnly.snapshot().objects())
                .extracting(CatalogObject::kind, CatalogObject::schema)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(ObjectKind.FUNCTION, "app"),
                        org.assertj.core.groups.Tuple.tuple(ObjectKind.FUNCTION, "pgXtemp_app"));
        assertThat(userOnly.vendorSql()).contains(
                "n.nspname <> 'pg_catalog'",
                "n.nspname <> 'information_schema'",
                "LEFT(n.nspname, 8) <> 'pg_toast'",
                "LEFT(n.nspname, 7) <> 'pg_temp'");

        DiscoveryRun includingSystem = discoverFunctions(true);

        assertThat(includingSystem.snapshot().objects())
                .extracting(CatalogObject::kind, CatalogObject::schema)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(ObjectKind.FUNCTION, "pg_catalog"),
                        org.assertj.core.groups.Tuple.tuple(ObjectKind.FUNCTION, "app"),
                        org.assertj.core.groups.Tuple.tuple(ObjectKind.FUNCTION, "pgXtemp_app"));
        assertThat(includingSystem.vendorSql()).doesNotContain(
                "n.nspname <> 'pg_catalog'",
                "n.nspname <> 'information_schema'",
                "LEFT(n.nspname, 8) <> 'pg_toast'",
                "LEFT(n.nspname, 7) <> 'pg_temp'");
    }

    @Test
    void exactKindsSuppressGenericRoutineAndTypeCollectorsToPreventDuplicates() throws Exception {
        MockDatabase database = mockDatabase(List.of());
        DiscoveryRequest request = new DiscoveryRequest(
                Set.of(),
                Set.of(),
                EnumSet.of(
                        ObjectKind.ROUTINE,
                        ObjectKind.FUNCTION,
                        ObjectKind.PROCEDURE,
                        ObjectKind.TYPE,
                        ObjectKind.DOMAIN,
                        ObjectKind.ENUM),
                false);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(database.connection(), request);

        assertThat(snapshot.objects())
                .extracting(CatalogObject::kind)
                .doesNotContain(ObjectKind.ROUTINE);
        verify(database.metadata(), never()).getProcedures(null, null, "%");
        verify(database.metadata(), never()).getFunctions(null, null, "%");
        verify(database.metadata(), never()).getUDTs(isNull(), isNull(), eq("%"), any(int[].class));
    }

    @Test
    void schemaAndGlobalCensusKindsFollowExecutableQueriesAndCapabilities() {
        PostgreSqlSourceAdapter adapter = new PostgreSqlSourceAdapter();

        assertThat(NEW_SCHEMA_KINDS)
                .allSatisfy(kind -> assertThat(adapter.capabilities().supportFor(kind))
                        .as(kind.name())
                        .isNotEqualTo(ObjectSupportGrade.UNSUPPORTED));
        assertThat(GLOBAL_KINDS)
                .allSatisfy(kind -> assertThat(adapter.capabilities().supportFor(kind))
                        .as(kind.name())
                        .isNotEqualTo(ObjectSupportGrade.UNSUPPORTED));
        assertThat(Set.of(ObjectKind.FUNCTION, ObjectKind.PROCEDURE, ObjectKind.DOMAIN, ObjectKind.ENUM))
                .allSatisfy(kind -> assertThat(adapter.capabilities().supportFor(kind))
                        .as(kind.name())
                        .isNotEqualTo(ObjectSupportGrade.UNSUPPORTED));
    }

    @Test
    void probeOnlyAndKnownPartialCatalogScopesBlockEvenWhenQueriesReturnNoRows() throws Exception {
        MockDatabase database = mockDatabase(List.of());
        DiscoveryRequest request = new DiscoveryRequest(
                Set.of(),
                Set.of(),
                EnumSet.of(ObjectKind.PARTITION, ObjectKind.GRANT, ObjectKind.JOB),
                false);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(database.connection(), request);

        assertThat(snapshot.visibilityFindings())
                .filteredOn(finding -> finding.status() == VisibilityStatus.PARTIAL)
                .extracting(finding -> finding.objectKind())
                .contains(ObjectKind.PARTITION, ObjectKind.GRANT, ObjectKind.JOB);
        assertThat(snapshot.objects()).extracting(CatalogObject::kind).doesNotContain(ObjectKind.JOB);
    }

    @Test
    void grantIdentityIsCollisionSafeWithoutPersistingRoleNames() throws Exception {
        List<Row> rows = List.of(
                new Row("legacy", "app", "orders", null, "SELECT", "alice:owner_a:SELECT:false"),
                new Row("legacy", "app", "orders", null, "SELECT", "alice:owner_b:SELECT:false"));
        MockDatabase database = mockDatabase(rows);
        DiscoveryRequest request = new DiscoveryRequest(
                Set.of(),
                Set.of(),
                Set.of(ObjectKind.GRANT),
                false);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(database.connection(), request);

        assertThat(snapshot.objects())
                .filteredOn(object -> object.kind() == ObjectKind.GRANT)
                .hasSize(2)
                .allSatisfy(object -> {
                    assertThat(object.name()).startsWith("orders#")
                            .doesNotContain("alice", "owner_a", "owner_b");
                    assertThat(object.attributes().values())
                            .noneMatch(value -> value.contains("alice") || value.contains("owner_"));
        });
    }

    @Test
    void conflictingPgCatalogRowsFailClosedInsteadOfOverwriting() throws Exception {
        List<Row> rows = List.of(
                new Row("legacy", "app", "shared()", "CREATE FUNCTION shared() RETURNS int", "f"),
                new Row("legacy", "app", "shared()", "CREATE FUNCTION shared() RETURNS text", "f"));
        MockDatabase database = mockDatabase(rows);
        DiscoveryRequest request = new DiscoveryRequest(
                Set.of(), Set.of(), Set.of(ObjectKind.FUNCTION), false);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(database.connection(), request);

        assertThat(snapshot.objects())
                .filteredOn(object -> object.kind() == ObjectKind.FUNCTION)
                .hasSize(1);
        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.UNREADABLE);
            assertThat(finding.operation()).isEqualTo("catalog-object-stable-id-collision");
            assertThat(finding.message()).doesNotContain("RETURNS int", "RETURNS text", "shared");
        });
    }

    private static DiscoveryRun discoverFunctions(boolean includeSystemObjects) throws Exception {
        List<Row> rows = List.of(
                new Row("legacy", "pg_catalog", "shared()", "CREATE FUNCTION shared()", "f"),
                new Row("legacy", "app", "shared()", "CREATE FUNCTION shared()", "f"),
                new Row("legacy", "pgXtemp_app", "shared()", "CREATE FUNCTION shared()", "f"));
        MockDatabase database = mockDatabase(rows);
        DiscoveryRequest request = new DiscoveryRequest(
                Set.of(),
                Set.of(),
                Set.of(ObjectKind.FUNCTION),
                includeSystemObjects);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(database.connection(), request);
        String vendorSql = database.preparedSql().stream()
                .filter(sql -> sql.contains("FROM pg_catalog.pg_proc"))
                .findFirst()
                .orElseThrow();
        return new DiscoveryRun(snapshot, vendorSql);
    }

    private static MockDatabase mockDatabase(List<Row> queryRows) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        List<String> preparedSql = new ArrayList<>();
        ResultSet emptyTables = mock(ResultSet.class);
        given(emptyTables.next()).willReturn(false);
        given(connection.getMetaData()).willReturn(metadata);
        given(metadata.storesLowerCaseIdentifiers()).willReturn(true);
        given(metadata.storesUpperCaseIdentifiers()).willReturn(false);
        given(metadata.getTables(null, null, "%", null)).willReturn(emptyTables);
        given(metadata.getDatabaseProductName()).willReturn("PostgreSQL");
        given(metadata.getDatabaseProductVersion()).willReturn("17.1");
        given(metadata.getDriverName()).willReturn("PostgreSQL JDBC Driver");
        given(metadata.getDriverVersion()).willReturn("test");
        given(connection.getCatalog()).willReturn("legacy");
        given(connection.getSchema()).willReturn("app");

        PreparedStatement environmentStatement = mock(PreparedStatement.class);
        ResultSet environmentRows = mock(ResultSet.class);
        given(environmentRows.next()).willReturn(true, false);
        given(environmentRows.getString("charset")).willReturn("UTF8");
        given(environmentRows.getString("collation")).willReturn("C");
        given(environmentRows.getString("timezone")).willReturn("UTC");
        given(environmentStatement.executeQuery()).willReturn(environmentRows);

        given(connection.prepareStatement(anyString())).willAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            preparedSql.add(sql);
            if (sql.contains("FROM pg_catalog.pg_database")) {
                return environmentStatement;
            }
            if (sql.contains("SELECT n.nspname AS schema_name")) {
                PreparedStatement statement = mock(PreparedStatement.class);
                ResultSet schemas = mock(ResultSet.class);
                given(schemas.next()).willReturn(true, false);
                given(schemas.getString("schema_name")).willReturn("app");
                given(statement.executeQuery()).willReturn(schemas);
                return statement;
            }
            if (sql.contains("AS schema_exists") && sql.contains("AS has_usage")) {
                PreparedStatement statement = mock(PreparedStatement.class);
                ResultSet visibility = mock(ResultSet.class);
                given(visibility.next()).willReturn(true, false);
                given(visibility.getBoolean("schema_exists")).willReturn(true);
                given(visibility.getBoolean("has_usage")).willReturn(true);
                given(statement.executeQuery()).willReturn(visibility);
                return statement;
            }
            PreparedStatement statement = mock(PreparedStatement.class);
            ResultSet queryResult = rows(queryRows);
            given(statement.executeQuery()).willReturn(queryResult);
            return statement;
        });
        return new MockDatabase(connection, metadata, preparedSql);
    }

    private static ResultSet rows(List<Row> source) throws Exception {
        ResultSet rows = mock(ResultSet.class);
        if (source.isEmpty()) {
            given(rows.next()).willReturn(false);
            return rows;
        }
        AtomicInteger cursor = new AtomicInteger(-1);
        given(rows.next()).willAnswer(ignored -> cursor.incrementAndGet() < source.size());
        given(rows.getString("object_catalog")).willAnswer(ignored -> source.get(cursor.get()).catalog());
        given(rows.getString("object_schema")).willAnswer(ignored -> source.get(cursor.get()).schema());
        given(rows.getString("object_name")).willAnswer(ignored -> source.get(cursor.get()).name());
        given(rows.getString("native_definition")).willAnswer(ignored -> source.get(cursor.get()).definition());
        given(rows.getString("dependency_schema")).willReturn(null);
        given(rows.getString("dependency_name")).willReturn(null);
        given(rows.getString("detail")).willAnswer(ignored -> source.get(cursor.get()).detail());
        given(rows.getString("identity_detail"))
                .willAnswer(ignored -> source.get(cursor.get()).identityDetail());
        return rows;
    }

    private record Row(
            String catalog,
            String schema,
            String name,
            String definition,
            String detail,
            String identityDetail) {

        private Row(String catalog, String schema, String name, String definition, String detail) {
            this(catalog, schema, name, definition, detail, null);
        }
    }

    private record MockDatabase(
            Connection connection,
            DatabaseMetaData metadata,
            List<String> preparedSql) {}

    private record DiscoveryRun(CatalogSnapshot snapshot, String vendorSql) {}
}
