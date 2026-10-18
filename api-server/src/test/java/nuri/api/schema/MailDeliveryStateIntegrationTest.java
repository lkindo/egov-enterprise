package nuri.api.schema;

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
import nuri.foundation.core.util.CryptoUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** PostgreSQL claims/transactions and real async proxies; SMTP is a synthetic test port. */
@Tag("schema-validation")
@SpringBootTest(properties = {"nuri.durable-work.enabled=false", "nuri.mail.from=no-reply@egov.local"})
@Import({AuthorizationSchemaRehearsalTestConfiguration.class, MailDeliveryStateIntegrationTest.ExecutorConfiguration.class})
@ActiveProfiles({"test", "tc"})
class MailDeliveryStateIntegrationTest {
    @Autowired private MailService service;
    @Autowired private MailAsyncProcessor processor;
    @Autowired private MailDeliveryWorkHandler handler;
    @Autowired private SentMailRepository mails;
    @Autowired private DurableJobRepository jobs;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager manager;
    @MockitoBean private EmailSender sender;
    private final Set<Long> ownedMails = new HashSet<>();
    private final Set<String> ownedJobs = new HashSet<>();
    private static final String ADDRESS = "accepted@example.invalid";

    @TestConfiguration(proxyBeanMethods = false)
    static class ExecutorConfiguration {
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
        ownedJobs.forEach(key -> jdbc.update("DELETE FROM tb_sys_job WHERE job_mng_no=?", key));
        ownedMails.forEach(id -> jdbc.update("DELETE FROM tb_email_dsptch_manage WHERE eml_dsptch_sn=?", id));
    }

    @Test void acceptanceAndEncryptedIntentRollBackTogetherWithoutSmtp() {
        long[] id = new long[1];
        tx().executeWithoutResult(status -> {
            id[0] = accept(ADDRESS, "display");
            DurableJob job = job(id[0]);
            assertThat(job.getJobCn()).doesNotContain(ADDRESS);
            status.setRollbackOnly();
        });
        assertThat(mails.findById(id[0])).isEmpty();
        assertThat(jobs.findByJobMngNo(ownedJobs.iterator().next())).isEmpty();
        verifyNoInteractions(sender);
    }

    @Test void restartedWorkerUsesFullAcceptedAddressAndErasesCiphertextAfterSuccess() throws Exception {
        String address = "a".repeat(90) + "@example.invalid";
        long id = service.sendMail(null, SentMailDto.builder().sj("subject").emailCn("body").recptnPerson(address).build());
        ownedMails.add(id);
        DurableJob initial = job(id);
        assertThat(mails.findById(id).orElseThrow().getRcvrNm()).hasSize(100);
        String encrypted = JsonMapper.builder().build().readTree(initial.getJobCn()).get("encryptedRecipient").asString();
        assertThat(CryptoUtil.decrypt(encrypted)).isEqualTo(address);
        doAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(code(id)).isEqualTo("P");
            return null;
        }).when(sender).send(anyString(), anyString(), anyString(), eq(address));
        assertThat(worker().dispatchOne()).isTrue();
        assertThat(code(id)).isEqualTo("S");
        DurableJob finished = jobs.findByJobMngNo(initial.getJobMngNo()).orElseThrow();
        assertThat(finished.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(finished.getJobCn()).isEmpty();
        verify(sender, times(1)).send("subject", "body", "no-reply@egov.local", address);
    }

    @Test void queuedPublicProjectionAndPendingFilterPreserveExistingApiVocabulary() {
        long id = accept(ADDRESS, "display");
        job(id);
        SentMail mail = mails.findById(id).orElseThrow();
        assertThat(SentMailDto.from(mail).getSndngResultCode()).isEqualTo("P");
        assertThat(mails.searchSentMails(null, "1", "mail durable fixture " + id, "P", PageRequest.of(0, 100)))
                .extracting(SentMail::getEmlDsptchSn).contains(id);
    }

    @Test void concurrentWorkersCommitOneClaimBeforeSmtp() throws Exception {
        SentMail mail = row(LocalDateTime.now().truncatedTo(ChronoUnit.MICROS));
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(call -> {
            assertThat(code(mail.getEmlDsptchSn())).isEqualTo("P");
            entered.countDown();
            assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
            return null;
        }).when(sender).send(anyString(), anyString(), anyString(), anyString());
        var first = dispatch(mail);
        try {
            assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
            dispatch(mail).get(5, TimeUnit.SECONDS);
            verify(sender, times(1)).send(anyString(), anyString(), anyString(), anyString());
        } finally { release.countDown(); }
        first.get(10, TimeUnit.SECONDS);
        assertThat(code(mail.getEmlDsptchSn())).isEqualTo("S");
    }

    @Test void recoveredClaimedUnknownOutcomeNeverAutomaticallySendsAgain() {
        long id = accept(ADDRESS, "display@example.invalid");
        DurableJob initial = job(id);
        jdbc.update("UPDATE tb_email_dsptch_manage SET dsptch_rslt_cd='P' WHERE eml_dsptch_sn=?", id);
        assertThat(worker().dispatchOne()).isTrue();
        assertThat(code(id)).isEqualTo("P");
        assertThat(jobs.findByJobMngNo(initial.getJobMngNo()).orElseThrow().getJobCn()).isEmpty();
        verifyNoInteractions(sender);
    }

    @Test void previousResultCannotOverwriteNewManualAcceptance() throws Exception {
        SentMail mail = row(LocalDateTime.now().minusMinutes(11).truncatedTo(ChronoUnit.MICROS));
        long id = mail.getEmlDsptchSn();
        jdbc.update("UPDATE tb_email_dsptch_manage SET frst_rgtr_id='mail-fixture' WHERE eml_dsptch_sn=?", id);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(call -> {
            entered.countDown();
            assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
            return null;
        }).when(sender).send(anyString(), anyString(), anyString(), anyString());
        var first = dispatch(mail);
        LocalDateTime next = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
        try {
            assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
            assertThat(tx().<Integer>execute(status -> mails.claimForResend(id, "mail-fixture", next, next.minusMinutes(10)))).isEqualTo(1);
        } finally { release.countDown(); }
        first.get(10, TimeUnit.SECONDS);
        assertThat(code(id)).isEqualTo("Q");
        assertThat(tx().<Integer>execute(status -> mails.recordResult(id, mail.getDsptchDt(), "F"))).isZero();
        assertThat(tx().<Integer>execute(status -> mails.failQueued(id, mail.getDsptchDt()))).isZero();
        assertThat(tx().<Integer>execute(status -> mails.claimQueued(id, mail.getDsptchDt()))).isZero();
        assertThat(mails.findById(id).orElseThrow().getDsptchDt()).isEqualTo(next);
        processor.dispatchCommitted(id, next, "subject", "body", "from@example.invalid", ADDRESS, null).get(10, TimeUnit.SECONDS);
        assertThat(code(id)).isEqualTo("S");
        verify(sender, times(2)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test void exhaustedUnstartedIntentBecomesFailedAndLosesItsCiphertext() {
        long id = accept(ADDRESS, "display");
        DurableJob initial = job(id);
        jdbc.update("UPDATE tb_sys_job SET prcs_stts_nm='RUNNING',rtry_nmtm=8,job_no='expired',job_prnmnt_dt=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE job_mng_no=?", initial.getJobMngNo());
        worker().dispatchOne();
        assertThat(code(id)).isEqualTo("F");
        DurableJob finished = jobs.findByJobMngNo(initial.getJobMngNo()).orElseThrow();
        assertThat(finished.getPrcsSttsNm()).isEqualTo("FAILED");
        assertThat(finished.getJobCn()).isEmpty();
        verifyNoInteractions(sender);
    }

    private long accept(String address, String display) {
        long id = service.sendToResolvedAddress(null, SentMailDto.builder().sj("subject").emailCn("body").build(), address, display);
        ownedMails.add(id);
        jdbc.update("UPDATE tb_email_dsptch_manage SET eml_ttl=? WHERE eml_dsptch_sn=?", "mail durable fixture " + id, id);
        return id;
    }

    private SentMail row(LocalDateTime queued) {
        SentMail mail = SentMail.builder().emlTtl("subject").emlCn("body").rcvrNm("display").build();
        mail.queueAt(queued);
        mail = mails.saveAndFlush(mail);
        ownedMails.add(mail.getEmlDsptchSn());
        return mail;
    }

    private java.util.concurrent.CompletableFuture<Void> dispatch(SentMail mail) {
        return processor.dispatchCommitted(mail.getEmlDsptchSn(), mail.getDsptchDt(), "subject", "body", "from@example.invalid", ADDRESS, null);
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
    private DurableWorkDispatcher worker() {
        // Execute/acknowledge through real transactions, but never claim another test's pending work.
        // General SKIP LOCKED selection and competing leases are covered by DurableWorkIntegrationTest.
        DurableJobRepository owned = mock(DurableJobRepository.class, org.mockito.AdditionalAnswers.delegatesTo(jobs));
        doAnswer(call -> {
            LocalDateTime now = call.getArgument(0);
            return ownedJobs.stream().map(jobs::findByJobMngNo).flatMap(java.util.Optional::stream)
                    .filter(job -> List.of("PENDING", "RETRY", "RUNNING").contains(job.getPrcsSttsNm())
                            && !job.getJobPrnmntDt().isAfter(now))
                    .findFirst().flatMap(job -> jobs.findLocked(job.getJobSn()));
        }).when(owned).claimNext(any(), any());
        return new DurableWorkDispatcher(owned, List.of(handler), manager, false);
    }
}
