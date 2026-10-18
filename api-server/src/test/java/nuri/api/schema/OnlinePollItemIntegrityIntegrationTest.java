package nuri.api.schema;

import nuri.business.service.survey.OnlinePollService;
import nuri.business.service.survey.dto.OnlinePollArticleDto;
import nuri.business.service.survey.dto.OnlinePollManageDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@SpringBootTest
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class OnlinePollItemIntegrityIntegrationTest {
    @Autowired private OnlinePollService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager manager;
    private long poll;
    private long first;
    private long second;

    @BeforeEach
    void prepare() {
        poll = jdbc.queryForObject("""
                INSERT INTO tb_onln_poll_manage (poll_nm, poll_bgng_ymd, poll_end_ymd, poll_dsuse_yn)
                VALUES ('항목 무결성', '20000101', '29991231', 'N') RETURNING poll_sn
                """, Long.class);
        first = jdbc.queryForObject("INSERT INTO tb_onln_poll_artcl(poll_sn, poll_artcl_nm) VALUES (?, '첫째') RETURNING poll_artcl_sn", Long.class, poll);
        second = jdbc.queryForObject("INSERT INTO tb_onln_poll_artcl(poll_sn, poll_artcl_nm) VALUES (?, '둘째') RETURNING poll_artcl_sn", Long.class, poll);
        authenticate();
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_onln_poll_rslt WHERE poll_sn=?", poll);
        jdbc.update("DELETE FROM tb_onln_poll_artcl WHERE poll_sn=?", poll);
        jdbc.update("DELETE FROM tb_onln_poll_manage WHERE poll_sn=?", poll);
    }

    @Test
    void reorderedItemsPreserveVotesAndVotedTextCannotBeReplaced() {
        service.vote(poll, first, "poll-voter");
        service.updatePoll(update("첫째"));
        assertThat(jdbc.queryForObject("SELECT poll_artcl_sn FROM tb_onln_poll_rslt WHERE poll_sn=?", Long.class, poll)).isEqualTo(first);
        assertThat(jdbc.queryForObject("SELECT poll_artcl_nm FROM tb_onln_poll_artcl WHERE poll_artcl_sn=?", String.class, first)).isEqualTo("첫째");

        assertThatThrownBy(() -> service.updatePoll(update("다른 의미")))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE);
        assertThat(jdbc.queryForObject("SELECT poll_artcl_nm FROM tb_onln_poll_artcl WHERE poll_artcl_sn=?", String.class, first)).isEqualTo("첫째");
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void votingAndEditingSerializeOnThePollBeforeCheckingResults(boolean voteFirst) throws Exception {
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var firstPid = new AtomicInteger();
        String application = "poll-contender-" + poll;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var leading = executor.submit(() -> transaction("poll-leading-" + poll, () -> {
                firstPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                String result = act(voteFirst);
                applied.countDown();
                try {
                    assertThat(release.await(20, TimeUnit.SECONDS)).isTrue();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(interrupted);
                }
                return result;
            }));
            java.util.concurrent.Future<String> following;
            try {
                boolean ready = applied.await(15, TimeUnit.SECONDS);
                if (!ready && leading.isDone()) leading.get();
                assertThat(ready).isTrue();
                following = executor.submit(() -> {
                    try {
                        return transaction(application, () -> act(!voteFirst));
                    } catch (BusinessException rejected) {
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
                        return "protected";
                    }
                });
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                boolean waiting;
                do {
                    waiting = Boolean.TRUE.equals(jdbc.queryForObject("""
                            SELECT EXISTS (SELECT 1 FROM pg_stat_activity
                              WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'
                                AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE '%tb_onln_poll_manage%')
                            """, Boolean.class, application, firstPid.get()));
                    if (!waiting && following.isDone()) following.get();
                    if (!waiting) Thread.sleep(20);
                } while (!waiting && System.nanoTime() < deadline);
                assertThat(waiting).as("vote and edit acquire the same poll row before item/result reads").isTrue();
            } finally {
                release.countDown();
            }
            assertThat(leading.get(15, TimeUnit.SECONDS)).isEqualTo(voteFirst ? "voted" : "updated");
            assertThat(following.get(15, TimeUnit.SECONDS)).isEqualTo(voteFirst ? "protected" : "voted");
        }
        assertThat(jdbc.queryForObject("SELECT poll_artcl_nm FROM tb_onln_poll_artcl WHERE poll_artcl_sn=?", String.class, first))
                .isEqualTo(voteFirst ? "첫째" : "바뀐 첫째");
        assertThat(jdbc.queryForObject("SELECT poll_artcl_sn FROM tb_onln_poll_rslt WHERE poll_sn=?", Long.class, poll)).isEqualTo(first);
    }

    @Test
    void concurrentVotersShareThePollLockAndDoNotWaitForEachOther() throws Exception {
        var voted = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            // 투표자 키(frst_rgtr_id)는 감사 컬럼이 인증 사용자로 채운다 — 같은 사용자로 인증하면 두 번째 INSERT 가
            // 유일 제약에서 첫 트랜잭션을 기다려, 부모 잠금과 무관하게 막힌다. 투표자마다 따로 인증한다.
            var holding = executor.submit(() -> transaction("poll-voter-a-" + poll, () -> {
                authenticate("poll-voter-a");
                service.vote(poll, first, "poll-voter-a");
                voted.countDown();
                try {
                    assertThat(release.await(20, TimeUnit.SECONDS)).isTrue();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(interrupted);
                }
                return "a";
            }));
            try {
                boolean ready = voted.await(15, TimeUnit.SECONDS);
                if (!ready && holding.isDone()) holding.get();
                assertThat(ready).isTrue();
                // The first vote's transaction is still open; an exclusive parent lock would block here.
                var other = executor.submit(() -> transaction("poll-voter-b-" + poll, () -> {
                    authenticate("poll-voter-b");
                    service.vote(poll, second, "poll-voter-b");
                    return "b";
                }));
                assertThat(other.get(10, TimeUnit.SECONDS)).isEqualTo("b");
            } finally {
                release.countDown();
            }
            assertThat(holding.get(15, TimeUnit.SECONDS)).isEqualTo("a");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_onln_poll_rslt WHERE poll_sn=?", Long.class, poll)).isEqualTo(2L);
    }

    private String act(boolean vote) {
        if (vote) {
            service.vote(poll, first, "poll-voter");
            return "voted";
        }
        service.updatePoll(update("바뀐 첫째"));
        return "updated";
    }

    @Test
    void deletionWaitsForTheEditingParentBeforeTakingAnyChildLocks() throws Exception {
        var editPrepared = new CountDownLatch(1);
        var releaseEdit = new CountDownLatch(1);
        var editorPid = new AtomicInteger();
        String application = "poll-deleting-" + poll;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var editing = executor.submit(() -> transaction("poll-editing-" + poll, () -> {
                editorPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                service.updatePoll(update("바뀐 첫째"));
                // The parent is locked, but the child UPDATE has not flushed yet.
                editPrepared.countDown();
                try {
                    assertThat(releaseEdit.await(20, TimeUnit.SECONDS)).isTrue();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(interrupted);
                }
                return "updated";
            }));
            java.util.concurrent.Future<String> deleting;
            try {
                boolean ready = editPrepared.await(15, TimeUnit.SECONDS);
                if (!ready && editing.isDone()) editing.get();
                assertThat(ready).isTrue();
                deleting = executor.submit(() -> transaction(application, () -> {
                    service.deletePoll(poll);
                    return "deleted";
                }));
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                boolean waiting;
                do {
                    waiting = Boolean.TRUE.equals(jdbc.queryForObject("""
                            SELECT EXISTS (SELECT 1 FROM pg_stat_activity
                              WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'
                                AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE '%tb_onln_poll_manage%')
                            """, Boolean.class, application, editorPid.get()));
                    if (!waiting && deleting.isDone()) deleting.get();
                    if (!waiting) Thread.sleep(20);
                } while (!waiting && System.nanoTime() < deadline);
                assertThat(waiting).as("delete waits on the editing parent").isTrue();
                // Waiting only at the final parent DELETE is too late: child locks would deadlock
                // the editor's eventual flush. A separate connection must still lock both children.
                assertThat(jdbc.queryForList("""
                        SELECT poll_artcl_sn FROM tb_onln_poll_artcl WHERE poll_sn=?
                        ORDER BY poll_artcl_sn FOR UPDATE SKIP LOCKED
                        """, Long.class, poll)).containsExactly(first, second);
            } finally {
                releaseEdit.countDown();
            }
            assertThat(editing.get(15, TimeUnit.SECONDS)).isEqualTo("updated");
            assertThat(deleting.get(15, TimeUnit.SECONDS)).isEqualTo("deleted");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_onln_poll_manage WHERE poll_sn=?", Long.class, poll)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_onln_poll_artcl WHERE poll_sn=?", Long.class, poll)).isZero();
        service.deletePoll(poll);
    }

    private OnlinePollManageDto update(String firstName) {
        return OnlinePollManageDto.builder().pollSn(poll).pollNm("항목 무결성")
                .pollBgngYmd("20000101").pollEndYmd("29991231").pollDsuseYn("N")
                .pollArticles(List.of(OnlinePollArticleDto.builder().pollArtclSn(second).pollArtclNm("둘째").build(),
                        OnlinePollArticleDto.builder().pollArtclSn(first).pollArtclNm(firstName).build())).build();
    }

    private String transaction(String application, Supplier<String> action) {
        authenticate();
        try {
            return new TransactionTemplate(manager).execute(status -> {
                jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                return action.get();
            });
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void authenticate() {
        authenticate("poll-editor");
    }

    private void authenticate(String userId) {
        var principal = CustomUserDetails.builder().userId(userId).esntlId(userId + "-id")
                .enabled(true).lockAt("N").groups(List.of()).permissions(List.of("POLL_READ", "POLL_READ_ALL", "POLL_UPDATE", "POLL_DELETE"))
                .authorizationVersion("poll-integrity").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
