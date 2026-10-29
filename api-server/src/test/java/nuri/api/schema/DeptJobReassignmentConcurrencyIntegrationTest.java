package nuri.api.schema;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.domain.organization.OrganizationManageRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.deptjob.DeptJobService;
import nuri.business.service.deptjob.dto.DeptJobMapper;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.notification.NotificationService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

/** Actual service/JPA transactions prove reassignment versions and atomic notification storage. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class DeptJobReassignmentConcurrencyIntegrationTest {

    @Autowired private DeptJobService service;
    @Autowired private DeptJobRepository jobs;
    @Autowired private DeptJobBoxRepository boxes;
    @Autowired private UserRepository users;
    @Autowired private OrganizationManageRepository organizations;
    @Autowired private DeptJobMapper mapper;
    @Autowired private AttachmentAssignmentPolicy attachments;
    @Autowired private ApplicationEventPublisher events;
    @Autowired private NotificationService notifications;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private JdbcTemplate jdbc;
    @PersistenceContext private EntityManager entityManager;

    private String fixture;
    private String actor;
    private String actorLogin;
    private String winner;
    private String contender;
    private Long task;

    @BeforeEach
    void createOnlyOwnDisposableFixtures() {
        fixture = "DJ" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        actor = fixture + "R";
        actorLogin = fixture + "L";
        winner = fixture + "W";
        contender = fixture + "C";
        insertUser(actor, actorLogin);
        insertUser(winner, winner);
        insertUser(contender, contender);
        task = jdbc.queryForObject("""
                INSERT INTO tb_dept_task_info
                    (dept_task_nm, dept_task_cn, pic_id, frst_rgtr_id, last_mdfr_id, crt_dt, mdfcn_dt)
                VALUES (?, 'original content', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING dept_task_sn
                """, Long.class, fixture, actor, actorLogin, actorLogin);
        authenticateRegistrar();
        assertThat(AopUtils.isAopProxy(service)).isTrue();
        assertThat(AopUtils.isAopProxy(notifications)).isTrue();
        assertThat(storedTask()).containsEntry("version", 0);
        assertNotificationRecipients();
    }

    @AfterEach
    void removeOnlyOwnFixturesInReferenceOrder() {
        SecurityContextHolder.clearContext();
        jdbc.update("""
                DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY'
                  AND job_cn::jsonb->>'receiver' IN (?, ?, ?)
                """, actor, winner, contender);
        jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id IN (?, ?, ?)", actor, winner, contender);
        jdbc.update("DELETE FROM tb_dept_task_info WHERE frst_rgtr_id=?", actorLogin);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?, ?, ?)", actor, winner, contender);
    }

    @Test
    void latestVersionCommitsOneIncrementAndOneNotification() {
        service.reassignDeptJob(task, winner, 0);

        assertThat(storedTask()).containsEntry("version", 1).containsEntry("pic_id", winner)
                .containsEntry("dept_task_nm", fixture).containsEntry("dept_task_cn", "original content")
                .containsEntry("frst_rgtr_id", actorLogin);
        assertNotificationRecipients(winner);
        assertThat(jdbc.queryForMap("SELECT noti_ttl_nm, noti_cn, link_url FROM tb_user_noti WHERE rcvr_id=?", winner))
                .containsEntry("noti_ttl_nm", "업무가 배정되었습니다")
                .containsEntry("noti_cn", fixture)
                .containsEntry("link_url", "/smart-toolkit/dept-job/" + task);
    }

    @Test
    void staleVersionRejectsBothAnotherAssigneeAndSameAssigneeWithoutMoreNotifications() {
        service.reassignDeptJob(task, winner, 0);
        Map<String, Object> committed = storedTask();

        for (String requested : List.of(contender, winner)) {
            assertThatThrownBy(() -> service.reassignDeptJob(task, requested, 0))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
            assertThat(storedTask()).isEqualTo(committed);
            assertNotificationRecipients(winner);
        }
    }

    @Test
    void currentVersionAndSameAssigneeCommitNoChangesOrExtraNotification() {
        service.reassignDeptJob(task, winner, 0);
        Map<String, Object> committed = storedTask();

        service.reassignDeptJob(task, winner, 1);

        assertThat(storedTask()).isEqualTo(committed);
        assertNotificationRecipients(winner);
    }

    @Test
    void twoRequestsThatReadVersionZeroCannotBothCommitOrKeepBothNotifications() throws Exception {
        var loaded = new CountDownLatch(1);
        var resume = new CountDownLatch(1);
        // Observe only the real initial read. All service writes, listeners and persistence are real.
        var observedJobs = mock(DeptJobRepository.class, delegatesTo(jobs));
        doAnswer(call -> {
            var found = jobs.findById(call.getArgument(0));
            assertThat(found).isPresent();
            assertThat(found.orElseThrow().getVersion()).isZero();
            loaded.countDown();
            await(resume);
            return found;
        }).when(observedJobs).findById(task);
        var lateService = new DeptJobService(observedJobs, boxes, users, organizations,
                mapper, attachments, events);
        var executor = Executors.newSingleThreadExecutor();
        Future<RuntimeException> lateRequest = null;
        try {
            lateRequest = executor.submit(() -> {
                authenticateRegistrar();
                try {
                    var transaction = new TransactionTemplate(transactionManager);
                    transaction.setTimeout(25);
                    transaction.executeWithoutResult(status -> {
                        lateService.reassignDeptJob(task, contender, 0);
                        // A real Hibernate flush (possibly triggered earlier by the notification path)
                        // must detect version zero even though the service's input check accepted it.
                        entityManager.flush();
                    });
                    return null;
                } catch (RuntimeException failure) {
                    return failure;
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            boolean ready = loaded.await(15, TimeUnit.SECONDS);
            if (!ready && lateRequest.isDone()) lateRequest.get(1, TimeUnit.SECONDS);
            assertThat(ready).as("the contender really loaded version zero in its own transaction").isTrue();

            // The real proxied service also accepts v0 and fully commits before T1 resumes.
            service.reassignDeptJob(task, winner, 0);
            Map<String, Object> committed = storedTask();
            assertThat(committed).containsEntry("version", 1).containsEntry("pic_id", winner);
            assertNotificationRecipients(winner);

            resume.countDown();
            RuntimeException failure = lateRequest.get(20, TimeUnit.SECONDS);
            assertThat(failure).as("the loser fails at actual optimistic persistence, not the DTO version guard")
                    .isInstanceOf(OptimisticLockingFailureException.class);
            assertThat(storedTask()).isEqualTo(committed);
            assertNotificationRecipients(winner);
        } finally {
            resume.countDown();
            if (lateRequest != null && !lateRequest.isDone()) lateRequest.cancel(true);
            executor.shutdownNow();
            assertThat(executor.awaitTermination(30, TimeUnit.SECONDS))
                    .as("worker must finish before fixture cleanup").isTrue();
            SecurityContextHolder.clearContext();
        }
    }

    private Map<String, Object> storedTask() {
        return jdbc.queryForMap("SELECT * FROM tb_dept_task_info WHERE dept_task_sn=?", task);
    }

    private void assertNotificationRecipients(String... expected) {
        assertThat(jdbc.queryForList("SELECT rcvr_id FROM tb_user_noti WHERE rcvr_id IN (?, ?, ?)",
                String.class, actor, winner, contender)).containsExactlyInAnyOrder(expected);
        assertThat(jdbc.queryForList("""
                SELECT job_cn::jsonb->>'receiver' FROM tb_sys_job
                WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver' IN (?, ?, ?)
                """, String.class, actor, winner, contender)).containsExactlyInAnyOrder(expected);
    }

    private void insertUser(String id, String login) {
        jdbc.update("""
                INSERT INTO tb_user_info(esntl_id, user_id, pswd, user_nm, user_stts_cd, lck_yn, sbscrb_ymd)
                VALUES (?, ?, 'test-only-unusable', '시험 계정', 'P', 'N', to_char(CURRENT_DATE, 'YYYYMMDD'))
                """, id, login);
    }

    private void authenticateRegistrar() {
        var principal = CustomUserDetails.builder().userId(actorLogin).esntlId(actor)
                .enabled(true).permissions(List.of()).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(20, TimeUnit.SECONDS)).as("resume the paused real repository read").isTrue();
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new AssertionError(failure);
        }
    }
}
