package nuri.foundation.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.core.task.SimpleAsyncTaskExecutor;
import org.springframework.retry.annotation.EnableRetry;
import java.util.concurrent.Executor;

import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 전역 비동기 처리, 재시도 및 스케줄링 설정
 * - 시스템 로그, 감사 로그(Audit), 인프라 통계 연동 및 알림 발송 등
 * - 메인 스레드의 지연을 최소화하기 위해 전용 태스크 실행자를 정의합니다.
 */
@Configuration
@EnableAsync
@EnableRetry
@EnableScheduling
public class AsyncConfig {

    @Bean(name = "logExecutor")
    public Executor logExecutor() {
        SimpleAsyncTaskExecutor executor = new SimpleAsyncTaskExecutor("LogAsync-");
        executor.setVirtualThreads(true);
        executor.setTaskDecorator(new ThreadLocalCopyTaskDecorator());
        return executor;
    }
}
