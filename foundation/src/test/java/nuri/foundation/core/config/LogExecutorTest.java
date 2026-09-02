package nuri.foundation.core.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.SimpleAsyncTaskExecutor;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** {@code logExecutor}의 정상 종료 시 진행 중 작업 보존 계약. */
@DisplayName("logExecutor — 종료 시 수락한 로그 작업 보존")
class LogExecutorTest {

    @Test
    @DisplayName("close는 진행 중 로그 작업이 끝날 때까지 기다린다")
    void closeWaitsForRunningLogTask() throws InterruptedException {
        SimpleAsyncTaskExecutor executor =
                (SimpleAsyncTaskExecutor) new AsyncConfig().logExecutor();
        CountDownLatch taskStarted = new CountDownLatch(1);
        CountDownLatch releaseTask = new CountDownLatch(1);
        CountDownLatch taskCompleted = new CountDownLatch(1);
        CountDownLatch closeCompleted = new CountDownLatch(1);
        Thread closeThread = null;
        try {
            executor.execute(() -> {
                taskStarted.countDown();
                try {
                    releaseTask.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    taskCompleted.countDown();
                }
            });
            assertThat(taskStarted.await(5, TimeUnit.SECONDS)).isTrue();

            closeThread = Thread.ofPlatform().name("log-executor-close-test").start(() -> {
                executor.close();
                closeCompleted.countDown();
            });

            assertThat(closeCompleted.await(250, TimeUnit.MILLISECONDS))
                    .as("기본 timeout=0이면 close가 진행 중 로그 작업을 기다리지 않고 반환한다")
                    .isFalse();

            releaseTask.countDown();
            assertThat(taskCompleted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(closeCompleted.await(5, TimeUnit.SECONDS)).isTrue();
            closeThread.join(5_000);
            assertThat(closeThread.isAlive()).isFalse();
        } finally {
            releaseTask.countDown();
            if (closeThread != null) {
                closeThread.interrupt();
            }
            executor.close();
        }
    }
}
