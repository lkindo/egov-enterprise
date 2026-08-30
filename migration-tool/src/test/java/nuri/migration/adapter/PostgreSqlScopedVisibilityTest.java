package nuri.migration.adapter;

import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanner;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class PostgreSqlScopedVisibilityTest {

    @Test
    void existingEmptySchemaWithUsageAndSuccessfulPgCatalogProofHasNoVisibilityPartial()
            throws Exception {
        MockPostgres database = postgres(true, true, false);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(
                database.connection(),
                scopedTableRequest("empty_schema"));

        assertThat(snapshot.objects()).isEmpty();
        assertThat(snapshot.visibilityFindings())
                .noneMatch(finding -> finding.operation().equals("source-visibility-proof"));
        assertThat(snapshot.visibilityFindings())
                .noneMatch(finding -> finding.operation().equals("postgres-schema-visibility"));
        assertThat(database.preparedSql())
                .anyMatch(sql -> sql.contains("pg_catalog.pg_namespace"));
    }

    @Test
    void provenSupportedSubsetWithAMappedTableCanReachCommitReadyPlan() throws Exception {
        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(
                postgres(true, true, false, true).connection(),
                scopedTableRequest("app"));
        MappingSpec mapping = new MappingSpec(
                null,
                null,
                List.of(new TableMapping(
                        "app.legacy_user",
                        "public.tb_user",
                        null,
                        List.of(),
                        null)),
                Map.of());

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot, mapping, Map.of(), "a".repeat(64));

        assertThat(snapshot.visibilityFindings()).isEmpty();
        assertThat(plan.coverage().unreadable()).isZero();
        assertThat(plan.commitReady()).isTrue();
    }

    @Test
    void missingUsageCannotBeReviewedAwayAndRemainsBlocking() throws Exception {
        MockPostgres database = postgres(true, false, false);

        CatalogSnapshot snapshot = new PostgreSqlSourceAdapter().discover(
                database.connection(),
                scopedTableRequest("private_schema"));

        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.PARTIAL);
            assertThat(finding.operation()).isEqualTo("source-visibility-proof");
        });
        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.UNREADABLE);
            assertThat(finding.operation()).isEqualTo("postgres-schema-visibility");
        });
        assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot,
                new MappingSpec(null, null, List.of(), Map.of()),
                Map.of(),
                "a".repeat(64));
        assertThat(plan.commitReady()).isFalse();
        assertThat(plan.coverage().unreadable()).isPositive();
    }

    @Test
    void failedPgCatalogProofAndWholeSourceDiscoveryRemainBlocking() throws Exception {
        CatalogSnapshot failedProof = new PostgreSqlSourceAdapter().discover(
                postgres(true, true, true).connection(),
                scopedTableRequest("app"));
        assertThat(failedProof.visibilityFindings())
                .anyMatch(finding -> finding.operation().equals("source-visibility-proof"));
        assertThat(failedProof.hasBlockingVisibilityFindings()).isTrue();

        CatalogSnapshot wholeSource = new PostgreSqlSourceAdapter().discover(
                postgres(true, true, false).connection(),
                new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false));
        assertThat(wholeSource.visibilityFindings())
                .anyMatch(finding -> finding.operation().equals("source-visibility-proof"));
        assertThat(wholeSource.hasBlockingVisibilityFindings()).isTrue();
    }

    private static DiscoveryRequest scopedTableRequest(String schema) {
        return new DiscoveryRequest(Set.of(), Set.of(schema), Set.of(ObjectKind.TABLE), false);
    }

    private static MockPostgres postgres(
            boolean schemaExists,
            boolean hasUsage,
            boolean proofFails
    ) throws Exception {
        return postgres(schemaExists, hasUsage, proofFails, false);
    }

    private static MockPostgres postgres(
            boolean schemaExists,
            boolean hasUsage,
            boolean proofFails,
            boolean tablePresent
    ) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        List<String> preparedSql = new ArrayList<>();
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn("legacy_db");
        given(connection.getSchema()).willReturn("app");
        given(metadata.storesLowerCaseIdentifiers()).willReturn(true);
        given(metadata.storesUpperCaseIdentifiers()).willReturn(false);
        given(metadata.getDatabaseProductName()).willReturn("PostgreSQL");
        given(metadata.getDatabaseProductVersion()).willReturn("17.1");
        given(metadata.getDriverName()).willReturn("PostgreSQL JDBC Driver");
        given(metadata.getDriverVersion()).willReturn("test");
        ResultSet tables = tablePresent ? tableRow() : emptyRows();
        given(metadata.getTables(isNull(), isNull(), anyString(), any())).willReturn(tables);

        given(connection.prepareStatement(anyString())).willAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            preparedSql.add(sql);
            PreparedStatement statement = mock(PreparedStatement.class);
            if (sql.contains("pg_catalog.pg_database")) {
                ResultSet environment = mock(ResultSet.class);
                given(environment.next()).willReturn(true, false);
                given(environment.getString("charset")).willReturn("UTF8");
                given(environment.getString("collation")).willReturn("C");
                given(environment.getString("timezone")).willReturn("UTC");
                given(statement.executeQuery()).willReturn(environment);
                return statement;
            }
            if (proofFails) {
                given(statement.executeQuery()).willThrow(new SQLException("unsafe detail", "42501"));
                return statement;
            }
            ResultSet proof = mock(ResultSet.class);
            given(proof.next()).willReturn(true, false);
            given(proof.getBoolean("schema_exists")).willReturn(schemaExists);
            given(proof.getBoolean("has_usage")).willReturn(hasUsage);
            given(proof.getBoolean("visible")).willReturn(schemaExists && hasUsage);
            given(statement.executeQuery()).willReturn(proof);
            return statement;
        });
        return new MockPostgres(connection, preparedSql);
    }

    private static ResultSet emptyRows() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(false);
        return rows;
    }

    private static ResultSet tableRow() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        given(rows.next()).willReturn(true, false);
        given(rows.getString("TABLE_CAT")).willReturn("legacy_db");
        given(rows.getString("TABLE_SCHEM")).willReturn("app");
        given(rows.getString("TABLE_NAME")).willReturn("legacy_user");
        given(rows.getString("TABLE_TYPE")).willReturn("TABLE");
        return rows;
    }

    private record MockPostgres(Connection connection, List<String> preparedSql) {}
}
