package nuri.api.schema;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** CUBRID 잠금 관측(VendorTestSql)이 읽는 {@code cubrid tranlist -f} 출력의 해석. 표본은 CUBRID 11.4.6 실측(2026-11-06)이다. */
class CubridTranlistParserTest {

    private static final String SAMPLE = """

            Tran index            User name      Host name      Process id    Program name              Query time    Tran time              Wait for lock holder      SQL_ID       SQL Text
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
               1(ACTIVE)                APP   11ea98343c53             64    broker1_cub_cas_1               0.00         2.00                              -1     *** empty ***
               2(ACTIVE)                APP   11ea98343c53             65    broker1_cub_cas_2               2.00         2.00                               1     14ae10b38f9b9   UPDATE t5 SET v = v + 1 WH
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

            SQL_ID: 14ae10b38f9b9
            Tran index : 2

            UPDATE t5 SET v = v + 1 WHERE id = 1
            """;

    @Test
    @DisplayName("기다리는 트랜잭션의 프로세스 번호·막는 트랜잭션·문장 전체를 읽는다")
    void readsWaitsWithTheirFullStatement() {
        Map<Integer, VendorTestSql.CubridTransaction> transactions = VendorTestSql.parseCubridTransactions(SAMPLE);

        assertThat(transactions.keySet()).containsExactly(1, 2);
        assertThat(transactions.get(1).holders()).isEmpty();
        assertThat(transactions.get(1).statement()).isNull();
        assertThat(transactions.get(2).process()).isEqualTo(65);
        assertThat(transactions.get(2).holders()).isEqualTo(List.of(1));
        assertThat(transactions.get(2).statement()).isEqualTo("update t5 set v = v + 1 where id = 1");
    }

    @Test
    @DisplayName("빈 출력이나 표가 잘린 출력은 '아무도 기다리지 않는다' 로 읽지 않고 멈춘다")
    void refusesOutputWithoutTheTable() {
        assertThatThrownBy(() -> VendorTestSql.parseCubridTransactions("")).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("tranlist 표를 찾지 못했다");
        String truncated = SAMPLE.substring(0, SAMPLE.indexOf("   1(ACTIVE)"));
        assertThatThrownBy(() -> VendorTestSql.parseCubridTransactions(truncated)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("tranlist 표를 찾지 못했다");
        String headless = SAMPLE.substring(SAMPLE.indexOf("-----"));
        assertThatThrownBy(() -> VendorTestSql.parseCubridTransactions(headless)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("tranlist 표를 찾지 못했다");
    }
}
