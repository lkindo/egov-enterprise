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

import java.util.List;

/**
 * SMS 비동기 발송 처리를 담당하는 컴포넌트
 *
 * 외부 게이트웨이 IO 는 트랜잭션 밖에서 수행한다 — 발송 루프가 tx 를 잡으면
 * 루프 전체가 DB 커넥션을 점유하고(외부 지연 = 커넥션 고갈), 커밋이 루프 종료로
 * 미뤄져 중간 크래시 시 진행분 발송 결과가 전량 유실된다.
 * 결과 기록은 수신자 단위 짧은 REQUIRES_NEW 트랜잭션으로 즉시 커밋한다.
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
     * 수신자 목록 조회 외에는 트랜잭션을 열지 않는다(외부 IO 비점유 원칙).
     */
    @Async("taskExecutor")
    public void processSending(String smsId, String senderTel, String content) {
        log.info("Async processing started for SMS ID: {}", smsId);

        List<SmsRecptn> recipients = smsRecptnRepository.findByIdSmsId(smsId);

        for (SmsRecptn recptn : recipients) {
            try {
                self.sendToRecipient(recptn.getSmsId(), recptn.getRcptnTelno(), senderTel, content);
            } catch (Exception e) {
                log.error("Final failure for SMS to: {}, error: {}", recptn.getRcptnTelno(), e.getMessage());
            }
        }

        log.info("Async processing completed for SMS ID: {}", smsId);
    }

    /**
     * 개별 수신자 발송 (재시도 적용) — 외부 IO 이므로 트랜잭션을 열지 않는다.
     * 결과 기록만 updateResult 의 짧은 트랜잭션에 위임한다.
     */
    @org.springframework.retry.annotation.Retryable(
        retryFor = { Exception.class },
        maxAttempts = 3,
        backoff = @org.springframework.retry.annotation.Backoff(delay = 1000)
    )
    public void sendToRecipient(String smsId, String rcptnTelno, String senderTel, String content) {
        log.debug("Attempting to send SMS to: {}", rcptnTelno);
        boolean success = smsSender.send(rcptnTelno, content, senderTel);

        if (success) {
            self.updateResult(smsId, rcptnTelno, "S", "Success");
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
    public void recoverSmsSending(Exception e, String smsId, String rcptnTelno, String senderTel, String content) {
        log.error("All retries failed for SMS to: {}, error: {}", rcptnTelno, e.getMessage());
        self.updateResult(smsId, rcptnTelno, "F", "Final Failure: " + e.getMessage());
        meterRegistry.counter("sms.dispatch.total", "result", "failure").increment();
    }

    /**
     * 발송 결과 기록 — 수신자 단위 짧은 트랜잭션으로 즉시 커밋(외부 IO 와 분리).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateResult(String smsId, String rcptnTelno, String rsltCd, String rsltMsg) {
        smsRecptnRepository.findById(new SmsRecptnId(smsId, rcptnTelno))
                .ifPresent(r -> r.updateResult(rsltCd, rsltMsg));
    }
}
