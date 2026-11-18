package nuri.business.service.file;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Component
@ConditionalOnProperty(name = "nuri.attachment.integrity.enabled", havingValue = "true")
public class AttachmentIntegrityScheduler {
    private static final Duration RECEIPT_PRUNE_MIN_AGE = Duration.ofHours(24);

    private final AttachmentIntegrityService files;
    private final AttachmentReferenceIntegrityService references;
    private final AttachmentIntegrityReportStore store;
    private final MeterRegistry metrics;
    private final AttachmentIntegrityMetrics health;
    private final int maxItems;
    @Nullable
    private final LocalFileStorageService localStorage;
    private final AtomicBoolean running = new AtomicBoolean();

    @org.springframework.beans.factory.annotation.Autowired
    public AttachmentIntegrityScheduler(AttachmentIntegrityService files, AttachmentReferenceIntegrityService references,
            AttachmentIntegrityReportStore store, MeterRegistry metrics,
            @Value("${nuri.attachment.integrity.max-items:50000}") int maxItems, AttachmentIntegrityMetrics health,
            @Nullable LocalFileStorageService localStorage) {
        if (maxItems < 1 || maxItems > 1_000_000) throw new IllegalArgumentException("Invalid attachment scan limit");
        this.files = files;
        this.references = references;
        this.store = store;
        this.metrics = metrics;
        this.health = health;
        this.maxItems = maxItems;
        this.localStorage = localStorage;
    }

    public AttachmentIntegrityScheduler(AttachmentIntegrityService files, AttachmentReferenceIntegrityService references,
            AttachmentIntegrityReportStore store, MeterRegistry metrics, int maxItems, AttachmentIntegrityMetrics health) {
        this(files, references, store, metrics, maxItems, health, null);
    }

    public AttachmentIntegrityScheduler(AttachmentIntegrityService files, AttachmentReferenceIntegrityService references,
            AttachmentIntegrityReportStore store, MeterRegistry metrics, int maxItems) {
        this(files, references, store, metrics, maxItems, new AttachmentIntegrityMetrics(store, metrics, true), null);
    }

    @Scheduled(cron = "${nuri.attachment.integrity.cron:0 15 3 * * *}", zone = "Asia/Seoul")
    @org.springframework.scheduling.annotation.Async("attachmentIntegrityExecutor")
    public void scan() {
        if (!running.compareAndSet(false, true)) return;
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("startedAt", Instant.now().toString());
        String outcome = "FAILED";
        boolean completed = false;
        try {
            var report = files.scanBounded(maxItems, Duration.ofSeconds(60));
            var links = references.scan(maxItems);
            summary.put("checked", report.checked());
            summary.put("missing", report.missing());
            summary.put("storedFilesChecked", report.storedFilesChecked());
            summary.put("orphanCandidates", report.orphanCandidates());
            summary.put("undecidable", report.undecidable());
            summary.put("referencesChecked", links.checked());
            summary.put("danglingReferences", links.dangling());
            summary.put("sourcesChecked", links.sourcesChecked());
            completed = links.complete() && report.undecidable() == 0;
            outcome = !completed ? "INCOMPLETE"
                    : report.missing() > 0 || links.dangling() > 0 ? "DRIFT" : "PASS";
            if (localStorage != null) {
                try {
                    int prunedReceipts = localStorage.pruneCompletedDeletionReceipts(RECEIPT_PRUNE_MIN_AGE);
                    summary.put("prunedDeletionReceipts", prunedReceipts);
                } catch (RuntimeException pruneFailure) {
                    log.warn("Failed to prune completed deletion receipts during integrity scan", pruneFailure);
                }
            }
        } catch (AttachmentIntegrityService.ScanLimitExceededException limit) {
            outcome = "INCOMPLETE";
        } catch (RuntimeException failure) {
            // Raw DB/storage exception text may contain data or connection details.
            outcome = "FAILED";
        } finally {
            summary.put("finishedAt", Instant.now().toString());
            summary.put("outcome", outcome);
            try {
                store.save(summary, completed);
            } catch (Exception writeFailure) {
                outcome = "REPORT_FAILED";
            }
            health.recordOutcome(outcome);
            metrics.counter("nuri.attachment.integrity.runs", "outcome", outcome).increment();
            log.info("Attachment integrity scheduled scan outcome={}", outcome);
            running.set(false);
        }
    }
}
