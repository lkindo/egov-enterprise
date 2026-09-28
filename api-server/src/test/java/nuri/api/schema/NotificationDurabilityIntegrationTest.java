package nuri.api.schema;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.service.notification.NotificationDeliveryWorkHandler;
import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.business.service.notification.dto.NotificationMapper;
import nuri.business.service.system.job.DurableWorkDispatcher;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** PostgreSQL proves atomic inbox/intent storage, replay serialization and committed worker recovery. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class NotificationDurabilityIntegrationTest {
    @Autowired NotificationService notifications;
    @Autowired NotificationRepository inbox;
    @Autowired NotificationMapper notificationMapper;
    @Autowired DurableJobRepository jobs;
    @Autowired ApplicationEventPublisher events;
    @Autowired PlatformTransactionManager manager;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    private TransactionTemplate transaction;
    private String receiver;
    private NotificationRequestedEvent request;
    private SimpMessagingTemplate transport;

    @BeforeEach void prepare() {
        receiver = "ND" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES (?,?,'test-fixture-only',?,'P','N','20260928')", receiver, receiver, receiver);
        transaction = new TransactionTemplate(manager);
        request = new NotificationRequestedEvent(receiver, "private-title", "private-body" + "x".repeat(3988), "/note");
        transport = mock(SimpMessagingTemplate.class);
        authenticate();
    }

    @AfterEach void cleanupOnlyOwnRows() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver'=?", receiver);
        jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id=?", receiver);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", receiver);
    }

    @Test void eventRequiresTransactionAndRollbackRemovesInboxAndIntentTogether() {
        assertThatThrownBy(() -> events.publishEvent(request))
                .isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
        transaction.executeWithoutResult(status -> {
            events.publishEvent(request);
            assertThat(inboxCount()).isEqualTo(1);
            assertThat(intentCount()).isEqualTo(1);
            status.setRollbackOnly();
        });
        assertThat(inboxCount()).isZero();
        assertThat(intentCount()).isZero();
        verifyNoInteractions(transport);
    }

    @Test void committedInboxAndMinimalIntentSurviveNewWorkerAndTransportFailure() {
        long id = enqueue();
        DurableJob stored = job();
        assertThat(stored.getJobCn()).hasSizeLessThan(400)
                .doesNotContain("private-title", "private-body", "/note");
        assertThat(inbox.findById(id).orElseThrow().getNotiCn()).hasSize(4000);
        verifyNoInteractions(transport);
        doThrow(new IllegalStateException("transport unavailable")).doNothing().when(transport)
                .convertAndSendToUser(eq(receiver), eq("/queue/notifications"), any(NotificationDto.class));
        due();
        assertThat(newWorker().dispatchOne()).isTrue();
        assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY");
        assertThat(inboxCount()).isEqualTo(1);
        due();
        assertThat(newWorker().dispatchOne()).isTrue();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(job().getRtryNmtm().intValueExact()).isEqualTo(2);
        verify(transport, times(2)).convertAndSendToUser(eq(receiver), eq("/queue/notifications"),
                argThat((NotificationDto dto) -> dto.getNotiSn().equals(id)));
        verify(transport, never()).convertAndSend(eq("/topic/public"), any(Object.class));
    }

    @Test void newWorkerRecoversCommittedExpiredLeaseWithoutCreatingAnotherInboxRow() {
        long id = enqueue();
        transaction.executeWithoutResult(status -> jobs.findLocked(job().getJobSn()).orElseThrow()
                .claim(LocalDateTime.of(1970, 1, 1, 0, 0), 8, 120));
        assertThat(job().getPrcsSttsNm()).isEqualTo("RUNNING");
        assertThat(newWorker().dispatchOne()).isTrue();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(inboxCount()).isEqualTo(1);
        // Simulates delivery before a process died without acknowledging: a replay keeps the row ID.
        handler().execute(job().work());
        verify(transport, times(2)).convertAndSendToUser(eq(receiver), eq("/queue/notifications"),
                argThat((NotificationDto dto) -> dto.getNotiSn().equals(id)));
        assertThat(inboxCount()).isEqualTo(1);
    }

    @Test void sequentialReplayRejectsChangedRequestAndDoesNotRecreateDeletedInboxRow() {
        long id = enqueue();
        assertThat(enqueue()).isEqualTo(id);
        assertThat(inboxCount()).isEqualTo(1);
        assertThat(intentCount()).isEqualTo(1);
        var changed = new NotificationRequestedEvent(request.eventId(), receiver, "changed", request.content(), request.linkUrl());
        assertThatThrownBy(() -> transaction.execute(status -> notifications.createForEvent(changed)))
                .isInstanceOf(IllegalStateException.class);
        notifications.deleteNotification(id, receiver);
        assertThat(enqueue()).isEqualTo(id);
        assertThat(inboxCount()).isZero();
        due();
        assertThat(newWorker().dispatchOne()).isTrue();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        verifyNoInteractions(transport);
    }

    @Test void concurrentReplayWaitsForActualAdvisoryLockAndReusesExactlyOneCommittedRow() throws Exception {
        CountDownLatch stored = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        String application = "notification-replay-" + receiver;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                authenticate();
                try {
                    return transaction.execute(status -> {
                        long id = notifications.createForEvent(request);
                        stored.countDown();
                        await(release);
                        return id;
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            try {
                assertThat(stored.await(15, TimeUnit.SECONDS)).isTrue();
                var second = executor.submit(() -> {
                    authenticate();
                    try {
                        return transaction.execute(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            return notifications.createForEvent(request);
                        });
                    } finally { SecurityContextHolder.clearContext(); }
                });
                try {
                    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                    int waiting;
                    do {
                        waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                                + "AND application_name=? AND wait_event_type='Lock' AND wait_event='advisory'", Integer.class, application);
                        if (waiting == 0) Thread.sleep(20);
                    } while (waiting == 0 && System.nanoTime() < deadline);
                    assertThat(waiting).as("PostgreSQL advisory transaction lock wait").isEqualTo(1);
                } finally { release.countDown(); }
                assertThat(second.get(20, TimeUnit.SECONDS)).isEqualTo(first.get(20, TimeUnit.SECONDS));
            } finally { release.countDown(); }
        }
        assertThat(inboxCount()).isEqualTo(1);
        assertThat(intentCount()).isEqualTo(1);
    }

    private long enqueue() { return transaction.execute(status -> notifications.createForEvent(request)); }
    private int inboxCount() { return jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id=?", Integer.class, receiver); }
    private int intentCount() { return jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver'=?", Integer.class, receiver); }
    private DurableJob job() {
        String key = jdbc.queryForObject("SELECT job_mng_no FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver'=?", String.class, receiver);
        return jobs.findByJobMngNo(key).orElseThrow();
    }
    private void due() { jdbc.update("UPDATE tb_sys_job SET job_prnmnt_dt=TIMESTAMP '1970-01-01 00:00:00' WHERE job_mng_no=?", job().getJobMngNo()); }
    private NotificationDeliveryWorkHandler handler() { return new NotificationDeliveryWorkHandler(inbox, notificationMapper, transport, mapper); }
    private DurableWorkDispatcher newWorker() { return new DurableWorkDispatcher(jobs, List.of(handler()), manager, false); }
    private void authenticate() {
        var principal = CustomUserDetails.builder().userId(receiver).esntlId(receiver).enabled(true).permissions(List.of()).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
    private static void await(CountDownLatch latch) {
        try { if (!latch.await(20, TimeUnit.SECONDS)) throw new IllegalStateException("fixture release timeout"); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new IllegalStateException(interrupted); }
    }
}
