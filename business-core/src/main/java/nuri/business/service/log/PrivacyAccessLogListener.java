package nuri.business.service.log;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.log.PrivacyLog;
import nuri.business.domain.log.PrivacyLogRepository;
import nuri.foundation.core.event.PrivacyAccessEvent;
import nuri.foundation.core.util.IdGenerationUtil;
import org.springframework.context.event.EventListener;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Component;

/**
 * PREPARED 원장과 같은 트랜잭션으로 기존 개인정보 감사 화면의 투영을 기록한다.
 * 동기 저장 실패는 전송 전에 전파한다. PREPARED는 응답 준비이며 클라이언트 수신 증거가 아니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PrivacyAccessLogListener {

    /** {@code tb_privacy_log.inq_info} 컬럼 폭. */
    private static final int INQ_INFO_MAX = 255;

    /** {@code tb_privacy_log.srvc_nm} 컬럼 폭. */
    private static final int SRVC_NM_MAX = 100;

    /** 유실 카운터 메트릭 이름 — 대시보드·알람이 이 이름에 결속한다. 바꾸면 관측이 끊긴다. */
    public static final String DROP_METRIC = "audit.privacylog.persist.failure";

    private final PrivacyLogRepository privacyLogRepository;

    private final org.springframework.beans.factory.ObjectProvider<
            io.micrometer.core.instrument.MeterRegistry> meterRegistryProvider;

    private final java.util.concurrent.atomic.AtomicLong persistFailureCount =
            new java.util.concurrent.atomic.AtomicLong();

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onPrivacyAccess(PrivacyAccessEvent event) {
        try {
            PrivacyLog entity = PrivacyLog.builder()
                    .dmndId(IdGenerationUtil.generateAuditRequestId())
                    .inqDt(event.occurredAt())
                    .srvcNm(truncate(event.serviceName(), SRVC_NM_MAX))
                    .inqInfo(truncate(event.inqInfo(), INQ_INFO_MAX))
                    .dmndUserId(event.userId())
                    .dmndUserIpAddr(event.clientIp())
                    .build();
            privacyLogRepository.saveAndFlush(entity);
        } catch (Exception e) {
            long total = persistFailureCount.incrementAndGet();
            recordDropMetric();
            log.error("개인정보 접근 준비 기록 실패(민감 응답 차단) — 누적 실패 {}건, 예외유형={}",
                    total, e.getClass().getSimpleName());
            throw new nuri.foundation.core.exception.BusinessException(
                    nuri.foundation.core.exception.CommonErrorCode.SERVER_OVERLOAD,
                    "감사 기록을 저장할 수 없어 민감 응답을 중단했습니다.");
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private void recordDropMetric() {
        io.micrometer.core.instrument.MeterRegistry registry = meterRegistryProvider.getIfAvailable();
        if (registry != null) {
            registry.counter(DROP_METRIC).increment();
        }
    }

    /** 테스트·운영 점검용 유실 누계. 외부 관측은 {@link #DROP_METRIC} 메트릭을 쓴다. */
    public long getPersistFailureCount() {
        return persistFailureCount.get();
    }
}
