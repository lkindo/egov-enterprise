package nuri.migration.etl;

import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class EtlSourcePagingTest {

    @Test
    void compositeKeysetPageUsesLexicographicSeekAndNeverOffset() {
        TableMapping table = new TableMapping(
                "LEGACY_ITEM", "tb_item", "ACTIVE_YN='Y'", null,
                List.of("TENANT_ID", "ITEM_SEQ"), null,
                List.of(new ColumnMapping("ITEM_NM", "item_nm", null, null, null, null, null)),
                new IdStrategy("item_id", "ITM", "ROW_ID"));

        String first = EtlExecutor.buildSourcePageSql(table, false);
        String next = EtlExecutor.buildSourcePageSql(table, true);

        assertThat(first)
                .startsWith("SELECT ITEM_NM, ROW_ID, TENANT_ID, ITEM_SEQ FROM LEGACY_ITEM")
                .contains("WHERE ACTIVE_YN='Y'", "ORDER BY TENANT_ID, ITEM_SEQ")
                .doesNotContain("SELECT *")
                .doesNotContainIgnoringCase("offset");
        assertThat(next).contains("ACTIVE_YN='Y'", "TENANT_ID > ?",
                        "TENANT_ID = ? AND ITEM_SEQ > ?", "ORDER BY TENANT_ID, ITEM_SEQ")
                .doesNotContain("SELECT *")
                .doesNotContainIgnoringCase("offset");
    }

    @Test
    void projectionIncludesEveryMappedIdentityForeignKeyAndOrderSourceExactlyOnce() {
        TableMapping table = new TableMapping(
                "LEGACY_CHILD", "tb_child", null, null,
                List.of("TENANT_ID", "ROW_SEQ"), null,
                List.of(
                        new ColumnMapping("VALUE", "value", null, null, null, null, null),
                        new ColumnMapping("TENANT_ID", "tenant_id", null, null, null, null, null),
                        new ColumnMapping(null, "audit_value", null, null, null, null, "SYSTEM")),
                null,
                new IdentityStrategy(
                        TargetIdentityPolicy.PRESERVE,
                        List.of(
                                new IdentityComponentSpec("TENANT_ID", IdentityValueType.TEXT),
                                new IdentityComponentSpec("ROW_SEQ", IdentityValueType.SIGNED_INTEGER)),
                        List.of(
                                new IdentityComponentSpec("tenant_id", IdentityValueType.TEXT),
                                new IdentityComponentSpec("row_seq", IdentityValueType.SIGNED_INTEGER))),
                List.of(new CompositeForeignKey(
                        "LEGACY_PARENT",
                        List.of(new IdentityComponentSpec("PARENT_ID", IdentityValueType.SIGNED_INTEGER)),
                        List.of(new IdentityComponentSpec("parent_id", IdentityValueType.SIGNED_INTEGER)))));

        assertThat(EtlExecutor.buildSourcePageSql(table, false))
                .startsWith("SELECT VALUE, TENANT_ID, ROW_SEQ, PARENT_ID FROM LEGACY_CHILD")
                .doesNotContain("TENANT_ID, TENANT_ID", "SELECT *");
    }

    @Test
    void constantOnlyDryRunUsesSafeRowMarkerInsteadOfWildcard() {
        TableMapping table = new TableMapping(
                "LEGACY_CONSTANT_ROWS", "tb_constant_rows", null,
                List.of(new ColumnMapping(null, "source_system", null, null, null, null, "LEGACY")),
                null);

        assertThat(EtlExecutor.buildSourcePageSql(table, false))
                .isEqualTo("SELECT 1 AS __migration_row__ FROM LEGACY_CONSTANT_ROWS");
    }
}
