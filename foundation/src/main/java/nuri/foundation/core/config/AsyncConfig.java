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
