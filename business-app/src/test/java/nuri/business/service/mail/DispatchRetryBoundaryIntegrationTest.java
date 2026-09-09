package nuri.business.service.mail;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnId;
import nuri.business.domain.sms.SmsRecptnRepository;
import nuri.business.service.sms.SmsAsyncProcessor;
import nuri.business.service.sms.SmsSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.TransientDataAccessResourceException;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.retry.backoff.Sleeper;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** 재시도·트랜잭션 프록시는 실물이며 외부 전송과 커밋 실패만 주입한다. */
class DispatchRetryBoundaryIntegrationTest {
    private final SentMailRepository mails = mock(SentMailRepository.class);
    private final SmsRecptnRepository recipients = mock(SmsRecptnRepository.class);
    private final EmailSender emailSender = mock(EmailSender.class);
    private final SmsSender smsSender = mock(SmsSender.class);

    @BeforeEach
    void prepare() throws Exception {
        when(mails.findById(anyLong())).thenReturn(Optional.of(SentMail.builder().emlDsptchSn(1L).build()));
        when(recipients.findById(any())).thenReturn(Optional.of(SmsRecptn.builder().smsTrsmSn(1L).rcptnTelno("0101").build()));
        doAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return null;
        }).when(emailSender).send(anyString(), anyString(), anyString(), anyString());
        when(smsSender.send(anyString(), anyString(), anyString())).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return true;
        });
    }

    private AnnotationConfigApplicationContext context() {
        var context = new AnnotationConfigApplicationContext();
        context.registerBean(SentMailRepository.class, () -> mails);
        context.registerBean(SmsRecptnRepository.class, () -> recipients);
        context.registerBean(EmailSender.class, () -> emailSender);
        context.registerBean(SmsSender.class, () -> smsSender);
        context.register(RetryConfiguration.class);
        context.refresh();
        return context;
    }

    @Test
    void mailCommitRetryDoesNotRepeatSuccessfulDelivery() throws Exception {
        try (var context = context()) {
            var transactions = context.getBean(FailingCommitManager.class);
            transactions.failuresRemaining.set(2);
            context.getBean(MailAsyncProcessor.class).processSending(1L, "title", "body", "from", "to");
            verify(emailSender, times(1)).send(anyString(), anyString(), anyString(), anyString());
            assertThat(transactions.commits.get()).isEqualTo(3);
        }
    }

    @Test
    void smsCommitRetryDoesNotRepeatSuccessfulDelivery() {
        try (var context = context()) {
            var transactions = context.getBean(FailingCommitManager.class);
            transactions.failuresRemaining.set(2);
            context.getBean(SmsAsyncProcessor.class).sendToRecipient(1L, "0101", "0102", "body");
            verify(smsSender, times(1)).send("0101", "body", "0102");
            assertThat(transactions.commits.get()).isEqualTo(3);
        }
    }

    @Test
    void exhaustedRecordingIsObservableWithoutFalseDeliveryFailureOrResend() throws Exception {
        try (var context = context()) {
            var transactions = context.getBean(FailingCommitManager.class);
            transactions.failuresRemaining.set(6);
            context.getBean(MailAsyncProcessor.class).processSending(1L, "title", "body", "from", "to");
            context.getBean(SmsAsyncProcessor.class).sendToRecipient(1L, "0101", "0102", "body");
            verify(emailSender, times(1)).send(anyString(), anyString(), anyString(), anyString());
            verify(smsSender, times(1)).send("0101", "body", "0102");
            var meters = context.getBean(SimpleMeterRegistry.class);
            for (String kind : new String[]{"mail", "sms"}) {
                assertThat(meters.get(kind + ".dispatch.recording.failures").counter().count()).isEqualTo(1);
                assertThat(meters.get(kind + ".dispatch.total").tag("result", "success").counter().count()).isEqualTo(1);
                assertThat(meters.find(kind + ".dispatch.total").tag("result", "failure").counter()).isNull();
            }
            assertThat(transactions.commits.get()).isEqualTo(6);
        }
    }

    @Test
    void deliveryFailuresStillRetryAndRecordFinalFailure() throws Exception {
        doThrow(new IllegalStateException("delivery unavailable"))
                .when(emailSender).send(anyString(), anyString(), anyString(), anyString());
        when(smsSender.send(anyString(), anyString(), anyString())).thenReturn(false);
        try (var context = context()) {
            context.getBean(MailAsyncProcessor.class).processSending(1L, "title", "body", "from", "to");
            context.getBean(SmsAsyncProcessor.class).sendToRecipient(1L, "0101", "0102", "body");
            verify(emailSender, times(3)).send(anyString(), anyString(), anyString(), anyString());
            verify(smsSender, times(3)).send("0101", "body", "0102");
            assertThat(mails.findById(1L).orElseThrow().getDsptchRsltCd()).isEqualTo("F");
            assertThat(recipients.findById(new SmsRecptnId(1L, "0101")).orElseThrow().getRsltCd()).isEqualTo("F");
            assertThat(recipients.findById(new SmsRecptnId(1L, "0101")).orElseThrow().getRsltMsg())
                    .isEqualTo("Gateway delivery failed");
            assertThat(context.getBean(FailingCommitManager.class).commits.get()).isEqualTo(2);
        }
    }

    @Configuration
    @EnableRetry
    @EnableTransactionManagement
    static class RetryConfiguration {
        @Bean MailAsyncProcessor mail(EmailSender sender, SentMailRepository repository, SimpleMeterRegistry meters) {
            return new MailAsyncProcessor(sender, repository, meters);
        }
        @Bean SmsAsyncProcessor sms(SmsSender sender, SmsRecptnRepository repository, SimpleMeterRegistry meters) {
            return new SmsAsyncProcessor(sender, repository, meters);
        }
        @Bean SimpleMeterRegistry meters() { return new SimpleMeterRegistry(); }
        @Bean FailingCommitManager transactionManager() { return new FailingCommitManager(); }
        @Bean Sleeper sleeper() { return delay -> { }; }
    }

    static class FailingCommitManager extends AbstractPlatformTransactionManager {
        final AtomicInteger failuresRemaining = new AtomicInteger();
        final AtomicInteger commits = new AtomicInteger();
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) { }
        @Override protected void doCommit(DefaultTransactionStatus status) {
            commits.incrementAndGet();
            if (failuresRemaining.getAndUpdate(value -> Math.max(value - 1, 0)) > 0) {
                throw new TransientDataAccessResourceException("injected commit failure");
            }
        }
        @Override protected void doRollback(DefaultTransactionStatus status) { }
    }
}
