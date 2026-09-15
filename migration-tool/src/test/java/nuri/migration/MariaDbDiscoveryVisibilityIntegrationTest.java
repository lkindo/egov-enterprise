package nuri.migration;

import nuri.migration.adapter.MariaDbSourceAdapter;
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
import java.sql.Types;
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

/** Real direct database SELECT visibility on disposable MariaDB SCHEMA-mode connections. */
class MariaDbDiscoveryVisibilityIntegrationTest extends MariaDbPostgresTestSupport {

    private static final String CURRENT_ACCOUNT_GRANTEE =
            "GRANTEE = CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(), '@', 1)), '@', "
                    + "QUOTE(SUBSTRING_INDEX(CURRENT_USER(), '@', -1)))";

    private final MariaDbSourceAdapter adapter = new MariaDbSourceAdapter();

    @Test
    void databaseSelectOnlyReaderDiscoversEveryTableColumnAndPrimaryKey() throws Exception {
        Account reader = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_owner (id BIGINT PRIMARY KEY, payload LONGTEXT, binary_payload LONGBLOB) ENGINE=InnoDB");
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_second (id BIGINT PRIMARY KEY) ENGINE=InnoDB");
        }
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            assertThat(connection.getCatalog()).isEqualTo("def");
            assertThat(connection.getSchema()).isEqualTo(reader.database());
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("MariaDB");
            assertThat(connection.getMetaData().getDriverName()).isEqualTo("MariaDB Connector/J");
            assertThat(currentRole(connection)).isNull();
            assertThat(globalPrivileges(connection)).isEmpty();
            assertThat(schemaPrivileges(connection)).containsExactly("SELECT");
            CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));

            assertThat(snapshot.visibilityFindings()).isEmpty();
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactlyInAnyOrder("tb_vis_owner", "tb_vis_second");
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN).hasSize(4);
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.PRIMARY_KEY).hasSize(2);
            assertThat(snapshot.objects()).allMatch(object -> "def".equals(object.catalog())
                    && reader.database().equals(object.schema()));
            assertThatThrownBy(() -> {
                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("INSERT INTO " + databaseIdent(reader.database())
                            + ".tb_vis_second VALUES (1)");
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
            assertThat(empty.objects()).filteredOn(object -> object.kind() == ObjectKind.SCHEMA)
                    .extracting(CatalogObject::name).containsExactly(reader.database());
            assertThat(empty.objects()).noneMatch(object -> object.kind() != ObjectKind.SCHEMA);
            assertThat(empty.visibilityFindings()).isEmpty();

            CatalogSnapshot missing = adapter.discover(connection, request("mdabsent" + suffix()));
            assertThat(missing.objects()).isEmpty();
            assertUnproven(missing);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"_", "%"})
    void literalDatabaseGrantUsesTheActualDatabaseAndEscapedGrantCatalogSpelling(String literal) throws Exception {
        Account reader = account("md" + literal + suffix());
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_literal (id BIGINT PRIMARY KEY) ENGINE=InnoDB");
        }
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            String grantScope = literalGrantScope(reader.database());
            assertThat(databaseSelectGrantScopes(connection)).containsExactly(grantScope);
            CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));

            assertThat(snapshot.visibilityFindings()).isEmpty();
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactly("tb_vis_literal");
            assertThat(snapshot.objects()).allMatch(object -> "def".equals(object.catalog())
                    && reader.database().equals(object.schema()));
        }
    }

    @Test
    void literalUnderscoreSchemaDoesNotImportColumnsFromAnotherReadableMatchingDatabase() throws Exception {
        String suffix = suffix();
        Account reader = account("md_" + suffix);
        String neighbor = "mdX" + suffix;
        String table = "tb_vis_namespace";
        try {
            try (Connection admin = admin(); Statement statement = admin.createStatement()) {
                statement.execute("CREATE DATABASE " + databaseIdent(neighbor) + " CHARACTER SET utf8mb4");
                statement.execute("CREATE TABLE " + databaseIdent(reader.database()) + "." + table
                        + " (id BIGINT PRIMARY KEY, payload VARCHAR(32) NOT NULL) ENGINE=InnoDB");
                statement.execute("CREATE TABLE " + databaseIdent(neighbor) + "." + table
                        + " (id INT PRIMARY KEY, payload BIGINT NULL, neighbor_only VARCHAR(64)) ENGINE=InnoDB");
                statement.execute("GRANT SELECT ON " + databaseIdent(literalGrantScope(neighbor))
                        + ".* TO " + reader.grantee());
            }
            grantDatabaseSelect(reader);
            try (Connection connection = reader.connect()) {
                assertThat(connection.getCatalog()).isEqualTo("def");
                assertThat(connection.getSchema()).isEqualTo(reader.database());
                assertThat(currentRole(connection)).isNull();
                assertThat(globalPrivileges(connection)).isEmpty();
                assertThat(databaseSelectGrantScopes(connection)).containsExactlyInAnyOrder(
                        literalGrantScope(reader.database()), literalGrantScope(neighbor));

                // JDBC schema arguments are patterns: the unescaped underscore really sees both databases.
                // Capture returned identities before discovery can accidentally relabel neighboring columns.
                List<String> returnedSchemas = new ArrayList<>();
                List<String> payloadMetadata = new ArrayList<>();
                List<String> neighborColumns = new ArrayList<>();
                try (ResultSet rows = connection.getMetaData().getColumns("def", reader.database(), table, "%")) {
                    while (rows.next()) {
                        assertThat(rows.getString("TABLE_CAT")).isEqualTo("def");
                        String schema = rows.getString("TABLE_SCHEM");
                        assertThat(rows.getString("TABLE_NAME")).isEqualTo(table);
                        String column = rows.getString("COLUMN_NAME");
                        int type = rows.getInt("DATA_TYPE");
                        int nullable = rows.getInt("NULLABLE");
                        returnedSchemas.add(schema);
                        if ("payload".equals(column)) {
                            payloadMetadata.add(schema + ":" + type + ":" + nullable);
                        }
                        if (neighbor.equals(schema)) {
                            neighborColumns.add(column);
                        }
                    }
                }
                assertThat(returnedSchemas).containsOnly(reader.database(), neighbor).contains(reader.database(), neighbor);
                assertThat(payloadMetadata).containsExactlyInAnyOrder(
                        reader.database() + ":" + Types.VARCHAR + ":" + DatabaseMetaData.columnNoNulls,
                        neighbor + ":" + Types.BIGINT + ":" + DatabaseMetaData.columnNullable);
                assertThat(neighborColumns).containsExactlyInAnyOrder("id", "payload", "neighbor_only");

                CatalogSnapshot snapshot = adapter.discover(connection, request(reader.database()));
                assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN)
                        .extracting(CatalogObject::name).containsExactlyInAnyOrder(table + ".id", table + ".payload");
                assertThat(snapshot.visibilityFindings()).isEmpty();
                assertThat(snapshot.objects()).allMatch(object -> "def".equals(object.catalog())
                        && reader.database().equals(object.schema()));
                assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                        .extracting(CatalogObject::name).containsExactly(table);
                assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN
                                && (table + ".payload").equals(object.name()))
                        .singleElement().satisfies(column -> assertThat(column.attributes())
                                .containsEntry("jdbcType", Integer.toString(Types.VARCHAR))
                                .containsEntry("nativeType", "VARCHAR")
                                .containsEntry("size", "32")
                                .containsEntry("nullable", "false"));
                assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN
                                && (table + ".id").equals(object.name()))
                        .singleElement().satisfies(column -> assertThat(column.attributes())
                                .containsEntry("jdbcType", Integer.toString(Types.BIGINT))
                                .containsEntry("nullable", "false"));
            }
        } finally {
            try (Connection admin = admin(); Statement statement = admin.createStatement()) {
                statement.execute("DROP USER IF EXISTS " + reader.grantee());
                statement.execute("DROP DATABASE IF EXISTS " + databaseIdent(neighbor));
                statement.execute("DROP DATABASE IF EXISTS " + databaseIdent(reader.database()));
            }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"_", "%"})
    void wildcardDatabaseGrantStillCannotBecomeAnExactSchemaProof(String wildcard) throws Exception {
        Account reader = account("md_" + suffix());
        String grantPattern = wildcard.equals("_") ? reader.database() : "md%";
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_wildcard (id BIGINT PRIMARY KEY) ENGINE=InnoDB");
            statement.execute("GRANT SELECT ON " + databaseIdent(grantPattern) + ".* TO " + reader.grantee());
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
            statement.execute("GRANT SELECT ON *.* TO " + reader.grantee());
        }
        try (Connection connection = reader.connect()) {
            assertThat(globalPrivileges(connection)).containsExactly("SELECT");
            assertThat(databaseSelectGrantScopes(connection)).isEmpty();
            assertUnproven(adapter.discover(connection, request(reader.database())));
        }
    }

    @Test
    void defaultRoleSelectGrantDoesNotImpersonateADirectAccountGrant() throws Exception {
        Account reader = account();
        String role = roleSelect(reader);
        try (Connection connection = reader.connect()) {
            assertThat(currentRole(connection)).isEqualTo(role);
            assertReadableTable(connection, reader, "tb_vis_role");
            assertUnproven(adapter.discover(connection, request(reader.database())));
        }
    }

    @Test
    void activeRoleStaysOutsideQualificationEvenWhenADirectSelectGrantAlsoExists() throws Exception {
        Account reader = account();
        String role = roleSelect(reader);
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            assertThat(currentRole(connection)).isEqualTo(role);
            assertThat(databaseSelectGrantScopes(connection)).containsExactly(reader.database());
            assertReadableTable(connection, reader, "tb_vis_role");
            assertUnproven(adapter.discover(connection, request(reader.database())));
        }
    }

    @Test
    void publicRoleGrantDoesNotBecomeAnAuthenticatedAccountGrant() throws Exception {
        Account reader = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_public (id BIGINT PRIMARY KEY) ENGINE=InnoDB");
            statement.execute("INSERT INTO " + databaseIdent(reader.database()) + ".tb_vis_public VALUES (1)");
            statement.execute("GRANT SELECT ON " + databaseIdent(reader.database()) + ".* TO PUBLIC");
        }
        try {
            try (Connection connection = reader.connect()) {
                assertThat(currentRole(connection)).isNull();
                assertReadableTable(connection, reader, "tb_vis_public");
                assertUnproven(adapter.discover(connection, request(reader.database())));
            }
        } finally {
            // Restore only this synthetic database grant on this disposable server.
            try (Connection admin = admin(); Statement statement = admin.createStatement()) {
                statement.execute("REVOKE SELECT ON " + databaseIdent(reader.database()) + ".* FROM PUBLIC");
            }
        }
    }

    @Test
    void oneGrantedTableCannotProveVisibilityOfTheHiddenTable() throws Exception {
        Account reader = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_allowed (id BIGINT PRIMARY KEY) ENGINE=InnoDB");
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_hidden (id BIGINT PRIMARY KEY) ENGINE=InnoDB");
            statement.execute("GRANT SELECT ON " + databaseIdent(reader.database()) + ".tb_vis_allowed TO "
                    + reader.grantee());
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
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_columns (id BIGINT PRIMARY KEY, hidden_payload VARCHAR(32)) ENGINE=InnoDB");
            statement.execute("GRANT SELECT (id) ON " + databaseIdent(reader.database()) + ".tb_vis_columns TO "
                    + reader.grantee());
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
        try (Connection connection = reader.connect(null)) {
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
    void anotherDriverCannotReuseOtherwiseValidMariaDbSchemaMetadataAndDirectGrant() throws Exception {
        Account reader = account();
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            DatabaseMetaData metadata = mock(DatabaseMetaData.class, delegatesTo(connection.getMetaData()));
            doReturn("MySQL Connector/J").when(metadata).getDriverName();
            Connection derived = mock(Connection.class, delegatesTo(connection));
            doReturn(metadata).when(derived).getMetaData();

            assertUnproven(adapter.discover(derived, request(reader.database())));
        }
    }

    @Test
    void provenReaderDoesNotHideSubsequentJdbcMetadataFailure() throws Exception {
        Account reader = account();
        grantDatabaseSelect(reader);
        try (Connection connection = reader.connect()) {
            DatabaseMetaData metadata = mock(DatabaseMetaData.class, delegatesTo(connection.getMetaData()));
            doThrow(new SQLException("injected sensitive metadata failure", "42000"))
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
                assertThat(finding.message()).doesNotContain("sensitive");
            });
        }
    }

    @Test
    void failedPrivilegeReadCannotBecomeSuccessfulEmptyInventoryOrExposeVendorDetails() throws Exception {
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

    private static String roleSelect(Account reader) throws Exception {
        String role = "mdr" + suffix();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + databaseIdent(reader.database())
                    + ".tb_vis_role (id BIGINT PRIMARY KEY) ENGINE=InnoDB");
            statement.execute("INSERT INTO " + databaseIdent(reader.database()) + ".tb_vis_role VALUES (1)");
            statement.execute("CREATE ROLE " + role);
            statement.execute("GRANT SELECT ON " + databaseIdent(reader.database()) + ".* TO " + role);
            statement.execute("GRANT " + role + " TO " + reader.grantee());
            statement.execute("SET DEFAULT ROLE " + role + " FOR " + reader.grantee());
        }
        return role;
    }

    private static String currentRole(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("SELECT CURRENT_ROLE()")) {
            assertThat(rows.next()).isTrue();
            return rows.getString(1);
        }
    }

    private static void assertReadableTable(Connection connection, Account reader, String table) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT count(*) FROM " + databaseIdent(reader.database()) + "." + table)) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getLong(1)).isEqualTo(1);
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
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT TABLE_SCHEMA FROM INFORMATION_SCHEMA.SCHEMA_PRIVILEGES WHERE PRIVILEGE_TYPE='SELECT' AND "
                        + CURRENT_ACCOUNT_GRANTEE + " ORDER BY TABLE_SCHEMA")) {
            while (rows.next()) {
                scopes.add(rows.getString(1));
            }
        }
        return scopes;
    }

    private static List<String> privileges(Connection connection, String table, String predicate) throws Exception {
        List<String> privileges = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT PRIVILEGE_TYPE FROM " + table + " WHERE (" + predicate + ") AND " + CURRENT_ACCOUNT_GRANTEE
                        + " ORDER BY PRIVILEGE_TYPE")) {
            while (rows.next()) {
                privileges.add(rows.getString(1));
            }
        }
        return privileges;
    }

    private static DiscoveryRequest request(String schema) {
        return new DiscoveryRequest(Set.of(), Set.of(schema),
                Set.of(ObjectKind.SCHEMA, ObjectKind.TABLE, ObjectKind.COLUMN, ObjectKind.PRIMARY_KEY), false);
    }

    private static Connection admin() throws Exception {
        return DriverManager.getConnection(MARIADB.getJdbcUrl(), "root", MARIADB.getPassword());
    }

    private static Account account() throws Exception {
        return account("md" + suffix());
    }

    private static Account account(String database) throws Exception {
        Account account = new Account("mdu" + suffix(), database, UUID.randomUUID().toString());
        // Only synthetic names and random disposable credentials initialize these local fixtures.
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE DATABASE " + databaseIdent(account.database()) + " CHARACTER SET utf8mb4");
            statement.execute("CREATE USER " + account.grantee() + " IDENTIFIED BY '" + account.password() + "'");
        }
        return account;
    }

    private static void grantDatabaseSelect(Account reader) throws Exception {
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("GRANT SELECT ON " + databaseIdent(literalGrantScope(reader.database()))
                    + ".* TO " + reader.grantee());
        }
    }

    private static String literalGrantScope(String database) {
        return database.replace("\\", "\\\\").replace("_", "\\_").replace("%", "\\%");
    }

    private static String databaseIdent(String database) {
        return "`" + database.replace("`", "``") + "`";
    }

    private static String jdbcUrl(String catalogTerm) {
        String original = MARIADB.getJdbcUrl();
        int queryStart = original.indexOf('?');
        String parameters = queryStart < 0 ? "" : original.substring(queryStart + 1);
        String base = queryStart < 0 ? original : original.substring(0, queryStart);
        base = base.substring(0, base.lastIndexOf('/') + 1);
        parameters = Arrays.stream(parameters.split("&")).filter(parameter -> !parameter.isBlank()
                        && !parameter.startsWith("useCatalogTerm=") && !parameter.startsWith("databaseTerm="))
                .collect(Collectors.joining("&"));
        if (catalogTerm != null) {
            parameters += (parameters.isEmpty() ? "" : "&") + "useCatalogTerm=" + catalogTerm;
        }
        return base + (parameters.isEmpty() ? "" : "?" + parameters);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private record Account(String name, String database, String password) {
        String grantee() { return "'" + name + "'@'%'"; }

        Connection connect() throws Exception { return connect("SCHEMA"); }

        Connection connect(String catalogTerm) throws Exception {
            Connection connection = DriverManager.getConnection(jdbcUrl(catalogTerm), name, password);
            try {
                if ("SCHEMA".equals(catalogTerm)) {
                    connection.setSchema(database);
                } else {
                    connection.setCatalog(database);
                }
                return connection;
            } catch (SQLException failure) {
                connection.close();
                throw failure;
            }
        }

        @Override
        public String toString() { return "disposable MariaDB fixture account"; }
    }
}
