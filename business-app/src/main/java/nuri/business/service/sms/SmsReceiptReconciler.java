package nuri.business.service.sms;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Provider receipt lookup uses the same bounded external-I/O executor; rejection never resends. */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "nuri.sms.provider", havingValue = "sens")
public class SmsReceiptReconciler {
    private final SmsAsyncProcessor processor;

    @Scheduled(fixedDelayString = "${nuri.sms.receipts.interval-ms:30000}",
            initialDelayString = "${nuri.sms.receipts.initial-delay-ms:30000}")
    public void reconcile() {
        try {
            processor.reconcilePending().whenComplete((ignored, failure) -> {
                if (failure != null) log.warn("SMS receipt reconciliation failed: errorType={}", failure.getClass().getSimpleName());
            });
        } catch (RuntimeException failure) {
            log.warn("SMS receipt reconciliation deferred: errorType={}", failure.getClass().getSimpleName());
        }
    }
}
