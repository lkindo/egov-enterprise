package nuri.foundation.core.config;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.task.TaskSchedulingAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.SimpleAsyncTaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@code @Scheduled} 작업이 WebSocket 브로커 스케줄러가 아니라 전용 스케줄러에서 도는가(ADR-0024).
 *
 * <p>api-server 의 {@code @EnableWebSocketMessageBroker} 가 등록하는 {@code messageBrokerTaskScheduler} 를 같은 이름·접두의
 * 빈으로 흉내 낸다. Boot 4 는 이 빈이 있으면 기본 스케줄러를 만들지 않으므로, AsyncConfig 의 전용 스케줄러가 없으면
 * 작업이 {@code MessageBroker-*} 에서 돈다.
 */
@DisplayName("@Scheduled 전용 스케줄러 — WebSocket 브로커 스케줄러와 분리")
class SchedulingTaskSchedulerTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(TaskSchedulingAutoConfiguration.class))
            .withUserConfiguration(BrokerSchedulerConfig.class, AsyncConfig.class, ProbeJob.class);

    @Test
    @DisplayName("가상 스레드: 브로커 스케줄러가 있어도 scheduling- 가상 스레드에서 돈다")
    void virtualThreadsRunOnDedicatedScheduler() {
        runner.withPropertyValues("spring.threads.virtual.enabled=true").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean("taskScheduler")).isInstanceOf(SimpleAsyncTaskScheduler.class);
            ProbeJob job = context.getBean(ProbeJob.class);
            assertThat(job.ran.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(job.threadName).startsWith("scheduling-");
            assertThat(job.virtual).isTrue();
        });
    }

    @Test
    @DisplayName("플랫폼 스레드: 브로커 스케줄러가 있어도 scheduling- 스레드에서 돈다")
    void platformThreadsRunOnDedicatedScheduler() {
        runner.withPropertyValues("spring.threads.virtual.enabled=false").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean("taskScheduler")).isInstanceOf(ThreadPoolTaskScheduler.class);
            ProbeJob job = context.getBean(ProbeJob.class);
            assertThat(job.ran.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(job.threadName).startsWith("scheduling-");
            assertThat(job.virtual).isFalse();
        });
    }

    @Test
    @DisplayName("Boot 자동 설정이 없는 컨텍스트에서도 같은 접두의 스케줄러로 기동한다")
    void startsWithoutBootAutoConfiguration() {
        new ApplicationContextRunner()
                .withUserConfiguration(BrokerSchedulerConfig.class, AsyncConfig.class, ProbeJob.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    ProbeJob job = context.getBean(ProbeJob.class);
                    assertThat(job.ran.await(5, TimeUnit.SECONDS)).isTrue();
                    assertThat(job.threadName).startsWith("scheduling-");
                });
    }

    @Configuration(proxyBeanMethods = false)
    static class BrokerSchedulerConfig {
        @Bean
        ThreadPoolTaskScheduler messageBrokerTaskScheduler() {
            ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
            scheduler.setThreadNamePrefix("MessageBroker-");
            scheduler.setPoolSize(2);
            return scheduler;
        }
    }

    static class ProbeJob {
        final CountDownLatch ran = new CountDownLatch(1);
        volatile String threadName;
        volatile boolean virtual;

        @Scheduled(fixedDelay = 60_000)
        void record() {
            if (ran.getCount() > 0) {
                threadName = Thread.currentThread().getName();
                virtual = Thread.currentThread().isVirtual();
                ran.countDown();
            }
        }
    }
}
