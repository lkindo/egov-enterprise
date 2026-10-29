package nuri.business.service.mail;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
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
 * 상태와 실패 알림 의도를 짧은 REQUIRES_NEW 트랜잭션(markResult)으로 함께 커밋한다.
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
        self.recordResult(emlDsptchSn, queuedAt, delivered ? "S" : "F", senderEsntlId);
        return java.util.concurrent.CompletableFuture.completedFuture(null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimQueued(Long emlDsptchSn, java.time.LocalDateTime queuedAt) {
        return sentMailRepository.claimQueued(emlDsptchSn, queuedAt) == 1;
    }

    /** 결과 CAS를 이긴 시도의 알림을 같은 트랜잭션에 저장한다. */
    private void notifyDeliveryFailure(Long emlDsptchSn, java.time.LocalDateTime queuedAt, String senderEsntlId) {
        // intent에서 전달받은 시각을 사용한다. DB 재조회 시각의 정밀도로 시도 식별자를 바꾸지 않는다.
        UUID eventId = UUID.nameUUIDFromBytes(
                ("MAIL_FAILURE:" + emlDsptchSn + ":" + queuedAt).getBytes(StandardCharsets.UTF_8));
        sentMailRepository.findById(emlDsptchSn).ifPresent(mail -> eventPublisher.publishEvent(
                new nuri.foundation.core.event.NotificationRequestedEvent(eventId, senderEsntlId, "메일 발송 실패",
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
    public boolean recordResult(Long emlDsptchSn, java.time.LocalDateTime queuedAt, String resultCode, String senderEsntlId) {
        return self.markResult(emlDsptchSn, queuedAt, resultCode, senderEsntlId);
    }

    @org.springframework.retry.annotation.Recover
    public boolean recoverRecording(Exception e, Long emlDsptchSn, java.time.LocalDateTime queuedAt,
            String resultCode, String senderEsntlId) {
        log.error("Mail result recording exhausted for dispatch serial number: {}, intendedResult: {}, errorType: {}",
                emlDsptchSn, resultCode, e.getClass().getSimpleName());
        meterRegistry.counter("mail.dispatch.recording.failures").increment();
        if (!"F".equals(resultCode)) return false;

        // 삭제된 발신자 등의 영구 알림 오류가 확정된 F 결과까지 잃게 하지 않는다.
        // 결과 전용 CAS는 한 번만 시도하며 SMTP를 다시 호출하지 않는다.
        try {
            boolean recorded = self.markFailureWithoutNotice(emlDsptchSn, queuedAt);
            if (recorded && senderEsntlId != null && !senderEsntlId.isBlank()) {
                meterRegistry.counter("mail.dispatch.failure.notices.lost").increment();
                log.error("Mail failure notice was not recorded for dispatch serial number: {}, errorType: {}",
                        emlDsptchSn, e.getClass().getSimpleName());
            }
            // CAS 0은 이전 시도이거나 이미 커밋된 결과일 수 있다. 알림 유실로 세지 않는다.
            return recorded;
        } catch (RuntimeException failure) {
            log.error("Mail result-only recording failed for dispatch serial number: {}, errorType: {}",
                    emlDsptchSn, failure.getClass().getSimpleName());
            return false;
        }
    }

    /**
     * 발송 결과와 실패 알림을 함께 기록한다. 커밋 실패도 recordResult 프록시가 재시도한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean markResult(Long emlDsptchSn, java.time.LocalDateTime queuedAt, String resultCode, String senderEsntlId) {
        if (sentMailRepository.recordResult(emlDsptchSn, queuedAt, resultCode) != 1) return false;
        if ("F".equals(resultCode) && senderEsntlId != null && !senderEsntlId.isBlank()) {
            notifyDeliveryFailure(emlDsptchSn, queuedAt, senderEsntlId);
        }
        return true;
    }

    /** 알림 저장이 소진돼도 확정 실패는 보존한다. 이 저장마저 실패하면 기존 P/UNKNOWN이 남는다. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean markFailureWithoutNotice(Long emlDsptchSn, java.time.LocalDateTime queuedAt) {
        return sentMailRepository.recordResult(emlDsptchSn, queuedAt, "F") == 1;
    }
}
