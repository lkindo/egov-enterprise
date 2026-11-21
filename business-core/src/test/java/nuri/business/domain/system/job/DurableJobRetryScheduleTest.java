package nuri.business.domain.system.job;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import nuri.foundation.core.job.DurableWork;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 재시도 간격이 짧은 장애 동안에 작업을 모두 소진시키지 않는다(2026-11-21). */
class DurableJobRetryScheduleTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 21, 9, 0);
    private static final int MAXIMUM_ATTEMPTS = 8;
    private static final long LEASE_SECONDS = 120;

    @Test
    @DisplayName("실패할 때마다 30초에서 두 배로 늘고 30분에서 멈춘다")
    void delaysDoubleFromThirtySecondsUpToThirtyMinutes() {
        assertThat(List.of(1, 2, 3, 4, 5, 6, 7, 8).stream().map(DurableJob::retryDelaySeconds).toList())
                .containsExactly(30L, 60L, 120L, 240L, 480L, 960L, 1800L, 1800L);
        assertThat(DurableJob.retryDelaySeconds(0)).isEqualTo(30L);
    }

    @Test
    @DisplayName("8회 시도가 한 시간 넘게 이어져 5분짜리 장애가 작업을 FAILED 로 만들지 않는다")
    void eightAttemptsSpanMoreThanAnHour() {
        DurableJob job = DurableJob.pending(new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{}"), NOW);
        LocalDateTime clock = NOW;
        List<Long> waits = new ArrayList<>();
        for (int attempt = 1; attempt <= MAXIMUM_ATTEMPTS; attempt++) {
            assertThat(job.claim(clock, MAXIMUM_ATTEMPTS, LEASE_SECONDS)).as("attempt %d", attempt).isNotNull();
            job.failed(clock, MAXIMUM_ATTEMPTS);
            if (attempt < MAXIMUM_ATTEMPTS) {
                assertThat(job.getPrcsSttsNm()).as("attempt %d", attempt).isEqualTo("RETRY");
                waits.add(Duration.between(clock, job.getJobPrnmntDt()).toSeconds());
                clock = job.getJobPrnmntDt();
            }
        }

        assertThat(job.getPrcsSttsNm()).isEqualTo("FAILED");
        assertThat(waits).containsExactly(30L, 60L, 120L, 240L, 480L, 960L, 1800L);
        assertThat(Duration.between(NOW, clock)).isGreaterThan(Duration.ofHours(1));
        // 종전 간격이라면 5분 안에 8회가 모두 끝났다.
        assertThat(Duration.between(NOW, clock)).isGreaterThan(Duration.ofMinutes(5));
    }
}
