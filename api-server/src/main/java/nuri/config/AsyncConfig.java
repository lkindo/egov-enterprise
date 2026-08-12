package nuri.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

/**
 * 비동기 처리 설정
 * - 메일 발송, 로그 기록 등 부가 작업의 비동기 처리를 위한 스레드 풀 설정
 */
@Configuration
@EnableAsync
@Profile("!test")
@Slf4j
public class AsyncConfig {

    public static final String DISPATCH_REJECTED_METRIC = "outbound.dispatch.executor.rejected";

    @Bean(name = "taskExecutor")
    public Executor taskExecutor(
            org.springframework.beans.factory.ObjectProvider<io.micrometer.core.instrument.MeterRegistry> meterRegistries) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 기본 스레드 수: 10
        executor.setCorePoolSize(10);
        // 최대 스레드 수: 50 (부하 시 확장)
        executor.setMaxPoolSize(50);
        // 대기 큐 크기: 100
        executor.setQueueCapacity(100);
        // 스레드 이름 접두사: 모니터링 시 식별 용이
        executor.setThreadNamePrefix("egov-async-");
        // 시스템 종료 시 대기 작업 완료 대기
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        // 외부 메일/SMS I/O를 요청 스레드에서 실행하면 큐 포화가 API 지연·타임아웃으로 전파된다.
        // 거부는 예외 + 메트릭으로 명시하고, 호출 서비스가 DB의 P 상태를 F로 전환해 유실을 가시화한다.
        executor.setRejectedExecutionHandler((task, pool) -> {
            io.micrometer.core.instrument.MeterRegistry registry = meterRegistries.getIfAvailable();
            if (registry != null) {
                registry.counter(DISPATCH_REJECTED_METRIC).increment();
            }
            log.error("Outbound dispatch executor saturated (active={}, queued={}, capacity={})",
                    pool.getActiveCount(), pool.getQueue().size(), pool.getQueue().remainingCapacity());
            throw new RejectedExecutionException("Outbound dispatch executor saturated");
        });
        executor.setTaskDecorator(new nuri.foundation.core.config.ThreadLocalCopyTaskDecorator());
        executor.initialize();
        return executor;
    }
}
