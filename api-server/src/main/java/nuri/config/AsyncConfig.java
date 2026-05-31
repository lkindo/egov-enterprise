package nuri.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 비동기 처리 설정
 * - 메일 발송, 로그 기록 등 부가 작업의 비동기 처리를 위한 스레드 풀 설정
 */
@Configuration
@EnableAsync
@Profile("!test")
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
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
        // 큐 고갈 시 거부 전략: 호출한 스레드에서 처리하여 안정성 확보
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setTaskDecorator(new nuri.foundation.core.config.ThreadLocalCopyTaskDecorator());
        executor.initialize();
        return executor;
    }
}
