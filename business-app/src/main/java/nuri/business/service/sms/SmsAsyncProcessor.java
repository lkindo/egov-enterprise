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
    public void processSending(Long smsTrsmSn, String senderTel, String content) {
        log.info("Async processing started for SMS transmission serial number: {}", smsTrsmSn);

        List<SmsRecptn> recipients = smsRecptnRepository.findByIdSmsTrsmSn(smsTrsmSn);

        for (SmsRecptn recptn : recipients) {
            try {
                self.sendToRecipient(recptn.getSmsTrsmSn(), recptn.getRcptnTelno(), senderTel, content);
            } catch (Exception e) {
                log.error("Final failure for SMS to: {}, errorType: {}",
                        nuri.foundation.core.util.PiiMaskUtil.phone(recptn.getRcptnTelno()),
                        e.getClass().getSimpleName());
            }
        }

        log.info("Async processing completed for SMS transmission serial number: {}", smsTrsmSn);
    }

    /**
     * 개별 수신자 발송 (재시도 적용) — 외부 IO 이므로 트랜잭션을 열지 않는다.
     * 결과 기록만 updateResult 의 짧은 트랜잭션에 위임한다.
     */
    public void sendToRecipient(Long smsTrsmSn, String rcptnTelno, String senderTel, String content) {
        boolean delivered = self.deliverToRecipient(smsTrsmSn, rcptnTelno, senderTel, content);
        meterRegistry.counter("sms.dispatch.total", "result", delivered ? "success" : "failure").increment();
        self.recordResult(smsTrsmSn, rcptnTelno, delivered ? "S" : "F",
                delivered ? "Success" : "Gateway delivery failed");
    }

    /** 외부 발송만 재시도하며 DB 기록·커밋 실패와 경계를 분리한다. */
    @org.springframework.retry.annotation.Retryable(
        retryFor = { Exception.class },
        recover = "recoverSmsSending",
        maxAttempts = 3,
        backoff = @org.springframework.retry.annotation.Backoff(delay = 1000)
    )
    public boolean deliverToRecipient(Long smsTrsmSn, String rcptnTelno, String senderTel, String content) {
        log.debug("Attempting to send SMS to: {}", nuri.foundation.core.util.PiiMaskUtil.phone(rcptnTelno));
        boolean success = smsSender.send(rcptnTelno, content, senderTel);

        if (success) {
            return true;
        } else {
            // 외부 연동 실패 시 예외를 던져 재시도를 유도할 수 있음
            throw new IllegalStateException("SMS gateway did not confirm delivery");
        }
    }

    /**
     * 모든 재시도 실패 시 호출되는 복구 메서드
     */
    @org.springframework.retry.annotation.Recover
    public boolean recoverSmsSending(Exception e, Long smsTrsmSn, String rcptnTelno, String senderTel, String content) {
        // 외부 예외 메시지는 전화번호·본문·API 응답을 포함할 수 있으므로 로그/DB에 복제하지 않는다.
        log.error("All retries failed for SMS to: {}, errorType: {}",
                nuri.foundation.core.util.PiiMaskUtil.phone(rcptnTelno), e.getClass().getSimpleName());
        return false;
    }

    /** 새 트랜잭션의 커밋까지 끝난 뒤 성공으로 판단하는 기록 전용 재시도 경계. */
    @org.springframework.retry.annotation.Retryable(
        retryFor = { org.springframework.dao.DataAccessException.class, org.springframework.transaction.TransactionException.class },
        recover = "recoverRecording",
        maxAttempts = 3,
        backoff = @org.springframework.retry.annotation.Backoff(delay = 1000)
    )
    public void recordResult(Long smsTrsmSn, String rcptnTelno, String rsltCd, String rsltMsg) {
        self.updateResult(smsTrsmSn, rcptnTelno, rsltCd, rsltMsg);
    }

    @org.springframework.retry.annotation.Recover
    public void recoverRecording(Exception e, Long smsTrsmSn, String rcptnTelno, String rsltCd, String rsltMsg) {
        log.error("SMS result recording exhausted for transmission serial number: {}, recipient: {}, intendedResult: {}, errorType: {}",
                smsTrsmSn, nuri.foundation.core.util.PiiMaskUtil.phone(rcptnTelno), rsltCd, e.getClass().getSimpleName());
        meterRegistry.counter("sms.dispatch.recording.failures").increment();
    }

    /**
     * 발송 결과 기록 — 수신자 단위 짧은 트랜잭션으로 즉시 커밋(외부 IO 와 분리).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateResult(Long smsTrsmSn, String rcptnTelno, String rsltCd, String rsltMsg) {
        smsRecptnRepository.findById(new SmsRecptnId(smsTrsmSn, rcptnTelno))
                .ifPresent(r -> r.updateResult(rsltCd, rsltMsg));
    }

    /** 제출 큐 포화 시 커밋된 대기 건을 명시적 실패로 전환해 영구 P/무음 유실을 막는다. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markBatchRejected(Long smsTrsmSn) {
        smsRecptnRepository.findByIdSmsTrsmSn(smsTrsmSn).stream()
                .filter(recipient -> "P".equals(recipient.getRsltCd()))
                .forEach(recipient -> recipient.updateResult("F", "Dispatch queue saturated"));
    }
}
