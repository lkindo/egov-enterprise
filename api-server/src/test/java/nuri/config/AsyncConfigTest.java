package nuri.config;

import java.util.concurrent.RejectedExecutionException;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AsyncConfigTest {

    @Test
    void saturationIsObservableAndNeverRunsOutboundIoOnCallerThread() {
        @SuppressWarnings("unchecked")
        ObjectProvider<io.micrometer.core.instrument.MeterRegistry> provider = mock(ObjectProvider.class);
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        when(provider.getIfAvailable()).thenReturn(registry);
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) new AsyncConfig().taskExecutor(provider);

        try {
            var handler = executor.getThreadPoolExecutor().getRejectedExecutionHandler();
            assertThat(handler).isNotInstanceOf(java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy.class);
            assertThatThrownBy(() -> handler.rejectedExecution(() -> { }, executor.getThreadPoolExecutor()))
                    .isInstanceOf(RejectedExecutionException.class);
            assertThat(registry.counter(AsyncConfig.DISPATCH_REJECTED_METRIC).count()).isEqualTo(1.0);
        } finally {
            executor.shutdown();
        }
    }
}
