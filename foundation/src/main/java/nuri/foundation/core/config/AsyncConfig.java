package nuri.foundation.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.core.task.SimpleAsyncTaskExecutor;
import org.springframework.retry.annotation.EnableRetry;
import java.util.concurrent.Executor;

import org.springframework.scheduling.annotation.EnableScheduling;
import lombok.extern.slf4j.Slf4j;

/**
 * 전역 비동기 처리, 재시도 및 스케줄링 설정
 * - 시스템 로그, 감사 로그(Audit), 인프라 통계 연동 및 알림 발송 등
 * - 메인 스레드의 지연을 최소화하기 위해 전용 태스크 실행자를 정의합니다.
 */
@Slf4j
@Configuration
@EnableAsync
@EnableRetry
@EnableScheduling
public class AsyncConfig implements AsyncConfigurer {

    /**
     * [회복탄력성] 비동기 태스크 동시성 상한. SimpleAsyncTaskExecutor는 기본이 무제한(UNBOUNDED)이라
     * 감사/로그/알림 폭주 시 DB 커넥션·다운스트림을 고갈시킬 수 있으므로 세마포어로 상한을 둔다(백프레셔).
     * 가상 스레드를 쓰되 동시 실행 수는 이 값으로 제한된다. 필요 시 DB 풀 크기에 맞춰 조정.
     */
    private static final int LOG_EXECUTOR_CONCURRENCY_LIMIT = 64;

    @Bean(name = "logExecutor")
    public Executor logExecutor() {
        SimpleAsyncTaskExecutor executor = new SimpleAsyncTaskExecutor("LogAsync-");
        executor.setVirtualThreads(true);
        executor.setConcurrencyLimit(LOG_EXECUTOR_CONCURRENCY_LIMIT);
        executor.setTaskDecorator(new ThreadLocalCopyTaskDecorator());
        return executor;
    }

    /**
     * 웹 감사 로그 전용 실행자. [W1-E2]
     *
     * <p>[왜 분리하는가] 감사 로그 영속화는 종전에 한정자 없는 {@code @Async} 였고, 그것은
     * api-server 의 {@code taskExecutor} 로 해소되어 <b>메일·SMS 발송과 같은 풀</b>을 썼다.
     * 모든 API 요청이 감사 INSERT 를 하나씩 유발하므로, 트래픽이 몰리면 감사가 풀을 채워
     * 메일·SMS 를 굶기고 그 풀의 {@code CallerRunsPolicy} 가 요청 스레드로 작업을 되돌렸다.
     *
     * <p>감사가 "메일/SMS 와 같은 풀을 쓴다"는 사실 때문에 거부 정책 변경
     * ({@code CallerRunsPolicy → AbortPolicy})이 논쟁거리였다 — 바꾸면 포화 시 발송이 조용히
     * 유실되고, 그것은 2026-07-17 에 고친 "SMS/Mail silent drop" 의 정확한 재발이기 때문이다.
     * <b>풀을 물리적으로 나누면 그 논쟁 자체가 사라진다.</b>
     * (2026-08-04: 풀 분리가 끝났으므로 이제 이 풀의 거부 정책을 안전하게 바꿀 수 있다 — 아래 참조.)
     */

    /**
     * 감사 실행자 <b>유계 큐</b> 용량. [2026-08-04 · E-2 잔여]
     *
     * <p>큐가 이 값을 넘으면 <b>버린다</b>(아래 거부 핸들러). 감사는 best-effort 라 버리는 것 자체는
     * 설계 선택이며, 중요한 것은 <b>버렸다는 사실이 보이는가</b>다 — 그래서 거부를 계측한다.
     */
    private static final int AUDIT_QUEUE_CAPACITY = 2_000;

    /**
     * 감사 실행자 스레드 수. Hikari 최대 풀(20)보다 작게 둔다 —
     * 감사가 커넥션을 다 가져가면 정작 요청 처리가 커넥션을 못 얻는다.
     */
    private static final int AUDIT_POOL_SIZE = 8;

    /** 큐 포화로 <b>버려진</b> 감사 태스크 수. 대시보드·알람이 이 이름에 결속한다. */
    public static final String AUDIT_REJECTED_METRIC = "audit.log.executor.rejected";

    /**
     * 웹 감사 로그 전용 실행자 — <b>유계 큐 + 논블로킹 거부</b>. [2026-08-04 · E-2 잔여]
     *
     * <p>[무엇이 문제였나] 종전에는 {@code SimpleAsyncTaskExecutor.setConcurrencyLimit(64)} 였다.
     * 그 상한은 세마포어라, 포화되면 {@code execute()} 가 <b>호출 스레드를 블로킹</b>한다.
     * 감사 이벤트는 요청 처리 중 동기 발행되므로 <b>블로킹되는 것은 요청 스레드</b>다 —
     * 감사 로그(부가 기능)가 느려지면 API 응답이 함께 느려지는 구조였다.
     * "백프레셔" 라는 이름이 붙어 있었지만, 실제로는 부가 기능이 본 기능을 인질로 잡는 형태였다.
     *
     * <p>[바꾼 것] 유계 큐를 둔 스레드풀로 바꾸고, 큐가 차면 <b>블로킹도 예외도 없이 버린다</b>.
     * 버린 수는 {@link #AUDIT_REJECTED_METRIC} 로 계측한다. 감사는 best-effort 이므로 버리는 것은
     * 정당하지만, <b>조용히</b> 버리는 것은 정당하지 않다(2026-07-17 에 고친 "SMS/Mail silent drop" 과 같은 원칙).
     *
     * <p>[거부 정책 안전성] 결정 원장의 '순서 지뢰 2' 는 <b>감사와 메일/SMS 가 같은 풀을 쓰던 시절</b>의
     * 경고다(거부 정책을 바꾸면 발송이 조용히 유실된다). 풀은 이미 물리적으로 분리됐고 여기 담기는 것은
     * 감사 태스크뿐이므로, 이 변경이 발송 유실을 만들지 않는다.
     *
     * <p><b>남긴 것</b>: 원장이 함께 권한 <b>배치 워커</b>(N건을 모아 한 번에 INSERT)는 넣지 않았다.
     * 요청당 1 INSERT 의 왕복 비용은 그대로다. 배치는 유실 창(window)과 순서 보장을 함께 설계해야 하는
     * 별개 과제이므로 미이행으로 남긴다 — 완료로 적지 않는다.
     */
    @Bean(name = "auditExecutor")
    public Executor auditExecutor(
            org.springframework.beans.factory.ObjectProvider<
                    io.micrometer.core.instrument.MeterRegistry> meterRegistries) {
        org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor executor =
                new org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("AuditAsync-");
        executor.setCorePoolSize(AUDIT_POOL_SIZE);
        executor.setMaxPoolSize(AUDIT_POOL_SIZE);
        executor.setQueueCapacity(AUDIT_QUEUE_CAPACITY);
        executor.setTaskDecorator(new ThreadLocalCopyTaskDecorator());
        executor.setRejectedExecutionHandler((task, poolExecutor) -> {
            io.micrometer.core.instrument.MeterRegistry registry = meterRegistries.getIfAvailable();
            if (registry != null) {
                registry.counter(AUDIT_REJECTED_METRIC).increment();
            }
            // 요청 스레드로 되돌리지도(CallerRuns), 예외를 던지지도(Abort) 않는다.
            // 되돌리면 블로킹 문제가 그대로고, 던지면 @Async 호출부(=요청 스레드)가 깨진다.
            log.warn("[AUDIT] 감사 로그 태스크를 버렸습니다 — 큐 포화(capacity={}). 유실은 {} 메트릭으로 관측하십시오.",
                    AUDIT_QUEUE_CAPACITY, AUDIT_REJECTED_METRIC);
        });
        executor.initialize();
        return executor;
    }

    /**
     * [회복탄력성] void 반환 @Async(감사 로그·알림 발송 등)에서 던져진 예외는 기본 핸들러가 단순 로깅만 하고
     * 유실되기 쉽다. 메서드·컨텍스트와 함께 명시적으로 기록해 원인 추적을 보장한다.
     * (필요 시 MeterRegistry 카운터/데드레터 연동 지점)
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) -> log.error(
                "[ASYNC-UNCAUGHT] {}.{} 비동기 실행 실패 (paramCount={}): {}",
                method.getDeclaringClass().getSimpleName(), method.getName(),
                params == null ? 0 : params.length, ex.getMessage(), ex);
    }
}
