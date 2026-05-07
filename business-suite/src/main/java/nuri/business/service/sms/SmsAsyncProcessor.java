package nuri.business.service.sms;

import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * SMS 비동기 발송 처리를 담당하는 컴포넌트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SmsAsyncProcessor {

    private final SmsSender smsSender;
    private final SmsRecptnRepository smsRecptnRepository;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;
    
    private SmsAsyncProcessor self;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy SmsAsyncProcessor self) {
        this.self = self;
    }

    /**
     * 특정 SMS의 수신자들에게 메시지를 비동기로 발송하고 결과를 업데이트한다.
     * 부모 트랜잭션과 독립적으로 동작하기 위해 REQUIRES_NEW 사용
     */
    @Async("taskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processSending(String smsId, String senderTel, String content) {
        log.info("Async processing started for SMS ID: {}", smsId);
        
        List<SmsRecptn> recipients = smsRecptnRepository.findByIdSmsId(smsId);
        
        for (SmsRecptn recptn : recipients) {
            try {
                self.sendToRecipient(recptn, senderTel, content);
            } catch (Exception e) {
                log.error("Final failure for SMS to: {}, error: {}", recptn.getRecptnTelno(), e.getMessage());
            }
        }
        
        log.info("Async processing completed for SMS ID: {}", smsId);
    }

    /**
     * 개별 수신자 발송 (재시도 적용)
     */
    @org.springframework.retry.annotation.Retryable(
        retryFor = { Exception.class },
        maxAttempts = 3,
        backoff = @org.springframework.retry.annotation.Backoff(delay = 1000)
    )
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendToRecipient(SmsRecptn recptn, String senderTel, String content) {
        log.debug("Attempting to send SMS to: {}", recptn.getRecptnTelno());
        boolean success = smsSender.send(recptn.getRecptnTelno(), content, senderTel);
        
        if (success) {
            recptn.updateResult("S", "Success");
            meterRegistry.counter("sms.dispatch.total", "result", "success").increment();
        } else {
            // 외부 연동 실패 시 예외를 던져 재시도를 유도할 수 있음
            throw new RuntimeException("SMS Gateway returned failure");
        }
    }

    /**
     * 모든 재시도 실패 시 호출되는 복구 메서드
     */
    @org.springframework.retry.annotation.Recover
    public void recoverSmsSending(Exception e, SmsRecptn recptn, String senderTel, String content) {
        log.error("All retries failed for SMS to: {}, error: {}", recptn.getRecptnTelno(), e.getMessage());
        recptn.updateResult("F", "Final Failure: " + e.getMessage());
        meterRegistry.counter("sms.dispatch.total", "result", "failure").increment();
    }
}
