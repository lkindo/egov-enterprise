package nuri.business.service.system.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.foundation.core.util.ServiceTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

@ExtendWith(MockitoExtension.class)
@DisplayName("DurableJobRetentionScheduler 단위 테스트")
class DurableJobRetentionSchedulerTest {

    @Mock
    private DurableJobRepository durableJobRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    private DurableJobRetentionScheduler schedulerWithDays(int days) {
        return new DurableJobRetentionScheduler(durableJobRepository, transactionManager, days);
    }

    private void stubTransactions() {
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
    }

    @Test
    @DisplayName("보존 일수 1 미만(0 또는 음수)은 전량 파기를 막기 위해 삭제를 건너뛴다")
    void belowMinimumDaysSkipsDeletion() {
        assertThat(schedulerWithDays(0).purgeSucceededJobs()).isZero();
        assertThat(schedulerWithDays(-5).purgeSucceededJobs()).isZero();
        verify(durableJobRepository, never()).findSucceededIdsCompletedBefore(any(), any());
        verify(durableJobRepository, never()).deleteSucceededByIdIn(any());
    }

    @Test
    @DisplayName("보존 일수 이전 SUCCEEDED 작업 ID 를 배치 단위로 조회·삭제한다")
    void purgesSucceededJobsOlderThanConfiguredDays() {
        stubTransactions();
        List<BigInteger> batch = List.of(BigInteger.ONE, BigInteger.TWO);
        when(durableJobRepository.findSucceededIdsCompletedBefore(
                any(LocalDateTime.class), eq(PageRequest.of(0, DurableJobRetentionScheduler.BATCH_SIZE))))
                .thenReturn(batch);
        when(durableJobRepository.deleteSucceededByIdIn(batch)).thenReturn(2);

        LocalDateTime before = ServiceTime.now().minusDays(30).minusSeconds(5);
        int deleted = schedulerWithDays(30).purgeSucceededJobs();
        LocalDateTime after = ServiceTime.now().minusDays(30).plusSeconds(5);

        assertThat(deleted).isEqualTo(2);
        ArgumentCaptor<LocalDateTime> cutoff = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(durableJobRepository, times(1)).findSucceededIdsCompletedBefore(
                cutoff.capture(), eq(PageRequest.of(0, DurableJobRetentionScheduler.BATCH_SIZE)));
        assertThat(cutoff.getValue()).isBetween(before, after);
        verify(durableJobRepository).deleteSucceededByIdIn(batch);
    }

    @Test
    @DisplayName("한 번 실행에서 MAX_BATCHES_PER_RUN 을 넘겨 장시간 잠금으로 번지지 않게 상한에서 멈춘다")
    void stopsAtMaxBatchesPerRun() {
        stubTransactions();
        List<BigInteger> fullBatch = java.util.stream.IntStream.rangeClosed(1, DurableJobRetentionScheduler.BATCH_SIZE)
                .mapToObj(BigInteger::valueOf)
                .toList();
        when(durableJobRepository.findSucceededIdsCompletedBefore(
                any(LocalDateTime.class), eq(PageRequest.of(0, DurableJobRetentionScheduler.BATCH_SIZE))))
                .thenReturn(fullBatch);
        when(durableJobRepository.deleteSucceededByIdIn(fullBatch))
                .thenReturn(DurableJobRetentionScheduler.BATCH_SIZE);

        int deleted = schedulerWithDays(30).purgeSucceededJobs();

        assertThat(deleted)
                .isEqualTo(DurableJobRetentionScheduler.BATCH_SIZE * DurableJobRetentionScheduler.MAX_BATCHES_PER_RUN);
        verify(durableJobRepository, times(DurableJobRetentionScheduler.MAX_BATCHES_PER_RUN))
                .findSucceededIdsCompletedBefore(any(), any());
    }
}
