package nuri.business.service.system.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.lang.reflect.Modifier;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.foundation.core.util.ServiceTime;
import org.junit.jupiter.api.Test;

class DurableWorkMetricsTest {

    @Test
    void refreshMethodUsesExplicitLockInsteadOfSynchronizedMonitor() throws NoSuchMethodException {
        assertThat(Modifier.isSynchronized(DurableWorkMetrics.class.getMethod("refresh").getModifiers())).isFalse();
    }

    @Test
    void refreshUpdatesQueueGaugesAndRecordsFailureState() {
        DurableJobRepository repository = mock(DurableJobRepository.class);
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        Instant fixed = Instant.parse("2026-11-24T01:00:00Z");
        Clock clock = Clock.fixed(fixed, ZoneOffset.UTC);
        LocalDateTime due = ServiceTime.toLocal(fixed.minusSeconds(120));

        DurableJobRepository.QueueStateAggregate pending = mock(DurableJobRepository.QueueStateAggregate.class);
        when(pending.getStatus()).thenReturn("PENDING");
        when(pending.getJobCount()).thenReturn(3L);
        when(pending.getOldestDueAt()).thenReturn(due);

        when(repository.summarizeQueue(any()))
                .thenReturn(List.of(pending))
                .thenThrow(new IllegalStateException("db unavailable"));

        DurableWorkMetrics metrics = new DurableWorkMetrics(repository, registry, true, clock);
        metrics.refresh();

        assertThat(registry.get(DurableWorkMetrics.ENABLED).gauge().value()).isEqualTo(1.0);
        assertThat(registry.get(DurableWorkMetrics.JOBS).tag(DurableWorkMetrics.STATUS_TAG, "PENDING").gauge().value())
                .isEqualTo(3.0);
        assertThat(registry.get(DurableWorkMetrics.OLDEST_DUE_AGE).tag(DurableWorkMetrics.STATUS_TAG, "PENDING").gauge().value())
                .isEqualTo(120.0);
        assertThat(registry.get(DurableWorkMetrics.OBSERVATION_HEALTHY).gauge().value()).isEqualTo(1.0);

        metrics.refresh();
        assertThat(registry.get(DurableWorkMetrics.OBSERVATION_HEALTHY).gauge().value()).isEqualTo(0.0);
    }

    @Test
    void concurrentVirtualThreadsSerializeRefreshWithoutOverlap() throws Exception {
        DurableJobRepository repository = mock(DurableJobRepository.class);
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        Clock clock = Clock.fixed(Instant.parse("2026-11-24T01:00:00Z"), ZoneOffset.UTC);
        DurableWorkMetrics metrics = new DurableWorkMetrics(repository, registry, true, clock);

        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        AtomicInteger concurrent = new AtomicInteger();
        AtomicInteger maxConcurrent = new AtomicInteger();
        AtomicInteger calls = new AtomicInteger();

        when(repository.summarizeQueue(any())).thenAnswer(inv -> {
            int inFlight = concurrent.incrementAndGet();
            maxConcurrent.accumulateAndGet(inFlight, Math::max);
            try {
                if (calls.incrementAndGet() == 1) {
                    firstEntered.countDown();
                    assertThat(releaseFirst.await(5, TimeUnit.SECONDS)).isTrue();
                }
                return List.of();
            } finally {
                concurrent.decrementAndGet();
            }
        });

        AtomicReference<Throwable> vt1Error = new AtomicReference<>();
        AtomicReference<Throwable> vt2Error = new AtomicReference<>();
        Thread t1 = Thread.ofVirtual().start(() -> {
            try {
                metrics.refresh();
            } catch (Throwable err) {
                vt1Error.set(err);
            }
        });
        assertThat(firstEntered.await(5, TimeUnit.SECONDS)).isTrue();
        Thread t2 = Thread.ofVirtual().start(() -> {
            try {
                metrics.refresh();
            } catch (Throwable err) {
                vt2Error.set(err);
            }
        });
        Thread.sleep(50);
        releaseFirst.countDown();
        t1.join(5_000);
        t2.join(5_000);

        assertThat(vt1Error.get()).isNull();
        assertThat(vt2Error.get()).isNull();
        assertThat(maxConcurrent.get()).isEqualTo(1);
        assertThat(calls.get()).isEqualTo(2);
        assertThat(registry.get(DurableWorkMetrics.OBSERVATION_HEALTHY).gauge().value()).isEqualTo(1.0);
    }
}
