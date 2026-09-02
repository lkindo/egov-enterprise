package nuri.business.service.log;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.log.PrivacyLog;
import nuri.business.domain.log.PrivacyLogRepository;
import nuri.foundation.core.event.PrivacyAccessEvent;
import nuri.foundation.core.util.IdGenerationUtil;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * 개인정보 접근 증적을 {@code tb_privacy_log}로 영속화하는 비동기 리스너.
 *
 * <p><b>⚠ 종전에는 이 테이블에 쓰는 코드가 저장소에 하나도 없었다.</b> 조회 서비스
 * ({@code PrivacyLogManageService})와 관리 화면 {@code /admin/system/logs/privacy}는 있었지만
 * 적재 경로가 없어 <b>영원히 빈 표</b>였다. 그 서비스의 javadoc이 "적재는 개인정보 접근 지점이
 * 담당한다"고 적어 둔 그 지점이 존재하지 않았다.
 *
 * <p>기록 대상은 {@link nuri.foundation.core.annotation.PrivacyAccess}가 붙은 핸들러의
 * <b>성공 응답</b>뿐이다. 어디까지 기록되는지는 그 애노테이션의 부착 지점이 정본이다.
 *
 * <p>[비파괴 원칙] 감사 전용 풀에서 비동기 실행하고 실패를 세되 원 요청에는 영향을 주지 않는다.
 * 단, 개인정보 증적은 컴플라이언스 대상이라 유실을 <b>WARN 이 아니라 ERROR</b>로 남긴다.
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

    @Async("auditExecutor")
    @EventListener
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
            privacyLogRepository.save(entity);
        } catch (Exception e) {
            long total = persistFailureCount.incrementAndGet();
            recordDropMetric();
            log.error("개인정보 접근 로그 영속화 실패(요청 처리에는 영향 없음) — 누적 유실 {}건: {}", total, e.toString());
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
