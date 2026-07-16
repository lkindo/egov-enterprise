package nuri.business.service.mail;

import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 메일 비동기 발송 처리를 담당하는 컴포넌트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MailAsyncProcessor {

    private final EmailSender emailSender;
    private final SentMailRepository sentMailRepository;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;

    /**
     * 메일을 비동기로 발송하고 결과를 업데이트한다.
     * 외부 SMTP 연동 실패를 대비해 최대 3회 재시도한다.
     */
    @Async("taskExecutor")
    @org.springframework.retry.annotation.Retryable(
        retryFor = { Exception.class }, 
        maxAttempts = 3, 
        backoff = @org.springframework.retry.annotation.Backoff(delay = 2000)
    )
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processSending(String mssageId, String sj, String emailCn, String dsptchPerson, String recptnPerson) {
        log.info("Async mail processing started for Message ID: {}", mssageId);
        
        try {
            emailSender.send(sj, emailCn, dsptchPerson, recptnPerson);
        } catch (Exception e) {
            // Checked Exception을 RuntimeException으로 변환하여 @Retryable이 작동하도록 함
            throw new RuntimeException("Mail delivery failed, triggering retry", e);
        }
        
        SentMail sentMail = sentMailRepository.findById(mssageId).orElse(null);
        if (sentMail != null) {
            sentMail.updateResult("S"); // Success
            meterRegistry.counter("mail.dispatch.total", "result", "success").increment();
            log.info("Mail sent successfully for ID: {}", mssageId);
        }
    }

    /**
     * 모든 재시도 실패 시 호출되는 복구 메서드
     */
    @org.springframework.retry.annotation.Recover
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recoverSending(Exception e, String mssageId, String sj, String emailCn, String dsptchPerson, String recptnPerson) {
        log.error("All retry attempts failed for mail ID: {}, error: {}", mssageId, e.getMessage());
        SentMail sentMail = sentMailRepository.findById(mssageId).orElse(null);
        if (sentMail != null) {
            sentMail.updateResult("F"); // Final Failure
            meterRegistry.counter("mail.dispatch.total", "result", "failure").increment();
        }
    }
}
