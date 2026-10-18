package nuri.business.service.sms;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.RejectedExecutionException;
import nuri.business.domain.sms.Sms;
import nuri.business.domain.sms.SmsRepository;
import nuri.foundation.core.job.DurableWork;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SmsDeliveryWorkHandlerTest {
    private final SmsRepository messages = mock(SmsRepository.class);
    private final SmsAsyncProcessor processor = mock(SmsAsyncProcessor.class);
    private final SmsDeliveryWorkHandler handler = new SmsDeliveryWorkHandler(messages, processor);

    @Test void intentContainsOnlyReferencesAndStableBatchKey() {
        var work = SmsDeliveryWorkHandler.work(17L, "SENDER_1");
        assertThat(work).isEqualTo(SmsDeliveryWorkHandler.work(17L, "SENDER_1"));
        assertThat(work.payload()).contains("17", "SENDER_1");
        assertThat(handler.type()).isEqualTo(work.type());
        assertThat(handler.maximumConcurrentExecutions()).isEqualTo(1);
    }

    @Test void rejectionAndWorkerFailureRemainRetryableAndDeletedBatchesStayDeleted() {
        var work = SmsDeliveryWorkHandler.work(17L, null);
        when(messages.findById(17L)).thenReturn(Optional.empty());
        handler.execute(work);
        verifyNoInteractions(processor);
        var message = Sms.builder().sndngTelno("0212345678").sndngCn("synthetic body").build();
        ReflectionTestUtils.setField(message, "smsTrsmSn", 17L);
        when(messages.findById(17L)).thenReturn(Optional.of(message));
        when(processor.dispatchCommitted(17L, "0212345678", "synthetic body", null))
                .thenThrow(new RejectedExecutionException("full"))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("unavailable")))
                .thenReturn(CompletableFuture.completedFuture(null));
        assertThatThrownBy(() -> handler.execute(work)).isInstanceOf(RejectedExecutionException.class);
        assertThatThrownBy(() -> handler.execute(work)).hasCauseInstanceOf(IllegalStateException.class);
        handler.execute(work);
        verify(processor, times(3)).dispatchCommitted(17L, "0212345678", "synthetic body", null);
        assertThatThrownBy(() -> handler.execute(new DurableWork(work.key(), "WRONG_TYPE", work.payload())))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void handlerWaitsForTheOutboundExecutorBeforeAcknowledging() throws Exception {
        var message = Sms.builder().sndngTelno("0212345678").sndngCn("synthetic body").build();
        ReflectionTestUtils.setField(message, "smsTrsmSn", 17L);
        when(messages.findById(17L)).thenReturn(Optional.of(message));
        var entered = new java.util.concurrent.CountDownLatch(1);
        var outbound = new CompletableFuture<Void>();
        when(processor.dispatchCommitted(17L, "0212345678", "synthetic body", null)).thenAnswer(call -> {
            entered.countDown();
            return outbound;
        });
        try (var executor = java.util.concurrent.Executors.newSingleThreadExecutor()) {
            var execution = executor.submit(() -> handler.execute(SmsDeliveryWorkHandler.work(17L, null)));
            try {
                assertThat(entered.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> execution.get(100, java.util.concurrent.TimeUnit.MILLISECONDS))
                        .isInstanceOf(java.util.concurrent.TimeoutException.class);
            } finally { outbound.complete(null); }
            execution.get(5, java.util.concurrent.TimeUnit.SECONDS);
        }
    }
}
