package nuri.api.schema;

import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnId;
import nuri.business.domain.sms.SmsRecptnRepository;
import nuri.business.service.sms.SmsAsyncProcessor;
import nuri.business.service.sms.SmsGatewayResult;
import nuri.business.service.sms.SmsReceiptState;
import nuri.business.service.sms.SmsSender;
import nuri.business.service.sms.SmsService;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Actual PostgreSQL row locks/proxies/commit callbacks; the gateway is an explicitly synthetic port. */
@Tag("schema-validation")
@SpringBootTest(properties = {"nuri.sms.provider=none", "nuri.durable-work.enabled=false"})
@Import({AuthorizationSchemaRehearsalTestConfiguration.class, SmsDeliveryStateIntegrationTest.SmsExecutorTestConfiguration.class})
@ActiveProfiles({"test", "tc"})
class SmsDeliveryStateIntegrationTest {
    @Autowired private SmsAsyncProcessor processor;
    @Autowired private SmsService service;
    @Autowired private SmsRecptnRepository recipients;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager manager;
    @Autowired private javax.sql.DataSource dataSource;
    @MockitoBean private SmsSender sender;
    private static final String PHONE = "01000000111";
    private final java.util.Set<Long> ownedTransmissions = new java.util.HashSet<>();
    private long transmission;

    @TestConfiguration(proxyBeanMethods = false)
    static class SmsExecutorTestConfiguration {
        @Bean(name = "taskExecutor", destroyMethod = "shutdown")
        ThreadPoolTaskExecutor smsTestExecutor() {
            ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
            executor.setCorePoolSize(2);
            executor.setMaxPoolSize(2);
            executor.setQueueCapacity(8);
            executor.setThreadNamePrefix("sms-owned-test-");
            executor.setWaitForTasksToCompleteOnShutdown(true);
            executor.setAwaitTerminationSeconds(3);
            return executor;
        }
    }

    @BeforeEach void createOnlyOwnedFixture() {
        reset(sender);
        transmission = jdbc.queryForObject("INSERT INTO tb_sms_info(sndng_telno,sndng_cn) VALUES (?,?) RETURNING sms_trsm_sn",
                Long.class, "0212345678", "owned sms fixture " + UUID.randomUUID());
        ownedTransmissions.add(transmission);
        recipients.saveAndFlush(SmsRecptn.builder().smsTrsmSn(transmission).rcptnTelno(PHONE).rsltCd("P").build());
    }

    @AfterEach void removeOnlyOwnedFixtures() {
        ownedTransmissions.forEach(id -> {
            jdbc.update("DELETE FROM tb_sms_rcptn WHERE sms_trsm_sn=?", id);
            jdbc.update("DELETE FROM tb_sms_info WHERE sms_trsm_sn=?", id);
        });
        ownedTransmissions.clear();
    }

    @Test void separateWorkersClaimOnePostAndAcceptanceDoesNotBecomeSuccess() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger calls = new AtomicInteger();
        when(sender.send(anyString(), anyString(), anyString())).thenAnswer(call -> {
            calls.incrementAndGet();
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            // A different JDBC transaction already sees the claim before the POST starts.
            assertThat(stored().stage()).isEqualTo(SmsReceiptState.Stage.CLAIMED);
            entered.countDown();
            assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
            return SmsGatewayResult.accepted("request-owned");
        });
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> processor.sendToRecipient(transmission, PHONE, "0212345678", "body"));
            try {
                assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
                var duplicate = executor.submit(() -> processor.sendToRecipient(transmission, PHONE, "0212345678", "body"));
                assertThat(duplicate.get(5, TimeUnit.SECONDS)).isEqualTo(SmsGatewayResult.State.PENDING);
                assertThat(calls.get()).isEqualTo(1);
            } finally { release.countDown(); }
            assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(SmsGatewayResult.State.PENDING);
        }
        assertThat(code()).isEqualTo("P");
        assertThat(stored().stage()).isEqualTo(SmsReceiptState.Stage.ACCEPTED);
        verify(sender, times(1)).send(anyString(), anyString(), anyString());
    }

    @Test void acceptedReceiptIsReconciledThroughGetOutsideTransactionsAndPublicMapperHidesIdentifiers() throws Exception {
        when(sender.send(anyString(), anyString(), anyString())).thenReturn(SmsGatewayResult.accepted("request-owned"));
        processor.sendToRecipient(transmission, PHONE, "0212345678", "body");
        assertThat(code()).isEqualTo("P");
        when(sender.query("request-owned", null, PHONE)).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return SmsGatewayResult.delivered("request-owned", "message-owned");
        });
        processor.reconcilePending().get(15, TimeUnit.SECONDS);
        assertThat(code()).isEqualTo("S");
        assertThat(stored().messageId()).isEqualTo("message-owned");
        assertThat(service.getSmsRecipients(transmission)).singleElement().satisfies(dto -> {
            assertThat(dto.getRsltCd()).isEqualTo("S");
            assertThat(dto.getRsltMsg()).contains("전달되었습니다").doesNotContain("request-owned", "message-owned", SmsReceiptState.PREFIX);
        });
        processor.reconcilePending().get(15, TimeUnit.SECONDS);
        verify(sender, times(1)).send(anyString(), anyString(), anyString());
        verify(sender, times(1)).query("request-owned", null, PHONE);
    }

    @Test void deletionWhilePostWaitsDoesNotRecreateRecipientFromLateAcceptance() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(sender.send(anyString(), anyString(), anyString())).thenAnswer(call -> {
            entered.countDown();
            assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
            return SmsGatewayResult.accepted("request-owned");
        });
        try (var executor = Executors.newSingleThreadExecutor()) {
            var sending = executor.submit(() -> processor.sendToRecipient(transmission, PHONE, "0212345678", "body"));
            try {
                assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
                jdbc.update("DELETE FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?", transmission, PHONE);
            } finally { release.countDown(); }
            sending.get(10, TimeUnit.SECONDS);
        }
        assertThat(recipients.findById(new SmsRecptnId(transmission, PHONE))).isEmpty();
        verify(sender, times(1)).send(anyString(), anyString(), anyString());
    }

    @Test void anotherTerminalResultWinsAgainstLateReceiptFailure() throws Exception {
        when(sender.send(anyString(), anyString(), anyString())).thenReturn(SmsGatewayResult.accepted("request-owned"));
        processor.sendToRecipient(transmission, PHONE, "0212345678", "body");
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(sender.query("request-owned", null, PHONE)).thenAnswer(call -> {
            entered.countDown();
            assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
            return SmsGatewayResult.rejected("request-owned", "message-owned", SmsGatewayResult.Reason.PROVIDER_REJECTED);
        });
        var polling = processor.reconcilePending();
        try {
            assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
            jdbc.update("UPDATE tb_sms_rcptn SET rslt_cd='S',rslt_msg='already settled' WHERE sms_trsm_sn=? AND rcptn_telno=?",
                    transmission, PHONE);
        } finally { release.countDown(); }
        polling.get(15, TimeUnit.SECONDS);
        assertThat(code()).isEqualTo("S");
        assertThat(jdbc.queryForObject("SELECT rslt_msg FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?", String.class,
                transmission, PHONE)).isEqualTo("already settled");
    }

    @Test void anotherTransactionPreservesThe48thGetLeaseUntilItsDeliveredResultCommits() throws Exception {
        long now = System.currentTimeMillis();
        SmsReceiptState initial = new SmsReceiptState(SmsReceiptState.Stage.ACCEPTED, UUID.randomUUID().toString(),
                "request-owned", "message-owned", now, now, 47, SmsGatewayResult.Reason.LOOKUP_PENDING);
        jdbc.update("UPDATE tb_sms_rcptn SET rslt_msg=? WHERE sms_trsm_sn=? AND rcptn_telno=?",
                initial.encode(), transmission, PHONE);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(sender.query("request-owned", "message-owned", PHONE)).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(stored().polls()).isEqualTo(48);
            entered.countDown();
            assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
            return SmsGatewayResult.delivered("request-owned", "message-owned");
        });
        try (var executor = Executors.newSingleThreadExecutor()) {
            var polling = executor.submit(() -> {
                String lease = processor.prepareReconciliation(transmission, PHONE).orElseThrow();
                processor.reconcileRecipient(transmission, PHONE, lease);
            });
            try {
                assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
                assertThat(processor.prepareReconciliation(transmission, PHONE)).isEmpty();
                assertThat(stored().stage()).isEqualTo(SmsReceiptState.Stage.ACCEPTED);
                assertThat(stored().polls()).isEqualTo(48);
                assertThat(code()).isEqualTo("P");
            } finally { release.countDown(); }
            polling.get(10, TimeUnit.SECONDS);
        }
        assertThat(code()).isEqualTo("S");
        assertThat(stored().stage()).isEqualTo(SmsReceiptState.Stage.DELIVERED);
        verify(sender, times(1)).query("request-owned", "message-owned", PHONE);
        verify(sender, never()).send(any(), any(), any());
    }

    @Test void persistedFinalGetLeaseExpiresWithoutA49thQueryOrAnotherPost() {
        long now = System.currentTimeMillis();
        SmsReceiptState exhausted = new SmsReceiptState(SmsReceiptState.Stage.ACCEPTED, UUID.randomUUID().toString(),
                "request-owned", "message-owned", now - 300_001, now - 1, 48, SmsGatewayResult.Reason.LOOKUP_PENDING);
        jdbc.update("UPDATE tb_sms_rcptn SET rslt_msg=? WHERE sms_trsm_sn=? AND rcptn_telno=?",
                exhausted.encode(), transmission, PHONE);

        assertThat(processor.prepareReconciliation(transmission, PHONE)).isEmpty();

        assertThat(code()).isEqualTo("P");
        assertThat(stored().stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
        assertThat(stored().reason()).isEqualTo(SmsGatewayResult.Reason.EXPIRED);
        assertThat(stored().polls()).isEqualTo(48);
        verifyNoInteractions(sender);
    }

    @Test void rollbackCreatesNoRecipientsAndNeverStartsAnAsyncPostButCommitDoes() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        AtomicBoolean outsideTransaction = new AtomicBoolean();
        CountDownLatch delivered = new CountDownLatch(1);
        when(sender.send(anyString(), anyString(), anyString())).thenAnswer(call -> {
            calls.incrementAndGet();
            outsideTransaction.set(!TransactionSynchronizationManager.isActualTransactionActive());
            delivered.countDown();
            return SmsGatewayResult.accepted("request-commit");
        });
        SmsDto dto = SmsDto.builder().sndngTelno("0212345678").sndngCn("owned committed request")
                .recipients(List.of(SmsRecptnDto.builder().rcptnTelno(PHONE).build())).build();
        Long rolledBack = new TransactionTemplate(manager).execute(status -> {
            Long id = service.sendSms("owned-test", dto);
            status.setRollbackOnly();
            return id;
        });
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sms_info WHERE sms_trsm_sn=?", Long.class, rolledBack)).isZero();
        assertThat(calls.get()).isZero();
        Long committed = new TransactionTemplate(manager).execute(status -> service.sendSms("owned-test", dto));
        ownedTransmissions.add(committed);
        assertThat(delivered.await(10, TimeUnit.SECONDS)).isTrue();
        org.awaitility.Awaitility.await().atMost(10, TimeUnit.SECONDS).untilAsserted(() ->
                assertThat(SmsReceiptState.parse(jdbc.queryForObject(
                        "SELECT rslt_msg FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?", String.class,
                        committed, PHONE)).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.ACCEPTED));
        assertThat(calls.get()).isEqualTo(1);
        assertThat(outsideTransaction.get()).isTrue();
        assertThat(jdbc.queryForObject("SELECT rslt_cd FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?", String.class,
                committed, PHONE)).isEqualTo("P");
    }

    @Test void persistedCrashedClaimExpiresAsUnknownWithoutAnotherPost() throws Exception {
        String crashed = SmsReceiptState.claim(System.currentTimeMillis() - 180_000).encode();
        jdbc.update("UPDATE tb_sms_rcptn SET rslt_msg=? WHERE sms_trsm_sn=? AND rcptn_telno=?", crashed, transmission, PHONE);
        processor.reconcilePending().get(15, TimeUnit.SECONDS);
        assertThat(code()).isEqualTo("P");
        assertThat(stored().stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
        assertThat(stored().reason()).isEqualTo(SmsGatewayResult.Reason.EXPIRED);
        processor.sendToRecipient(transmission, PHONE, "0212345678", "body");
        verifyNoInteractions(sender);
    }

    @Test void queueRejectionWaitingForRowLockPreservesTheConcurrentAcceptedReceipt() throws Exception {
        long now = System.currentTimeMillis();
        String receipt = SmsReceiptState.claim(now).submitted(SmsGatewayResult.accepted("request-owned"), now).encode();
        try (var blocker = dataSource.getConnection(); var executor = Executors.newSingleThreadExecutor()) {
            blocker.setAutoCommit(false);
            int blockerPid;
            try (var statement = blocker.createStatement(); var result = statement.executeQuery("SELECT pg_backend_pid()")) {
                assertThat(result.next()).isTrue();
                blockerPid = result.getInt(1);
            }
            try (var lock = blocker.prepareStatement("SELECT rslt_cd FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=? FOR UPDATE")) {
                lock.setLong(1, transmission);
                lock.setString(2, PHONE);
                lock.executeQuery().close();
            }
            var rejecting = executor.submit(() -> processor.markBatchRejected(transmission));
            try {
                org.awaitility.Awaitility.await().atMost(10, TimeUnit.SECONDS).untilAsserted(() ->
                        assertThat(jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE ? = ANY(pg_blocking_pids(pid))"
                                + " AND query LIKE '%tb_sms_rcptn%'", Long.class, blockerPid)).isPositive());
                try (var update = blocker.prepareStatement("UPDATE tb_sms_rcptn SET rslt_msg=? WHERE sms_trsm_sn=? AND rcptn_telno=?")) {
                    update.setString(1, receipt);
                    update.setLong(2, transmission);
                    update.setString(3, PHONE);
                    update.executeUpdate();
                }
                blocker.commit();
            } finally { blocker.rollback(); }
            rejecting.get(10, TimeUnit.SECONDS);
        }
        assertThat(code()).isEqualTo("P");
        assertThat(stored().requestId()).isEqualTo("request-owned");
        verifyNoInteractions(sender);
    }

    @Test void heldRecipientLockTimesOutBeforeAnyPostAndLeavesPendingUntouched() throws Exception {
        try (var blocker = dataSource.getConnection(); var executor = Executors.newSingleThreadExecutor()) {
            blocker.setAutoCommit(false);
            try (var lock = blocker.prepareStatement("SELECT rslt_cd FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=? FOR UPDATE")) {
                lock.setLong(1, transmission);
                lock.setString(2, PHONE);
                lock.executeQuery().close();
            }
            long start = System.nanoTime();
            var attempting = executor.submit(() -> {
                org.assertj.core.api.Assertions.assertThatThrownBy(() -> processor.sendToRecipient(transmission, PHONE, "0212345678", "body"))
                        .isInstanceOf(RuntimeException.class);
            });
            try {
                attempting.get(6, TimeUnit.SECONDS);
                assertThat(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start)).isBetween(1500L, 5500L);
            } finally { blocker.rollback(); }
        }
        assertThat(code()).isEqualTo("P");
        assertThat(jdbc.queryForObject("SELECT rslt_msg FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?", String.class,
                transmission, PHONE)).isNull();
        verifyNoInteractions(sender);
    }

    @Test void twoHundredMalformedOldCandidatesCannotPermanentlyStarveAValidReceipt() throws Exception {
        List<SmsRecptn> broken = new java.util.ArrayList<>();
        for (int index = 0; index < 200; index++) {
            broken.add(SmsRecptn.builder().smsTrsmSn(transmission).rcptnTelno("010" + String.format("%08d", index + 1000))
                    .rsltCd("P").rsltMsg(SmsReceiptState.PREFIX + "ACCEPTED|malformed-private-receipt").build());
        }
        recipients.saveAllAndFlush(broken);
        long now = System.currentTimeMillis();
        String valid = SmsReceiptState.claim(now).submitted(SmsGatewayResult.accepted("request-owned"), now).encode();
        jdbc.update("UPDATE tb_sms_rcptn SET rslt_msg=?,mdfcn_dt=CURRENT_TIMESTAMP + INTERVAL '1 hour'"
                + " WHERE sms_trsm_sn=? AND rcptn_telno=?", valid, transmission, PHONE);
        when(sender.query("request-owned", null, PHONE)).thenReturn(SmsGatewayResult.delivered("request-owned", "message-owned"));
        processor.reconcilePending().get(30, TimeUnit.SECONDS);
        assertThat(code()).isEqualTo("P");
        verify(sender, never()).query(any(), any(), any());
        processor.reconcilePending().get(30, TimeUnit.SECONDS);
        assertThat(code()).isEqualTo("S");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rslt_msg LIKE ?", Long.class,
                transmission, SmsReceiptState.PREFIX + "UNKNOWN|%")).isEqualTo(200);
        verify(sender, never()).send(any(), any(), any());
    }

    private String code() {
        return jdbc.queryForObject("SELECT rslt_cd FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?", String.class,
                transmission, PHONE);
    }

    private SmsReceiptState stored() {
        return SmsReceiptState.parse(jdbc.queryForObject("SELECT rslt_msg FROM tb_sms_rcptn WHERE sms_trsm_sn=? AND rcptn_telno=?",
                String.class, transmission, PHONE)).orElseThrow();
    }
}
