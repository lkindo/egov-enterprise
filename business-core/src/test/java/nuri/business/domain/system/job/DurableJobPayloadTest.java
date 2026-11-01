package nuri.business.domain.system.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import java.util.UUID;
import nuri.foundation.core.job.DurableWork;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class DurableJobPayloadTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 1, 9, 0);

    private final DurableJob job = DurableJob.pending(new DurableWork(UUID.randomUUID(), "MAIL_DELIVERY", "{\"address\":\"secret\"}"), NOW);

    @Test
    @DisplayName("끝난 작업의 내용을 지워도 빈 문자열을 남기지 않는다 — Oracle 은 NULL 로 바꿔 NOT NULL 위반이 된다")
    void discardKeepsANonEmptyMarker() {
        job.succeeded(NOW);

        job.discardPayload();

        assertThat(job.getJobCn()).isNotEmpty().doesNotContain("secret");
        assertThat(job.payloadDiscarded()).isTrue();
    }

    @Test
    @DisplayName("내용이 남은 작업은 지운 것으로 읽지 않는다")
    void keptPayloadIsNotDiscarded() {
        assertThat(job.payloadDiscarded()).isFalse();
    }

    @Test
    @DisplayName("지운 내용은 다시 처리할 수 없다 — 이전 빈 문자열 행도 같다")
    void discardedPayloadCannotBeRetried() {
        job.failed(NOW, 0);
        assertThat(job.getPrcsSttsNm()).isEqualTo("FAILED");
        assertThat(job.retryable()).isTrue();

        job.discardPayload();
        assertThat(job.retryable()).isFalse();

        ReflectionTestUtils.setField(job, "jobCn", "");
        assertThat(job.payloadDiscarded()).isTrue();
        assertThat(job.retryable()).isFalse();
    }

    @Test
    @DisplayName("끝나지 않은 작업의 내용은 지울 수 없다")
    void onlyTerminalPayloadsCanBeDiscarded() {
        assertThatThrownBy(job::discardPayload).isInstanceOf(IllegalStateException.class);
    }
}
