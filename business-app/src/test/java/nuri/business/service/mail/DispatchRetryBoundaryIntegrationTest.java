package nuri.business.service.mail;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnId;
import nuri.business.domain.sms.SmsRecptnRepository;
import nuri.business.service.sms.SmsAsyncProcessor;
import nuri.business.service.sms.SmsSender;
import nuri.business.service.sms.SmsGatewayResult;
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
        SmsRecptn recipient = SmsRecptn.builder().smsTrsmSn(1L).rcptnTelno("0101").rsltCd("P").build();
        lenient().when(recipients.findById(any())).thenReturn(Optional.of(recipient));
        when(recipients.findByIdForUpdate(any())).thenReturn(Optional.of(recipient));
        doAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return null;
        }).when(emailSender).send(anyString(), anyString(), anyString(), anyString());
        when(smsSender.send(anyString(), anyString(), anyString())).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return SmsGatewayResult.accepted("request-1");
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
    void smsRecordCommitRetryDoesNotRepeatAcceptedPost() {
        try (var context = context()) {
            var transactions = context.getBean(FailingCommitManager.class);
            failSmsRecordingAfterTheCommittedClaim(transactions, 2);
            context.getBean(SmsAsyncProcessor.class).sendToRecipient(1L, "0101", "0102", "body");
            verify(smsSender, times(1)).send("0101", "body", "0102");
            assertThat(transactions.commits.get()).isEqualTo(4); // committed claim + three record commits
            assertThat(recipients.findById(new SmsRecptnId(1L, "0101")).orElseThrow().getRsltCd()).isEqualTo("P");
        }
    }

    @Test
    void exhaustedRecordingIsObservableWithoutFalseDeliveryFailureOrResend() throws Exception {
        try (var context = context()) {
            var transactions = context.getBean(FailingCommitManager.class);
            transactions.failuresRemaining.set(3);
            context.getBean(MailAsyncProcessor.class).processSending(1L, "title", "body", "from", "to");
            failSmsRecordingAfterTheCommittedClaim(transactions, 3);
            context.getBean(SmsAsyncProcessor.class).sendToRecipient(1L, "0101", "0102", "body");
            verify(emailSender, times(1)).send(anyString(), anyString(), anyString(), anyString());
            verify(smsSender, times(1)).send("0101", "body", "0102");
            var meters = context.getBean(SimpleMeterRegistry.class);
            for (String kind : new String[]{"mail", "sms"}) {
                assertThat(meters.get(kind + ".dispatch.recording.failures").counter().count()).isEqualTo(1);
                assertThat(meters.get(kind + ".dispatch.total").tag("result", kind.equals("sms") ? "pending" : "success").counter().count()).isEqualTo(1);
                assertThat(meters.find(kind + ".dispatch.total").tag("result", "failure").counter()).isNull();
            }
            assertThat(transactions.commits.get()).isEqualTo(7);
        }
    }

    @Test
    void mailRetriesButDefinitiveSmsRejectDoesNotRepeatPost() throws Exception {
        doThrow(new IllegalStateException("delivery unavailable"))
                .when(emailSender).send(anyString(), anyString(), anyString(), anyString());
        when(smsSender.send(anyString(), anyString(), anyString())).thenReturn(SmsGatewayResult.rejected(SmsGatewayResult.Reason.PROVIDER_REJECTED));
        try (var context = context()) {
            context.getBean(MailAsyncProcessor.class).processSending(1L, "title", "body", "from", "to");
            context.getBean(SmsAsyncProcessor.class).sendToRecipient(1L, "0101", "0102", "body");
            verify(emailSender, times(3)).send(anyString(), anyString(), anyString(), anyString());
            verify(smsSender, times(1)).send("0101", "body", "0102");
            assertThat(mails.findById(1L).orElseThrow().getDsptchRsltCd()).isEqualTo("F");
            assertThat(recipients.findById(new SmsRecptnId(1L, "0101")).orElseThrow().getRsltCd()).isEqualTo("F");
            assertThat(nuri.business.service.sms.SmsReceiptState.display("F", recipients.findById(new SmsRecptnId(1L, "0101")).orElseThrow().getRsltMsg()))
                    .contains("거절");
            assertThat(context.getBean(FailingCommitManager.class).commits.get()).isEqualTo(3);
        }
    }

    @Test
    void ambiguousSmsPostExceptionCannotTriggerRetryThroughTheRealProxy() {
        when(smsSender.send(anyString(), anyString(), anyString())).thenThrow(new IllegalStateException("accepted then response lost"));
        try (var context = context()) {
            var processor = context.getBean(SmsAsyncProcessor.class);
            processor.sendToRecipient(1L, "0101", "0102", "body");
            processor.sendToRecipient(1L, "0101", "0102", "body");
            verify(smsSender, times(1)).send("0101", "body", "0102");
            var receipt = nuri.business.service.sms.SmsReceiptState.parse(recipients.findById(new SmsRecptnId(1L, "0101")).orElseThrow().getRsltMsg()).orElseThrow();
            assertThat(receipt.stage()).isEqualTo(nuri.business.service.sms.SmsReceiptState.Stage.UNKNOWN);
            assertThat(context.getBean(FailingCommitManager.class).commits.get()).isEqualTo(3);
        }
    }

    @Test
    void failedClaimCommitPreventsAnyExternalPost() {
        try (var context = context()) {
            context.getBean(FailingCommitManager.class).failuresRemaining.set(1);
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> context.getBean(SmsAsyncProcessor.class)
                    .sendToRecipient(1L, "0101", "0102", "body"))
                    .isInstanceOf(TransientDataAccessResourceException.class);
            verify(smsSender, never()).send(anyString(), anyString(), anyString());
        }
    }

    private void failSmsRecordingAfterTheCommittedClaim(FailingCommitManager transactions, int failures) {
        when(smsSender.send(anyString(), anyString(), anyString())).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(transactions.commits.get()).isPositive();
            transactions.failuresRemaining.set(failures);
            return SmsGatewayResult.accepted("request-1");
        });
    }

    @Configuration
    @EnableRetry
    @EnableTransactionManagement
    static class RetryConfiguration {
        @Bean MailAsyncProcessor mail(EmailSender sender, SentMailRepository repository, SimpleMeterRegistry meters,
                org.springframework.context.ApplicationEventPublisher events) {
            return new MailAsyncProcessor(sender, repository, meters, events);
        }
        @Bean SmsAsyncProcessor sms(SmsSender sender, SmsRecptnRepository repository, SimpleMeterRegistry meters,
                org.springframework.context.ApplicationEventPublisher events) {
            return new SmsAsyncProcessor(sender, repository, meters, events);
        }
        @Bean SimpleMeterRegistry meters() { return new SimpleMeterRegistry(); }
        @Bean FailingCommitManager transactionManager() { return new FailingCommitManager(); }
        @Bean Sleeper sleeper() { return delay -> { }; }
        /** This fixture proves AOP/fake commit boundaries. Actual PostgreSQL locks have a separate test. */
        @Bean jakarta.persistence.EntityManagerFactory entityManagerFactory() {
            var factory = mock(jakarta.persistence.EntityManagerFactory.class);
            var sessionFactory = mock(org.hibernate.engine.spi.SessionFactoryImplementor.class);
            var jdbcServices = mock(org.hibernate.engine.jdbc.spi.JdbcServices.class);
            when(factory.unwrap(org.hibernate.engine.spi.SessionFactoryImplementor.class)).thenReturn(sessionFactory);
            when(sessionFactory.getJdbcServices()).thenReturn(jdbcServices);
            when(jdbcServices.getDialect()).thenReturn(new org.hibernate.dialect.H2Dialect());
            return factory;
        }
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
