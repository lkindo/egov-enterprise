package nuri.business.service.mail;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.util.CryptoUtil;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MailDeliveryWorkHandlerTest {
    private static final LocalDateTime QUEUED = LocalDateTime.of(2026, 10, 18, 0, 0);
    private final SentMailRepository repository = mock(SentMailRepository.class);
    private final MailAsyncProcessor processor = mock(MailAsyncProcessor.class);
    private final MailDeliveryWorkHandler handler = new MailDeliveryWorkHandler(repository, processor);

    @Test
    void recoveryUsesEncryptedAcceptedAddressEvenWhenHistoryIsTruncatedOrContainsAnEmailDisplayName() {
        String original = "a".repeat(90) + "@example.invalid";
        try (var crypto = mockStatic(CryptoUtil.class)) {
            crypto.when(() -> CryptoUtil.encrypt(original)).thenReturn("encrypted-snapshot");
            crypto.when(() -> CryptoUtil.decrypt("encrypted-snapshot")).thenReturn(original);
            DurableWork work = MailDeliveryWorkHandler.work(7L, QUEUED, original, "system@example.invalid", null);
            assertThat(work.payload()).doesNotContain(original);
            for (String display : new String[]{original.substring(0, 100), "display@example.invalid"}) {
                SentMail mail = queued(display);
                when(repository.findById(7L)).thenReturn(Optional.of(mail));
                when(processor.dispatchCommitted(7L, QUEUED, "subject", "body", "system@example.invalid", original, null))
                        .thenReturn(CompletableFuture.completedFuture(null));
                handler.execute(work);
            }
            verify(processor, times(2)).dispatchCommitted(7L, QUEUED, "subject", "body", "system@example.invalid", original, null);
            assertThat(handler.discardPayloadOnCompletion()).isTrue();
            assertThat(handler.maximumConcurrentExecutions()).isEqualTo(2);
        }
    }

    @Test
    void claimedDeletedAndReplacedAttemptsNeverDecryptOrSubmit() {
        DurableWork work = work();
        try (var crypto = mockStatic(CryptoUtil.class)) {
            when(repository.findById(7L)).thenReturn(Optional.empty());
            handler.execute(work);
            SentMail mail = queued("display");
            mail.updateResult("P");
            when(repository.findById(7L)).thenReturn(Optional.of(mail));
            handler.execute(work);
            mail.queueAt(QUEUED.plusSeconds(1));
            handler.execute(work);
            verifyNoInteractions(processor);
            crypto.verifyNoInteractions();
        }
    }

    @Test
    void failureAndInterruptionCannotBeAcknowledgedAsSuccessfulDelivery() {
        DurableWork work = work();
        when(repository.findById(7L)).thenReturn(Optional.of(queued("display")));
        try (var crypto = mockStatic(CryptoUtil.class)) {
            crypto.when(() -> CryptoUtil.decrypt("encrypted-snapshot")).thenReturn("original@example.invalid");
            when(processor.dispatchCommitted(anyLong(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("fixture")));
            assertThatThrownBy(() -> handler.execute(work)).isInstanceOf(IllegalStateException.class);
            Thread.currentThread().interrupt();
            try {
                assertThatThrownBy(() -> handler.execute(work)).isInstanceOf(IllegalStateException.class);
                assertThat(Thread.currentThread().isInterrupted()).isTrue();
            } finally { Thread.interrupted(); }
            verify(processor, times(1)).dispatchCommitted(anyLong(), any(), any(), any(), any(), any(), any());
        }
    }

    @Test
    void exhaustedDeliveryFailsOnlyTheSameQueuedAttempt() {
        DurableWork work = work();
        handler.onTerminal(work, false);
        verify(repository).failQueued(7L, QUEUED);
        handler.onTerminal(work, true);
        verifyNoMoreInteractions(repository);
    }

    private DurableWork work() {
        try (var crypto = mockStatic(CryptoUtil.class)) {
            crypto.when(() -> CryptoUtil.encrypt("original@example.invalid")).thenReturn("encrypted-snapshot");
            return MailDeliveryWorkHandler.work(7L, QUEUED, "original@example.invalid", "system@example.invalid", null);
        }
    }

    private SentMail queued(String display) {
        SentMail mail = SentMail.builder().emlDsptchSn(7L).emlTtl("subject").emlCn("body").rcvrNm(display).build();
        mail.queueAt(QUEUED);
        return mail;
    }
}
