package nuri.migration.etl;

import nuri.migration.model.MappingSpec;
import org.junit.jupiter.api.Test;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class EtlExecutorBatchCountTest {

    @Test
    void onlyOneAffectedRowPerStatementIsAnExactBatchSuccess() {
        assertThat(EtlExecutor.exactInsertedRows(new int[]{1, 1, 1}, 3)).isEqualTo(3L);
        assertThat(EtlExecutor.exactInsertedRows(new int[]{1, 1}, 3)).isEqualTo(-1L);
    }

    @Test
    void zeroUnknownAndFailedBatchCountsCannotBeReportedAsWritten() {
        assertThat(EtlExecutor.exactInsertedRows(new int[]{1, 0}, 2)).isEqualTo(-1L);
        assertThat(EtlExecutor.exactInsertedRows(
                new int[]{1, Statement.SUCCESS_NO_INFO}, 2)).isEqualTo(-1L);
        assertThat(EtlExecutor.exactInsertedRows(
                new int[]{1, Statement.EXECUTE_FAILED}, 2)).isEqualTo(-1L);
    }

    @Test
    void inconclusiveBatchCountsCannotReachTheCommitOrFallbackLayerAsSuccess() throws Exception {
        PreparedStatement statement = mock(PreparedStatement.class);
        given(statement.executeBatch()).willReturn(new int[]{1, 0});

        assertThatThrownBy(() -> EtlExecutor.executeBatch(statement,
                List.of(new Object[]{"A"}, new Object[]{"B"})))
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("updateCounts");

        verify(statement, times(2)).addBatch();
        verify(statement, never()).executeUpdate();
    }

    @Test
    void exactBatchCountsAreReturnedToTheAtomicCommitLayer() throws Exception {
        PreparedStatement statement = mock(PreparedStatement.class);
        given(statement.executeBatch()).willReturn(new int[]{1, 1});

        long written = EtlExecutor.executeBatch(statement,
                List.of(new Object[]{"A"}, new Object[]{"B"}));

        assertThat(written).isEqualTo(2L);
        verify(statement, times(2)).addBatch();
        verify(statement, never()).executeUpdate();
    }

    @Test
    void tableCountersDoNotNarrowAtIntegerRange() {
        EtlExecutor.TableResult result = new EtlExecutor.TableResult(
                "source", "target", Long.MAX_VALUE, Long.MAX_VALUE, Long.MAX_VALUE, List.of());

        assertThat(result.read()).isEqualTo(Long.MAX_VALUE);
        assertThat(result.transformed()).isEqualTo(Long.MAX_VALUE);
        assertThat(result.written()).isEqualTo(Long.MAX_VALUE);
    }

    @Test
    void writeFailureMessageCarriesOnlyTheRowPositionAndSqlState() {
        MappingSpec.TableMapping table = new MappingSpec.TableMapping(
                "LEGACY_ITEM", "tb_item", null, "ITEM_ID", null, List.of(), null);
        SQLException withValue = new SQLException("Key (item_id)=(SECRET-VALUE) already exists", "23505");

        assertThat(EtlExecutor.writeFailureMessage(table, 7L, "ATOMIC_WRITE_FAILED", withValue))
                .isEqualTo("행 쓰기 실패(LEGACY_ITEM, target=tb_item, row=7): ATOMIC_WRITE_FAILED(SQLSTATE=23505)"
                        + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다")
                .doesNotContain("SECRET-VALUE");
        assertThat(EtlExecutor.writeFailureMessage(table, 0L, "ATOMIC_WRITE_FAILED:keymap/checkpoint",
                new IllegalStateException("wrapped", new SQLException("x", "23503"))))
                .contains("row=-)").contains("SQLSTATE=23503");
        assertThat(EtlExecutor.sqlState(new SQLException("value 'abc'", "bad state"))).isEqualTo("-");
        assertThat(EtlExecutor.sqlState(new RuntimeException("no sql state"))).isEqualTo("-");
    }
}
