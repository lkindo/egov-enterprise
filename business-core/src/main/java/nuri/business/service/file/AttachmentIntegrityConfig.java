package nuri.business.service.file;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Slow storage I/O must not occupy the shared scheduler used by dashboard updates. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "nuri.attachment.integrity.enabled", havingValue = "true")
public class AttachmentIntegrityConfig {
    @Bean
    public ThreadPoolTaskExecutor attachmentIntegrityExecutor() {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(0);
        executor.setThreadNamePrefix("attachment-integrity-");
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.setAwaitTerminationSeconds(10);
        return executor;
    }
}
