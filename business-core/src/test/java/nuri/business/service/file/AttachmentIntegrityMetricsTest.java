package nuri.business.service.file;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.IOException;
import java.lang.reflect.Modifier;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class AttachmentIntegrityMetricsTest {

    @Test
    void recordOutcomeMethodUsesExplicitLockInsteadOfSynchronizedMonitor() throws NoSuchMethodException {
        assertThat(Modifier.isSynchronized(
                AttachmentIntegrityMetrics.class.getMethod("recordOutcome", String.class).getModifiers())).isFalse();
    }

    @Test
    void recordOutcomeUpdatesHealthAndUnhealthyGauges() throws IOException {
        AttachmentIntegrityReportStore store = mock(AttachmentIntegrityReportStore.class);
        when(store.loadHealth()).thenReturn(Optional.empty());
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        Clock clock = Clock.fixed(Instant.parse("2026-11-24T01:00:00Z"), ZoneOffset.UTC);

        AttachmentIntegrityMetrics metrics = new AttachmentIntegrityMetrics(store, registry, true, clock);
        assertThat(registry.get(AttachmentIntegrityMetrics.ENABLED).gauge().value()).isEqualTo(1.0);
        assertThat(registry.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isEqualTo(1.0);

        metrics.recordOutcome("DRIFT");
        assertThat(registry.get(AttachmentIntegrityMetrics.LAST_RUN_UNHEALTHY).gauge().value()).isEqualTo(1.0);
        assertThat(registry.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isEqualTo(1.0);

        metrics.recordOutcome("REPORT_FAILED");
        assertThat(registry.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isEqualTo(0.0);

        metrics.recordOutcome("PASS");
        assertThat(registry.get(AttachmentIntegrityMetrics.LAST_RUN_UNHEALTHY).gauge().value()).isEqualTo(0.0);
        assertThat(registry.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isEqualTo(1.0);

        doThrow(new IOException("disk full")).when(store).saveHealth(any());
        metrics.recordOutcome("PASS");
        assertThat(registry.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isEqualTo(0.0);
    }

    @Test
    void concurrentVirtualThreadsSerializeRecordOutcomeWithoutOverlap() throws Exception {
        AttachmentIntegrityReportStore store = mock(AttachmentIntegrityReportStore.class);
        when(store.loadHealth()).thenReturn(Optional.empty());
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        Clock clock = Clock.fixed(Instant.parse("2026-11-24T01:00:00Z"), ZoneOffset.UTC);

        AttachmentIntegrityMetrics metrics = new AttachmentIntegrityMetrics(store, registry, true, clock);

        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        AtomicInteger concurrent = new AtomicInteger();
        AtomicInteger maxConcurrent = new AtomicInteger();
        AtomicInteger calls = new AtomicInteger();

        doAnswer(inv -> {
            int inFlight = concurrent.incrementAndGet();
            maxConcurrent.accumulateAndGet(inFlight, Math::max);
            try {
                if (calls.incrementAndGet() == 1) {
                    firstEntered.countDown();
                    assertThat(releaseFirst.await(5, TimeUnit.SECONDS)).isTrue();
                }
                return null;
            } finally {
                concurrent.decrementAndGet();
            }
        }).when(store).saveHealth(any());

        // Trigger the 1st post-stub saveHealth call on virtual thread 1, then start virtual thread 2 while it holds stateLock.
        AtomicReference<Throwable> vt1Error = new AtomicReference<>();
        AtomicReference<Throwable> vt2Error = new AtomicReference<>();
        Thread t1 = Thread.ofVirtual().start(() -> {
            try {
                metrics.recordOutcome("PASS");
            } catch (Throwable err) {
                vt1Error.set(err);
            }
        });
        assertThat(firstEntered.await(5, TimeUnit.SECONDS)).isTrue();
        Thread t2 = Thread.ofVirtual().start(() -> {
            try {
                metrics.recordOutcome("DRIFT");
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
    }
}
