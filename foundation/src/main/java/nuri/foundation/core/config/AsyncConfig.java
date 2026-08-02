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
     * <b>풀을 물리적으로 나누면 그 논쟁 자체가 사라진다.</b> 거부 정책은 건드리지 않았다.
     */
    @Bean(name = "auditExecutor")
    public Executor auditExecutor() {
        SimpleAsyncTaskExecutor executor = new SimpleAsyncTaskExecutor("AuditAsync-");
        executor.setVirtualThreads(true);
        executor.setConcurrencyLimit(LOG_EXECUTOR_CONCURRENCY_LIMIT);
        executor.setTaskDecorator(new ThreadLocalCopyTaskDecorator());
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
