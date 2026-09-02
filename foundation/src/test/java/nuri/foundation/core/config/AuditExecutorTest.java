package nuri.foundation.core.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 🧾 감사 실행자의 <b>포화 거동</b> 검증 — {@code AsyncConfig#auditExecutor}.
 *
 * <p>[왜 이 테스트인가] 종전 실행자는 {@code SimpleAsyncTaskExecutor.setConcurrencyLimit} 세마포어라
 * 포화 시 {@code execute()} 가 <b>호출 스레드를 블로킹</b>했다. 감사 이벤트는 요청 처리 중 동기
 * 발행되므로 블로킹되는 것은 <b>요청 스레드</b>였다 — 부가 기능이 본 기능을 인질로 잡는 형태다.
 *
 * <p>이 성질은 설정 한 줄로 조용히 되돌아갈 수 있고(거부 핸들러 제거·CallerRunsPolicy 복귀),
 * 되돌아가도 기능 테스트는 전부 초록이다. 그래서 <b>포화를 실제로 만들어</b> 확인한다.
 */
@DisplayName("auditExecutor — 포화 시 거동")
class AuditExecutorTest {

    private Executor auditExecutor(MeterRegistry registry) {
        @SuppressWarnings("unchecked")
        ObjectProvider<MeterRegistry> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(registry);
        return new AsyncConfig().auditExecutor(provider);
    }

    @Test
    @DisplayName("🚨 큐가 포화돼도 제출 스레드는 블로킹되지 않는다 — 감사가 요청을 인질로 잡지 않는다")
    void saturatedQueueDoesNotBlockTheSubmittingThread() throws InterruptedException {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) auditExecutor(registry);

        CountDownLatch hold = new CountDownLatch(1);
        try {
            // 풀 스레드를 전부 붙잡아 큐에만 쌓이게 한다.
            for (int i = 0; i < executor.getCorePoolSize(); i++) {
                executor.execute(() -> {
                    try {
                        hold.await(10, TimeUnit.SECONDS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
            }

            // 큐 용량을 넘겨 제출한다. 블로킹된다면 이 루프가 여기서 멈춘다.
            long startedAt = System.nanoTime();
            for (int i = 0; i < executor.getQueueCapacity() + 500; i++) {
                assertThatCode(() -> executor.execute(() -> { }))
                        .as("제출이 예외로 깨지면 @Async 호출부(=요청 스레드)가 함께 깨진다")
                        .doesNotThrowAnyException();
            }
            long elapsedMs = (System.nanoTime() - startedAt) / 1_000_000;

            assertThat(elapsedMs)
                    .as("포화 상태에서 %d건 제출이 %dms 걸렸다 — 블로킹(세마포어 대기)이면 초 단위로 늘어난다",
                            executor.getQueueCapacity() + 500, elapsedMs)
                    .isLessThan(5_000);

            assertThat(registry.counter(AsyncConfig.AUDIT_REJECTED_METRIC).count())
                    .as("버린 태스크가 계측되지 않으면 유실이 조용해진다")
                    .isGreaterThan(0.0);
        } finally {
            hold.countDown();
            executor.shutdown();
        }
    }

    @Test
    @DisplayName("큐는 유계다 — 무제한이면 폭주 시 메모리로 번진다")
    void queueIsBounded() {
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) auditExecutor(new SimpleMeterRegistry());
        try {
            assertThat(executor.getQueueCapacity())
                    .as("Integer.MAX_VALUE 면 사실상 무계 큐다")
                    .isPositive()
                    .isLessThan(Integer.MAX_VALUE);
            assertThat(executor.getCorePoolSize())
                    .as("감사가 Hikari 최대 풀(20)을 다 가져가면 요청 처리가 커넥션을 얻지 못한다")
                    .isLessThan(20);
        } finally {
            executor.shutdown();
        }
    }

    @Test
    @DisplayName("MeterRegistry 가 없어도 거부 처리가 깨지지 않는다")
    void rejectionWorksWithoutMeterRegistry() {
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) auditExecutor(null);
        try {
            assertThatCode(() -> executor.execute(() -> { }))
                    .doesNotThrowAnyException();
        } finally {
            executor.shutdown();
        }
    }

    @Test
    @DisplayName("정상 종료는 실행 중 작업을 기다린 뒤 큐의 감사 작업까지 완료한다")
    void shutdownWaitsForQueuedAuditTasks() throws InterruptedException {
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) auditExecutor(new SimpleMeterRegistry());
        CountDownLatch workersStarted = new CountDownLatch(executor.getCorePoolSize());
        CountDownLatch releaseWorkers = new CountDownLatch(1);
        CountDownLatch queuedTaskRan = new CountDownLatch(1);
        Thread shutdownThread = null;
        try {
            for (int i = 0; i < executor.getCorePoolSize(); i++) {
                executor.execute(() -> {
                    workersStarted.countDown();
                    try {
                        releaseWorkers.await();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
            }
            assertThat(workersStarted.await(5, TimeUnit.SECONDS)).isTrue();
            executor.execute(queuedTaskRan::countDown);

            CountDownLatch shutdownEntered = new CountDownLatch(1);
            shutdownThread = Thread.ofPlatform().name("audit-shutdown-test").start(() -> {
                shutdownEntered.countDown();
                executor.shutdown();
            });
            assertThat(shutdownEntered.await(5, TimeUnit.SECONDS)).isTrue();
            long shutdownDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (!executor.getThreadPoolExecutor().isShutdown()
                    && System.nanoTime() < shutdownDeadline) {
                Thread.onSpinWait();
            }
            assertThat(executor.getThreadPoolExecutor().isShutdown()).isTrue();
            releaseWorkers.countDown();

            assertThat(queuedTaskRan.await(5, TimeUnit.SECONDS))
                    .as("정상 종료 중 큐에 있던 감사 작업이 폐기됐다")
                    .isTrue();
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
