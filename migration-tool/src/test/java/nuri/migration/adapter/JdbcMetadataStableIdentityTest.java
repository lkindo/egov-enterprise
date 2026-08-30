package nuri.migration.adapter;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class JdbcMetadataStableIdentityTest {

    @Test
    void multipleUnnamedForeignKeysBetweenTheSameTablesAreNeverMerged() throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        ResultSet tables = mock(ResultSet.class);
        ResultSet foreignKeys = mock(ResultSet.class);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn("legacy");
        given(connection.getSchema()).willReturn("sales");
        given(metadata.storesLowerCaseIdentifiers()).willReturn(false);
        given(metadata.storesUpperCaseIdentifiers()).willReturn(true);
        given(metadata.getDatabaseProductName()).willReturn("LegacyDB");
        given(metadata.getDatabaseProductVersion()).willReturn("1");
        given(metadata.getDriverName()).willReturn("legacy-driver");
        given(metadata.getDriverVersion()).willReturn("1");
        given(metadata.getTables(null, null, "%", null)).willReturn(tables);
        given(tables.next()).willReturn(true, false);
        given(tables.getString("TABLE_CAT")).willReturn("legacy");
        given(tables.getString("TABLE_SCHEM")).willReturn("sales");
        given(tables.getString("TABLE_NAME")).willReturn("CHILD");
        given(tables.getString("TABLE_TYPE")).willReturn("TABLE");
        given(metadata.getImportedKeys("legacy", "sales", "CHILD")).willReturn(foreignKeys);
        given(foreignKeys.next()).willReturn(true, true, false);
        given(foreignKeys.getString("FK_NAME")).willReturn(null);
        given(foreignKeys.getString("PKTABLE_CAT")).willReturn("legacy");
        given(foreignKeys.getString("PKTABLE_SCHEM")).willReturn("sales");
        given(foreignKeys.getString("PKTABLE_NAME")).willReturn("PARENT");
        given(foreignKeys.getString("PK_NAME")).willReturn("PK_PARENT");
        given(foreignKeys.getShort("KEY_SEQ")).willReturn((short) 1);
        given(foreignKeys.getShort("UPDATE_RULE")).willReturn((short) DatabaseMetaData.importedKeyNoAction);
        given(foreignKeys.getShort("DELETE_RULE")).willReturn((short) DatabaseMetaData.importedKeyNoAction);
        given(foreignKeys.getString("FKCOLUMN_NAME"))
                .willReturn("PRIMARY_PARENT_ID", "SECONDARY_PARENT_ID");
        given(foreignKeys.getString("PKCOLUMN_NAME")).willReturn("ID", "ID");

        CatalogSnapshot snapshot = new JdbcMetadataSourceAdapter().discover(
                connection,
                new DiscoveryRequest(Set.of(), Set.of("sales"), Set.of(ObjectKind.FOREIGN_KEY), false));

        assertThat(snapshot.objects())
                .filteredOn(object -> object.kind() == ObjectKind.FOREIGN_KEY)
                .hasSize(2)
                .extracting(CatalogObject::stableId)
                .doesNotHaveDuplicates();
        assertThat(snapshot.objects())
                .filteredOn(object -> object.kind() == ObjectKind.FOREIGN_KEY)
                .extracting(object -> object.attributes().get("columns"))
                .containsExactlyInAnyOrder("PRIMARY_PARENT_ID", "SECONDARY_PARENT_ID");
    }
}
