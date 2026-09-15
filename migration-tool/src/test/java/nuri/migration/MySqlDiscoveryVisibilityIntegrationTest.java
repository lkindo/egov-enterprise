package nuri.migration;

import nuri.migration.adapter.MySqlSourceAdapter;
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
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

/** Real database visibility under disposable database SELECT-only accounts, without mysql.* access. */
class MySqlDiscoveryVisibilityIntegrationTest extends MySqlPostgresTestSupport {

    private static final String CURRENT_ACCOUNT_GRANTEE =
            "GRANTEE = CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(), '@', 1)), '@', "
                    + "QUOTE(SUBSTRING_INDEX(CURRENT_USER(), '@', -1)))";

    private final MySqlSourceAdapter adapter = new MySqlSourceAdapter();

    @Test
    void databaseSelectOnlyReaderDiscoversEveryTableColumnAndPrimaryKey() throws Exception {
        Account reader = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + reader.database()
                    + ".tb_vis_owner (id BIGINT PRIMARY KEY, payload LONGTEXT, binary_payload LONGBLOB)");
            statement.execute("CREATE TABLE " + reader.database() + ".tb_vis_second (id BIGINT PRIMARY KEY)");
            statement.execute("GRANT SELECT ON " + reader.database() + ".* TO '" + reader.name() + "'@'%'");
        }
        try (Connection connection = reader.connect()) {
            assertThat(globalPrivileges(connection)).isEmpty();
            assertThat(schemaPrivileges(connection)).containsExactly("SELECT");
            CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));

            assertThat(snapshot.visibilityFindings()).isEmpty();
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactlyInAnyOrder("tb_vis_owner", "tb_vis_second");
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN).hasSize(4);
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.PRIMARY_KEY).hasSize(2);
            assertThat(snapshot.objects()).allMatch(object -> reader.database().equals(object.schema()));
            assertThatThrownBy(() -> {
                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("INSERT INTO " + reader.database() + ".tb_vis_second VALUES (1)");
                }
            }).isInstanceOf(SQLException.class);
        }
    }

    @Test
    void existingEmptyDatabaseIsDistinguishedFromUnprovenMissingDatabase() throws Exception {
        Account reader = account();
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            CatalogSnapshot empty = adapter.discover(connection, request(reader.database()));
            assertThat(empty.objects()).isEmpty();
            assertThat(empty.visibilityFindings()).isEmpty();

            CatalogSnapshot missing = adapter.discover(connection, request("mvabsent" + suffix()));
            assertThat(missing.objects()).isEmpty();
            assertUnproven(missing);
        }
    }

    @Test
    void literalUnderscoreDatabaseGrantProvesTheRealDatabaseName() throws Exception {
        Account reader = account("mv_" + suffix());
        String escapedGrantSchema = reader.database().replace("_", "\\_");
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + reader.database() + ".tb_vis_literal (id BIGINT PRIMARY KEY)");
            statement.execute("GRANT SELECT ON `" + escapedGrantSchema + "`.* TO '" + reader.name() + "'@'%'");
        }
        try (Connection connection = reader.connect()) {
            assertThat(databaseSelectGrantScopes(connection)).containsExactly(escapedGrantSchema);
            CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));

            assertThat(snapshot.visibilityFindings()).isEmpty();
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactly("tb_vis_literal");
            assertThat(snapshot.objects()).allMatch(object -> reader.database().equals(object.schema()));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"_", "%"})
    void wildcardDatabaseGrantStillCannotBecomeAnExactSchemaProof(String wildcard) throws Exception {
        Account reader = account("mv_" + suffix());
        String grantPattern = wildcard.equals("_") ? reader.database() : "mv%";
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + reader.database() + ".tb_vis_wildcard (id BIGINT PRIMARY KEY)");
            statement.execute("GRANT SELECT ON `" + grantPattern + "`.* TO '" + reader.name() + "'@'%'");
        }
        try (Connection connection = reader.connect()) {
            assertThat(databaseSelectGrantScopes(connection)).containsExactly(grantPattern);
            CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));

            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactly("tb_vis_wildcard");
            assertUnproven(snapshot);
        }
    }

    @Test
    void globalSelectGrantDoesNotQualifyTheNarrowDatabaseGrantRoute() throws Exception {
        Account reader = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("GRANT SELECT ON *.* TO '" + reader.name() + "'@'%'");
        }
        try (Connection connection = reader.connect()) {
            assertThat(globalPrivileges(connection)).containsExactly("SELECT");
            assertUnproven(adapter.discover(connection, request(reader.database())));
        }
    }

    @Test
    void enabledRoleSelectGrantDoesNotImpersonateADirectAccountGrant() throws Exception {
        Account reader = account();
        String role = "mvr" + suffix();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + reader.database() + ".tb_vis_role (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE ROLE '" + role + "'@'%'");
            statement.execute("GRANT SELECT ON " + reader.database() + ".* TO '" + role + "'@'%'");
            statement.execute("GRANT '" + role + "'@'%' TO '" + reader.name() + "'@'%'");
            statement.execute("SET DEFAULT ROLE ALL TO '" + reader.name() + "'@'%'");
        }
        try (Connection connection = reader.connect()) {
            CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));

            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactly("tb_vis_role");
            assertUnproven(snapshot);
        }
    }

    @Test
    void enabledPartialRevokesModeStaysUnprovenEvenWhenTheReaderCanSelectItsTable() throws Exception {
        Account reader = account();
        grantDatabaseSelect(reader);
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + reader.database() + ".tb_vis_mode (id BIGINT PRIMARY KEY)");
            statement.execute("INSERT INTO " + reader.database() + ".tb_vis_mode VALUES (1)");
        }
        // Toggle only this class's disposable server and restore its original mode before another test.
        try {
            try (Connection admin = admin(); Statement statement = admin.createStatement()) {
                statement.execute("SET GLOBAL partial_revokes = ON");
            }
            try (Connection connection = reader.connect(); Statement statement = connection.createStatement();
                 ResultSet rows = statement.executeQuery("SELECT count(*) FROM " + reader.database() + ".tb_vis_mode")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getLong(1)).isEqualTo(1);
                assertUnproven(adapter.discover(connection, request(reader.database())));
            }
        } finally {
            try (Connection admin = admin(); Statement statement = admin.createStatement()) {
                statement.execute("SET GLOBAL partial_revokes = OFF");
            }
        }
    }

    @Test
    void oneGrantedTableCannotProveVisibilityOfTheHiddenTable() throws Exception {
        Account reader = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + reader.database() + ".tb_vis_allowed (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE " + reader.database() + ".tb_vis_hidden (id BIGINT PRIMARY KEY)");
            statement.execute("GRANT SELECT ON " + reader.database() + ".tb_vis_allowed TO '"
                    + reader.name() + "'@'%'");
        }
        try (Connection connection = reader.connect()) {
            CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));

            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactly("tb_vis_allowed");
            assertUnproven(snapshot);
        }
    }

    @Test
    void columnGrantCannotProveCompleteColumnInventory() throws Exception {
        Account reader = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + reader.database()
                    + ".tb_vis_columns (id BIGINT PRIMARY KEY, hidden_payload VARCHAR(32))");
            statement.execute("GRANT SELECT (id) ON " + reader.database() + ".tb_vis_columns TO '"
                    + reader.name() + "'@'%'");
        }
        try (Connection connection = reader.connect()) {
            CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));

            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactly("tb_vis_columns");
            assertUnproven(snapshot);
        }
    }

    @Test
    void connectorDefaultCatalogModeRemainsBlockedDespiteDatabaseSelectGrant() throws Exception {
        Account reader = account();
        grantDatabaseSelect(reader);
        try (Connection connection = DriverManager.getConnection(
                jdbcUrl(reader.database(), "CATALOG"), reader.name(), reader.password())) {
            assertThat(connection.getSchema()).isNull();
            assertThat(connection.getCatalog()).isEqualTo(reader.database());
            assertUnproven(adapter.discover(connection, request(reader.database())));
        }
    }

    @Test
    void broaderAndUnqualifiedRequestsCannotExpandTheProof() throws Exception {
        Account reader = account();
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            for (DiscoveryRequest request : Set.of(
                    new DiscoveryRequest(Set.of(), Set.of(), Set.of(ObjectKind.TABLE), false),
                    new DiscoveryRequest(Set.of(), Set.of(reader.database(), "another"), Set.of(ObjectKind.TABLE), false),
                    new DiscoveryRequest(Set.of("def"), Set.of(reader.database()), Set.of(ObjectKind.TABLE), false),
                    new DiscoveryRequest(Set.of(), Set.of(reader.database()), Set.of(ObjectKind.TABLE), true),
                    new DiscoveryRequest(Set.of(), Set.of(reader.database()), Set.of(ObjectKind.TABLE, ObjectKind.VIEW), false))) {
                assertUnproven(adapter.discover(connection, request));
            }
        }
    }

    @Test
    void provenReaderDoesNotHideSubsequentJdbcMetadataFailure() throws Exception {
        Account reader = account();
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            DatabaseMetaData metadata = mock(DatabaseMetaData.class, delegatesTo(connection.getMetaData()));
            doThrow(new SQLException("injected metadata read failure", "42000"))
                    .when(metadata).getTables(isNull(), any(), anyString(), any());
            Connection interrupted = mock(Connection.class, delegatesTo(connection));
            doReturn(metadata).when(interrupted).getMetaData();

            CatalogSnapshot snapshot = adapter.discover(interrupted, request(reader.database()));

            assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
            assertThat(snapshot.visibilityFindings())
                    .noneMatch(finding -> finding.operation().equals("source-visibility-proof"));
            assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
                assertThat(finding.operation()).isEqualTo("jdbc-get-tables");
                assertThat(finding.objectKind()).isEqualTo(ObjectKind.TABLE);
            });
        }
    }

    @Test
    void failedPrivilegeReadCannotBecomeSuccessfulEmptyInventory() throws Exception {
        Account reader = account();
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            Connection interrupted = mock(Connection.class, delegatesTo(connection));
            doThrow(new SQLException("injected sensitive catalog failure", "42000"))
                    .when(interrupted).prepareStatement(anyString());

            CatalogSnapshot snapshot = adapter.discover(interrupted, request(reader.database()));

            assertUnproven(snapshot);
            assertThat(snapshot.visibilityFindings()).allSatisfy(finding ->
                    assertThat(finding.message()).doesNotContain("sensitive"));
        }
    }

    private static void assertUnproven(CatalogSnapshot snapshot) {
        assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
        assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
            assertThat(finding.status()).isEqualTo(VisibilityStatus.PARTIAL);
            assertThat(finding.objectKind()).isEqualTo(ObjectKind.SCHEMA);
            assertThat(finding.operation()).isEqualTo("source-visibility-proof");
        });
    }

    private static List<String> globalPrivileges(Connection connection) throws Exception {
        return privileges(connection, "INFORMATION_SCHEMA.USER_PRIVILEGES", "PRIVILEGE_TYPE <> 'USAGE'");
    }

    private static List<String> schemaPrivileges(Connection connection) throws Exception {
        return privileges(connection, "INFORMATION_SCHEMA.SCHEMA_PRIVILEGES", "TABLE_SCHEMA = DATABASE()");
    }

    private static List<String> databaseSelectGrantScopes(Connection connection) throws Exception {
        List<String> scopes = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("SELECT TABLE_SCHEMA FROM INFORMATION_SCHEMA.SCHEMA_PRIVILEGES"
                     + " WHERE PRIVILEGE_TYPE='SELECT' AND " + CURRENT_ACCOUNT_GRANTEE + " ORDER BY TABLE_SCHEMA")) {
            while (rows.next()) {
                scopes.add(rows.getString(1));
            }
        }
        return scopes;
    }

    private static List<String> privileges(Connection connection, String table, String predicate) throws Exception {
        List<String> privileges = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("SELECT PRIVILEGE_TYPE FROM " + table + " WHERE (" + predicate
                     + ") AND " + CURRENT_ACCOUNT_GRANTEE + " ORDER BY PRIVILEGE_TYPE")) {
            while (rows.next()) {
                privileges.add(rows.getString(1));
            }
        }
        return privileges;
    }

    private static DiscoveryRequest request(String schema) {
        return new DiscoveryRequest(Set.of(), Set.of(schema),
                Set.of(ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
    }

    private static Connection admin() throws Exception {
        return DriverManager.getConnection(MYSQL.getJdbcUrl(), "root", MYSQL.getPassword());
    }

    private static Account account() throws Exception {
        return account("mv" + suffix());
    }

    private static Account account(String database) throws Exception {
        String suffix = suffix();
        Account account = new Account("mvu" + suffix, database, UUID.randomUUID().toString());
        // Names are synthetic ASCII; all DDL and privilege variants initialize disposable fixtures only.
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE DATABASE " + account.database() + " CHARACTER SET utf8mb4");
            statement.execute("CREATE USER '" + account.name() + "'@'%' IDENTIFIED BY '" + account.password() + "'");
        }
        return account;
    }

    private static void grantDatabaseSelect(Account reader) throws Exception {
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("GRANT SELECT ON " + reader.database() + ".* TO '" + reader.name() + "'@'%'");
        }
    }

    private static String jdbcUrl(String database, String databaseTerm) {
        String original = MYSQL.getJdbcUrl();
        int queryStart = original.indexOf('?');
        String parameters = queryStart < 0 ? "" : original.substring(queryStart + 1);
        String base = queryStart < 0 ? original : original.substring(0, queryStart);
        base = base.substring(0, base.lastIndexOf('/') + 1);
        parameters = Arrays.stream(parameters.split("&")).filter(parameter -> !parameter.isBlank()
                        && !parameter.startsWith("databaseTerm="))
                .collect(Collectors.joining("&"));
        return base + database + "?" + (parameters.isEmpty() ? "" : parameters + "&")
                + "databaseTerm=" + databaseTerm;
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private record Account(String name, String database, String password) {
        Connection connect() throws Exception {
            return DriverManager.getConnection(jdbcUrl(database, "SCHEMA"), name, password);
        }

        @Override
        public String toString() {
            return "disposable MySQL fixture account";
        }
    }
}
