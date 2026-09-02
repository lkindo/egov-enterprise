package nuri.foundation.core.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.task.SimpleAsyncTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** 알림 전용 실행자의 격리·포화·종료 계약. */
@DisplayName("notificationExecutor — logExecutor와 격리된 알림 실행자")
class NotificationExecutorTest {

    @Test
    @DisplayName("알림 풀이 포화돼도 logExecutor의 64개 부모 작업은 중첩 제출 후 반환한다")
    void saturatedNestedDispatchDoesNotDeadlockParentExecutor() throws InterruptedException {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        try (AnnotationConfigApplicationContext context = context(registry)) {
            SimpleAsyncTaskExecutor parentExecutor =
                    (SimpleAsyncTaskExecutor) context.getBean("logExecutor");
            ThreadPoolTaskExecutor notificationExecutor =
                    (ThreadPoolTaskExecutor) context.getBean("notificationExecutor");

            assertThat(notificationExecutor).isNotSameAs(parentExecutor);
            assertThat(notificationExecutor.getQueueCapacity())
                    .isPositive()
                    .isLessThan(Integer.MAX_VALUE);

            CountDownLatch notificationWorkersStarted =
                    new CountDownLatch(notificationExecutor.getMaxPoolSize());
            CountDownLatch releaseNotificationWorkers = new CountDownLatch(1);
            try {
                for (int i = 0; i < notificationExecutor.getMaxPoolSize(); i++) {
                    notificationExecutor.execute(() -> {
                        notificationWorkersStarted.countDown();
                        await(releaseNotificationWorkers);
                    });
                }
                assertThat(notificationWorkersStarted.await(5, TimeUnit.SECONDS)).isTrue();
                for (int i = 0; i < notificationExecutor.getQueueCapacity(); i++) {
                    notificationExecutor.execute(() -> { });
                }

                int parentLimit = parentExecutor.getConcurrencyLimit();
                assertThat(parentLimit).isEqualTo(64);
                CountDownLatch parentsStarted = new CountDownLatch(parentLimit);
                CountDownLatch releaseParents = new CountDownLatch(1);
                CountDownLatch parentsReturned = new CountDownLatch(parentLimit);
                Queue<Throwable> parentFailures = new ConcurrentLinkedQueue<>();
                for (int i = 0; i < parentLimit; i++) {
                    parentExecutor.execute(() -> {
                        parentsStarted.countDown();
                        await(releaseParents);
                        try {
                            notificationExecutor.execute(() -> { });
                        } catch (Throwable failure) {
                            parentFailures.add(failure);
                        } finally {
                            parentsReturned.countDown();
                        }
                    });
                }

                assertThat(parentsStarted.await(5, TimeUnit.SECONDS)).isTrue();
                releaseParents.countDown();

                assertThat(parentsReturned.await(5, TimeUnit.SECONDS))
                        .as("같은 풀 permit을 기다리면 64개 부모가 서로 반환하지 못한다")
                        .isTrue();
                assertThat(parentFailures).isEmpty();
                assertThat(registry.counter("notification.dispatch.executor.rejected").count())
                        .isGreaterThanOrEqualTo(parentLimit);
            } finally {
                releaseNotificationWorkers.countDown();
            }
        }
    }

    @Test
    @DisplayName("정상 종료는 큐에 수락한 알림 작업까지 완료한다")
    void shutdownWaitsForQueuedNotificationTasks() throws InterruptedException {
        try (AnnotationConfigApplicationContext context = context(new SimpleMeterRegistry())) {
            ThreadPoolTaskExecutor executor =
                    (ThreadPoolTaskExecutor) context.getBean("notificationExecutor");
            CountDownLatch workersStarted = new CountDownLatch(executor.getMaxPoolSize());
            CountDownLatch releaseWorkers = new CountDownLatch(1);
            CountDownLatch queuedTaskRan = new CountDownLatch(1);
            Thread shutdownThread = null;
            try {
                for (int i = 0; i < executor.getMaxPoolSize(); i++) {
                    executor.execute(() -> {
                        workersStarted.countDown();
                        await(releaseWorkers);
                    });
                }
                assertThat(workersStarted.await(5, TimeUnit.SECONDS)).isTrue();
                executor.execute(queuedTaskRan::countDown);

                shutdownThread = Thread.ofPlatform().name("notification-shutdown-test")
                        .start(executor::shutdown);
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
                while (!executor.getThreadPoolExecutor().isShutdown()
                        && System.nanoTime() < deadline) {
                    Thread.onSpinWait();
                }
                assertThat(executor.getThreadPoolExecutor().isShutdown()).isTrue();
                releaseWorkers.countDown();

                assertThat(queuedTaskRan.await(5, TimeUnit.SECONDS)).isTrue();
                shutdownThread.join(5_000);
                assertThat(shutdownThread.isAlive()).isFalse();
            } finally {
                releaseWorkers.countDown();
                if (shutdownThread != null) {
                    shutdownThread.interrupt();
                }
                executor.shutdown();
            }
        }
    }

    private static AnnotationConfigApplicationContext context(MeterRegistry registry) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        context.registerBean(MeterRegistry.class, () -> registry);
        context.register(AsyncConfig.class);
        context.refresh();
        return context;
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
