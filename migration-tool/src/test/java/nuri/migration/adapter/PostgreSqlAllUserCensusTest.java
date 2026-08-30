package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScopeStatus;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class PostgreSqlAllUserCensusTest {

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
    void allUserScopeEnumeratesEveryNonSystemSchemaAndProvesUsageBeforeCompleteness()
            throws Exception {
        PgCatalogMock database = database(List.of("app", "audit", "pgXtemp_app"), Set.of(), null);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(
                database.connection(),
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false));

        assertThat(snapshot.visibilityFindings())
                .noneMatch(finding -> finding.operation().equals("source-visibility-proof"));
        assertThat(snapshot.visibilityFindings())
                .noneMatch(finding -> finding.operation().equals("postgres-schema-enumeration"));
        assertThat(database.preparedSql())
                .anyMatch(sql -> sql.contains("AS schema_name")
                        && sql.contains("pg_catalog.pg_namespace")
                        && sql.contains("n.nspname <> 'pg_catalog'")
                        && sql.contains("LEFT(n.nspname, 8) <> 'pg_toast'")
                        && sql.contains("LEFT(n.nspname, 7) <> 'pg_temp'")
                        && !sql.contains("NOT LIKE 'pg_toast%'")
                        && !sql.contains("NOT LIKE 'pg_temp%'"));
        assertThat(database.proofBindings())
                .contains("app", "audit", "pgXtemp_app")
                .allMatch(Set.of("app", "audit", "pgXtemp_app")::contains);
    }

    @Test
    void zeroSchemasPermissionFailureAndEnumerationFailureAreFailClosed() throws Exception {
        CatalogSnapshot zero = new PostgreSqlSourceAdapter().discover(
                database(List.of(), Set.of(), null).connection(),
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false));
        assertThat(zero.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.PARTIAL);
            assertThat(finding.operation()).isEqualTo("postgres-schema-enumeration");
        });

        CatalogSnapshot noUsage = new PostgreSqlSourceAdapter().discover(
                database(List.of("app", "private"), Set.of("private"), null).connection(),
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false));
        assertThat(noUsage.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.UNREADABLE);
            assertThat(finding.schema()).isEqualTo("private");
            assertThat(finding.operation()).isEqualTo("postgres-schema-visibility");
        });

        CatalogSnapshot failed = new PostgreSqlSourceAdapter().discover(
                database(List.of(), Set.of(), new SQLException("unsafe detail", "42501")).connection(),
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false));
        assertThat(failed.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.UNREADABLE);
            assertThat(finding.operation()).isEqualTo("postgres-schema-enumeration");
            assertThat(finding.message()).doesNotContain("unsafe detail");
        });
        assertThat(zero.hasBlockingVisibilityFindings()).isTrue();
        assertThat(noUsage.hasBlockingVisibilityFindings()).isTrue();
        assertThat(failed.hasBlockingVisibilityFindings()).isTrue();
    }

    @Test
    void unscopedCensusMapsEveryGlobalKindWithoutReadingSecretOptionColumns() throws Exception {
        PgCatalogMock database = database(List.of("app"), Set.of(), null);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(
                database.connection(),
                new DiscoveryRequest(Set.of(), Set.of(), GLOBAL_KINDS, false));

        assertThat(snapshot.objects())
                .extracting(CatalogObject::kind)
                .containsAll(GLOBAL_KINDS);
        assertThat(snapshot.visibilityFindings())
                .noneMatch(finding -> finding.status() == VisibilityStatus.UNSUPPORTED);
        assertThat(database.globalRows()).isNotEmpty();
        for (ResultSet row : database.globalRows()) {
            verify(row, never()).getString("subconninfo");
            verify(row, never()).getString("umoptions");
            verify(row, never()).getString("srvoptions");
            verify(row, never()).getString("fdwoptions");
            verify(row, never()).getString("rolpassword");
        }
        assertThat(database.preparedSql().stream()
                .filter(sql -> globalKind(sql) != null)
                .map(sql -> sql.toLowerCase(Locale.ROOT)))
                .allSatisfy(sql -> assertThat(sql)
                        .doesNotContain("conninfo", "options", "password", "credential", "secret"));
    }

    @Test
    void explicitSchemaKeepsGlobalKindsNotRequestedAndNeverRunsGlobalQueries() throws Exception {
        PostgreSqlSourceAdapter adapter = new PostgreSqlSourceAdapter();
        DiscoveryRequest original = new DiscoveryRequest(
                Set.of(), Set.of("app"), GLOBAL_KINDS, false);
        PgCatalogMock database = database(List.of("app"), Set.of(), null);

        CatalogSnapshot snapshot = adapter.discover(
                database.connection(),
                adapter.discoveryScope(original).effectiveRequest());

        assertThat(GLOBAL_KINDS).allSatisfy(kind -> assertThat(
                adapter.discoveryScope(original).status(kind))
                .isEqualTo(DiscoveryScopeStatus.NOT_REQUESTED));
        assertThat(snapshot.objects()).isEmpty();
        assertThat(database.preparedSql())
                .noneMatch(sql -> globalKind(sql) != null);
    }

    private static PgCatalogMock database(
            List<String> schemas,
            Set<String> deniedSchemas,
            SQLException enumerationFailure
    ) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        List<String> preparedSql = new ArrayList<>();
        List<String> proofBindings = new ArrayList<>();
        List<ResultSet> globalRows = new ArrayList<>();
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn("legacy");
        given(connection.getSchema()).willReturn("app");
        given(metadata.storesLowerCaseIdentifiers()).willReturn(true);
        given(metadata.storesUpperCaseIdentifiers()).willReturn(false);
        given(metadata.getDatabaseProductName()).willReturn("PostgreSQL");
        given(metadata.getDatabaseProductVersion()).willReturn("17.1");
        given(metadata.getDriverName()).willReturn("PostgreSQL JDBC Driver");
        given(metadata.getDriverVersion()).willReturn("test");
        ResultSet tableRows = emptyRows();
        given(metadata.getTables(isNull(), isNull(), anyString(), any())).willReturn(tableRows);

        given(connection.prepareStatement(anyString())).willAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            preparedSql.add(sql);
            PreparedStatement statement = mock(PreparedStatement.class);
            if (sql.contains("SELECT n.nspname AS schema_name")) {
                if (enumerationFailure != null) {
                    given(statement.executeQuery()).willThrow(enumerationFailure);
                } else {
                    ResultSet enumerationRows = schemaRows(schemas);
                    given(statement.executeQuery()).willReturn(enumerationRows);
                }
                return statement;
            }
            if (sql.contains("pg_catalog.pg_namespace")
                    && sql.contains("schema_exists")) {
                given(statement.executeQuery()).willAnswer(ignored -> {
                    ResultSet proof = mock(ResultSet.class);
                    given(proof.next()).willReturn(true, false);
                    given(proof.getBoolean("schema_exists")).willReturn(true);
                    given(proof.getBoolean("has_usage")).willAnswer(answer -> {
                        String bound = proofBindings.getLast();
                        return !deniedSchemas.contains(bound);
                    });
                    return proof;
                });
                org.mockito.Mockito.doAnswer(answer -> {
                    proofBindings.add(answer.getArgument(1));
                    return null;
                }).when(statement).setString(org.mockito.ArgumentMatchers.eq(1), anyString());
                return statement;
            }
            if (sql.contains("pg_catalog.pg_encoding_to_char(d.encoding)")
                    && sql.contains("FROM pg_catalog.pg_database d")) {
                ResultSet environment = environmentRows();
                given(statement.executeQuery()).willReturn(environment);
                return statement;
            }
            ObjectKind kind = globalKind(sql);
            if (kind != null) {
                ResultSet row = globalRow(kind);
                globalRows.add(row);
                given(statement.executeQuery()).willReturn(row);
                return statement;
            }
            ResultSet empty = emptyRows();
            given(statement.executeQuery()).willReturn(empty);
            return statement;
        });
        return new PgCatalogMock(connection, preparedSql, proofBindings, globalRows);
    }

    private static ObjectKind globalKind(String sql) {
        if (sql.contains("pg_catalog.pg_subscription")) return ObjectKind.SUBSCRIPTION;
        if (sql.contains("pg_catalog.pg_publication")) return ObjectKind.PUBLICATION;
        if (sql.contains("pg_catalog.pg_user_mapping")) return ObjectKind.USER_MAPPING;
        if (sql.contains("pg_catalog.pg_foreign_server")) return ObjectKind.FOREIGN_SERVER;
        if (sql.contains("pg_catalog.pg_foreign_data_wrapper")) return ObjectKind.FOREIGN_DATA_WRAPPER;
        if (sql.contains("pg_catalog.pg_tablespace")) return ObjectKind.TABLESPACE;
        if (sql.contains("pg_catalog.pg_roles") && sql.contains("rolcanlogin")) {
            return sql.contains("NOT r.rolcanlogin") ? ObjectKind.ROLE : ObjectKind.USER;
        }
        return null;
    }

    private static ResultSet globalRow(ObjectKind kind) throws Exception {
        ResultSet row = mock(ResultSet.class);
        given(row.next()).willReturn(true, false);
        given(row.getString("object_catalog")).willReturn("legacy");
        given(row.getString("object_schema")).willReturn(null);
        given(row.getString("object_name")).willReturn(kind.name().toLowerCase(Locale.ROOT));
        given(row.getString("native_definition")).willReturn(null);
        given(row.getString("dependency_schema")).willReturn(null);
        given(row.getString("dependency_name")).willReturn(null);
        given(row.getString("detail")).willReturn("metadata-only");
        return row;
    }

    private static ResultSet schemaRows(List<String> schemas) throws Exception {
        ResultSet rows = mock(ResultSet.class);
        java.util.concurrent.atomic.AtomicInteger cursor = new java.util.concurrent.atomic.AtomicInteger(-1);
        given(rows.next()).willAnswer(ignored -> cursor.incrementAndGet() < schemas.size());
        given(rows.getString("schema_name")).willAnswer(ignored -> schemas.get(cursor.get()));
        return rows;
    }

    private static ResultSet emptyRows() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(false);
        return rows;
    }

    private static ResultSet environmentRows() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("charset")).willReturn("UTF8");
        given(rows.getString("collation")).willReturn("C");
        given(rows.getString("timezone")).willReturn("UTC");
        return rows;
    }

    private record PgCatalogMock(
            Connection connection,
            List<String> preparedSql,
            List<String> proofBindings,
            List<ResultSet> globalRows) {}
}
