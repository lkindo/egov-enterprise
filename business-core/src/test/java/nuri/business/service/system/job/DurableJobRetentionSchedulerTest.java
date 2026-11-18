package nuri.business.service.system.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import nuri.business.domain.system.job.DurableJobRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Limit;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

@DisplayName("DurableJobRetentionScheduler 보존 정리 가드 및 배치 삭제")
class DurableJobRetentionSchedulerTest {

    private final DurableJobRepository repository = mock(DurableJobRepository.class);
    private final PlatformTransactionManager txManager = new StubTransactionManager();
    private final Clock fixedClock = Clock.fixed(Instant.parse("2026-11-19T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void rejectsNonPositiveRetentionDaysOrInvalidBatchBounds() {
        assertThatThrownBy(() -> new DurableJobRetentionScheduler(repository, txManager, 0, 500, 20, fixedClock))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DurableJobRetentionScheduler(repository, txManager, 30, 0, 20, fixedClock))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DurableJobRetentionScheduler(repository, txManager, 30, 500, 0, fixedClock))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void purgesExpiredSucceededJobsInBoundedBatchesAndStopsWhenExhausted() {
        var scheduler = new DurableJobRetentionScheduler(repository, txManager, 30, 2, 5, fixedClock);
        LocalDateTime expectedCutoff = LocalDateTime.of(2026, 10, 20, 0, 0);
        when(repository.findExpiredSucceededJobSns(eq(expectedCutoff), eq(Limit.of(2))))
                .thenReturn(List.of(BigInteger.ONE, BigInteger.TWO))
                .thenReturn(List.of(BigInteger.valueOf(3)));
        when(repository.deleteSucceededByJobSnIn(List.of(BigInteger.ONE, BigInteger.TWO))).thenReturn(2);
        when(repository.deleteSucceededByJobSnIn(List.of(BigInteger.valueOf(3)))).thenReturn(1);

        int deleted = scheduler.purgeExpiredSucceededJobs();

        assertThat(deleted).isEqualTo(3);
        verify(repository, times(2)).findExpiredSucceededJobSns(eq(expectedCutoff), eq(Limit.of(2)));
        verify(repository).deleteSucceededByJobSnIn(List.of(BigInteger.ONE, BigInteger.TWO));
        verify(repository).deleteSucceededByJobSnIn(List.of(BigInteger.valueOf(3)));
    }

    @Test
    void stopsAtMaxBatchesPerRunWhenBacklogExceedsBudget() {
        var scheduler = new DurableJobRetentionScheduler(repository, txManager, 14, 2, 2, fixedClock);
        LocalDateTime expectedCutoff = LocalDateTime.of(2026, 11, 5, 0, 0);
        when(repository.findExpiredSucceededJobSns(eq(expectedCutoff), eq(Limit.of(2))))
                .thenReturn(List.of(BigInteger.ONE, BigInteger.TWO))
                .thenReturn(List.of(BigInteger.valueOf(3), BigInteger.valueOf(4)));
        when(repository.deleteSucceededByJobSnIn(any())).thenReturn(2);

        int deleted = scheduler.purgeExpiredSucceededJobs();

        assertThat(deleted).isEqualTo(4);
        verify(repository, times(2)).findExpiredSucceededJobSns(eq(expectedCutoff), eq(Limit.of(2)));
        verify(repository, times(2)).deleteSucceededByJobSnIn(any());
        verifyNoMoreInteractions(repository);
    }

    private static final class StubTransactionManager implements PlatformTransactionManager {
        @Override
        public TransactionStatus getTransaction(TransactionDefinition definition) {
            return new SimpleTransactionStatus();
        }

        @Override
        public void commit(TransactionStatus status) {}

        @Override
        public void rollback(TransactionStatus status) {}
    }
}
