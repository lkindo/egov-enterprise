package nuri.business.service.log;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.log.WebLog;
import nuri.business.domain.log.WebLogRepository;
import nuri.foundation.core.event.AuditEvent;
import nuri.foundation.core.util.IdGenerationUtil;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;

/**
 * API 접근 감사 이벤트({@link AuditEvent})를 {@code tb_web_log}로 영속화하는 비동기 리스너.
 *
 * <p>[비파괴 원칙] {@code @Async} + try/catch 로, 영속화 실패가 원 요청 처리에 절대 영향을 주지 않는다
 * (별도 스레드에서 실행되며 예외는 흡수). 감사 로그 도메인({@code domain/log})과 API 경계 인터셉터를
 * 이벤트로 디커플링한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebAuditLogListener {

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final WebLogRepository webLogRepository;

    /**
     * 영속화에 실패한 감사 건수. [W1-E2]
     *
     * <p>감사 로그를 best-effort 로 두는 것 자체는 정당한 설계 선택이다 — 준-필수로 올리려면
     * 별도 저장(데드레터·파일 appender)이 필요해 범위가 급격히 커진다.
     * 다만 <b>유실이 보이지 않는 것</b>은 정당하지 않다. 얼마나 잃었는지 셀 수 없으면
     * "감사 로그가 있다"는 진술 자체를 신뢰할 수 없기 때문이다.
     */
    private final java.util.concurrent.atomic.AtomicLong persistFailureCount =
            new java.util.concurrent.atomic.AtomicLong();

    /**
     * [W1-E2] {@code auditExecutor} 로 한정한다.
     *
     * <p>종전의 한정자 없는 {@code @Async} 는 api-server 의 {@code taskExecutor} 로 해소되어
     * <b>메일·SMS 발송과 같은 풀</b>을 썼다. 모든 API 요청이 감사 INSERT 를 유발하므로
     * 트래픽이 몰리면 감사가 풀을 채워 발송을 굶겼다.
     */
    @Async("auditExecutor")
    @EventListener
    @Transactional
    public void onAuditEvent(AuditEvent event) {
        try {
            WebLog webLog = WebLog.create(
                    IdGenerationUtil.generateId("WLOG_", 13),
                    event.url(),
                    event.userId(),
                    event.clientIp(),
                    event.occurredAt().format(YMD),
                    event.durationMs());
            webLogRepository.save(webLog);
        } catch (Exception e) {
            // 요청 처리에는 영향을 주지 않되(비파괴 원칙), 유실을 셀 수 있게 남긴다.
            long total = persistFailureCount.incrementAndGet();
            log.error("웹 감사 로그 영속화 실패(요청 처리에는 영향 없음) — 누적 유실 {}건: {}", total, e.toString());
        }
    }

    /** 테스트·운영 점검용 유실 누계. */
    public long getPersistFailureCount() {
        return persistFailureCount.get();
    }
}
