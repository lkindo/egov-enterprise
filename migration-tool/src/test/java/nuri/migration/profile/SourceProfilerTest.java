package nuri.migration.profile;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.TableProfile;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class SourceProfilerTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    private final SourceProfiler profiler = new SourceProfiler();

    @Test
    void profilesInventoryTablesComparesCommentsAndRedactsWithoutWritingToTheSource() throws Exception {
        try (Connection connection = h2()) {
            seed(connection, 12);
            List<CatalogObject> objects = new ArrayList<>(table("LEGACY_USER", false));
            objects.addAll(columns("LEGACY_USER", "USER_ID", "STAT_CD", "HP_NO", "REG_YMD"));
            objects.add(comment("LEGACY_USER.STAT_CD", "상태코드"));
            objects.add(comment("LEGACY_USER.HP_NO", "예전 코멘트"));
            connection.setReadOnly(true);

            SourceProfile profile = profiler.profile(connection, snapshot(objects), null);

            assertThat(connection.getAutoCommit()).isTrue();
            assertThat(profile.complete()).isTrue();
            TableProfile table = profile.tables().getFirst();
            assertThat(table.status()).isEqualTo("PROFILED");
            assertThat(table.rowsScanned()).isEqualTo(12);
            assertThat(table.truncated()).isFalse();
            assertThat(table.comment().text()).isNull();
            assertThat(table.comment().withheld()).isEqualTo("CREDENTIAL_LIKE");
            assertThat(table.columns()).extracting(ColumnProfile::name)
                    .containsExactly("USER_ID", "STAT_CD", "HP_NO", "REG_YMD");

            ColumnProfile status = column(table, "STAT_CD");
            assertThat(status.comment().text()).isEqualTo("상태코드");
            assertThat(status.comment().inventoryMatch()).isEqualTo("MATCH");
            assertThat(status.valueFrequencies()).isNotEmpty();

            ColumnProfile phone = column(table, "HP_NO");
            assertThat(phone.comment().inventoryMatch()).isEqualTo("MISMATCH");
            assertThat(phone.comment().redacted()).isTrue();
            assertThat(phone.comment().text()).isEqualTo("연락처 예: [REDACTED:PHONE]");
            assertThat(phone.frequencyOmittedReason()).isEqualTo("PERSONAL_PATTERN");

            assertThat(column(table, "USER_ID").comment().inventoryMatch()).isEqualTo("ABSENT");
            assertThat(column(table, "REG_YMD").comment().inventoryMatch()).isEqualTo("NOT_IN_INVENTORY");
            assertThat(column(table, "REG_YMD").patternMatches()).containsEntry("YMD8", 12L);
            try (var rows = connection.createStatement().executeQuery("SELECT count(*) FROM LEGACY_USER")) {
                rows.next();
                assertThat(rows.getLong(1)).isEqualTo(12);
            }
        }
    }

    @Test
    void rowLimitTruncatesAndUnreadableOrMissingTablesMakeTheProfileIncomplete() throws Exception {
        try (Connection connection = h2()) {
            seed(connection, 9);
            List<CatalogObject> objects = new ArrayList<>(table("LEGACY_USER", false));
            objects.addAll(columns("LEGACY_USER", "USER_ID", "STAT_CD", "HP_NO", "REG_YMD"));
            objects.addAll(table("Quoted Name", true));
            objects.addAll(columns("Quoted Name", "ID"));
            objects.addAll(table("GONE_TABLE", false));
            objects.addAll(columns("GONE_TABLE", "ID"));

            SourceProfile profile = profiler.profile(connection, snapshot(objects), 5L);

            assertThat(profile.complete()).isFalse();
            assertThat(profile.rowLimit()).isEqualTo(5L);
            TableProfile user = profile.tables().stream().filter(t -> t.name().equals("LEGACY_USER")).findFirst()
                    .orElseThrow();
            assertThat(user.rowsScanned()).isEqualTo(5);
            assertThat(user.truncated()).isTrue();
            TableProfile quoted = profile.tables().stream().filter(t -> t.name().equals("Quoted Name")).findFirst()
                    .orElseThrow();
            assertThat(quoted.status()).isEqualTo("SKIPPED_IDENTIFIER");
            TableProfile gone = profile.tables().stream().filter(t -> t.name().equals("GONE_TABLE")).findFirst()
                    .orElseThrow();
            assertThat(gone.status()).isEqualTo("FAILED");
            assertThat(gone.failureSqlState()).matches("[0-9A-Z]{5}");
            assertThat(gone.columns()).singleElement().satisfies(column -> assertThat(column.rows()).isZero());
        }
    }

    @Test
    void ownerFallsBackToTheCatalogAndCommentsAreFoundWithoutAnUnknownCatalog() throws Exception {
        try (Connection connection = h2()) {
            seed(connection, 6);
            List<CatalogObject> objects = new ArrayList<>(List.of(new CatalogObject(ObjectKind.TABLE, "PUBLIC", null,
                    "LEGACY_USER", false, null, null, List.of(), Map.of())));
            objects.add(new CatalogObject(ObjectKind.COLUMN, "PUBLIC", null, "LEGACY_USER.STAT_CD", false, null,
                    null, List.of(), Map.of("parentTable", "LEGACY_USER", "size", "1", "nullable", "false",
                    "nativeType", "CHAR", "jdbcType", "1", "scale", "x")));
            objects.add(new CatalogObject(ObjectKind.TABLE, null, "bad schema", "BAD", false, null, null,
                    List.of(), Map.of()));

            SourceProfile profile = profiler.profile(connection, snapshot(objects), null);

            TableProfile user = profile.tables().stream().filter(t -> t.name().equals("LEGACY_USER")).findFirst()
                    .orElseThrow();
            assertThat(user.status()).isEqualTo("PROFILED");
            assertThat(user.rowsScanned()).isEqualTo(6);
            ColumnProfile status = user.columns().getFirst();
            assertThat(status.name()).isEqualTo("STAT_CD");
            assertThat(status.declaredSize()).isEqualTo(1L);
            assertThat(status.declaredNullable()).isFalse();
            assertThat(status.jdbcType()).isEqualTo(1);
            assertThat(status.declaredScale()).isNull();
            assertThat(status.comment().text()).isEqualTo("상태코드");
            assertThat(user.comment().withheld()).isEqualTo("CREDENTIAL_LIKE");
            TableProfile bad = profile.tables().stream().filter(t -> t.name().equals("BAD")).findFirst()
                    .orElseThrow();
            assertThat(bad.status()).isEqualTo("SKIPPED_IDENTIFIER");
            assertThat(profile.complete()).isFalse();
        }
    }

    @Test
    void readsInOneRolledBackTransactionWithTheDriverSpecificFetchSizeAndRestoresAutocommit() throws Exception {
        for (String product : List.of("MySQL", "PostgreSQL")) {
            Connection connection = mock(Connection.class);
            DatabaseMetaData metadata = mock(DatabaseMetaData.class);
            Statement statement = mock(Statement.class);
            ResultSet empty = mock(ResultSet.class);
            given(connection.getAutoCommit()).willReturn(true);
            given(connection.getMetaData()).willReturn(metadata);
            given(metadata.getDatabaseProductName()).willReturn(product);
            given(metadata.getColumns(any(), any(), any(), any())).willReturn(empty);
            given(metadata.getTables(any(), any(), any(), any())).willReturn(empty);
            given(connection.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY))
                    .willReturn(statement);
            given(statement.executeQuery(any())).willReturn(empty);
            List<CatalogObject> objects = new ArrayList<>(table("LEGACY_USER", false));
            objects.addAll(columns("LEGACY_USER", "USER_ID"));

            profiler.profile(connection, snapshot(objects), null);

            InOrder order = inOrder(connection, statement);
            order.verify(connection).setAutoCommit(false);
            order.verify(statement).setFetchSize(product.equals("MySQL") ? Integer.MIN_VALUE : 500);
            order.verify(statement).executeQuery("SELECT USER_ID FROM PUBLIC.LEGACY_USER");
            order.verify(connection).rollback();
            order.verify(connection).setAutoCommit(true);
        }
    }

    @Test
    void aFailingTableIsRolledBackBeforeTheNextTableIsRead() throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        Statement statement = mock(Statement.class);
        ResultSet empty = mock(ResultSet.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(metadata.getColumns(any(), any(), any(), any())).willReturn(empty);
        given(metadata.getTables(any(), any(), any(), any())).willReturn(empty);
        given(connection.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY))
                .willReturn(statement);
        given(statement.executeQuery(any())).willThrow(new java.sql.SQLException("gone", "42P01"));
        List<CatalogObject> objects = new ArrayList<>(table("ONE", false));
        objects.addAll(columns("ONE", "ID"));

        SourceProfile profile = profiler.profile(connection, snapshot(objects), null);

        assertThat(profile.tables().getFirst().failureSqlState()).isEqualTo("42P01");
        verify(connection, times(2)).rollback();
    }

    @Test
    void rejectsNonPositiveRowLimits() throws Exception {
        try (Connection connection = h2()) {
            assertThatThrownBy(() -> profiler.profile(connection, snapshot(List.of()), 0L))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    private static void seed(Connection connection, int rows) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE LEGACY_USER (USER_ID varchar(20), STAT_CD char(1), HP_NO varchar(20), "
                    + "REG_YMD varchar(8))");
            statement.execute("COMMENT ON TABLE LEGACY_USER IS 'password=legacy-secret'");
            statement.execute("COMMENT ON COLUMN LEGACY_USER.STAT_CD IS '상태코드'");
            statement.execute("COMMENT ON COLUMN LEGACY_USER.HP_NO IS '연락처 예: 010-1111-2222'");
            statement.execute("COMMENT ON COLUMN LEGACY_USER.REG_YMD IS '등록일자'");
            for (int index = 0; index < rows; index++) {
                statement.execute("INSERT INTO LEGACY_USER VALUES ('user" + index + "', '" + (index % 2 == 0 ? "A" : "R")
                        + "', '010-2222-" + (1000 + index) + "', '2024010" + (index % 9 + 1) + "')");
            }
        }
    }

    private static ColumnProfile column(TableProfile table, String name) {
        return table.columns().stream().filter(column -> column.name().equals(name)).findFirst().orElseThrow();
    }

    private static List<CatalogObject> table(String name, boolean quoted) {
        return List.of(new CatalogObject(ObjectKind.TABLE, null, "PUBLIC", name, quoted, null, null, List.of(),
                Map.of()));
    }

    private static List<CatalogObject> columns(String table, String... names) {
        List<CatalogObject> columns = new ArrayList<>();
        for (int index = 0; index < names.length; index++) {
            columns.add(new CatalogObject(ObjectKind.COLUMN, null, "PUBLIC", table + "." + names[index], false, null,
                    null, List.of(new ObjectReference(ObjectKind.TABLE, null, "PUBLIC", table)),
                    Map.of("parentTable", table, "originalName", names[index], "ordinal",
                            String.valueOf(index + 1))));
        }
        return columns;
    }

    private static CatalogObject comment(String name, String text) {
        return CatalogObject.hashOnlyDefinition(ObjectKind.COMMENT, null, "PUBLIC", name, false, text, List.of(),
                Map.of("parentKind", "COLUMN"));
    }

    private static CatalogSnapshot snapshot(List<CatalogObject> objects) {
        return CatalogSnapshot.of(new CatalogSnapshot.DatabaseInfo("H2", "2", "h2", "2"), objects, List.of());
    }

    private static Connection h2() throws Exception {
        return DriverManager.getConnection("jdbc:h2:mem:profile_" + SEQUENCE.incrementAndGet() + ";DB_CLOSE_DELAY=-1",
                "sa", "");
    }
}
