package nuri.business.service.log;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.log.WebLog;
import nuri.business.domain.log.WebLogRepository;
import nuri.foundation.core.event.AuditEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

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

    /** 유실 카운터 메트릭 이름 — 대시보드·알람이 이 이름에 결속한다. 바꾸면 관측이 끊긴다. */
    public static final String DROP_METRIC = "audit.log.persist.failure";

    /**
     * 영속화에 실패한 감사 건수. [W1-E2]
     *
     * <p>감사 로그를 best-effort 로 두는 것 자체는 정당한 설계 선택이다 — 준-필수로 올리려면
     * 별도 저장(데드레터·파일 appender)이 필요해 범위가 급격히 커진다.
     * 다만 <b>유실이 보이지 않는 것</b>은 정당하지 않다. 얼마나 잃었는지 셀 수 없으면
     * "감사 로그가 있다"는 진술 자체를 신뢰할 수 없기 때문이다.
     *
     * <p>프로세스 내부 값이라 <b>외부에서 관측할 수 없다</b> — 그래서 아래 Micrometer 카운터를 함께 올린다.
     * 이 필드는 레지스트리가 없는 컨텍스트(단위 테스트 슬라이스)의 폴백이자 테스트 관측점으로 남긴다.
     */
    private final java.util.concurrent.atomic.AtomicLong persistFailureCount =
            new java.util.concurrent.atomic.AtomicLong();

    /**
     * 유실 카운터의 <b>외부 관측</b> 경로. [2026-08-04 · E-2 잔여]
     *
     * <p>[왜 ObjectProvider 인가] business-core 는 Micrometer 를 <b>선택 의존</b>으로 쓴다.
     * {@code MeterRegistry} 를 생성자로 직접 주입하면 그 빈이 없는 컨텍스트에서 이 리스너의 생성이
     * 실패하고, 그러면 <b>감사 로깅이 통째로 빠진 채 테스트가 초록</b>이 된다
     * ({@code RateLimitFilter} 가 같은 이유로 메트릭 배선을 포기했던 지점이다).
     * 지연 조회로 두면 레지스트리가 있을 때만 계측하고, 없으면 조용히 폴백한다 — 어느 쪽도 깨지지 않는다.
     */
    private final org.springframework.beans.factory.ObjectProvider<
            io.micrometer.core.instrument.MeterRegistry> meterRegistryProvider;

    /**
     * [W1-E2] {@code auditExecutor} 로 한정한다.
     *
     * <p>종전의 한정자 없는 {@code @Async} 는 api-server 의 {@code taskExecutor} 로 해소되어
     * <b>메일·SMS 발송과 같은 풀</b>을 썼다. 모든 API 요청이 감사 INSERT 를 유발하므로
     * 트래픽이 몰리면 감사가 풀을 채워 발송을 굶겼다.
     *
     * <p><b>⚠ {@code @Transactional} 을 의도적으로 붙이지 않는다.</b> [2026-08-04 · E-2 잔여]
     *
     * <p>종전에는 이 메서드에 {@code @Transactional} 이 있었다. 그러면 실제 INSERT 는 메서드가
     * <b>반환된 뒤 커밋 시점</b>에 flush 되므로, 제약 위반·커넥션 실패 같은 <b>지배적 실패 모드가
     * 아래 catch 를 통과하지 못한다</b> — 예외는 프록시 밖으로 던져져 비동기 미처리 핸들러로 가고,
     * 유실 카운터는 <b>0 을 유지한다</b>. 즉 "유실을 센다"는 진술이 정작 가장 흔한 유실에는 거짓이었다.
     *
     * <p>{@code SimpleJpaRepository.save} 자체가 {@code @Transactional} 이므로, 바깥 트랜잭션이 없으면
     * 저장은 {@code save()} 호출 안에서 열리고 <b>거기서 커밋된다</b>. 따라서 실패가 {@code save()} 에서
     * 던져지고 이 catch 에 잡힌다. 감사 1건 INSERT 에 선언적 트랜잭션이 필요하지도 않다.
     */
    @Async("auditExecutor")
    @EventListener
    public void onAuditEvent(AuditEvent event) {
        try {
            WebLog webLog = WebLog.builder()
                    .url(event.url())
                    .dmndUserId(event.userId())
                    .dmndUserIpAddr(event.clientIp())
                    .occrYmd(event.occurredAt().format(YMD))
                    .prcsTm(event.durationMs())
                    .build();
            webLogRepository.save(webLog);
        } catch (Exception e) {
            // 요청 처리에는 영향을 주지 않되(비파괴 원칙), 유실을 셀 수 있게 남긴다.
            long total = persistFailureCount.incrementAndGet();
            recordDropMetric();
            log.error("웹 감사 로그 영속화 실패(요청 처리에는 영향 없음) — 누적 유실 {}건: {}", total, e.toString());
        }
    }

    /** 레지스트리가 있을 때만 계측한다. 없으면 프로세스 내부 카운터만 남는다(폴백). */
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
