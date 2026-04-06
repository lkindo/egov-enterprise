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
                log.debug("Sending SMS to: {}", recptn.getRecptnTelno());
                boolean success = smsSender.send(recptn.getRecptnTelno(), content, senderTel);
                
                if (success) {
                    recptn.updateResult("S", "Success");
                } else {
                    recptn.updateResult("F", "Gateway Failure");
                }
            } catch (Exception e) {
                log.error("Failed to send SMS to: {}, error: {}", recptn.getRecptnTelno(), e.getMessage());
                recptn.updateResult("F", e.getMessage());
            }
        }
        
        log.info("Async processing completed for SMS ID: {}", smsId);
    }
}
