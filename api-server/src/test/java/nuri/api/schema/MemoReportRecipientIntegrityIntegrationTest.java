package nuri.api.schema;

import nuri.business.service.memoreport.MemoReportService;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.ClassUtils;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 메모 도메인만 선택해도 수신자 고정·활성 상태·최초 열람의 실제 PostgreSQL 검증을 유지한다. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@RecordApplicationEvents
class MemoReportRecipientIntegrityIntegrationTest {
    @Autowired private MemoReportService memoReportService;
    @Autowired private javax.sql.DataSource dataSource;
    @Autowired private jakarta.persistence.EntityManager entityManager;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private ApplicationContext applicationContext;
    @Autowired private ApplicationEvents applicationEvents;

    private String fixtureId;
    private String sender;
    private String active;
    private String waiting;
    private String disabled;
    private String missing;
    private boolean notificationModule;

    @BeforeEach
    void seedOnlyDisposableDatabaseUsers() {
        fixtureId = "MR" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        sender = fixtureId + "S";
        active = fixtureId + "P";
        waiting = fixtureId + "A";
        disabled = fixtureId + "D";
        missing = fixtureId + "M";
        insertUser(sender, "P");
        insertUser(active, "P");
        insertUser(waiting, "A");
        insertUser(disabled, "D");
        var principal = CustomUserDetails.builder().userId(sender).esntlId(sender).enabled(true).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        assertThat(AopUtils.isAopProxy(memoReportService)).isTrue();
        // 알림은 선택 모듈이다. 실제 클래스가 포함됐으면 bean과 테이블이 반드시 있어야 한다.
        // 테이블 누락을 '알림 없음'으로 처리하거나 선택 도메인에 Java import를 강요하지 않는다.
        notificationModule = ClassUtils.isPresent("nuri.business.service.notification.NotificationService", getClass().getClassLoader());
        if (notificationModule) {
            var notificationType = ClassUtils.resolveClassName("nuri.business.service.notification.NotificationService", getClass().getClassLoader());
            assertThat(applicationContext.getBeansOfType(notificationType)).hasSize(1);
            assertThat(jdbc.queryForObject("SELECT to_regclass('public.tb_user_noti') IS NOT NULL", Boolean.class)).isTrue();
        }
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver' IN (?, ?, ?, ?, ?)",
                sender, active, waiting, disabled, missing);
        if (notificationModule) {
            jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id IN (?, ?, ?, ?, ?)", sender, active, waiting, disabled, missing);
        }
        jdbc.update("DELETE FROM tb_memo_rpt_info WHERE user_id=?", sender);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?, ?, ?, ?)", sender, active, waiting, disabled);
    }

    private void insertUser(String id, String state) {
        jdbc.update("INSERT INTO tb_user_info(esntl_id, user_id, pswd, user_nm, user_stts_cd, lck_yn, sbscrb_ymd) "
                + "VALUES (?, ?, 'test-only-unusable', '시험 계정', ?, 'N', to_char(CURRENT_DATE, 'YYYYMMDD'))",
                id, id, state);
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "A", "D"})
    void unavailableMemoRecipientLeavesNoReportOrNotification(String state) throws InterruptedException {
        assertThatThrownBy(() -> memoReportService.createMemoReport(sender, memo(unavailable(state))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_memo_rpt_info WHERE user_id=?", Long.class, sender)).isZero();
        assertThat(applicationEvents.stream(NotificationRequestedEvent.class).count()).isZero();
        if (notificationModule) {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id IN (?, ?, ?, ?, ?)",
                    Long.class, sender, active, waiting, disabled, missing)).isZero();
        }
    }

    @Test
    void memoRecipientIsFixedAndInactiveExistingRecipientDoesNotBlockCorrection() {
        long id = memoReportService.createMemoReport(sender, memo(active));
        jdbc.update("UPDATE tb_user_info SET user_stts_cd='D' WHERE esntl_id=?", active);
        var correction = memo(active);
        correction.setRptCn("corrected");
        memoReportService.updateMemoReport(id, sender, correction);
        assertThatThrownBy(() -> memoReportService.updateMemoReport(id, sender, memo(sender)))
                .isInstanceOf(BusinessException.class);
        assertThat(jdbc.queryForMap("SELECT rptr_id, rpt_cn FROM tb_memo_rpt_info WHERE memo_rpt_sn=?", id))
                .containsEntry("rptr_id", active).containsEntry("rpt_cn", "corrected");
    }

    @Test
    void memoRegistrationWaitsForConcurrentDeactivationAndRejectsItsCommittedState() throws Exception {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        try (var blocker = dataSource.getConnection(); var executor = java.util.concurrent.Executors.newSingleThreadExecutor()) {
            blocker.setAutoCommit(false);
            try (var update = blocker.prepareStatement("UPDATE tb_user_info SET user_stts_cd='D' WHERE esntl_id=?")) {
                update.setString(1, active);
                update.executeUpdate();
            }
            String application = fixtureId + "memo";
            var pending = executor.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(authentication);
                try {
                    return new TransactionTemplate(transactionManager).execute(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                        return memoReportService.createMemoReport(sender, memo(active));
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            try {
                waitForDatabaseLock(application, 1);
            } finally {
                blocker.commit();
            }
            assertThatThrownBy(() -> pending.get(20, TimeUnit.SECONDS))
                    .hasCauseInstanceOf(BusinessException.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_memo_rpt_info WHERE user_id=?", Long.class, sender)).isZero();
        }
    }

    @Test
    void concurrentRecipientReadsPreserveExactlyTheFirstReadTime() throws Exception {
        long id = memoReportService.createMemoReport(sender, memo(active));
        // 작성자가 확인해도 수신자 읽음은 생기지 않는다.
        memoReportService.readMemoReport(id);
        assertThat(jdbc.queryForObject("SELECT rptr_inq_dt FROM tb_memo_rpt_info WHERE memo_rpt_sn=?", java.sql.Timestamp.class, id)).isNull();
        try (var blocker = dataSource.getConnection(); var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            blocker.setAutoCommit(false);
            try (var lock = blocker.prepareStatement("SELECT memo_rpt_sn FROM tb_memo_rpt_info WHERE memo_rpt_sn=? FOR UPDATE")) {
                lock.setLong(1, id);
                lock.executeQuery().close();
            }
            String application = fixtureId + "read";
            java.util.concurrent.Callable<java.sql.Timestamp> read = () -> {
                var principal = CustomUserDetails.builder().userId(active).esntlId(active).enabled(true).build();
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
                try {
                    return new TransactionTemplate(transactionManager).execute(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                        memoReportService.readMemoReport(id);
                        entityManager.flush();
                        return jdbc.queryForObject("SELECT rptr_inq_dt FROM tb_memo_rpt_info WHERE memo_rpt_sn=?",
                                java.sql.Timestamp.class, id);
                    });
                } finally { SecurityContextHolder.clearContext(); }
            };
            var first = executor.submit(read);
            var second = executor.submit(read);
            try { waitForDatabaseLock(application, 2); } finally { blocker.rollback(); }
            var firstRead = first.get(20, TimeUnit.SECONDS);
            assertThat(firstRead).isNotNull().isEqualTo(second.get(20, TimeUnit.SECONDS));
            assertThat(jdbc.queryForObject("SELECT rptr_inq_dt FROM tb_memo_rpt_info WHERE memo_rpt_sn=?", java.sql.Timestamp.class, id))
                    .isEqualTo(firstRead);
        }
    }

    private MemoReportDto memo(String receiver) {
        return MemoReportDto.builder().rptTtl(fixtureId).rptCn("original").rptrId(receiver).build();
    }

    private void waitForDatabaseLock(String application, int expected) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        int waiting;
        do {
            waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                    + "AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
            if (waiting < expected) Thread.sleep(20);
        } while (waiting < expected && System.nanoTime() < deadline);
        assertThat(waiting).as("실제 PostgreSQL 행 잠금 대기").isEqualTo(expected);
    }

    private String unavailable(String state) {
        return switch (state) {
            case "A" -> waiting;
            case "D" -> disabled;
            default -> missing;
        };
    }
}
