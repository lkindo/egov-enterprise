package nuri.business.service.mail;

import nuri.business.domain.mail.SentMailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 메일 비동기 발송 처리를 담당하는 컴포넌트
 *
 * 외부 SMTP IO 는 트랜잭션 밖에서 수행한다 — 발송이 tx 안에 있으면 SMTP 지연 동안
 * DB 커넥션을 점유하고, 발송 성공 후 커밋 실패 시 실제 발송과 기록이 어긋난다.
 * 상태 기록만 짧은 REQUIRES_NEW 트랜잭션(markResult)으로 분리해 즉시 커밋한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MailAsyncProcessor {

    private final EmailSender emailSender;
    private final SentMailRepository sentMailRepository;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    /** 발신 이력 화면. 실패 알림을 누르면 여기서 결과를 확인하고 다시 보낸다. */
    static final String MAIL_HISTORY_PATH = "/admin/collaboration/mail-history";

    private MailAsyncProcessor self;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy MailAsyncProcessor self) {
        this.self = self;
    }

    /** The durable worker awaits this bounded executor task before acknowledging its job. */
    @Async("taskExecutor")
    public java.util.concurrent.CompletableFuture<Void> dispatchCommitted(Long emlDsptchSn,
            java.time.LocalDateTime queuedAt, String sj, String emailCn, String dsptchPerson, String recptnPerson,
            String senderEsntlId) {
        if (Thread.currentThread().isInterrupted()) throw new IllegalStateException("Mail delivery interrupted");
        if (!self.claimQueued(emlDsptchSn, queuedAt)) {
            return java.util.concurrent.CompletableFuture.completedFuture(null);
        }
        boolean delivered = self.deliverMail(emlDsptchSn, sj, emailCn, dsptchPerson, recptnPerson);
        meterRegistry.counter("mail.dispatch.total", "result", delivered ? "success" : "failure").increment();
        boolean recorded = self.recordResult(emlDsptchSn, queuedAt, delivered ? "S" : "F");
        if (recorded && !delivered && senderEsntlId != null && !senderEsntlId.isBlank()) {
            try {
                self.notifyDeliveryFailure(emlDsptchSn, senderEsntlId);
            } catch (RuntimeException e) {
                // 알림 실패가 발송 결과 기록을 되돌리지 않는다 — 결과는 이미 이력에 있다.
                log.error("Mail failure notice could not be requested for dispatch serial number: {}, errorType: {}",
                        emlDsptchSn, e.getClass().getSimpleName());
            }
        }
        return java.util.concurrent.CompletableFuture.completedFuture(null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimQueued(Long emlDsptchSn, java.time.LocalDateTime queuedAt) {
        return sentMailRepository.claimQueued(emlDsptchSn, queuedAt) == 1;
    }

    /** 실패로 확정된 발송을 발신자에게 알린다 — 알림은 업무 트랜잭션 안에서 저장된다(NotificationRequestListener). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyDeliveryFailure(Long emlDsptchSn, String senderEsntlId) {
        sentMailRepository.findById(emlDsptchSn).ifPresent(mail -> eventPublisher.publishEvent(
                new nuri.foundation.core.event.NotificationRequestedEvent(senderEsntlId, "메일 발송 실패",
                        failureNotice(mail.getEmlTtl(), mail.getRcvrNm()), MAIL_HISTORY_PATH)));
    }

    static String failureNotice(String title, String receiverName) {
        String subject = title == null || title.isBlank() ? "메일" : "「" + title.trim() + "」 메일";
        String receiver = receiverName == null || receiverName.isBlank() ? "" : receiverName.trim() + "에게 ";
        return subject + "을 " + receiver + "보내지 못했습니다. 발신 이력에서 결과를 확인하고 다시 보낼 수 있습니다.";
    }

    /** 발송만 재시도한다. 결과 기록이나 커밋 실패는 이 경계로 전파되지 않는다. */
    @org.springframework.retry.annotation.Retryable(
        retryFor = { Exception.class },
        recover = "recoverSending",
        maxAttempts = 3,
        backoff = @org.springframework.retry.annotation.Backoff(delay = 2000)
    )
    public boolean deliverMail(Long emlDsptchSn, String sj, String emailCn, String dsptchPerson, String recptnPerson) {
        log.info("Async mail processing started for dispatch serial number: {}", emlDsptchSn);

        try {
            emailSender.send(sj, emailCn, dsptchPerson, recptnPerson);
        } catch (MailDeliveryUnavailableException e) {
            log.warn("Mail delivery unavailable for dispatch serial number: {}", emlDsptchSn);
            return false;
        } catch (Exception e) {
            // Checked Exception을 RuntimeException으로 변환하여 @Retryable이 작동하도록 함
            throw new RuntimeException("Mail delivery failed, triggering retry", e);
        }

        log.info("Mail sent successfully for dispatch serial number: {}", emlDsptchSn);
        return true;
    }

    /**
     * 모든 재시도 실패 시 호출되는 복구 메서드
     */
    @org.springframework.retry.annotation.Recover
    public boolean recoverSending(Exception e, Long emlDsptchSn, String sj, String emailCn, String dsptchPerson, String recptnPerson) {
        log.error("All retry attempts failed for mail dispatch serial number: {}, errorType: {}",
                emlDsptchSn, e.getClass().getSimpleName());
        return false;
    }

    /** 트랜잭션 프록시 밖에서 커밋 실패까지 포함해 기록만 재시도한다. */
    @org.springframework.retry.annotation.Retryable(
        retryFor = { org.springframework.dao.DataAccessException.class, org.springframework.transaction.TransactionException.class },
        recover = "recoverRecording",
        maxAttempts = 3,
        backoff = @org.springframework.retry.annotation.Backoff(delay = 1000)
    )
    public boolean recordResult(Long emlDsptchSn, java.time.LocalDateTime queuedAt, String resultCode) {
        return self.markResult(emlDsptchSn, queuedAt, resultCode);
    }

    @org.springframework.retry.annotation.Recover
    public boolean recoverRecording(Exception e, Long emlDsptchSn, java.time.LocalDateTime queuedAt, String resultCode) {
        log.error("Mail result recording exhausted for dispatch serial number: {}, intendedResult: {}, errorType: {}",
                emlDsptchSn, resultCode, e.getClass().getSimpleName());
        meterRegistry.counter("mail.dispatch.recording.failures").increment();
        return false;
    }

    /**
     * 발송 결과 기록 — 짧은 트랜잭션으로 즉시 커밋(외부 IO 와 분리).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean markResult(Long emlDsptchSn, java.time.LocalDateTime queuedAt, String resultCode) {
        return sentMailRepository.recordResult(emlDsptchSn, queuedAt, resultCode) == 1;
    }
}
