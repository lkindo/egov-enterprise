package nuri.migration.etl;

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
}
