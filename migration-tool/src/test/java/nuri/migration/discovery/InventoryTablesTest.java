package nuri.migration.discovery;

import nuri.migration.discovery.CatalogObject.ObjectReference;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** mapping·원장·skeleton 의 소스 표 표기를 inventory 표와 컬럼으로 해석하는 공용 규칙(ADR-0029 L3a-2). */
class InventoryTablesTest {

    @Test
    void oneTwoAndThreePartNamesResolveTheSameUnquotedTableIgnoringCase() {
        CatalogObject table = table("db", "legacy", "USER_MST", false);
        CatalogSnapshot snapshot = snapshot(table, table("db", "audit", "LOG_HIST", false));

        for (String declared : List.of("USER_MST", "legacy.USER_MST", "db.legacy.USER_MST", "LEGACY.user_mst",
                " legacy.USER_MST ")) {
            InventoryTables.Resolution resolution = InventoryTables.resolve(snapshot, declared);
            assertThat(resolution.resolved()).as(declared).isTrue();
            assertThat(resolution.table()).isSameAs(table);
        }
        for (String declared : List.of("other.USER_MST", "x.db.legacy.USER_MST", "legacy.", "USER")) {
            assertThat(InventoryTables.resolve(snapshot, declared).problem()).as(declared)
                    .isEqualTo("소스 표를 inventory 에서 찾을 수 없습니다");
        }
        assertThat(InventoryTables.resolve(snapshot, " ").problem()).isEqualTo("소스 표가 비어 있습니다");
        assertThat(InventoryTables.resolve(snapshot, null).problem()).isEqualTo("소스 표가 비어 있습니다");
    }

    @Test
    void aQuotedTableIsMatchedWithItsCase() {
        CatalogObject table = table("db", "legacy", "User_Mst", true);
        CatalogSnapshot snapshot = snapshot(table);

        assertThat(InventoryTables.resolve(snapshot, "legacy.User_Mst").table()).isSameAs(table);
        assertThat(InventoryTables.resolve(snapshot, "legacy.user_mst").resolved()).isFalse();
        assertThat(InventoryTables.matches("LEGACY.User_Mst", table)).isFalse();
    }

    @Test
    void theSameNameInTwoCatalogsIsAmbiguousUntilTheCatalogIsWritten() {
        CatalogObject first = table("crm", "dbo", "CUSTOMER", false);
        CatalogObject second = table("erp", "dbo", "CUSTOMER", false);
        CatalogSnapshot snapshot = snapshot(first, second);

        assertThat(InventoryTables.find(snapshot, "dbo.CUSTOMER")).containsExactly(first, second);
        assertThat(InventoryTables.resolve(snapshot, "dbo.CUSTOMER").problem())
                .isEqualTo("소스 표가 inventory 에서 모호합니다(같은 이름의 표가 둘 이상) — catalog 까지 적으세요");
        assertThat(InventoryTables.resolve(snapshot, "erp.dbo.CUSTOMER").table()).isSameAs(second);
    }

    @Test
    void columnsAreEveryColumnObjectThatDependsOnTheTableReference() {
        CatalogObject table = table("db", "legacy", "USER_MST", false);
        CatalogObject twin = table("db", "other", "USER_MST", false);
        CatalogObject id = column(table, "USER_ID", false);
        CatalogObject name = column(table, "USER_NM", false);
        CatalogObject foreign = column(twin, "USER_ID", false);
        CatalogSnapshot snapshot = snapshot(table, twin, id, foreign, name);

        InventoryTables.TableColumns columns = InventoryTables.columns(snapshot, table);

        assertThat(columns.problem()).isNull();
        assertThat(columns.columns()).containsExactly(id, name);
        assertThat(InventoryTables.columnName(name)).isEqualTo("USER_NM");
        assertThat(InventoryTables.columnMatches("user_nm", name)).isTrue();
        assertThat(InventoryTables.columnMatches("USER_N", name)).isFalse();
    }

    @Test
    void columnsFollowTheirDefinitionOrderNotTheArtifactOrder() {
        CatalogObject table = table("db", "legacy", "USER_MST", false);
        CatalogObject second = column(table, "A_SECOND", false, "2");
        CatalogObject first = column(table, "Z_FIRST", false, "1");
        CatalogObject unordered = column(table, "B_UNKNOWN", false, null);
        CatalogObject unreadable = column(table, "A_UNKNOWN", false, "x");

        assertThat(InventoryTables.columns(snapshot(table, unordered, second, unreadable, first), table).columns())
                .containsExactly(first, second, unreadable, unordered);
    }

    @Test
    void aQuotedColumnIsMatchedWithItsCase() {
        CatalogObject table = table("db", "legacy", "USER_MST", false);
        CatalogObject quoted = column(table, "Nick_Nm", true);

        assertThat(InventoryTables.columnMatches("Nick_Nm", quoted)).isTrue();
        assertThat(InventoryTables.columnMatches("nick_nm", quoted)).isFalse();
    }

    @Test
    void columnsThatDifferOnlyInCaseCannotBeJudgedByTheCaseFreeLedger() {
        CatalogObject table = table("db", "legacy", "USER_MST", false);
        CatalogSnapshot snapshot = snapshot(table, column(table, "Name", true), column(table, "NAME", true),
                column(table, "USER_ID", false));

        InventoryTables.TableColumns columns = InventoryTables.columns(snapshot, table);

        assertThat(columns.columns()).isEmpty();
        assertThat(columns.problem())
                .isEqualTo("대소문자만 다른 컬럼(name)이 있어 판정할 수 없습니다 — 원장은 컬럼을 대소문자 없이 가립니다");
    }

    @Test
    void aTableWithoutColumnObjectsOrWithAnUnnamedColumnFailsClosed() {
        CatalogObject table = table("db", "legacy", "USER_MST", false);

        assertThat(InventoryTables.columns(snapshot(table), table).problem())
                .isEqualTo("inventory 에 이 표의 컬럼(COLUMN) 객체가 없습니다 — COLUMN 을 포함해 discover 를 다시"
                        + " 실행하세요");
        CatalogObject unnamed = new CatalogObject(ObjectKind.COLUMN, "db", "legacy", "USER_MST.X", false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", "USER_MST")),
                Map.of("parentTable", "USER_MST"));
        assertThat(InventoryTables.columns(snapshot(table, unnamed), table).problem())
                .isEqualTo("컬럼 이름(originalName)이 없는 COLUMN 객체가 있어 판정할 수 없습니다");
    }

    static CatalogSnapshot snapshot(CatalogObject... objects) {
        return new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-10-14T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("LegacyDB", "1", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(),
                new ArrayList<>(List.of(objects)),
                List.of());
    }

    static CatalogObject table(String catalog, String schema, String name, boolean quoted) {
        return new CatalogObject(ObjectKind.TABLE, catalog, schema, name, quoted, null, null, List.of(), Map.of());
    }

    static CatalogObject column(CatalogObject table, String name, boolean quoted) {
        return column(table, name, quoted, null);
    }

    static CatalogObject column(CatalogObject table, String name, boolean quoted, String ordinal) {
        Map<String, String> attributes = new LinkedHashMap<>();
        attributes.put("parentTable", table.name());
        attributes.put("originalName", name);
        attributes.put("jdbcType", "12");
        if (ordinal != null) {
            attributes.put("ordinal", ordinal);
        }
        return new CatalogObject(ObjectKind.COLUMN, table.catalog(), table.schema(), table.name() + "." + name,
                quoted || table.quoted(), null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, table.catalog(), table.schema(), table.name())),
                attributes);
    }
}
