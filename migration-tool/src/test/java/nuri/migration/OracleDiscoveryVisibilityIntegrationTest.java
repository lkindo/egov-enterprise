package nuri.migration;

import nuri.migration.adapter.OracleSourceAdapter;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.VisibilityStatus;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

/** Real dictionary visibility under disposable CREATE SESSION-only accounts, with no DBA catalog grants. */
class OracleDiscoveryVisibilityIntegrationTest extends OraclePostgresTestSupport {

    private final OracleSourceAdapter adapter = new OracleSourceAdapter();

    @Test
    void localOwnerWithOnlyCreateSessionCanDiscoverTableColumnsAndPrimaryKey() throws Exception {
        Account owner = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + owner.name()
                    + ".TB_VIS_OWNER (ID NUMBER(10) PRIMARY KEY, PAYLOAD CLOB, BINARY_PAYLOAD BLOB)");
        }
        try (Connection connection = owner.connect()) {
            assertThat(sessionPrivileges(connection)).containsExactly("CREATE SESSION");
            CatalogSnapshot snapshot = adapter.discover(connection, request(owner.name()));

            assertThat(snapshot.hasBlockingVisibilityFindings()).isFalse();
            assertThat(snapshot.visibilityFindings()).isEmpty();
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactly("TB_VIS_OWNER");
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.COLUMN)
                    .extracting(object -> object.attributes().get("jdbcType"))
                    .containsExactlyInAnyOrder(Integer.toString(Types.NUMERIC),
                            Integer.toString(Types.CLOB), Integer.toString(Types.BLOB));
            assertThat(snapshot.objects()).filteredOn(object -> object.kind() == ObjectKind.PRIMARY_KEY)
                    .hasSize(1);
        }
    }

    @Test
    void existingEmptyOwnerIsDistinguishedFromMissingSchema() throws Exception {
        Account owner = account();
        try (Connection connection = owner.connect()) {
            CatalogSnapshot empty = adapter.discover(connection, request(owner.name()));
            assertThat(empty.objects()).isEmpty();
            assertThat(empty.visibilityFindings()).isEmpty();

            CatalogSnapshot missing = adapter.discover(connection, request("MV_ABSENT_" + suffix()));
            assertThat(missing.objects()).isEmpty();
            assertUnproven(missing);
        }
    }

    @Test
    void oneGrantedTableDoesNotProveVisibilityOfTheOwnersHiddenTable() throws Exception {
        Account owner = account();
        Account reader = account();
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE TABLE " + owner.name() + ".TB_VIS_ALLOWED (ID NUMBER(10) PRIMARY KEY)");
            statement.execute("CREATE TABLE " + owner.name() + ".TB_VIS_HIDDEN (ID NUMBER(10) PRIMARY KEY)");
            statement.execute("GRANT SELECT ON " + owner.name() + ".TB_VIS_ALLOWED TO " + reader.name());
        }
        try (Connection connection = reader.connect()) {
            assertThat(sessionPrivileges(connection)).containsExactly("CREATE SESSION");
            CatalogSnapshot granted = adapter.discover(connection, request(owner.name()));

            assertThat(granted.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactly("TB_VIS_ALLOWED");
            assertUnproven(granted);
        }
        try (Connection connection = owner.connect()) {
            CatalogSnapshot complete = adapter.discover(connection, request(owner.name()));
            assertThat(complete.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name).containsExactlyInAnyOrder("TB_VIS_ALLOWED", "TB_VIS_HIDDEN");
            assertThat(complete.visibilityFindings()).isEmpty();
        }
    }

    @Test
    void changingCurrentSchemaDoesNotImpersonateItsOwnerForVisibility() throws Exception {
        Account owner = account();
        Account reader = account();
        try (Connection connection = reader.connect(); Statement statement = connection.createStatement()) {
            statement.execute("ALTER SESSION SET CURRENT_SCHEMA = " + owner.name());

            assertUnproven(adapter.discover(connection, request(owner.name())));
        }
    }

    @Test
    void unsupportedObjectKindStillBlocksEvenWhenTheRequestedSchemaIsOwned() throws Exception {
        Account owner = account();
        try (Connection connection = owner.connect()) {
            CatalogSnapshot snapshot = adapter.discover(connection, new DiscoveryRequest(Set.of(),
                    Set.of(owner.name()), Set.of(ObjectKind.TABLE, ObjectKind.FOREIGN_SERVER), false));

            assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
            assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
                assertThat(finding.objectKind()).isEqualTo(ObjectKind.FOREIGN_SERVER);
                assertThat(finding.status()).isEqualTo(VisibilityStatus.UNSUPPORTED);
            });
        }
    }

    @Test
    void provenOwnerDoesNotHideASubsequentJdbcMetadataFailure() throws Exception {
        Account owner = account();
        try (Connection connection = owner.connect()) {
            DatabaseMetaData metadata = mock(DatabaseMetaData.class, delegatesTo(connection.getMetaData()));
            doThrow(new SQLException("injected metadata read failure", "42000"))
                    .when(metadata).getTables(isNull(), any(), anyString(), any());
            Connection interrupted = mock(Connection.class, delegatesTo(connection));
            doReturn(metadata).when(interrupted).getMetaData();

            CatalogSnapshot snapshot = adapter.discover(interrupted, request(owner.name()));

            assertThat(snapshot.hasBlockingVisibilityFindings()).isTrue();
            assertThat(snapshot.visibilityFindings())
                    .noneMatch(finding -> finding.operation().equals("source-visibility-proof"));
            assertThat(snapshot.visibilityFindings()).anySatisfy(finding -> {
                assertThat(finding.operation()).isEqualTo("jdbc-get-tables");
                assertThat(finding.objectKind()).isEqualTo(ObjectKind.TABLE);
            });
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

    private static List<String> sessionPrivileges(Connection connection) throws Exception {
        List<String> privileges = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("SELECT PRIVILEGE FROM SYS.SESSION_PRIVS ORDER BY PRIVILEGE")) {
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
        return DriverManager.getConnection(ORACLE.getJdbcUrl(), "system", ORACLE.getPassword());
    }

    private static Account account() throws Exception {
        // Oracle 19c limits password identifiers to 30 bytes; retain a random ASCII fixture password.
        Account account = new Account("MV_" + suffix(), "R" + UUID.randomUUID().toString().replace("-", "").substring(0, 29));
        // DDL and grants only initialize these newly created, disposable fixture accounts.
        try (Connection admin = admin(); Statement statement = admin.createStatement()) {
            statement.execute("CREATE USER " + account.name() + " IDENTIFIED BY \"" + account.password()
                    + "\" QUOTA 2M ON USERS");
            statement.execute("GRANT CREATE SESSION TO " + account.name());
        }
        return account;
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(java.util.Locale.ROOT);
    }

    private record Account(String name, String password) {
        Connection connect() throws Exception {
            return DriverManager.getConnection(ORACLE.getJdbcUrl(), name, password);
        }

        @Override
        public String toString() {
            return "disposable Oracle fixture account";
        }
    }
}
