package nuri.business.service.system.job;

import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Polling and lease renewal stay responsive while bounded workers wait for external I/O. */
@Configuration(proxyBeanMethods = false)
public class DurableWorkSchedulingConfig {
    public static final String SCHEDULER_BEAN = "durableWorkScheduler";
    public static final String EXECUTOR_BEAN = "durableWorkExecutor";
    public static final int WORKER_COUNT = 4;

    @Bean(name = SCHEDULER_BEAN)
    public ThreadPoolTaskScheduler durableWorkScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("durable-work-scheduling-");
        scheduler.setRemoveOnCancelPolicy(true);
        scheduler.setWaitForTasksToCompleteOnShutdown(false);
        scheduler.setAwaitTerminationSeconds(10);
        return scheduler;
    }

    @Bean(name = EXECUTOR_BEAN)
    public ThreadPoolTaskExecutor durableWorkExecutor() {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(WORKER_COUNT);
        executor.setMaxPoolSize(WORKER_COUNT);
        // A task claims its DB lease only after entering a worker; there is no local waiting queue.
        executor.setQueueCapacity(0);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.setThreadNamePrefix("durable-work-");
        executor.setStrictEarlyShutdown(true);
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.setAwaitTerminationSeconds(10);
        return executor;
    }
}
