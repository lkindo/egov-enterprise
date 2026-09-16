package nuri.migration.adapter;

import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class CubridSourceAdapterTest {

    @Test
    void declaresManualRepeatableReadAndBoundedLobSupportWithoutCommitQualification() {
        CubridSourceAdapter adapter = new CubridSourceAdapter();

        assertThat(adapter.id()).isEqualTo("cubrid-catalog");
        assertThat(adapter.identity().databaseFamily()).isEqualTo(DatabaseFamily.CUBRID);
        assertThat(adapter.identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        assertThat(adapter.sourceReadSessionPolicy().isolationMode())
                .isEqualTo(SourceReadSessionPolicy.IsolationMode.REPEATABLE_READ);
        assertThat(adapter.sourceReadSessionPolicy().sourceFreezeRequired()).isTrue();
        assertThat(adapter.sourceReadSessionPolicy().lobStreamingSupported()).isTrue();
        assertThat(adapter.sourceReadSessionPolicy().executionPolicy()).isEqualTo(ExecutionPolicy.MANUAL_ONLY);
        assertThat(adapter.catalogQueries()).extracting(VendorCatalogQuery::operation)
                .containsExactly("cubrid-user-schemas", "cubrid-partitions", "cubrid-sequences",
                        "cubrid-identities", "cubrid-triggers", "cubrid-object-privileges");
    }

    @Test
    void exactDriverAndSelectOnlySchemaProofReplaceTheUnsupportedReadOnlySignal() throws Exception {
        Fixture fixture = fixture(false, false, List.of("PUBLIC"));
        CubridSourceAdapter adapter = new CubridSourceAdapter();

        AdapterPreflight report = adapter.preflight(fixture.connection(), request());

        assertThat(report.adapterMatches()).isTrue();
        assertThat(report.connectionReadOnlySignal()).isFalse();
        assertThat(report.hasBlockingFindings()).isFalse();
        assertThat(report.findings()).extracting(PreflightFinding::code)
                .contains("CUBRID_INTERNAL_CATALOG_SELECT_ONLY", "PRIVILEGE_PROOF_REQUIRED",
                        "UNVERIFIED_VENDOR_EVIDENCE")
                .doesNotContain("READ_ONLY_SIGNAL_MISSING");
        assertThat(CubridSourcePrivilegeProof.SOURCE_OBJECTS_SQL).contains("_db_class");
        assertThat(CubridSourcePrivilegeProof.SOURCE_GRANTS_SQL).contains("_db_auth", "_db_class");
    }

    @Test
    void inheritedGroupWriteMissingGrantAndDirectWriteEachFailClosed() throws Exception {
        for (Fixture fixture : List.of(
                fixture(false, false, List.of("PUBLIC", "WRITERS")),
                fixture(false, true, List.of("PUBLIC")),
                fixture(true, false, List.of("PUBLIC")))) {
            AdapterPreflight report = new CubridSourceAdapter().preflight(fixture.connection(), request());

            assertThat(report.hasBlockingFindings()).isTrue();
                    assertThat(report.findings()).extracting(PreflightFinding::code)
                    .contains("READ_ONLY_SIGNAL_MISSING")
                    .doesNotContain("CUBRID_INTERNAL_CATALOG_SELECT_ONLY");
        }
    }

    @Test
    void grantOutsideTheAuthoritativeObjectCensusFailsClosed() throws Exception {
        Fixture fixture = fixture(false, false, List.of("PUBLIC"), true);

        AdapterPreflight report = new CubridSourceAdapter().preflight(fixture.connection(), request());

        assertThat(report.hasBlockingFindings()).isTrue();
        assertThat(report.findings()).extracting(PreflightFinding::code)
                .contains("READ_ONLY_SIGNAL_MISSING")
                .doesNotContain("CUBRID_INTERNAL_CATALOG_SELECT_ONLY");
    }

    @Test
    void autoIncrementSerialsUseTheIdentityRouteAndStayOutOfStandaloneSequences() {
        CubridSourceAdapter adapter = new CubridSourceAdapter();
        VendorCatalogQuery sequence = adapter.catalogQueries().stream()
                .filter(query -> "cubrid-sequences".equals(query.operation()))
                .findFirst().orElseThrow();
        VendorCatalogQuery identity = adapter.catalogQueries().stream()
                .filter(query -> "cubrid-identities".equals(query.operation()))
                .findFirst().orElseThrow();

        assertThat(sequence.sql()).contains("class_name IS NULL", "attr_name IS NULL");
        assertThat(identity.kind()).isEqualTo(ObjectKind.IDENTITY);
        assertThat(identity.sql()).contains("class_name IS NOT NULL", "attr_name IS NOT NULL", "column_name");
        assertThat(identity.projection().dependency().kind()).isEqualTo(ObjectKind.COLUMN);
        assertThat(identity.projection().dependency().name().column()).isEqualTo("column_name");
    }

    @Test
    void visibilityProofCoversOnlyTheExplicitRelationalScope() throws Exception {
        Fixture relational = fixture(false, false, List.of("PUBLIC"));
        Fixture extended = fixture(false, false, List.of("PUBLIC"));

        assertThat(new CubridSourceAdapter().visibilityProof(relational.connection(), request())
                .covers(request())).isTrue();
        DiscoveryRequest withGrant = new DiscoveryRequest(
                Set.of(), Set.of("dba"), EnumSet.of(ObjectKind.TABLE, ObjectKind.GRANT), false);
        assertThat(new CubridSourceAdapter().visibilityProof(extended.connection(), withGrant)
                .covers(withGrant)).isFalse();
    }

    @Test
    void cubridMetadataHooksQualifyOwnerAndAvoidMissingOptionalColumnReads() throws Exception {
        CubridSourceAdapter adapter = new CubridSourceAdapter();
        ResultSet row = mock(ResultSet.class);
        given(row.getString("COLUMN_DEF")).willReturn("NULL");

        assertThat(adapter.currentCatalog(mock(Connection.class))).isNull();
        assertThat(adapter.metadataTableName("dba", "orders")).isEqualTo("dba.orders");
        assertThat(adapter.metadataTableName(null, "orders")).isEqualTo("orders");
        assertThat(adapter.columnDefaultExpression(row)).isNull();
        assertThat(adapter.columnAutoIncrement(row)).isNull();
        assertThat(adapter.columnGenerated(row)).isNull();
        verify(row, never()).getString("IS_AUTOINCREMENT");
        verify(row, never()).getString("IS_GENERATEDCOLUMN");
    }

    private static DiscoveryRequest request() {
        return new DiscoveryRequest(Set.of(), Set.of("dba"), EnumSet.of(
                ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY,
                ObjectKind.UNIQUE_KEY, ObjectKind.FOREIGN_KEY, ObjectKind.DEFAULT_CONSTRAINT,
                ObjectKind.INDEX, ObjectKind.IDENTITY, ObjectKind.VIEW, ObjectKind.COMMENT), false);
    }

    private static Fixture fixture(
            boolean directWrite,
            boolean missingGrant,
            List<String> groups) throws Exception {
        return fixture(directWrite, missingGrant, groups, false);
    }

    private static Fixture fixture(
            boolean directWrite,
            boolean missingGrant,
            List<String> groups,
            boolean outsideObjectGrant) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.isReadOnly()).willReturn(false);
        given(metadata.getDatabaseProductName()).willReturn("CUBRID");
        given(metadata.getDatabaseProductVersion()).willReturn(CubridSourceAdapter.QUALIFIED_PRODUCT_VERSION);
        given(metadata.getDriverName()).willReturn(CubridSourceAdapter.QUALIFIED_DRIVER_NAME);
        given(metadata.getDriverVersion()).willReturn(CubridSourceAdapter.QUALIFIED_DRIVER_VERSION);

        prepared(connection, CubridSourcePrivilegeProof.CURRENT_USER_SQL,
                List.of(row("current_user_name", "MIGREADER")));
        List<Map<String, Object>> groupRows = groups.stream()
                .map(group -> row("group_name", group)).toList();
        prepared(connection, CubridSourcePrivilegeProof.DIRECT_GROUPS_SQL, groupRows);
        prepared(connection, CubridSourcePrivilegeProof.SOURCE_OBJECTS_SQL, List.of(
                row("owner_name", "DBA", "class_name", "orders", "class_type", "CLASS"),
                row("owner_name", "DBA", "class_name", "payloads", "class_type", "CLASS")));
        List<Map<String, Object>> grants = new ArrayList<>();
        grants.add(grant("orders", "SELECT"));
        if (!missingGrant) grants.add(grant("payloads", "SELECT"));
        if (directWrite) grants.add(grant("orders", "UPDATE"));
        if (outsideObjectGrant) grants.add(grant("not_in_object_census", "SELECT"));
        prepared(connection, CubridSourcePrivilegeProof.SOURCE_GRANTS_SQL, grants);
        return new Fixture(connection);
    }

    private static Map<String, Object> grant(String object, String privilege) {
        return row(
                "owner_name", "DBA",
                "object_name", object,
                "object_type", "CLASS",
                "grantee_name", "MIGREADER",
                "auth_type", privilege,
                "is_grantable", "NO");
    }

    private static void prepared(
            Connection connection,
            String sql,
            List<Map<String, Object>> values) throws Exception {
        PreparedStatement statement = mock(PreparedStatement.class);
        given(connection.prepareStatement(sql)).willReturn(statement);
        given(statement.executeQuery()).willAnswer(ignored -> rows(values));
    }

    private static ResultSet rows(List<Map<String, Object>> values) throws Exception {
        ResultSet rows = mock(ResultSet.class);
        AtomicInteger cursor = new AtomicInteger(-1);
        given(rows.next()).willAnswer(ignored -> cursor.incrementAndGet() < values.size());
        given(rows.getString(anyString())).willAnswer(invocation -> {
            Object value = values.get(cursor.get()).get(invocation.getArgument(0));
            return value == null ? null : String.valueOf(value);
        });
        return rows;
    }

    private static Map<String, Object> row(Object... pairs) {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int index = 0; index < pairs.length; index += 2) {
            row.put((String) pairs[index], pairs[index + 1]);
        }
        return row;
    }

    private record Fixture(Connection connection) {}
}
