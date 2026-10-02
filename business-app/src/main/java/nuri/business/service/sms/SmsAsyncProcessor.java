package nuri.business.service.sms;

import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnId;
import nuri.business.domain.sms.SmsRecptnRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Claim commits before external POST. Its unknown outcome must never cause an automatic resend.
 * Receipt lookup is read-only I/O; result CAS and DB-only retries use short REQUIRES_NEW transactions.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SmsAsyncProcessor {
    private final SmsSender smsSender;
    private final SmsRecptnRepository smsRecptnRepository;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    static final String SMS_ADMIN_PATH = "/admin/uss/ion/sms";
    private Clock clock = Clock.systemUTC();
    private SmsAsyncProcessor self;
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy SmsAsyncProcessor self) {
        this.self = self;
    }

    void setClock(Clock clock) { this.clock = java.util.Objects.requireNonNull(clock); }

    @Async("taskExecutor")
    public void processSending(Long smsTrsmSn, String senderTel, String content) {
        processSending(smsTrsmSn, senderTel, content, null);
    }

    @Async("taskExecutor")
    public void processSending(Long smsTrsmSn, String senderTel, String content, String senderEsntlId) {
        List<SmsRecptn> recipients = smsRecptnRepository.findByIdSmsTrsmSn(smsTrsmSn);
        int failed = 0;
        for (SmsRecptn recipient : recipients) {
            try {
                if (self.sendToRecipient(smsTrsmSn, recipient.getRcptnTelno(), senderTel, content)
                        == SmsGatewayResult.State.REJECTED) failed++;
            } catch (RuntimeException failure) {
                // A DB/worker failure does not prove the provider rejected a possibly accepted POST.
                log.error("SMS dispatch remains unconfirmed: transmission={}, recipient={}, errorType={}",
                        smsTrsmSn, nuri.foundation.core.util.PiiMaskUtil.phone(recipient.getRcptnTelno()),
                        failure.getClass().getSimpleName());
            }
        }
        if (failed > 0 && senderEsntlId != null && !senderEsntlId.isBlank()) {
            try { self.notifyDeliveryFailure(senderEsntlId, failed, recipients.size()); }
            catch (RuntimeException failure) {
                log.error("SMS failure notice could not be requested: transmission={}, errorType={}",
                        smsTrsmSn, failure.getClass().getSimpleName());
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyDeliveryFailure(String senderEsntlId, int failed, int total) {
        eventPublisher.publishEvent(new nuri.foundation.core.event.NotificationRequestedEvent(senderEsntlId,
                "문자 발송 실패", "문자 " + total + "건 중 " + failed + "건을 보내지 못했습니다. 문자 관리에서 수신자 결과를 확인해 주세요.",
                SMS_ADMIN_PATH));
    }

    /** No retry annotation: even an exception after acceptance cannot justify a second POST. */
    public SmsGatewayResult.State sendToRecipient(Long smsTrsmSn, String recipientPhone, String senderTel, String content) {
        Optional<String> claimed = self.claimSending(smsTrsmSn, recipientPhone);
        if (claimed.isEmpty()) return SmsGatewayResult.State.PENDING;
        SmsGatewayResult result;
        try {
            result = java.util.Objects.requireNonNull(smsSender.send(recipientPhone, content, senderTel));
        } catch (RuntimeException failure) {
            log.warn("SMS provider outcome unconfirmed: transmission={}, recipient={}, errorType={}",
                    smsTrsmSn, nuri.foundation.core.util.PiiMaskUtil.phone(recipientPhone),
                    failure.getClass().getSimpleName());
            result = SmsGatewayResult.unknown(SmsGatewayResult.Reason.UNCONFIRMED);
        }
        SmsReceiptState receipt = SmsReceiptState.parse(claimed.get()).orElseThrow().submitted(result, clock.millis());
        String metricResult = switch (receipt.stage()) {
            case ACCEPTED -> "pending";
            case REJECTED -> "failure";
            default -> "unknown";
        };
        meterRegistry.counter("sms.dispatch.total", "result", metricResult).increment();
        self.recordResult(smsTrsmSn, recipientPhone, claimed.get(), receipt.resultCode(), receipt.encode());
        return switch (receipt.stage()) {
            case REJECTED -> SmsGatewayResult.State.REJECTED;
            case UNKNOWN -> SmsGatewayResult.State.UNKNOWN;
            default -> SmsGatewayResult.State.PENDING;
        };
    }

    /** Only a never-claimed committed recipient can initiate a POST. The lock serializes workers. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<String> claimSending(Long smsTrsmSn, String recipientPhone) {
        boundRecipientLockWait();
        return lockedRecipient(smsTrsmSn, recipientPhone)
                .filter(row -> "P".equals(row.getRsltCd()) && row.getRsltMsg() == null)
                .map(row -> {
                    String claim = SmsReceiptState.claim(clock.millis()).encode();
                    row.updateResult("P", claim);
                    return claim;
                });
    }

    /** Bounded candidates and elapsed start budget; the current in-flight query also has an HTTP timeout. */
    @Async("taskExecutor")
    public CompletableFuture<Void> reconcilePending() {
        long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(20);
        List<SmsRecptn> candidates = smsRecptnRepository.findPendingDeliveryReceipts(
                SmsReceiptState.ACCEPTED_PATTERN, SmsReceiptState.CLAIMED_PATTERN,
                org.springframework.data.domain.PageRequest.of(0, 200));
        int queried = 0;
        for (SmsRecptn row : candidates) {
            if (queried >= 50 || System.nanoTime() >= deadline) break;
            try {
                Optional<String> prepared = self.prepareReconciliation(row.getSmsTrsmSn(), row.getRcptnTelno());
                if (prepared.isEmpty()) continue;
                queried++;
                self.reconcileRecipient(row.getSmsTrsmSn(), row.getRcptnTelno(), prepared.get());
            } catch (RuntimeException failure) {
                log.warn("SMS receipt row reconciliation deferred: errorType={}", failure.getClass().getSimpleName());
                meterRegistry.counter("sms.delivery.receipts.total", "result", "lookup_failed").increment();
            }
        }
        return CompletableFuture.completedFuture(null);
    }

    /** Persists the read budget/next poll before GET so concurrent schedulers do not duplicate work. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<String> prepareReconciliation(Long smsTrsmSn, String recipientPhone) {
        boundRecipientLockWait();
        return lockedRecipient(smsTrsmSn, recipientPhone).filter(row -> "P".equals(row.getRsltCd())).flatMap(row -> {
            var parsed = SmsReceiptState.parse(row.getRsltMsg());
            if (parsed.isEmpty() || parsed.get().implausibleTiming(clock.millis())) {
                // Quarantine bad private envelopes. Otherwise old malformed candidates starve later receipts.
                if (row.getRsltMsg() != null && row.getRsltMsg().startsWith(SmsReceiptState.PREFIX))
                    row.updateResult("P", SmsReceiptState.claim(clock.millis())
                            .submitted(SmsGatewayResult.unknown(SmsGatewayResult.Reason.UNCONFIRMED), clock.millis()).encode());
                return Optional.empty();
            }
            SmsReceiptState state = parsed.get();
            if (state.stage() != SmsReceiptState.Stage.CLAIMED && state.stage() != SmsReceiptState.Stage.ACCEPTED)
                return Optional.empty();
            // The last allowed GET already consumed its poll budget when this lease committed.
            // Preserve that worker's receipt until the lease ends so its result can still win the CAS.
            if (state.stage() == SmsReceiptState.Stage.ACCEPTED && state.nextPollAt() > clock.millis())
                return Optional.empty();
            if (state.expired(clock.millis())) {
                row.updateResult("P", state.expired().encode());
                meterRegistry.counter("sms.delivery.receipts.total", "result", "expired").increment();
                return Optional.empty();
            }
            if (state.stage() == SmsReceiptState.Stage.CLAIMED || state.nextPollAt() > clock.millis())
                return Optional.empty();
            String claim = state.pollClaim(clock.millis()).encode();
            row.updateResult("P", claim);
            return Optional.of(claim);
        });
    }

    public void reconcileRecipient(Long smsTrsmSn, String recipientPhone, String expectedReceipt) {
        SmsReceiptState previous = SmsReceiptState.parse(expectedReceipt).orElseThrow();
        SmsGatewayResult result;
        try {
            result = java.util.Objects.requireNonNull(smsSender.query(previous.requestId(), previous.messageId(), recipientPhone));
        } catch (RuntimeException failure) {
            log.warn("SMS receipt lookup unconfirmed: transmission={}, errorType={}", smsTrsmSn, failure.getClass().getSimpleName());
            result = SmsGatewayResult.unknown(SmsGatewayResult.Reason.LOOKUP_FAILED);
        }
        SmsReceiptState receipt = previous.reconciled(result);
        self.recordResult(smsTrsmSn, recipientPhone, expectedReceipt, receipt.resultCode(), receipt.encode());
        String metricResult = switch (receipt.stage()) {
            case DELIVERED -> "success";
            case REJECTED -> "failure";
            default -> receipt.reason() == SmsGatewayResult.Reason.LOOKUP_FAILED ? "lookup_failed" : "pending";
        };
        meterRegistry.counter("sms.delivery.receipts.total", "result", metricResult).increment();
    }

    @org.springframework.retry.annotation.Retryable(
        retryFor = { org.springframework.dao.DataAccessException.class, org.springframework.transaction.TransactionException.class },
        recover = "recoverRecording", maxAttempts = 3,
        backoff = @org.springframework.retry.annotation.Backoff(delay = 1000)
    )
    public void recordResult(Long smsTrsmSn, String recipientPhone, String expectedReceipt, String rsltCd, String rsltMsg) {
        self.updateResult(smsTrsmSn, recipientPhone, expectedReceipt, rsltCd, rsltMsg);
    }

    @org.springframework.retry.annotation.Recover
    public void recoverRecording(Exception failure, Long smsTrsmSn, String recipientPhone, String expectedReceipt, String rsltCd, String rsltMsg) {
        log.error("SMS result recording exhausted: transmission={}, recipient={}, intendedResult={}, errorType={}",
                smsTrsmSn, nuri.foundation.core.util.PiiMaskUtil.phone(recipientPhone), rsltCd, failure.getClass().getSimpleName());
        meterRegistry.counter("sms.dispatch.recording.failures").increment();
    }

    /** A stale result cannot overwrite terminal state, a new attempt, or an already removed recipient. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateResult(Long smsTrsmSn, String recipientPhone, String expectedReceipt, String rsltCd, String rsltMsg) {
        boundRecipientLockWait();
        lockedRecipient(smsTrsmSn, recipientPhone)
                .filter(row -> "P".equals(row.getRsltCd()) && java.util.Objects.equals(expectedReceipt, row.getRsltMsg()))
                .ifPresent(r -> r.updateResult(rsltCd, rsltMsg));
    }

    /** Queue rejection is a failure only before any worker claimed the POST; accepted receipts stay P. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markBatchRejected(Long smsTrsmSn) {
        boundRecipientLockWait();
        smsRecptnRepository.findRecipientNumbers(smsTrsmSn).stream()
                .forEach(recipient -> lockedRecipient(smsTrsmSn, recipient)
                        .filter(row -> "P".equals(row.getRsltCd()) && row.getRsltMsg() == null)
                        .ifPresent(row -> row.updateResult("F", "Dispatch queue saturated")));
    }

    private Optional<SmsRecptn> lockedRecipient(Long smsTrsmSn, String recipientPhone) {
        String canonical = nuri.business.domain.sms.SmsRecipientNumber.requireValid(recipientPhone);
        return smsRecptnRepository.findByIdForUpdate(new SmsRecptnId(smsTrsmSn, canonical))
                .or(() -> canonical.equals(recipientPhone) ? Optional.empty()
                        : smsRecptnRepository.findByIdForUpdate(new SmsRecptnId(smsTrsmSn, recipientPhone)));
    }

    private void boundRecipientLockWait() {
        // Production JPA injects this shared proxy. Pure port/proxy unit fixtures have no persistence context.
        // PostgreSQL's local transaction setting enforces the deadline, unlike a positive JPA lock hint.
        if (entityManager != null && entityManager.getEntityManagerFactory()
                .unwrap(org.hibernate.engine.spi.SessionFactoryImplementor.class)
                .getJdbcServices().getDialect() instanceof org.hibernate.dialect.PostgreSQLDialect)
            entityManager.createNativeQuery("SET LOCAL lock_timeout = '2s'").executeUpdate();
    }
}
