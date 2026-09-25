package nuri.api.schema;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import nuri.business.service.system.content.community.CommunityService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Actual PostgreSQL locks expose stale membership decisions in either commit order. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class CommunityDecisionConcurrencyIntegrationTest {
    private static final String USER_ID = "USRCNFRM_00000000001";
    @Autowired private CommunityService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @PersistenceContext private EntityManager entityManager;
    private long community;

    @BeforeEach
    void prepareRequestedMembership() {
        community = jdbc.queryForObject("""
                INSERT INTO tb_cmnty_info (cmnty_nm, reg_se_cd, use_yn)
                VALUES ('회원 결정 경합', 'REGC01', 'Y') RETURNING cmnty_sn
                """, Long.class);
        jdbc.update("""
                INSERT INTO tb_cmnty_user_map (cmnty_sn, user_id, mbr_stts_cd, mngr_yn, use_yn)
                VALUES (?, ?, 'A', 'N', 'Y')
                """, community, USER_ID);
    }

    @AfterEach
    void removeOwnFixture() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_cmnty_user_map WHERE cmnty_sn=?", community);
        jdbc.update("DELETE FROM tb_cmnty_info WHERE cmnty_sn=?", community);
    }

    @ParameterizedTest(name = "first decision approves={0}")
    @ValueSource(booleans = {true, false})
    void competingDecisionRechecksStateAfterTheFirstCommit(boolean approveFirst) throws Exception {
        var decided = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                authenticate(approveFirst);
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        decide(approveFirst);
                        entityManager.flush();
                        decided.countDown();
                        await(release);
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            try {
                boolean ready = decided.await(15, TimeUnit.SECONDS);
                if (!ready && first.isDone()) first.get(1, TimeUnit.SECONDS);
                assertThat(ready).as("선행 결정이 DB에 반영되어야 한다").isTrue();
                var second = executor.submit(() -> {
                    authenticate(!approveFirst);
                    try {
                        assertThatThrownBy(() -> new TransactionTemplate(transactionManager)
                                .executeWithoutResult(status -> {
                                    jdbc.queryForObject("SELECT set_config('application_name', ?, true)",
                                            String.class, "community-decision-contender");
                                    decide(!approveFirst);
                                })).isInstanceOf(BusinessException.class)
                                .hasFieldOrPropertyWithValue("errorCode", approveFirst
                                        ? CommonErrorCode.INVALID_STATE : CommonErrorCode.RESOURCE_NOT_FOUND);
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                try {
                    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                    int waiting;
                    do {
                        waiting = jdbc.queryForObject("""
                                SELECT count(*) FROM pg_stat_activity
                                WHERE datname=current_database() AND application_name='community-decision-contender'
                                  AND wait_event_type='Lock'
                                """, Integer.class);
                        if (waiting == 0) Thread.sleep(20);
                    } while (waiting == 0 && System.nanoTime() < deadline);
                    assertThat(waiting).as("선행 결정이 가진 실제 DB 잠금을 기다린다").isEqualTo(1);
                } finally {
                    release.countDown();
                }
                first.get(20, TimeUnit.SECONDS);
                second.get(20, TimeUnit.SECONDS);
            } finally {
                release.countDown();
            }
        }
        var states = jdbc.queryForList(
                "SELECT mbr_stts_cd FROM tb_cmnty_user_map WHERE cmnty_sn=? AND user_id=?",
                String.class, community, USER_ID);
        if (approveFirst) {
            assertThat(states).containsExactly("P");
        } else {
            assertThat(states).isEmpty();
        }
    }

    private void decide(boolean approve) {
        if (approve) service.approveMember(community, USER_ID);
        else service.rejectMember(community, USER_ID);
    }

    private static void authenticate(boolean approve) {
        var principal = CustomUserDetails.builder().userId("community-reviewer").esntlId(USER_ID)
                .enabled(true).permissions(List.of(approve ? "COMMUNITY_APPROVE" : "COMMUNITY_REJECT")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(25, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new AssertionError(failure);
        }
    }
}
