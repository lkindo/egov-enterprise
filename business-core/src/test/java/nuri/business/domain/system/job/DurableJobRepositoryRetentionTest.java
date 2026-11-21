package nuri.business.domain.system.job;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import nuri.business.support.PersistenceTestSupport;
import nuri.foundation.core.job.DurableWork;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("DurableJobRepository 보존 정리 쿼리 테스트")
class DurableJobRepositoryRetentionTest extends PersistenceTestSupport {

    @Autowired
    private DurableJobRepository durableJobRepository;

    @Test
    @DisplayName("cutoff 이전 완료된 SUCCEEDED 만 고르고 FAILED·PENDING·RETRY·RUNNING·최근 SUCCEEDED 는 보존한다")
    void selectsAndDeletesOnlyExpiredSucceededJobs() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 21, 4, 45);
        LocalDateTime cutoff = now.minusDays(30);

        DurableJob oldSucceeded = DurableJob.pending(
                new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{\"a\":1}"), now.minusDays(40));
        oldSucceeded.succeeded(cutoff.minusMinutes(1));

        DurableJob boundarySucceeded = DurableJob.pending(
                new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{\"a\":2}"), now.minusDays(30));
        boundarySucceeded.succeeded(cutoff);

        DurableJob recentSucceeded = DurableJob.pending(
                new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{\"a\":3}"), now.minusDays(5));
        recentSucceeded.succeeded(now.minusDays(5));

        DurableJob oldFailed = DurableJob.pending(
                new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{\"a\":4}"), now.minusDays(60));
        oldFailed.failed(cutoff.minusDays(5), 0);

        DurableJob oldPending = DurableJob.pending(
                new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{\"a\":5}"), now.minusDays(60));

        DurableJob oldRunning = DurableJob.pending(
                new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{\"a\":6}"), now.minusDays(60));
        ReflectionTestUtils.setField(oldRunning, "prcsSttsNm", "RUNNING");
        ReflectionTestUtils.setField(oldRunning, "jobCmptnDt", cutoff.minusDays(1));

        DurableJob oldRetry = DurableJob.pending(
                new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{\"a\":7}"), now.minusDays(60));
        ReflectionTestUtils.setField(oldRetry, "prcsSttsNm", "RETRY");
        ReflectionTestUtils.setField(oldRetry, "jobCmptnDt", cutoff.minusDays(1));

        durableJobRepository.saveAllAndFlush(
                List.of(oldSucceeded, boundarySucceeded, recentSucceeded, oldFailed, oldPending, oldRunning, oldRetry));

        List<BigInteger> expiredIds = durableJobRepository.findSucceededIdsCompletedBefore(cutoff, PageRequest.of(0, 50));
        assertThat(expiredIds).containsExactly(oldSucceeded.getJobSn());

        int deleted = durableJobRepository.deleteSucceededByIdIn(expiredIds);
        assertThat(deleted).isEqualTo(1);

        assertThat(durableJobRepository.findById(oldSucceeded.getJobSn())).isEmpty();
        assertThat(durableJobRepository.findById(boundarySucceeded.getJobSn())).isPresent();
        assertThat(durableJobRepository.findById(recentSucceeded.getJobSn())).isPresent();
        assertThat(durableJobRepository.findById(oldFailed.getJobSn())).isPresent();
        assertThat(durableJobRepository.findById(oldPending.getJobSn())).isPresent();
        assertThat(durableJobRepository.findById(oldRunning.getJobSn())).isPresent();
        assertThat(durableJobRepository.findById(oldRetry.getJobSn())).isPresent();
    }
}
