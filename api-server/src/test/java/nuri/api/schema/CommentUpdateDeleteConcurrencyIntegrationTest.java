package nuri.api.schema;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import nuri.business.domain.comment.exception.CommentErrorCode;
import nuri.business.service.comment.CommentService;
import nuri.foundation.core.exception.BusinessException;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertAll;

/** Actual PostgreSQL lock waiting must not let a stale comment update undo a committed deletion. */
@Tag("schema-validation")
@SpringBootTest
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class CommentUpdateDeleteConcurrencyIntegrationTest {
    private static final String BOARD_ID = "BBSMSTR_AAAAAAAAAAAA";
    private static final String USER_ID = "USRCNFRM_00000000001";

    @Autowired private CommentService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;
    @PersistenceContext private EntityManager entityManager;

    private Long post;
    private Long comment;
    private String loginId;

    @BeforeEach
    void createOwnPostAndComment() {
        loginId = jdbc.queryForObject("SELECT user_id FROM tb_user_info WHERE esntl_id=?", String.class, USER_ID);
        post = jdbc.queryForObject("""
                INSERT INTO tb_bbs_item (bbs_id, pst_ttl, pst_cn, use_yn, user_id, cmnt_cnt)
                VALUES (?, ?, 'comment race fixture', 'Y', ?, 1) RETURNING pst_sn
                """, Long.class, BOARD_ID, "comment-race-" + UUID.randomUUID(), USER_ID);
        comment = jdbc.queryForObject("""
                INSERT INTO tb_bbs_comment (ans_sn, pst_sn, bbs_id, wrter_id, wrter_nm, ans_cn, use_yn, frst_rgtr_id)
                VALUES (nextval('sq_answer_no'), ?, ?, ?, '경합 검증', 'before deletion', 'Y', ?) RETURNING ans_sn
                """, Long.class, post, BOARD_ID, USER_ID, loginId);
    }

    @AfterEach
    void removeOnlyOwnFixture() {
        SecurityContextHolder.clearContext();
        if (comment != null) jdbc.update("DELETE FROM tb_bbs_comment WHERE ans_sn=?", comment);
        if (post != null) jdbc.update("DELETE FROM tb_bbs_item WHERE pst_sn=?", post);
    }

    @Test
    void updateWaitingForDeletionCannotReactivateTheComment() throws Exception {
        var deletionApplied = new CountDownLatch(1);
        var releaseDeletion = new CountDownLatch(1);
        var deletingPid = new AtomicInteger();
        String application = "comment-update-contender-" + UUID.randomUUID();

        // The observer has its own connection; both workers retain their transactional connections.
        try (Connection observer = dataSource.getConnection(); var executor = Executors.newFixedThreadPool(2)) {
            var deleting = executor.submit(() -> {
                authenticateOwner();
                try {
                    transaction().executeWithoutResult(status -> {
                        deletingPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        service.deleteComment(comment);
                        entityManager.flush();
                        deletionApplied.countDown();
                        awaitRelease(releaseDeletion);
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            Future<Throwable> updating;
            try {
                boolean ready = deletionApplied.await(15, TimeUnit.SECONDS);
                if (!ready && deleting.isDone()) deleting.get(1, TimeUnit.SECONDS);
                assertThat(ready).as("deletion is flushed while its transaction still holds the comment lock").isTrue();

                updating = executor.submit(() -> {
                    authenticateOwner();
                    try {
                        return catchThrowable(() -> transaction().executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            jdbc.queryForObject("SELECT set_config('lock_timeout', '20s', true)", String.class);
                            service.updateComment(comment, "late update after deletion");
                        }));
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                assertWaitingOnComment(observer, application, deletingPid.get(), updating);
            } finally {
                releaseDeletion.countDown();
            }
            deleting.get(20, TimeUnit.SECONDS);
            Throwable updateFailure = updating.get(20, TimeUnit.SECONDS);

            String useYn = jdbc.queryForObject("SELECT use_yn FROM tb_bbs_comment WHERE ans_sn=?", String.class, comment);
            Integer count = jdbc.queryForObject("SELECT cmnt_cnt FROM tb_bbs_item WHERE pst_sn=?", Integer.class, post);
            assertAll(
                    () -> assertThat(updateFailure).isInstanceOfSatisfying(BusinessException.class,
                            rejected -> assertThat(rejected.getErrorCode()).isEqualTo(CommentErrorCode.COMMENT_NOT_FOUND)),
                    () -> assertThat(useYn).as("the committed deletion remains effective").isEqualTo("N"),
                    () -> assertThat(count).as("the deleted comment stays excluded from the post count").isZero());
        }
    }

    private void assertWaitingOnComment(Connection observer, String application, int blockerPid,
            Future<Throwable> updating) throws Exception {
        try (var statement = observer.prepareStatement("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_stat_activity
                    WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'
                      AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE '%tb_bbs_comment%'
                )
                """)) {
            statement.setString(1, application);
            statement.setInt(2, blockerPid);
            statement.setQueryTimeout(3);
            // Both the old UPDATE and the corrected SELECT FOR UPDATE must wait on this actual row lock.
            await().pollDelay(Duration.ZERO).pollInterval(Duration.ofMillis(20)).atMost(Duration.ofSeconds(15))
                    .until(() -> {
                        try (var rows = statement.executeQuery()) {
                            rows.next();
                            if (rows.getBoolean(1)) return true;
                        }
                        if (updating.isDone()) {
                            throw new AssertionError("Update completed before waiting on the deleting transaction", updating.get());
                        }
                        return false;
                    });
        }
    }

    private TransactionTemplate transaction() {
        var transaction = new TransactionTemplate(transactionManager);
        transaction.setTimeout(30);
        return transaction;
    }

    private void authenticateOwner() {
        var principal = CustomUserDetails.builder().userId(loginId).esntlId(USER_ID).enabled(true)
                .permissions(List.of("COMMENT_UPDATE", "COMMENT_DELETE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void awaitRelease(CountDownLatch release) {
        try {
            assertThat(release.await(25, TimeUnit.SECONDS)).as("release follows observed PostgreSQL lock waiting").isTrue();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError(interrupted);
        }
    }
}
