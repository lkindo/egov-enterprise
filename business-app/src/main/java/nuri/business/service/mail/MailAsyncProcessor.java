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

    private MailAsyncProcessor self;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy MailAsyncProcessor self) {
        this.self = self;
    }

    /**
     * 메일을 비동기로 발송하고 결과를 업데이트한다.
     * 외부 SMTP 연동 실패를 대비해 최대 3회 재시도한다. 발송 자체는 트랜잭션을 열지 않는다.
     */
    @Async("taskExecutor")
    @org.springframework.retry.annotation.Retryable(
        retryFor = { Exception.class },
        maxAttempts = 3,
        backoff = @org.springframework.retry.annotation.Backoff(delay = 2000)
    )
    public void processSending(Long emlDsptchSn, String sj, String emailCn, String dsptchPerson, String recptnPerson) {
        log.info("Async mail processing started for dispatch serial number: {}", emlDsptchSn);

        try {
            emailSender.send(sj, emailCn, dsptchPerson, recptnPerson);
        } catch (Exception e) {
            // Checked Exception을 RuntimeException으로 변환하여 @Retryable이 작동하도록 함
            throw new RuntimeException("Mail delivery failed, triggering retry", e);
        }

        self.markResult(emlDsptchSn, "S"); // Success
        meterRegistry.counter("mail.dispatch.total", "result", "success").increment();
        log.info("Mail sent successfully for dispatch serial number: {}", emlDsptchSn);
    }

    /**
     * 모든 재시도 실패 시 호출되는 복구 메서드
     */
    @org.springframework.retry.annotation.Recover
    public void recoverSending(Exception e, Long emlDsptchSn, String sj, String emailCn, String dsptchPerson, String recptnPerson) {
        log.error("All retry attempts failed for mail dispatch serial number: {}, errorType: {}",
                emlDsptchSn, e.getClass().getSimpleName());
        self.markResult(emlDsptchSn, "F"); // Final Failure
        meterRegistry.counter("mail.dispatch.total", "result", "failure").increment();
    }

    /**
     * 발송 결과 기록 — 짧은 트랜잭션으로 즉시 커밋(외부 IO 와 분리).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markResult(Long emlDsptchSn, String resultCode) {
        sentMailRepository.findById(emlDsptchSn).ifPresent(m -> m.updateResult(resultCode));
    }
}
