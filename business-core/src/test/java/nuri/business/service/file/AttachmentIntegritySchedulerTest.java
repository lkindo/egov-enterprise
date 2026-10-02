package nuri.business.service.file;

import tools.jackson.databind.json.JsonMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.service.file.dto.AttachmentIntegrityReport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AttachmentIntegritySchedulerTest {
    @TempDir Path directory;

    /**
     * 경보 규칙은 Prometheus 노출 이름에 결속한다. 점 표기 → 밑줄 + {@code _total} 변환을 추론하지 않고 실제
     * 레지스트리의 scrape 출력으로 고정한다 — observability-alert-rules 계약이 이 문자열을 참조한다
     * (RateLimitFilterTest 의 같은 형태).
     */
    @Test
    @DisplayName("[2026-09-23] Prometheus 로는 nuri_attachment_integrity_runs_total{outcome=...} 로 노출된다")
    void exportsPrometheusCounterName() throws Exception {
        var files = mock(AttachmentIntegrityService.class);
        var references = mock(AttachmentReferenceIntegrityService.class);
        var store = new AttachmentIntegrityReportStore(JsonMapper.builder().configureForJackson2().build(), directory.toString());
        var prometheus = new io.micrometer.prometheusmetrics.PrometheusMeterRegistry(
                io.micrometer.prometheusmetrics.PrometheusConfig.DEFAULT);
        var clock = new MutableClock();
        var health = new AttachmentIntegrityMetrics(store, prometheus, true, clock);
        var scheduler = new AttachmentIntegrityScheduler(files, references, store, prometheus, 20, health);
        // 누락 0 · 미결정 0 · dangling 0 · 완주 → outcome 은 PASS 다(스케줄러의 판정식).
        when(files.scanBounded(eq(20), any(Duration.class))).thenReturn(new AttachmentIntegrityReport(
                3, 0, List.of(), "private-root", 3, 0, 0, List.of()));
        when(references.scan(20)).thenReturn(new AttachmentReferenceIntegrityService.Result(5, 0, 2, true));

        scheduler.scan();

        org.junit.jupiter.api.Assertions.assertTrue(
                prometheus.scrape().contains("nuri_attachment_integrity_runs_total{outcome=\"PASS\"} 1.0"),
                prometheus.scrape());
        assertThat(prometheus.scrape()).contains("nuri_attachment_integrity_enabled 1.0",
                "nuri_attachment_integrity_healthy_age_seconds 0.0",
                "nuri_attachment_integrity_last_run_unhealthy 0.0",
                "nuri_attachment_integrity_observation_healthy 1.0");
    }

    @Test
    void savesAggregateResultsAndKeepsLastCompleteResultAcrossFailureAndRestart() throws Exception {
        var files = mock(AttachmentIntegrityService.class);
        var references = mock(AttachmentReferenceIntegrityService.class);
        var mapper = JsonMapper.builder().configureForJackson2().build();
        var store = new AttachmentIntegrityReportStore(mapper, directory.toString());
        var metrics = new SimpleMeterRegistry();
        var scheduler = new AttachmentIntegrityScheduler(files, references, store, metrics, 20);
        when(files.scanBounded(eq(20), any(Duration.class))).thenReturn(new AttachmentIntegrityReport(
                3, 1, List.of("private-file-path"), "private-root", 3, 1, 0, List.of("private-orphan")));
        when(references.scan(20)).thenReturn(new AttachmentReferenceIntegrityService.Result(5, 2, 2, true));
        scheduler.scan();
        String completed = Files.readString(directory.resolve("last-complete.json"));
        assertThat(completed).contains("DRIFT", "danglingReferences").doesNotContain("private-");
        when(files.scanBounded(eq(20), any(Duration.class))).thenThrow(new IllegalStateException("private-db-connection"));
        scheduler.scan();
        assertThat(Files.readString(directory.resolve("latest.json"))).contains("FAILED").doesNotContain("private-");
        assertThat(Files.readString(directory.resolve("last-complete.json"))).isEqualTo(completed);
        assertThat(metrics.counter("nuri.attachment.integrity.runs", "outcome", "FAILED").count()).isEqualTo(1);
        new AttachmentIntegrityReportStore(mapper, directory.toString()).save(Map.of("outcome", "INCOMPLETE"), false);
        assertThat(Files.readString(directory.resolve("last-complete.json"))).isEqualTo(completed);
        try (var entries = Files.list(directory)) { assertThat(entries.toList()).hasSize(3); }
        assertThat(Files.readString(directory.resolve("health.json"))).doesNotContain("private-");
    }

    @Test
    void incompleteReferenceCensusDoesNotBecomeACompletedSnapshot() throws Exception {
        var files = mock(AttachmentIntegrityService.class);
        var references = mock(AttachmentReferenceIntegrityService.class);
        var store = new AttachmentIntegrityReportStore(JsonMapper.builder().configureForJackson2().build(), directory.toString());
        when(files.scanBounded(eq(5), any(Duration.class))).thenReturn(new AttachmentIntegrityReport(0, 0, List.of(), "root", 0, 0, 0, List.of()));
        when(references.scan(5)).thenReturn(new AttachmentReferenceIntegrityService.Result(5, 0, 1, false));
        new AttachmentIntegrityScheduler(files, references, store, new SimpleMeterRegistry(), 5).scan();
        assertThat(Files.readString(directory.resolve("latest.json"))).contains("INCOMPLETE");
        assertThat(directory.resolve("last-complete.json")).doesNotExist();
    }

    @Test
    void reportWriteFailureIsVisibleAndDoesNotLeaveTheSchedulerLocked() throws Exception {
        var files = mock(AttachmentIntegrityService.class);
        var references = mock(AttachmentReferenceIntegrityService.class);
        var store = mock(AttachmentIntegrityReportStore.class);
        var metrics = new SimpleMeterRegistry();
        when(files.scanBounded(eq(5), any(Duration.class))).thenThrow(new IllegalStateException());
        doThrow(new java.io.IOException()).when(store).save(anyMap(), anyBoolean());
        var scheduler = new AttachmentIntegrityScheduler(files, references, store, metrics, 5);
        scheduler.scan(); scheduler.scan();
        assertThat(metrics.counter("nuri.attachment.integrity.runs", "outcome", "REPORT_FAILED").count()).isEqualTo(2);
        assertThat(metrics.get(AttachmentIntegrityMetrics.LAST_RUN_UNHEALTHY).gauge().value()).isEqualTo(1);
        assertThat(metrics.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isZero();
    }

    @Test
    void disabledScanStillExportsItsDisabledStateWithoutReadingOrWritingStorage() {
        var store = mock(AttachmentIntegrityReportStore.class);
        var prometheus = new io.micrometer.prometheusmetrics.PrometheusMeterRegistry(
                io.micrometer.prometheusmetrics.PrometheusConfig.DEFAULT);
        new AttachmentIntegrityMetrics(store, prometheus, false, new MutableClock());
        assertThat(prometheus.scrape()).contains("nuri_attachment_integrity_enabled 0.0",
                "nuri_attachment_integrity_healthy_age_seconds 0.0",
                "nuri_attachment_integrity_last_run_unhealthy 0.0",
                "nuri_attachment_integrity_observation_healthy 0.0");
        verifyNoInteractions(store);
        try (var context = new org.springframework.context.annotation.AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new org.springframework.core.env.MapPropertySource("disabled", Map.of(
                    "nuri.attachment.integrity.enabled", "false")));
            context.registerBean(AttachmentIntegrityReportStore.class, () -> new AttachmentIntegrityReportStore(
                    JsonMapper.builder().configureForJackson2().build(), directory.resolve("unused").toString()));
            context.registerBean(io.micrometer.core.instrument.MeterRegistry.class, SimpleMeterRegistry::new);
            context.register(AttachmentIntegrityMetrics.class, AttachmentIntegrityScheduler.class);
            context.refresh();
            assertThat(context.getBeansOfType(AttachmentIntegrityScheduler.class)).isEmpty();
            assertThat(context.getBeansOfType(AttachmentIntegrityMetrics.class)).hasSize(1);
            assertThat(directory.resolve("unused")).doesNotExist();
        }
    }

    @Test
    void neverRunGraceInitialFailureAndPassAnchorSurviveRestartAndDrift() throws Exception {
        var clock = new MutableClock();
        var store = new AttachmentIntegrityReportStore(JsonMapper.builder().configureForJackson2().build(), directory.toString());
        var files = mock(AttachmentIntegrityService.class);
        var references = mock(AttachmentReferenceIntegrityService.class);
        var metrics = new SimpleMeterRegistry();
        new AttachmentIntegrityMetrics(store, metrics, true, clock);
        long firstEnabled = store.loadHealth().orElseThrow().observedSinceEpochSeconds();
        clock.advance(Duration.ofHours(27));
        var restartedMetrics = new SimpleMeterRegistry();
        var health = new AttachmentIntegrityMetrics(store, restartedMetrics, true, clock);
        assertThat(restartedMetrics.get(AttachmentIntegrityMetrics.HEALTHY_AGE).gauge().value()).isEqualTo(97200);
        assertThat(store.loadHealth().orElseThrow().observedSinceEpochSeconds()).isEqualTo(firstEnabled);
        when(files.scanBounded(eq(5), any(Duration.class))).thenThrow(new IllegalStateException("private-data"));
        var scheduler = new AttachmentIntegrityScheduler(files, references, store, restartedMetrics, 5, health);
        scheduler.scan();
        assertThat(restartedMetrics.get(AttachmentIntegrityMetrics.LAST_RUN_UNHEALTHY).gauge().value()).isEqualTo(1);
        assertThat(store.loadHealth().orElseThrow().lastHealthyEpochSeconds()).isZero();
        clock.advance(Duration.ofMinutes(1));
        when(files.scanBounded(eq(5), any(Duration.class))).thenReturn(new AttachmentIntegrityReport(
                3, 0, List.of(), "private-root", 3, 0, 0, List.of()));
        when(references.scan(5)).thenReturn(new AttachmentReferenceIntegrityService.Result(5, 0, 1, true));
        scheduler.scan();
        long pass = store.loadHealth().orElseThrow().lastHealthyEpochSeconds();
        assertThat(pass).isEqualTo(clock.instant().getEpochSecond());
        assertThat(restartedMetrics.get(AttachmentIntegrityMetrics.LAST_RUN_UNHEALTHY).gauge().value()).isZero();
        clock.advance(Duration.ofHours(4));
        when(files.scanBounded(eq(5), any(Duration.class))).thenReturn(new AttachmentIntegrityReport(
                3, 1, List.of("private-filename"), "private-root", 3, 0, 0, List.of()));
        scheduler.scan();
        assertThat(Files.readString(directory.resolve("last-complete.json"))).contains("DRIFT");
        assertThat(store.loadHealth().orElseThrow().lastHealthyEpochSeconds()).isEqualTo(pass);
        var afterDriftRestart = new SimpleMeterRegistry();
        new AttachmentIntegrityMetrics(store, afterDriftRestart, true, clock);
        assertThat(afterDriftRestart.get(AttachmentIntegrityMetrics.HEALTHY_AGE).gauge().value()).isEqualTo(14400);
        assertThat(afterDriftRestart.get(AttachmentIntegrityMetrics.LAST_RUN_UNHEALTHY).gauge().value()).isEqualTo(1);
        when(references.scan(5)).thenReturn(new AttachmentReferenceIntegrityService.Result(5, 0, 1, false));
        scheduler.scan();
        assertThat(store.loadHealth().orElseThrow().lastHealthyEpochSeconds()).isEqualTo(pass);
        assertThat(Files.readString(directory.resolve("health.json"))).doesNotContain("private-");
    }

    @Test
    void corruptedOversizedFutureAndUnwritableHealthRemainVisibleWithoutReplacingTheEvidence() throws Exception {
        var clock = new MutableClock();
        for (String bad : List.of("invalid-json", "x".repeat(4097),
                "{\"schemaVersion\":1,\"observedSinceEpochSeconds\":9999999999,\"lastHealthyEpochSeconds\":0,\"lastRunUnhealthy\":false}")) {
            Files.writeString(directory.resolve("health.json"), bad);
            var registry = new SimpleMeterRegistry();
            new AttachmentIntegrityMetrics(new AttachmentIntegrityReportStore(
                    JsonMapper.builder().configureForJackson2().build(), directory.toString()), registry, true, clock);
            assertThat(registry.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isZero();
            assertThat(Files.readString(directory.resolve("health.json"))).isEqualTo(bad);
        }
        var store = mock(AttachmentIntegrityReportStore.class);
        var registry = new SimpleMeterRegistry();
        var health = new AttachmentIntegrityMetrics(store, registry, true, clock);
        doThrow(new java.io.IOException("private-path")).when(store).saveHealth(any());
        clock.advance(Duration.ofMinutes(2));
        health.recordOutcome("FAILED");
        assertThat(registry.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isZero();
        assertThat(registry.get(AttachmentIntegrityMetrics.LAST_RUN_UNHEALTHY).gauge().value()).isEqualTo(1);

        var restoredDirectory = directory.resolve("restored");
        var persistedStore = new AttachmentIntegrityReportStore(
                JsonMapper.builder().configureForJackson2().build(), restoredDirectory.toString());
        var persistedHealth = new AttachmentIntegrityMetrics(persistedStore, new SimpleMeterRegistry(), true, clock);
        persistedHealth.recordOutcome("PASS");
        var anchors = persistedStore.loadHealth().orElseThrow();
        String persisted = Files.readString(restoredDirectory.resolve("health.json"));
        clock.advance(Duration.ofMinutes(2));
        var unavailableStore = spy(persistedStore);
        doThrow(new java.io.IOException("private-path")).when(unavailableStore).saveHealth(any());
        var restoredRegistry = new SimpleMeterRegistry();
        new AttachmentIntegrityMetrics(unavailableStore, restoredRegistry, true, clock);
        assertThat(restoredRegistry.get(AttachmentIntegrityMetrics.OBSERVATION_HEALTHY).gauge().value()).isZero();
        assertThat(restoredRegistry.get(AttachmentIntegrityMetrics.HEALTHY_AGE).gauge().value()).isEqualTo(120);
        assertThat(restoredRegistry.get(AttachmentIntegrityMetrics.LAST_RUN_UNHEALTHY).gauge().value()).isZero();
        verify(unavailableStore).saveHealth(anchors);
        assertThat(persistedStore.loadHealth().orElseThrow()).isEqualTo(anchors);
        assertThat(Files.readString(restoredDirectory.resolve("health.json"))).isEqualTo(persisted);
    }
    @org.springframework.boot.test.context.TestConfiguration(proxyBeanMethods = false)
    @org.springframework.scheduling.annotation.EnableScheduling
    @org.springframework.scheduling.annotation.EnableAsync
    static class SchedulingEnabled { }

    @Test
    void configuredCronActuallyRunsOnTheDedicatedExecutorAndWritesAReport() {
        var files = mock(AttachmentIntegrityService.class);
        var references = mock(AttachmentReferenceIntegrityService.class);
        var thread = new java.util.concurrent.atomic.AtomicReference<String>();
        when(files.scanBounded(eq(5), any(Duration.class))).thenAnswer(invocation -> {
            thread.set(Thread.currentThread().getName());
            return new AttachmentIntegrityReport(0, 0, List.of(), "root", 0, 0, 0, List.of());
        });
        when(references.scan(5)).thenReturn(new AttachmentReferenceIntegrityService.Result(0, 0, 1, true));
        try (var context = new org.springframework.context.annotation.AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new org.springframework.core.env.MapPropertySource("scan-test", Map.of(
                    "nuri.attachment.integrity.enabled", "true", "nuri.attachment.integrity.cron", "*/1 * * * * *", "nuri.attachment.integrity.max-items", "5")));
            context.registerBean(AttachmentIntegrityService.class, () -> files);
            context.registerBean(AttachmentReferenceIntegrityService.class, () -> references);
            context.registerBean(AttachmentIntegrityReportStore.class, () -> new AttachmentIntegrityReportStore(JsonMapper.builder().configureForJackson2().build(), directory.toString()));
            context.registerBean(io.micrometer.core.instrument.MeterRegistry.class, SimpleMeterRegistry::new);
            context.register(SchedulingEnabled.class, AttachmentIntegrityConfig.class, AttachmentIntegrityMetrics.class, AttachmentIntegrityScheduler.class);
            context.refresh();
            org.awaitility.Awaitility.await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
                assertThat(directory.resolve("last-complete.json")).exists();
                assertThat(Files.readString(directory.resolve("last-complete.json"))).contains("PASS");
                assertThat(thread.get()).startsWith("attachment-integrity-");
            });
        }
    }

    private static final class MutableClock extends Clock {
        private Instant instant = Instant.parse("2026-10-01T00:00:00Z");
        void advance(Duration duration) { instant = instant.plus(duration); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return instant; }
    }

}
