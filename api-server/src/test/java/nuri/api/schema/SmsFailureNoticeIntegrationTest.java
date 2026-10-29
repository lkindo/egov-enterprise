package nuri.api.schema;

// DRAFT ONLY: not installed, compiled, or executed. Reviewed against 3112daea2.
// Keep separate from the SMS-only state suite: this class requires both SMS and optional notification.
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import nuri.business.domain.sms.SmsRepository;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.service.notification.listener.NotificationRequestListener;
import nuri.business.service.sms.SmsAsyncProcessor;
import nuri.business.service.sms.SmsDeliveryWorkHandler;
import nuri.business.service.sms.SmsGatewayResult;
import nuri.business.service.sms.SmsReceiptState;
import nuri.business.service.sms.SmsSender;
import nuri.business.service.sms.SmsService;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import nuri.business.service.system.job.DurableJobAdministrationService;
import nuri.business.service.system.job.DurableWorkDispatcher;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Actual PostgreSQL, proxies, event listener, inbox/intents and dispatcher; only the SMS gateway is fake. */
@Tag("schema-validation")
@SpringBootTest(properties = {"nuri.sms.provider=none", "nuri.durable-work.enabled=false",
        "spring.datasource.url=jdbc:tc:postgresql:17:///egov_sms_failure_notification?currentSchema=public"})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import({AuthorizationSchemaRehearsalTestConfiguration.class, SmsDeliveryStateIntegrationTest.SmsExecutorTestConfiguration.class})
@ActiveProfiles({"test", "tc"})
class SmsFailureNoticeIntegrationTest {
    @Autowired private SmsService service;
    @Autowired private SmsAsyncProcessor processor;
    @Autowired private SmsRepository messages;
    @Autowired private DurableJobRepository jobs;
    @Autowired private DurableJobAdministrationService administration;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager manager;
    @Autowired private javax.sql.DataSource dataSource;
    @MockitoBean private SmsSender sender;
    // A spy is only the fault/observation seam: callRealMethod always performs actual persistence.
    @MockitoSpyBean private NotificationRequestListener notices;
    private static final String FIRST = "01000000111";
    private static final String SECOND = "01000000222";
    private static final String FROM = "0212345678";
    private static final String BODY = "owned sms notice fixture";
    private final List<NotificationRequestedEvent> observed = new CopyOnWriteArrayList<>();
    private final AtomicBoolean failNoticeOnce = new AtomicBoolean();
    private final AtomicInteger sqlFaults = new AtomicInteger();
    private final AtomicReference<String> noticeSqlState = new AtomicReference<>();
    private String receiver;
    private String loginId;
    private Long transmission;

    @BeforeEach void prepareOwnSenderAndRealNoticeFaultSeam() {
        NotificationRequestListener noticeTarget = AopTestUtils.getUltimateTargetObject(notices);
        reset(sender, noticeTarget);
        observed.clear();
        failNoticeOnce.set(false);
        sqlFaults.set(0);
        noticeSqlState.set(null);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        receiver = "SN" + suffix;
        loginId = "sms_" + suffix; // Deliberately different from esntlId: notification recipients use the latter.
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES (?,?,'test-fixture-only','owned sms sender','P','N','20261030')", receiver, loginId);
        var principal = CustomUserDetails.builder().userId(loginId).esntlId(receiver).enabled(true).permissions(List.of()).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        doAnswer(invocation -> {
            NotificationRequestedEvent event = invocation.getArgument(0);
            boolean owned = receiver.equals(event.receiverEsntlId());
            if (owned) observed.add(event);
            try {
                Object result = invocation.callRealMethod();
                if (owned && failNoticeOnce.compareAndSet(true, false)) {
                    assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                    assertThat(inboxCount()).isEqualTo(1); // Same connection sees the uncommitted real rows.
                    assertThat(noticeJobCount()).isEqualTo(1);
                    sqlFaults.incrementAndGet();
                    jdbc.queryForObject("SELECT 1 / 0", Integer.class); // Actual SQLSTATE 22012, no DDL/mock exception.
                }
                return result;
            } catch (RuntimeException failure) {
                if (owned) noticeSqlState.set(sqlState(failure));
                throw failure;
            }
        }).when(noticeTarget).onNotificationRequested(any(NotificationRequestedEvent.class));
        when(sender.send(anyString(), anyString(), anyString())).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return SmsGatewayResult.rejected(SmsGatewayResult.Reason.UNCONFIGURED);
        });
    }

    @AfterEach void cleanupOnlyOwnedRows() {
        processorClock(Clock.systemUTC());
        SecurityContextHolder.clearContext();
        // All worker futures/latches below are joined/released before cleanup. No seeded account is touched.
        jdbc.update("DELETE FROM tb_sys_job WHERE CASE WHEN job_se_nm='NOTIFICATION_DELIVERY' AND job_cn<>'' "
                + "THEN job_cn::jsonb->>'receiver' END=?", receiver);
        jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id=?", receiver);
        if (transmission != null) {
            jdbc.update("DELETE FROM tb_sys_job WHERE job_mng_no=?", deliveryKey());
            jdbc.update("DELETE FROM tb_sms_rcptn WHERE sms_trsm_sn=?", transmission);
            jdbc.update("DELETE FROM tb_sms_info WHERE sms_trsm_sn=?", transmission);
        }
        AuditLedgerFixtures.delete(jdbc,
                "DELETE FROM tb_sys_adt_log WHERE job_nm='DURABLE_WORK_RETRY' AND frst_rgtr_id=?", loginId);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", receiver);
    }

    @Test void actualNoticeSqlRollbackRetriesOnlyNoticeAndReconstructsAlreadyRejectedRecipient() {
        enqueue(FIRST);
        failNoticeOnce.set(true);
        dispatchOwned();
        assertThat(sqlFaults.get()).isEqualTo(1);
        assertThat(noticeSqlState.get()).isEqualTo("22012");
        assertThat(code(FIRST)).isEqualTo("F");
        assertThat(stored(FIRST).stage()).isEqualTo(SmsReceiptState.Stage.REJECTED);
        assertThat(stored(FIRST).requestId()).isNull();
        assertThat(inboxCount()).isZero();
        assertThat(noticeJobCount()).isZero();
        assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY"); // CURRENT RED: swallowed notice error => SUCCEEDED.
        assertThat(job().getRtryNmtm().intValueExact()).isEqualTo(1);

        due();
        dispatchOwned();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(job().getRtryNmtm().intValueExact()).isEqualTo(2);
        assertOneNotice(1, 1);
        assertSameEventIdentity(2);
        handler().execute(job().work()); // A fresh handler's replay also reuses the persisted notification intent.
        assertOneNotice(1, 1);
        assertSameEventIdentity(2);
        verify(sender, times(1)).send(eq(FIRST), anyString(), anyString());
        verify(sender, never()).query(any(), any(), any());
    }

    @Test void noticeCommittedBeforeSmsAcknowledgementSurvivesExpiredLeaseReplay() {
        enqueue(FIRST);
        // Actual claim/domain state with an already expired lease; simulate process loss before ack without changing status by SQL.
        new TransactionTemplate(manager).executeWithoutResult(status -> jobs.findLocked(job().getJobSn()).orElseThrow()
                .claim(LocalDateTime.of(1970, 1, 1, 0, 0), 8, 120));
        handler().execute(job().work());
        assertThat(job().getPrcsSttsNm()).isEqualTo("RUNNING");
        assertOneNotice(1, 1);
        dispatchOwned();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertOneNotice(1, 1);
        assertSameEventIdentity(1); // Reusing an existing intent may skip another publication; row/job identity is authoritative.
        verify(sender, times(1)).send(eq(FIRST), anyString(), anyString());
    }

    @Test void deferredRecipientLockPreventsPrematureSummaryAndLaterRetryUsesFinalTotal() throws Exception {
        enqueue(FIRST, SECOND);
        try (var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var lock = blocker.prepareStatement("SELECT rslt_cd FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=? FOR UPDATE")) {
                lock.setLong(1, transmission);
                lock.setString(2, SECOND);
                lock.executeQuery().close();
            }
            try {
                dispatchOwned(); // Real claimSending SET LOCAL lock_timeout='2s' rejects only SECOND's claim.
                assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY");
                assertThat(code(FIRST)).isEqualTo("F");
                assertThat(code(SECOND)).isEqualTo("P");
                assertThat(rawReceipt(SECOND)).isNull();
                assertThat(inboxCount()).isZero(); // CURRENT RED: it publishes the one-failure partial summary first.
                assertThat(noticeJobCount()).isZero();
                assertThat(observed).isEmpty();
                verify(sender, times(1)).send(eq(FIRST), anyString(), anyString());
                verify(sender, never()).send(eq(SECOND), anyString(), anyString());
            } finally { blocker.rollback(); }
        }
        due();
        dispatchOwned();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertOneNotice(2, 2);
        handler().execute(job().work());
        assertOneNotice(2, 2);
        assertSameEventIdentity(1);
        verify(sender, times(2)).send(anyString(), anyString(), anyString());
    }

    @Test void anotherWorkersClaimedRecipientDefersAckUntilItsRealResultCommits() throws Exception {
        enqueue(FIRST, SECOND);
        processor.sendToRecipient(transmission, FIRST, FROM, BODY);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(sender.send(eq(SECOND), anyString(), anyString())).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(stored(SECOND).stage()).isEqualTo(SmsReceiptState.Stage.CLAIMED);
            entered.countDown();
            assertThat(release.await(15, TimeUnit.SECONDS)).isTrue();
            return SmsGatewayResult.rejected(SmsGatewayResult.Reason.UNCONFIGURED);
        });
        try (var executor = Executors.newSingleThreadExecutor()) {
            var inFlight = executor.submit(() -> processor.sendToRecipient(transmission, SECOND, FROM, BODY));
            try {
                assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
                dispatchOwned();
                assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY"); // CURRENT RED: both rows are skipped, false success.
                assertThat(inboxCount()).isZero();
                assertThat(noticeJobCount()).isZero();
                assertThat(stored(SECOND).stage()).isEqualTo(SmsReceiptState.Stage.CLAIMED);
            } finally { release.countDown(); }
            assertThat(inFlight.get(10, TimeUnit.SECONDS)).isEqualTo(SmsGatewayResult.State.REJECTED);
        }
        due();
        dispatchOwned();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertOneNotice(2, 2);
        verify(sender, times(2)).send(anyString(), anyString(), anyString());
    }

    @Test void laterGetRejectionCannotChangeInitialSummaryFingerprintOrResendAnyPost() {
        enqueue(FIRST, SECOND);
        when(sender.send(eq(SECOND), anyString(), anyString())).thenReturn(SmsGatewayResult.accepted("request-owned-second"));
        dispatchOwned();
        assertOneNotice(2, 1);
        String originalContent = noticeContent();
        UUID originalId = observed.getFirst().eventId();
        when(sender.query("request-owned-second", null, SECOND)).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return SmsGatewayResult.rejected("request-owned-second", "message-owned-second", SmsGatewayResult.Reason.PROVIDER_REJECTED);
        });
        String lease = processor.prepareReconciliation(transmission, SECOND).orElseThrow();
        processor.reconcileRecipient(transmission, SECOND, lease);
        assertThat(code(SECOND)).isEqualTo("F");
        assertThat(stored(SECOND).stage()).isEqualTo(SmsReceiptState.Stage.REJECTED);
        assertThat(stored(SECOND).requestId()).isEqualTo("request-owned-second");
        handler().execute(job().work()); // Naive count(F) + stable eventId causes a real fingerprint conflict here.
        assertOneNotice(2, 1);
        assertThat(noticeContent()).isEqualTo(originalContent);
        assertSameEventIdentity(1);
        assertThat(observed.getLast().eventId()).isEqualTo(originalId);
        assertThat(observed.getLast().content()).isEqualTo(originalContent);
        verify(sender, times(2)).send(anyString(), anyString(), anyString());
        verify(sender, times(1)).query("request-owned-second", null, SECOND);
    }

    @Test void expiredClaimDefersEightAttemptsThenExistingReconciliationAndAuditedRetryRecoverOneNotice() {
        Instant claimedAt = Instant.parse("2026-10-30T00:00:00Z");
        processorClock(Clock.fixed(claimedAt, ZoneOffset.UTC));
        try {
            enqueue(FIRST, SECOND);
            processor.sendToRecipient(transmission, FIRST, FROM, BODY);
            String abandonedClaim = processor.claimSending(transmission, SECOND).orElseThrow();
            // Simulate loss after claim commit and before POST. Even an expired CLAIMED can still win a late CAS.
            Instant expiredAt = claimedAt.plusMillis(120_001);
            processorClock(Clock.fixed(expiredAt, ZoneOffset.UTC));
            for (int attempt = 1; attempt <= 8; attempt++) {
                due();
                dispatchOwned();
                assertThat(job().getRtryNmtm().intValueExact()).isEqualTo(attempt);
                assertThat(job().getPrcsSttsNm()).isEqualTo(attempt < 8 ? "RETRY" : "FAILED");
                assertThat(rawReceipt(SECOND)).isEqualTo(abandonedClaim);
                assertThat(inboxCount()).isZero();
                assertThat(noticeJobCount()).isZero();
            }
            assertThat(observed).isEmpty();
            assertThat(job().retryable()).isTrue();
            verify(sender, times(1)).send(eq(FIRST), anyString(), anyString());
            verify(sender, never()).send(eq(SECOND), anyString(), anyString());

            // Exercise the existing DB-only path used by the sens reconciler. Provider=none does NOT schedule it.
            assertThat(processor.prepareReconciliation(transmission, SECOND)).isEmpty();
            assertThat(code(SECOND)).isEqualTo("P");
            assertThat(stored(SECOND).stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
            assertThat(stored(SECOND).reason()).isEqualTo(SmsGatewayResult.Reason.EXPIRED);
            String settledReceipt = rawReceipt(SECOND);
            SmsReceiptState staleResult = SmsReceiptState.parse(abandonedClaim).orElseThrow()
                    .submitted(SmsGatewayResult.rejected(SmsGatewayResult.Reason.UNCONFIGURED), expiredAt.toEpochMilli());
            processor.updateResult(transmission, SECOND, abandonedClaim, staleResult.resultCode(), staleResult.encode());
            assertThat(rawReceipt(SECOND)).isEqualTo(settledReceipt); // A late old-claim result cannot change the final numerator.

            var principal = CustomUserDetails.builder().userId(loginId).esntlId(receiver).enabled(true)
                    .permissions(List.of("DWORK_RETRY")).build();
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
            administration.retry(job().getJobSn()); // Actual permission check, state transition and mandatory audit transaction.
            assertThat(job().getPrcsSttsNm()).isEqualTo("PENDING");
            assertThat(job().getRtryNmtm().intValueExact()).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_adt_log "
                    + "WHERE job_nm='DURABLE_WORK_RETRY' AND prcs_stts_nm='COMMITTED' AND frst_rgtr_id=?",
                    Long.class, loginId)).isEqualTo(1L);
            dispatchOwned();
            assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
            assertOneNotice(2, 1);
            handler().execute(job().work());
            assertOneNotice(2, 1);
            assertSameEventIdentity(1);
            verify(sender, times(1)).send(anyString(), anyString(), anyString());
            verify(sender, never()).query(any(), any(), any());
        } finally {
            processorClock(Clock.systemUTC());
        }
    }

    @Test void claimedRecipientWithoutAnyInitialRejectionStillDefersAcknowledgement() {
        enqueue(FIRST);
        String claim = processor.claimSending(transmission, FIRST).orElseThrow();
        dispatchOwned();
        assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY"); // CURRENT RED: local and persisted failure counts are both zero.
        assertThat(rawReceipt(FIRST)).isEqualTo(claim);
        assertThat(inboxCount()).isZero();
        assertThat(noticeJobCount()).isZero();
        assertThat(observed).isEmpty();
        verify(sender, never()).send(anyString(), anyString(), anyString());
        verify(sender, never()).query(any(), any(), any());
    }

    @Test void deletedSenderForeignKeyFailureStaysRetryableAndDoesNotResendSms() {
        enqueue(FIRST);
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", receiver);
        dispatchOwned();
        assertThat(noticeSqlState.get()).isEqualTo("23503"); // Actual migrated notification receiver FK, not an assumed error.
        assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY"); // No blanket swallow/no invented absent-user success policy.
        assertThat(code(FIRST)).isEqualTo("F");
        assertThat(inboxCount()).isZero();
        assertThat(noticeJobCount()).isZero();
        due();
        dispatchOwned();
        assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY");
        assertThat(inboxCount()).isZero();
        assertThat(noticeJobCount()).isZero();
        verify(sender, times(1)).send(anyString(), anyString(), anyString());
    }

    @Test void persistedLegacyFailuresAndUnknownAreNotInventedAsInitialPostRejections() {
        String legacy = "01000000333";
        String malformed = "01000000444";
        String legacyPending = "01000000555";
        enqueue(FIRST, SECOND, legacy, malformed, legacyPending);
        when(sender.send(eq(SECOND), anyString(), anyString()))
                .thenReturn(SmsGatewayResult.unknown(SmsGatewayResult.Reason.UNCONFIRMED));
        processor.sendToRecipient(transmission, FIRST, FROM, BODY);
        processor.sendToRecipient(transmission, SECOND, FROM, BODY);
        jdbc.update("UPDATE tb_sms_rcptn SET rslt_cd='F',rslt_msg='Dispatch queue saturated' WHERE sms_trsm_sn=? AND rcptn_telno=?",
                transmission, legacy);
        jdbc.update("UPDATE tb_sms_rcptn SET rslt_cd='F',rslt_msg=? WHERE sms_trsm_sn=? AND rcptn_telno=?",
                SmsReceiptState.PREFIX + "REJECTED|malformed-private-receipt", transmission, malformed);
        jdbc.update("UPDATE tb_sms_rcptn SET rslt_msg='legacy pending outcome' WHERE sms_trsm_sn=? AND rcptn_telno=?",
                transmission, legacyPending);
        dispatchOwned();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(code(SECOND)).isEqualTo("P");
        assertThat(stored(SECOND).stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
        assertThat(code(legacyPending)).isEqualTo("P");
        assertThat(rawReceipt(legacyPending)).isEqualTo("legacy pending outcome");
        assertOneNotice(5, 1); // Legacy P neither blocks nor counts; naive count(F) would incorrectly give 3.
        verify(sender, times(2)).send(anyString(), anyString(), anyString());
        verify(sender, never()).query(any(), any(), any());
    }

    private void enqueue(String... phones) {
        SmsDto dto = SmsDto.builder().sndngTelno(FROM).sndngCn(BODY).recipients(java.util.Arrays.stream(phones)
                .map(phone -> SmsRecptnDto.builder().rcptnTelno(phone).build()).toList()).build();
        transmission = new TransactionTemplate(manager).execute(status -> service.sendSms(loginId, dto));
        assertThat(job().getPrcsSttsNm()).isEqualTo("PENDING");
        assertThat(job().getJobCn()).contains(receiver).doesNotContain(FIRST, SECOND, FROM, BODY);
    }

    private void dispatchOwned() {
        // Run this class exclusively. The production dispatcher is global; never let this fixture drain another test's work.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE job_se_nm='SMS_DELIVERY' "
                + "AND prcs_stts_nm IN ('PENDING','RETRY','RUNNING') AND job_prnmnt_dt <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') "
                + "AND job_mng_no<>?", Long.class, deliveryKey())).isZero();
        assertThat(new DurableWorkDispatcher(jobs, List.of(handler()), manager, false).dispatchOne()).isTrue();
    }

    private SmsDeliveryWorkHandler handler() { return new SmsDeliveryWorkHandler(messages, processor); }
    private void processorClock(Clock clock) {
        SmsAsyncProcessor target = AopTestUtils.getUltimateTargetObject(processor);
        ReflectionTestUtils.invokeMethod(target, "setClock", clock);
    }
    private DurableJob job() { return jobs.findByJobMngNo(deliveryKey()).orElseThrow(); }
    private String deliveryKey() {
        return UUID.nameUUIDFromBytes(("SMS_DELIVERY:" + transmission).getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
    }
    private void due() {
        jdbc.update("UPDATE tb_sys_job SET job_prnmnt_dt=TIMESTAMP '1970-01-01 00:00:00' WHERE job_mng_no=?", deliveryKey());
    }
    private String code(String phone) {
        return jdbc.queryForObject("SELECT rslt_cd FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?", String.class, transmission, phone);
    }
    private String rawReceipt(String phone) {
        return jdbc.queryForObject("SELECT rslt_msg FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?", String.class, transmission, phone);
    }
    private SmsReceiptState stored(String phone) { return SmsReceiptState.parse(rawReceipt(phone)).orElseThrow(); }
    private long inboxCount() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id=?", Long.class, receiver);
    }
    private long noticeJobCount() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE CASE "
                + "WHEN job_se_nm='NOTIFICATION_DELIVERY' AND job_cn<>'' THEN job_cn::jsonb->>'receiver' END=?",
                Long.class, receiver);
    }
    private String noticeContent() {
        return jdbc.queryForObject("SELECT noti_cn FROM tb_user_noti WHERE rcvr_id=?", String.class, receiver);
    }
    private void assertOneNotice(int total, int failed) {
        assertThat(inboxCount()).isEqualTo(1);
        assertThat(noticeJobCount()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE job_mng_no=?", Long.class, deliveryKey())).isEqualTo(1);
        assertThat(noticeContent()).contains("문자 " + total + "건 중 " + failed + "건");
    }
    private void assertSameEventIdentity(int minimumPublications) {
        assertThat(observed).hasSizeGreaterThanOrEqualTo(minimumPublications);
        assertThat(observed.stream().map(NotificationRequestedEvent::eventId).distinct().toList()).hasSize(1);
        assertThat(observed).allSatisfy(event -> assertThat(event.receiverEsntlId()).isEqualTo(receiver));
    }
    private static String sqlState(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof java.sql.SQLException sql) return sql.getSQLState();
        }
        return null;
    }
}
