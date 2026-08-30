package nuri.migration.etl;

import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
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

        assertThat(first).contains("WHERE ACTIVE_YN='Y'", "ORDER BY TENANT_ID, ITEM_SEQ")
                .doesNotContainIgnoringCase("offset");
        assertThat(next).contains("ACTIVE_YN='Y'", "TENANT_ID > ?",
                        "TENANT_ID = ? AND ITEM_SEQ > ?", "ORDER BY TENANT_ID, ITEM_SEQ")
                .doesNotContainIgnoringCase("offset");
    }
}
