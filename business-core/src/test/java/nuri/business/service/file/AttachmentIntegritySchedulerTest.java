package nuri.business.service.file;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.service.file.dto.AttachmentIntegrityReport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AttachmentIntegritySchedulerTest {
    @TempDir Path directory;

    @Test
    void savesAggregateResultsAndKeepsLastCompleteResultAcrossFailureAndRestart() throws Exception {
        var files = mock(AttachmentIntegrityService.class);
        var references = mock(AttachmentReferenceIntegrityService.class);
        var mapper = new ObjectMapper();
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
        try (var entries = Files.list(directory)) { assertThat(entries.toList()).hasSize(2); }
    }

    @Test
    void incompleteReferenceCensusDoesNotBecomeACompletedSnapshot() throws Exception {
        var files = mock(AttachmentIntegrityService.class);
        var references = mock(AttachmentReferenceIntegrityService.class);
        var store = new AttachmentIntegrityReportStore(new ObjectMapper(), directory.toString());
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
            context.registerBean(AttachmentIntegrityReportStore.class, () -> new AttachmentIntegrityReportStore(new ObjectMapper(), directory.toString()));
            context.registerBean(io.micrometer.core.instrument.MeterRegistry.class, SimpleMeterRegistry::new);
            context.register(SchedulingEnabled.class, AttachmentIntegrityConfig.class, AttachmentIntegrityScheduler.class);
            context.refresh();
            org.awaitility.Awaitility.await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
                assertThat(directory.resolve("last-complete.json")).exists();
                assertThat(Files.readString(directory.resolve("last-complete.json"))).contains("PASS");
                assertThat(thread.get()).startsWith("attachment-integrity-");
            });
        }
    }

}
