package nuri.api.schema;

import io.micrometer.core.instrument.MeterRegistry;
import java.sql.SQLException;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import nuri.business.service.mail.MailDeliveryUnavailableException;
import nuri.business.service.notification.listener.NotificationRequestListener;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.security.service.CustomUserDetails;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.transaction.support.TransactionSynchronization;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.service.mail.EmailSender;
import nuri.business.service.mail.MailAsyncProcessor;
import nuri.business.service.mail.MailDeliveryWorkHandler;
import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.SentMailDto;
import nuri.business.service.system.job.DurableWorkDispatcher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * PostgreSQL mail-result/notification atomicity through real async/retry/transaction/listener proxies.
 * Separate from the mail-only gate: this test requires both mail and notification features.
 * Original mail-only delivery tests remain independent of the notification feature.
 */
@Tag("schema-validation")
@SpringBootTest(properties = {
        "nuri.durable-work.enabled=false",
        "nuri.mail.from=no-reply@egov.local",
        "spring.datasource.url=jdbc:tc:postgresql:17:///egov_mail_failure_notification?currentSchema=public"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import({AuthorizationSchemaRehearsalTestConfiguration.class, MailFailureNotificationIntegrationTest.ExecutorConfiguration.class})
@ActiveProfiles({"test", "tc"})
class MailFailureNotificationIntegrationTest {
    @Autowired private MailService service;
    @Autowired private MailAsyncProcessor processor;
    @Autowired private MailDeliveryWorkHandler handler;
    @Autowired private SentMailRepository mails;
    @Autowired private DurableJobRepository jobs;
    @Autowired private DurableWorkDispatcher worker;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager manager;
    @MockitoBean private EmailSender sender;
    @Autowired private ApplicationEventPublisher events;
    @Autowired private NoticeFailureProbe noticeFailure;
    @Autowired private NotificationRequestListener notificationListener;
    @Autowired private MeterRegistry meters;
    private final Set<String> ownedNoticeReceivers = new HashSet<>();
    private final Set<Long> ownedMails = new HashSet<>();
    private final Set<String> ownedJobs = new HashSet<>();
    private static final String ADDRESS = "accepted@example.invalid";

    @TestConfiguration(proxyBeanMethods = false)
    @EnableAspectJAutoProxy
    static class ExecutorConfiguration {
        @Bean NoticeFailureProbe noticeFailureProbe(JdbcTemplate jdbc, PlatformTransactionManager manager) {
            return new NoticeFailureProbe(jdbc, manager);
        }
        @Bean(name = "taskExecutor", destroyMethod = "shutdown")
        ThreadPoolTaskExecutor mailExecutor() {
            var executor = new ThreadPoolTaskExecutor();
            executor.setCorePoolSize(2);
            executor.setMaxPoolSize(2);
            executor.setQueueCapacity(8);
            executor.setThreadNamePrefix("mail-owned-test-");
            executor.setWaitForTasksToCompleteOnShutdown(true);
            executor.setAwaitTerminationSeconds(3);
            return executor;
        }
    }

    @AfterEach void cleanup() {
        SecurityContextHolder.clearContext();
        noticeFailure.reset();
        for (String receiver : ownedNoticeReceivers) {
            jdbc.update("DELETE FROM tb_sys_job WHERE CASE WHEN job_se_nm='NOTIFICATION_DELIVERY' AND job_cn<>'' "
                    + "THEN job_cn::jsonb->>'receiver' END = ?", receiver);
            jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id=?", receiver);
        }
        ownedJobs.forEach(key -> jdbc.update("DELETE FROM tb_sys_job WHERE job_mng_no=?", key));
        ownedMails.forEach(id -> jdbc.update("DELETE FROM tb_email_dsptch_manage WHERE eml_dsptch_sn=?", id));
        ownedNoticeReceivers.forEach(receiver -> jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", receiver));
    }

    @Test void failedNoticeWriteRetriesOnlyResultRecordingAndKeepsOneDurableNotice() throws Exception {
        NoticeIdentity identity = noticeIdentity();
        long id;
        authenticateNoticeSender(identity);
        try {
            id = service.sendToResolvedAddress(identity.esntlId(),
                    SentMailDto.builder().sj("synthetic failure subject")
                            .emailCn("synthetic private body").build(), ADDRESS, "Synthetic recipient");
            ownedMails.add(id);
        } finally {
            SecurityContextHolder.clearContext();
        }
        DurableJob initial = job(id);
        var acceptedWork = initial.work();
        LocalDateTime queuedAt = mails.findById(id).orElseThrow().getDsptchDt();
        var observation = noticeFailure.arm(id, identity.esntlId(), 1);
        failSmtpDefinitively(id);

        assertThat(org.springframework.aop.support.AopUtils.isAopProxy(processor)).isTrue();
        assertThat(org.springframework.aop.support.AopUtils.isAopProxy(notificationListener))
                .as("actual notification listener must retain its transaction and failure-probe advisors").isTrue();
        assertThat(worker.dispatchOne()).isTrue();

        // A replay of the accepted job cannot repair a swallowed notice failure or send SMTP again.
        handler.execute(acceptedWork);
        processor.dispatchCommitted(id, queuedAt, "synthetic failure subject", "synthetic private body",
                "from@example.invalid", ADDRESS, identity.esntlId()).get(10, TimeUnit.SECONDS);

        // The real listener persisted both rows before a real SQLSTATE 22012 aborted its transaction.
        assertThat(observation.sqlStates).containsExactly("22012");
        assertThat(observation.beforeFailure).containsExactly(new NoticeBoundary("F", 1, 1));
        assertThat(observation.observationFailure.get()).isNull();
        assertThat(observation.completions).containsExactly(TransactionSynchronization.STATUS_ROLLED_BACK);
        // Current code is red here: its prior result transaction leaves F / 0 / 0 after notice rollback.
        assertThat(observation.afterRollback).containsExactly(new NoticeBoundary("P", 0, 0));

        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 1, 1));
        assertThat(observation.events).hasSize(2);
        assertThat(observation.events.get(0).eventId()).isEqualTo(observation.events.get(1).eventId());
        assertThat(observation.events).allSatisfy(event -> {
            assertThat(event.receiverEsntlId()).isEqualTo(identity.esntlId()).isNotEqualTo(identity.loginId());
            assertThat(event.content()).doesNotContain("synthetic private body", ADDRESS);
            assertThat(event.linkUrl()).isEqualTo("/admin/collaboration/mail-history");
        });
        DurableJob completed = jobs.findByJobMngNo(initial.getJobMngNo()).orElseThrow();
        assertThat(completed.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(completed.getJobCn()).isEmpty();
        assertThat(notificationIntentCount(jdbc, identity.loginId())).isZero();
        verify(sender, times(1)).send(anyString(), anyString(), anyString(), anyString());

        // Replaying the same event also reuses its durable delivery reference.
        NotificationRequestedEvent committedEvent = observation.events.getLast();
        tx().executeWithoutResult(status -> events.publishEvent(committedEvent));
        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 1, 1));
        verify(sender, times(1)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test void lateFailedAttemptCannotNotifyOrChangeANewerManualAcceptance() throws Exception {
        NoticeIdentity identity = noticeIdentity();
        SentMail mail = row(LocalDateTime.now().minusMinutes(11).truncatedTo(ChronoUnit.MICROS));
        long id = mail.getEmlDsptchSn();
        jdbc.update("UPDATE tb_email_dsptch_manage SET frst_rgtr_id=? WHERE eml_dsptch_sn=?", identity.loginId(), id);
        var observation = noticeFailure.arm(id, identity.esntlId(), 0);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(code(id)).isEqualTo("P");
            entered.countDown();
            assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
            throw new MailDeliveryUnavailableException();
        }).when(sender).send(anyString(), anyString(), anyString(), anyString());

        var first = dispatchWithSender(mail, identity.esntlId());
        LocalDateTime next = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
        try {
            assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
            assertThat(tx().<Integer>execute(status ->
                    mails.claimForResend(id, identity.loginId(), next, next.minusMinutes(10)))).isEqualTo(1);
        } finally {
            release.countDown();
        }
        first.get(10, TimeUnit.SECONDS);
        assertThat(code(id)).isEqualTo("Q");
        assertThat(mails.findById(id).orElseThrow().getDsptchDt()).isEqualTo(next);
        assertThat(observation.events).isEmpty();
        assertThat(notificationCount(jdbc, identity.esntlId())).isZero();
        assertThat(notificationIntentCount(jdbc, identity.esntlId())).isZero();

        failSmtpDefinitively(id);
        processor.dispatchCommitted(id, next, "subject", "body", "from@example.invalid", ADDRESS,
                identity.esntlId()).get(10, TimeUnit.SECONDS);
        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 1, 1));
        assertThat(observation.events).hasSize(1);
        verify(sender, times(2)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test void twoManualAttemptsHaveSeparateFailureNoticesWhileEachAttemptReplaysOnce() throws Exception {
        NoticeIdentity identity = noticeIdentity();
        SentMail mail = row(LocalDateTime.now().minusMinutes(1).truncatedTo(ChronoUnit.MICROS));
        long id = mail.getEmlDsptchSn();
        jdbc.update("UPDATE tb_email_dsptch_manage SET frst_rgtr_id=? WHERE eml_dsptch_sn=?", identity.loginId(), id);
        var observation = noticeFailure.arm(id, identity.esntlId(), 0);
        failSmtpDefinitively(id);
        dispatchWithSender(mail, identity.esntlId()).get(10, TimeUnit.SECONDS);
        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 1, 1));
        UUID firstEvent = observation.events.getFirst().eventId();

        LocalDateTime next = mail.getDsptchDt().plusSeconds(1);
        assertThat(tx().<Integer>execute(status ->
                mails.claimForResend(id, identity.loginId(), next, next.minusMinutes(10)))).isEqualTo(1);
        processor.dispatchCommitted(id, next, "subject", "body", "from@example.invalid", ADDRESS,
                identity.esntlId()).get(10, TimeUnit.SECONDS);
        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 2, 2));
        assertThat(observation.events).hasSize(2);
        assertThat(observation.events.getLast().eventId()).isNotEqualTo(firstEvent);
        processor.dispatchCommitted(id, next, "subject", "body", "from@example.invalid", ADDRESS,
                identity.esntlId()).get(10, TimeUnit.SECONDS);
        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 2, 2));
        verify(sender, times(2)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test void deletedSenderStillKeepsDefinitiveFailureAfterNotificationRetriesExhaust() throws Exception {
        NoticeIdentity identity = noticeIdentity();
        long id = acceptMail(identity);
        DurableJob accepted = job(id);
        var acceptedWork = accepted.work();
        var observation = noticeFailure.arm(id, identity.esntlId(), 0);
        double failuresBefore = recordingFailures();
        assertThat(jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", identity.esntlId())).isEqualTo(1);
        failSmtpDefinitively(id);

        assertThat(worker.dispatchOne()).isTrue();
        handler.execute(acceptedWork);

        // A permanent notice FK violation must not turn a definitive SMTP failure back into P.
        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 0, 0));
        assertCompletedWithoutPayload(accepted.getJobMngNo());
        verify(sender, times(1)).send(anyString(), anyString(), anyString(), anyString());
        assertThat(observation.sqlStates).containsExactly("23503", "23503", "23503");
        assertThat(observation.events).hasSize(3);
        // Three rolled-back combined attempts, then exactly one result-only CAS in recovery.
        assertThat(observation.resultCas).containsExactly(1, 1, 1, 1);
        assertThat(recordingFailures() - failuresBefore).isEqualTo(1.0);
    }

    @Test void nonDatabaseNoticeFailureSelectsRecordingRecoveryWithoutRetryingSmtp() throws Exception {
        NoticeIdentity identity = noticeIdentity();
        long id = acceptMail(identity);
        DurableJob accepted = job(id);
        var observation = noticeFailure.arm(id, identity.esntlId(), 1, NoticeFault.RUNTIME);
        double failuresBefore = recordingFailures();
        failSmtpDefinitively(id);

        assertThat(worker.dispatchOne()).isTrue();

        assertThat(observation.beforeFailure).containsExactly(new NoticeBoundary("F", 1, 1));
        assertThat(observation.observationFailure.get()).isNull();
        assertThat(observation.completions).containsExactly(TransactionSynchronization.STATUS_ROLLED_BACK);
        assertThat(observation.afterRollback).containsExactly(new NoticeBoundary("P", 0, 0));
        assertThat(observation.sqlStates).isEmpty();
        // IllegalStateException is not retryFor, but the real Retry proxy must select recoverRecording.
        assertThat(observation.events).hasSize(1);
        assertThat(observation.resultCas).containsExactly(1, 1);
        assertThat(recordingFailures() - failuresBefore).isEqualTo(1.0);
        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 0, 0));
        assertCompletedWithoutPayload(accepted.getJobMngNo());
        verify(sender, times(1)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test void responseLostAfterRealCommitRetriesWithCasZeroAndKeepsOneNotice() throws Exception {
        NoticeIdentity identity = noticeIdentity();
        long id = acceptMail(identity);
        DurableJob accepted = job(id);
        var acceptedWork = accepted.work();
        var observation = noticeFailure.arm(id, identity.esntlId(), 1, NoticeFault.AFTER_COMMIT);
        double failuresBefore = recordingFailures();
        failSmtpDefinitively(id);

        assertThat(worker.dispatchOne()).isTrue();
        handler.execute(acceptedWork);

        assertThat(observation.beforeFailure).containsExactly(new NoticeBoundary("F", 1, 1));
        assertThat(observation.observationFailure.get()).isNull();
        assertThat(observation.completions).containsExactly(TransactionSynchronization.STATUS_COMMITTED);
        assertThat(observation.afterCommit).containsExactly(new NoticeBoundary("F", 1, 1));
        assertThat(observation.commitResponseLosses.get()).isEqualTo(1);
        // This is an actual PostgreSQL commit, not a transaction-manager stub returning success.
        assertThat(observation.resultCas).containsExactly(1, 0);
        assertThat(observation.events).hasSize(1);
        assertThat(recordingFailures()).isEqualTo(failuresBefore);
        assertThat(noticeBoundary(jdbc, id, identity.esntlId())).isEqualTo(new NoticeBoundary("F", 1, 1));
        assertCompletedWithoutPayload(accepted.getJobMngNo());
        verify(sender, times(1)).send(anyString(), anyString(), anyString(), anyString());
    }

    private long acceptMail(NoticeIdentity identity) {
        authenticateNoticeSender(identity);
        try {
            long id = service.sendToResolvedAddress(identity.esntlId(),
                    SentMailDto.builder().sj("synthetic failure subject")
                            .emailCn("synthetic private body").build(), ADDRESS, "Synthetic recipient");
            ownedMails.add(id);
            return id;
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void assertCompletedWithoutPayload(String jobKey) {
        DurableJob completed = jobs.findByJobMngNo(jobKey).orElseThrow();
        assertThat(completed.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(completed.getJobCn()).isEmpty();
    }

    private double recordingFailures() {
        var counter = meters.find("mail.dispatch.recording.failures").counter();
        return counter == null ? 0.0 : counter.count();
    }

    private NoticeIdentity noticeIdentity() {
        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        NoticeIdentity identity = new NoticeIdentity("MF" + token, "ml" + token);
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES (?,?,'test-fixture-only','Synthetic sender','P','N','20261030')",
                identity.esntlId(), identity.loginId());
        ownedNoticeReceivers.add(identity.esntlId());
        return identity;
    }

    private static void authenticateNoticeSender(NoticeIdentity identity) {
        var principal = CustomUserDetails.builder().esntlId(identity.esntlId()).userId(identity.loginId())
                .userNm("Synthetic sender").password("unused").enabled(true).lockAt("N")
                .permissions(List.of("MAIL_SEND")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private void failSmtpDefinitively(long id) throws Exception {
        doAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(code(id)).isEqualTo("P");
            throw new MailDeliveryUnavailableException();
        }).when(sender).send(anyString(), anyString(), anyString(), anyString());
    }

    private java.util.concurrent.CompletableFuture<Void> dispatchWithSender(SentMail mail, String senderEsntlId) {
        return processor.dispatchCommitted(mail.getEmlDsptchSn(), mail.getDsptchDt(), "subject", "body",
                "from@example.invalid", ADDRESS, senderEsntlId);
    }

    private static int notificationCount(JdbcTemplate jdbc, String receiver) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id=?", Integer.class, receiver);
    }

    private static int notificationIntentCount(JdbcTemplate jdbc, String receiver) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE CASE "
                + "WHEN job_se_nm='NOTIFICATION_DELIVERY' AND job_cn<>'' THEN job_cn::jsonb->>'receiver' END = ?",
                Integer.class, receiver);
    }

    private static NoticeBoundary noticeBoundary(JdbcTemplate jdbc, long id, String receiver) {
        return new NoticeBoundary(jdbc.queryForObject(
                "SELECT dsptch_rslt_cd FROM tb_email_dsptch_manage WHERE eml_dsptch_sn=?", String.class, id),
                notificationCount(jdbc, receiver), notificationIntentCount(jdbc, receiver));
    }

    private record NoticeIdentity(String esntlId, String loginId) { }
    private record NoticeBoundary(String mailState, int notifications, int deliveryIntents) { }
    private enum NoticeFault { SQL, RUNTIME, AFTER_COMMIT }

    /** No service/repository replacement: proceed through the real mandatory listener transaction, then fail SQL. */
    @Aspect
    @Order(Ordered.HIGHEST_PRECEDENCE)
    static class NoticeFailureProbe {
        private final JdbcTemplate jdbc;
        private final PlatformTransactionManager manager;
        private final AtomicReference<NoticeObservation> armed = new AtomicReference<>();

        NoticeFailureProbe(JdbcTemplate jdbc, PlatformTransactionManager manager) {
            this.jdbc = jdbc;
            this.manager = manager;
        }

        NoticeObservation arm(long dispatchId, String receiver, int failureCount) {
            return arm(dispatchId, receiver, failureCount, NoticeFault.SQL);
        }

        NoticeObservation arm(long dispatchId, String receiver, int failureCount, NoticeFault fault) {
            NoticeObservation observation = new NoticeObservation(dispatchId, receiver, failureCount, fault);
            armed.set(observation);
            return observation;
        }

        void reset() { armed.set(null); }

        @Around("execution(* nuri.business.domain.mail.SentMailRepository.recordResult(..))")
        Object observeActualResultCas(ProceedingJoinPoint invocation) throws Throwable {
            Object result = invocation.proceed();
            NoticeObservation observation = armed.get();
            if (observation != null && Long.valueOf(observation.dispatchId).equals(invocation.getArgs()[0])) {
                observation.resultCas.add((Integer) result);
            }
            return result;
        }

        @Around("execution(* nuri.business.service.notification.listener.NotificationRequestListener.onNotificationRequested(..))")
        Object afterRealListenerStored(ProceedingJoinPoint invocation) throws Throwable {
            NotificationRequestedEvent event = (NotificationRequestedEvent) invocation.getArgs()[0];
            NoticeObservation observation = armed.get();
            if (observation == null || !observation.receiver.equals(event.receiverEsntlId())) {
                return invocation.proceed();
            }
            observation.events.add(event);
            Object result;
            try {
                result = invocation.proceed();
            } catch (RuntimeException failure) {
                recordSqlState(observation, failure);
                throw failure;
            }
            if (observation.failures.getAndUpdate(value -> Math.max(0, value - 1)) == 0) return result;

            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            observation.beforeFailure.add(noticeBoundary(jdbc, observation.dispatchId, observation.receiver));
            if (observation.fault == NoticeFault.AFTER_COMMIT) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override public void afterCommit() {
                        // The real transaction manager has committed PostgreSQL before this callback.
                        observeCommittedState(observation, observation.afterCommit);
                        observation.commitResponseLosses.incrementAndGet();
                        throw new TransactionSystemException("Synthetic committed-response loss");
                    }
                    @Override public void afterCompletion(int status) { observation.completions.add(status); }
                });
                return result;
            }
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    observation.completions.add(status);
                    observeCommittedState(observation, observation.afterRollback);
                }
            });
            if (observation.fault == NoticeFault.RUNTIME) {
                throw new IllegalStateException("Synthetic non-database notice failure");
            }
            try {
                jdbc.queryForObject("SELECT 1 / CAST(? AS INTEGER)", Integer.class, 0);
            } catch (DataAccessException failure) {
                recordSqlState(observation, failure);
                throw failure;
            }
            throw new AssertionError("Synthetic SQLSTATE 22012 injection did not fail");
        }

        private void observeCommittedState(NoticeObservation observation, List<NoticeBoundary> destination) {
            // Completion callbacks may still have resources bound to the completed/failed transaction.
            // REQUIRES_NEW suspends them; REQUIRED could accidentally reuse that EntityManager/Connection.
            var isolatedRead = new TransactionTemplate(manager);
            isolatedRead.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            isolatedRead.setReadOnly(true);
            try {
                destination.add(isolatedRead.execute(ignored ->
                        noticeBoundary(jdbc, observation.dispatchId, observation.receiver)));
            } catch (Throwable failure) {
                observation.observationFailure.set(failure);
            }
        }

        private static void recordSqlState(NoticeObservation observation, Throwable failure) {
            for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
                if (cause instanceof SQLException sql) {
                    observation.sqlStates.add(sql.getSQLState());
                    return;
                }
            }
        }
    }

    static class NoticeObservation {
        final long dispatchId;
        final String receiver;
        final AtomicInteger failures;
        final NoticeFault fault;
        final List<NotificationRequestedEvent> events = new CopyOnWriteArrayList<>();
        final List<NoticeBoundary> beforeFailure = new CopyOnWriteArrayList<>();
        final List<NoticeBoundary> afterRollback = new CopyOnWriteArrayList<>();
        final List<NoticeBoundary> afterCommit = new CopyOnWriteArrayList<>();
        final List<Integer> resultCas = new CopyOnWriteArrayList<>();
        final List<String> sqlStates = new CopyOnWriteArrayList<>();
        final List<Integer> completions = new CopyOnWriteArrayList<>();
        final AtomicInteger commitResponseLosses = new AtomicInteger();
        final AtomicReference<Throwable> observationFailure = new AtomicReference<>();

        NoticeObservation(long dispatchId, String receiver, int failures, NoticeFault fault) {
            this.dispatchId = dispatchId;
            this.receiver = receiver;
            this.failures = new AtomicInteger(failures);
            this.fault = fault;
        }
    }

    private SentMail row(LocalDateTime queued) {
        SentMail mail = SentMail.builder().emlTtl("subject").emlCn("body").rcvrNm("display").build();
        mail.queueAt(queued);
        mail = mails.saveAndFlush(mail);
        ownedMails.add(mail.getEmlDsptchSn());
        return mail;
    }

    private String code(long id) {
        return jdbc.queryForObject("SELECT dsptch_rslt_cd FROM tb_email_dsptch_manage WHERE eml_dsptch_sn=?", String.class, id);
    }

    private DurableJob job(long id) {
        String key = jdbc.queryForObject("SELECT job_mng_no FROM tb_sys_job WHERE CASE WHEN job_se_nm='MAIL_DELIVERY' AND job_cn<>'' THEN job_cn::jsonb->>'dispatchId' END = ?", String.class, Long.toString(id));
        ownedJobs.add(key);
        return jobs.findByJobMngNo(key).orElseThrow();
    }

    private TransactionTemplate tx() { return new TransactionTemplate(manager); }
}

