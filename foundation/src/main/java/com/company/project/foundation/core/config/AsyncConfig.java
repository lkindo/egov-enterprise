package com.company.project.foundation.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import java.util.concurrent.Executor;

/**
 * 전역 비동기 처리 설정
 * - 시스템 로그, 감사 로그(Audit), 인프라 통계 연동 및 알림 발송 등
 * - 메인 스레드의 지연을 최소화하기 위해 전용 태스크 실행자를 정의합니다.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "logExecutor")
    public Executor logExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);        // 기본 가동 스레드
        executor.setMaxPoolSize(10);       // 최대 가동 스레드
        executor.setQueueCapacity(500);    // 대기 큐 용량
        executor.setThreadNamePrefix("LogAsync-");
        executor.initialize();
        return executor;
    }
}
