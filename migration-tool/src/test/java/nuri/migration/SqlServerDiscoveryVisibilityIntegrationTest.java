package nuri.migration;

import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SqlServerSourceAdapter;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

/** Sysadmin metadata evidence on disposable fixtures; no least-privilege or public COMMIT qualification. */
class SqlServerDiscoveryVisibilityIntegrationTest extends SqlServerPostgresTestSupport {
    private final SqlServerSourceAdapter adapter = new SqlServerSourceAdapter();

    @Test
    void currentSysadminDiscoversExactDboTablesColumnsAndPrimaryKeys() throws Exception {
        tables();
        try (Connection connection = sourceConnection()) {
            assertThat(connection.getCatalog()).isEqualTo(SOURCE_DATABASE);
            assertThat(connection.getSchema()).isEqualTo("dbo");
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("Microsoft SQL Server");
            assertThat(connection.getMetaData().getDriverName()).isEqualTo("Microsoft JDBC Driver 13.6 for SQL Server");
            assertThat(connection.getMetaData().getDriverVersion()).isEqualTo("13.6.0.0");
            assertThat(integer(connection, "SELECT IS_SRVROLEMEMBER('sysadmin')")).isEqualTo(1);
            assertThat(integer(connection, "SELECT CASE WHEN ORIGINAL_LOGIN()=SUSER_SNAME() THEN 1 ELSE 0 END")).isEqualTo(1);
            assertThat(integer(connection, "SELECT CASE WHEN USER_NAME()='dbo' THEN 1 ELSE 0 END")).isEqualTo(1);
            CatalogSnapshot snapshot = adapter.discover(connection, request());
            assertCompleteTables(snapshot);
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN).hasSize(3);
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.PRIMARY_KEY).hasSize(2);
            assertThat(adapter.identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
            assertThat(adapter.sourceReadSessionPolicy().sourceFreezeRequired()).isTrue();
        }
    }

    @Test
    void completeEmptyDboIsDistinctFromAnUnqualifiedMissingSchema() throws Exception {
        String database = "sdempty" + suffix();
        try {
            execute("CREATE DATABASE " + ident(database));
            try (Connection connection = sourceConnection()) {
                connection.setCatalog(database);
                assertThat(connection.getCatalog()).isEqualTo(database);
                assertThat(connection.getSchema()).isEqualTo("dbo");
                CatalogSnapshot empty = adapter.discover(connection, request());
                assertThat(empty.visibilityFindings()).isEmpty();
                assertThat(empty.objects()).singleElement().satisfies(object -> {
                    assertThat(object.kind()).isEqualTo(ObjectKind.SCHEMA);
                    assertThat(object.name()).isEqualTo("dbo");
                    assertThat(object.catalog()).isEqualTo(database);
                    assertThat(object.schema()).isEqualTo("dbo");
                });
                CatalogSnapshot missing = adapter.discover(connection,
                        new DiscoveryRequest(Set.of(), Set.of("sdabsent" + suffix()), request().objectKinds(), false));
                assertThat(missing.objects()).isEmpty();
                assertUnproven(missing);
            }
        } finally {
            execute("IF DB_ID(N'" + database + "') IS NOT NULL DROP DATABASE " + ident(database));
        }
    }

    @Test
    void directSchemaSelectAndDefinitionReaderStaysUnprovenAndCannotWrite() throws Exception {
        tables();
        try (Account reader = account()) {
            grantSchema(reader.ident());
            try (Connection connection = reader.connect()) {
                assertThat(integer(connection, "SELECT IS_SRVROLEMEMBER('sysadmin')")).isEqualTo(0);
                assertThat(integer(connection, "SELECT HAS_PERMS_BY_NAME('dbo','SCHEMA','SELECT')")).isEqualTo(1);
                assertThat(integer(connection, "SELECT HAS_PERMS_BY_NAME('dbo','SCHEMA','VIEW DEFINITION')")).isEqualTo(1);
                connection.setReadOnly(true);
                // The Microsoft JDBC driver treats this setter as a hint; physical privileges enforce no writes.
                assertThat(connection.isReadOnly()).isFalse();
                CatalogSnapshot snapshot = adapter.discover(connection, request());
                assertUnproven(snapshot);
                assertBothTables(snapshot);
                assertThatThrownBy(() -> {
                    try (Statement statement = connection.createStatement()) {
                        statement.executeUpdate("INSERT INTO dbo.tb_sqlserver_vis_allowed VALUES (1, 'blocked')");
                    }
                }).isInstanceOf(SQLException.class);
            }
        }
    }

    @Test
    void singleTableGrantDoesNotProveTheHiddenTableAbsent() throws Exception {
        tables();
        try (Account reader = account()) {
            execute("GRANT SELECT ON OBJECT::dbo.tb_sqlserver_vis_allowed TO " + reader.ident());
            try (Connection connection = reader.connect()) {
                CatalogSnapshot snapshot = adapter.discover(connection, request());
                assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                        .extracting(CatalogObject::name).containsExactly("tb_sqlserver_vis_allowed");
                assertThat(snapshot.objects()).noneMatch(object -> object.name().startsWith("tb_sqlserver_vis_hidden"));
                assertUnproven(snapshot);
            }
        }
    }

    @Test
    void columnGrantExposesWholeGrantedTableMetadataButStillCannotProveHiddenTablesAbsent() throws Exception {
        tables();
        try (Account reader = account()) {
            execute("GRANT SELECT ON OBJECT::dbo.tb_sqlserver_vis_allowed (id) TO " + reader.ident());
            try (Connection connection = reader.connect()) {
                CatalogSnapshot snapshot = adapter.discover(connection, request());
                assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                        .extracting(CatalogObject::name).containsExactly("tb_sqlserver_vis_allowed");
                // SQL Server column grants expose all metadata columns of the parent table.
                assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN)
                        .extracting(object -> object.attributes().get("originalName"))
                        .containsExactlyInAnyOrder("id", "payload");
                assertThat(snapshot.objects()).noneMatch(object -> object.name().startsWith("tb_sqlserver_vis_hidden"));
                assertUnproven(snapshot);
            }
        }
    }

    @Test
    void databaseRoleSchemaGrantsDoNotImplySysadminQualification() throws Exception {
        tables();
        String role = "sdr" + suffix();
        execute("CREATE ROLE " + ident(role));
        try {
            try (Account reader = account()) {
                grantSchema(ident(role));
                execute("ALTER ROLE " + ident(role) + " ADD MEMBER " + reader.ident());
                try (Connection connection = reader.connect(); PreparedStatement token = connection.prepareStatement(
                        "SELECT count(*) FROM sys.user_token t JOIN sys.database_principals p"
                                + " ON p.principal_id=t.principal_id WHERE t.name=? AND p.type='R'")) {
                    token.setString(1, role);
                    try (ResultSet rows = token.executeQuery()) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.getInt(1)).isEqualTo(1);
                    }
                    assertThat(integer(connection, "SELECT IS_SRVROLEMEMBER('sysadmin')")).isEqualTo(0);
                    CatalogSnapshot snapshot = adapter.discover(connection, request());
                    assertBothTables(snapshot);
                    assertUnproven(snapshot);
                }
            }
        } finally {
            execute("DROP ROLE " + ident(role));
        }
    }

    @Test
    void dbOwnerMembershipIsNotASysadminMetadataProof() throws Exception {
        tables();
        try (Account reader = account()) {
            execute("ALTER ROLE db_owner ADD MEMBER " + reader.ident());
            try (Connection connection = reader.connect()) {
                assertThat(integer(connection, "SELECT IS_ROLEMEMBER('db_owner')")).isEqualTo(1);
                assertThat(integer(connection, "SELECT IS_SRVROLEMEMBER('sysadmin')")).isEqualTo(0);
                CatalogSnapshot snapshot = adapter.discover(connection, request());
                assertBothTables(snapshot);
                assertUnproven(snapshot);
            }
        }
    }

    @Test
    void controlServerPermissionDoesNotSubstituteForTheDenyBypassingSysadminRole() throws Exception {
        tables();
        try (Account reader = account()) {
            try (Connection master = SQLSERVER.createConnection(""); Statement statement = master.createStatement()) {
                statement.execute("GRANT CONTROL SERVER TO " + reader.ident());
            }
            try (Connection connection = reader.connect()) {
                assertThat(integer(connection, "SELECT HAS_PERMS_BY_NAME(NULL,NULL,'CONTROL SERVER')")).isEqualTo(1);
                assertThat(integer(connection, "SELECT IS_SRVROLEMEMBER('sysadmin')")).isEqualTo(0);
                CatalogSnapshot snapshot = adapter.discover(connection, request());
                assertBothTables(snapshot);
                assertUnproven(snapshot);
            }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"LOGIN", "USER"})
    void impersonatedContextsRemainUnprovenAndRevertRestoresOriginalQualification(String context) throws Exception {
        tables();
        try (Account reader = account(); Connection connection = sourceConnection()) {
            grantSchema(reader.ident());
            try (Statement statement = connection.createStatement()) {
                statement.execute("EXECUTE AS " + context + " = '" + reader.name() + "'");
            }
            try {
                assertThat(integer(connection, "SELECT CASE WHEN USER_NAME()='dbo' THEN 1 ELSE 0 END")).isEqualTo(0);
                CatalogSnapshot snapshot = adapter.discover(connection, request());
                assertBothTables(snapshot);
                assertUnproven(snapshot);
            } finally {
                try (Statement statement = connection.createStatement()) { statement.execute("REVERT"); }
            }
            assertCompleteTables(adapter.discover(connection, request()));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"master", "model", "msdb", "tempdb"})
    void systemDatabaseIsOutsideQualificationEvenForSysadmin(String database) throws Exception {
        try (Connection connection = sourceConnection()) {
            connection.setCatalog(database);
            assertThat(connection.getCatalog()).isEqualTo(database);
            assertThat(integer(connection, "SELECT IS_SRVROLEMEMBER('sysadmin')")).isEqualTo(1);
            assertUnproven(adapter.discover(connection, request()));
        }
    }

    @Test
    void broaderKindsSchemasAndCatalogRequestsCannotExpandSysadminProof() throws Exception {
        try (Connection connection = sourceConnection()) {
            for (DiscoveryRequest request : Set.of(
                    new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false),
                    new DiscoveryRequest(Set.of(), Set.of("dbo", "sys"), Set.of(ObjectKind.TABLE), false),
                    new DiscoveryRequest(Set.of(SOURCE_DATABASE), Set.of("dbo"), Set.of(ObjectKind.TABLE), false),
                    new DiscoveryRequest(Set.of(), Set.of("dbo"), Set.of(ObjectKind.TABLE), true),
                    new DiscoveryRequest(Set.of(), Set.of("dbo"), Set.of(ObjectKind.TABLE, ObjectKind.VIEW), false))) {
                assertUnproven(adapter.discover(connection, request));
            }
        }
    }

    @Test
    void differentDriverCannotReuseRealSysadminAndDatabaseEvidence() throws Exception {
        try (Connection connection = sourceConnection()) {
            DatabaseMetaData metadata = mock(DatabaseMetaData.class, delegatesTo(connection.getMetaData()));
            doReturn("jTDS").when(metadata).getDriverName();
            Connection derived = mock(Connection.class, delegatesTo(connection));
            doReturn(metadata).when(derived).getMetaData();
            assertUnproven(adapter.discover(derived, request()));
        }
    }

    @Test
    void catalogAndSchemaDefaultsMustMatchActualConnectedNamespace() throws Exception {
        try (Connection connection = sourceConnection()) {
            Connection catalogMismatch = mock(Connection.class, delegatesTo(connection));
            doReturn("another_fixture_database").when(catalogMismatch).getCatalog();
            assertUnproven(adapter.discover(catalogMismatch, request()));
            Connection schemaMismatch = mock(Connection.class, delegatesTo(connection));
            doReturn("another_fixture_schema").when(schemaMismatch).getSchema();
            assertUnproven(adapter.discover(schemaMismatch, request()));
        }
    }

    @Test
    void sysadminProofDoesNotHideSubsequentMetadataFailure() throws Exception {
        try (Connection connection = sourceConnection()) {
            DatabaseMetaData metadata = mock(DatabaseMetaData.class, delegatesTo(connection.getMetaData()));
            doThrow(new SQLException("injected sensitive metadata failure", "42000"))
                    .when(metadata).getTables(isNull(), any(), anyString(), any());
            Connection interrupted = mock(Connection.class, delegatesTo(connection));
            doReturn(metadata).when(interrupted).getMetaData();
            CatalogSnapshot snapshot = adapter.discover(interrupted, request());
            assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
            assertThat(snapshot.visibilityFindings()).noneMatch(finding -> finding.operation().equals("source-visibility-proof"));
            assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
                assertThat(finding.operation()).isEqualTo("jdbc-get-tables");
                assertThat(finding.objectKind()).isEqualTo(ObjectKind.TABLE);
                assertThat(finding.message()).doesNotContain("sensitive");
            });
        }
    }

    @Test
    void failedContextQueryStaysUnprovenWithoutLeakingSqlOrAccountDetails() throws Exception {
        try (Connection connection = sourceConnection()) {
            Connection interrupted = mock(Connection.class, delegatesTo(connection));
            doThrow(new SQLException("injected sensitive context query failure", "42000"))
                    .when(interrupted).prepareStatement(anyString());
            CatalogSnapshot snapshot = adapter.discover(interrupted, request());
            assertUnproven(snapshot);
            assertThat(snapshot.visibilityFindings()).allSatisfy(finding ->
                    assertThat(finding.message()).doesNotContain("sensitive"));
        }
    }

    private static DiscoveryRequest request() {
        return new DiscoveryRequest(Set.of(), Set.of("dbo"),
                Set.of(ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
    }

    private static void tables() throws Exception {
        execute("CREATE TABLE dbo.tb_sqlserver_vis_allowed (id BIGINT PRIMARY KEY, payload VARCHAR(32))");
        execute("CREATE TABLE dbo.tb_sqlserver_vis_hidden (id BIGINT PRIMARY KEY)");
    }

    private static void grantSchema(String grantee) throws Exception {
        execute("GRANT SELECT, VIEW DEFINITION ON SCHEMA::dbo TO " + grantee);
    }

    private static void assertCompleteTables(CatalogSnapshot snapshot) {
        assertThat(snapshot.visibilityFindings()).isEmpty();
        assertBothTables(snapshot);
        assertThat(snapshot.objects()).allMatch(object -> SOURCE_DATABASE.equals(object.catalog()) && "dbo".equals(object.schema()));
    }

    private static void assertBothTables(CatalogSnapshot snapshot) {
        assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                .extracting(CatalogObject::name).containsExactlyInAnyOrder("tb_sqlserver_vis_allowed", "tb_sqlserver_vis_hidden");
    }

    private static void assertUnproven(CatalogSnapshot snapshot) {
        assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.operation()).isEqualTo("source-visibility-proof");
            assertThat(finding.objectKind()).isEqualTo(ObjectKind.SCHEMA);
            assertThat(finding.status()).isEqualTo(VisibilityStatus.PARTIAL);
        });
    }

    private static int integer(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertThat(rows.next()).isTrue();
            return rows.getInt(1);
        }
    }

    private static void execute(String sql) throws Exception {
        try (Connection connection = sourceConnection(); Statement statement = connection.createStatement()) { statement.execute(sql); }
    }

    private static Account account() throws Exception {
        Account account = new Account("sdu" + suffix(), "SqlServer1!" + UUID.randomUUID());
        // Synthetic principals and disposable random passwords never become snapshot evidence or logs.
        execute("CREATE LOGIN " + account.ident() + " WITH PASSWORD='" + account.password() + "', CHECK_POLICY=OFF");
        execute("CREATE USER " + account.ident() + " FOR LOGIN " + account.ident() + " WITH DEFAULT_SCHEMA=dbo");
        return account;
    }

    private static String suffix() { return UUID.randomUUID().toString().replace("-", "").substring(0, 12); }

    private static String ident(String name) { return "[" + name.replace("]", "]]") + "]"; }

    private record Account(String name, String password) implements AutoCloseable {
        String ident() { return SqlServerDiscoveryVisibilityIntegrationTest.ident(name); }
        Connection connect() throws Exception { return DriverManager.getConnection(sourceConfig().url(), name, password); }
        @Override
        public void close() throws Exception {
            execute("DROP USER IF EXISTS " + ident());
            execute("DROP LOGIN " + ident());
        }
        @Override
        public String toString() { return "disposable SQL Server fixture account"; }
    }
}
