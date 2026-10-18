package nuri.business.service.system.job;

import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DurableWorkSchedulingConfigTest {
    @Test
    void blockedWorkersDoNotBlockSchedulingOrAcceptQueuedWork() throws Exception {
        try (var context = new AnnotationConfigApplicationContext(DurableWorkSchedulingConfig.class)) {
            var workers = context.getBean(DurableWorkSchedulingConfig.EXECUTOR_BEAN, ThreadPoolTaskExecutor.class);
            var scheduler = context.getBean(DurableWorkSchedulingConfig.SCHEDULER_BEAN, ThreadPoolTaskScheduler.class);
            var entered = new CountDownLatch(4);
            var release = new CountDownLatch(1);
            var tick = new CountDownLatch(1);
            var overflowRan = new AtomicBoolean();
            try {
                for (int index = 0; index < 4; index++) {
                    workers.execute(() -> {
                        entered.countDown();
                        try {
                            release.await();
                        } catch (InterruptedException interrupted) {
                            Thread.currentThread().interrupt();
                        }
                    });
                }
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();

                scheduler.schedule(tick::countDown, Instant.now());
                assertThat(tick.await(5, TimeUnit.SECONDS)).as("poll/heartbeat must not wait for handlers").isTrue();
                assertThatThrownBy(() -> workers.execute(() -> overflowRan.set(true)))
                        .isInstanceOf(RejectedExecutionException.class);
                assertThat(overflowRan).isFalse();
                assertThat(workers.getThreadPoolExecutor().getQueue()).isEmpty();
            } finally {
                release.countDown();
            }
        }
    }
}
