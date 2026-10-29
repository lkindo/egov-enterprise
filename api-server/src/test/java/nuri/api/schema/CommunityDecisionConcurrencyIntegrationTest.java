package nuri.api.schema;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import com.querydsl.jpa.impl.JPAQueryFactory;
import nuri.business.domain.community.CommunityRepository;
import nuri.business.domain.community.CommunityUserId;
import nuri.business.domain.community.CommunityUserRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.community.CommunityService;
import nuri.business.service.user.UserService;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.core.template.TemplateAssignmentPolicy;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

/** Actual PostgreSQL locks expose stale membership decisions in either commit order. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class CommunityDecisionConcurrencyIntegrationTest {
    private static final String USER_ID = "USRCNFRM_00000000001";
    @Autowired private CommunityService service;
    @Autowired private UserService users;
    @Autowired private CommunityRepository communityRepository;
    @Autowired private CommunityUserRepository memberships;
    @Autowired private UserRepository userRepository;
    @Autowired private JPAQueryFactory queryFactory;
    @Autowired private ObjectProvider<TemplateAssignmentPolicy> templateAssignmentPolicy;
    @Autowired private ApplicationEventPublisher eventPublisher;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @PersistenceContext private EntityManager entityManager;
    private long community;
    private String deletedMember;

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
        if (deletedMember != null) jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", deletedMember);
    }

    @Test
    void deletingWithdrawnMemberFlushesMembershipBeforeParentBulkDelete() {
        deletedMember = "CU" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        jdbc.update("""
                INSERT INTO tb_user_info (esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn)
                VALUES (?,?,'unused-fixture-password','회원 삭제 검증','P','N')
                """, deletedMember, deletedMember);
        jdbc.update("""
                INSERT INTO tb_cmnty_user_map (cmnty_sn,user_id,mbr_stts_cd,mngr_yn,use_yn,whdwl_ymd)
                VALUES (?,?,'W','N','N',to_char(CURRENT_DATE,'YYYYMMDD'))
                """, community, deletedMember);
        String administrator = jdbc.queryForObject("SELECT user_id FROM tb_user_info WHERE esntl_id=?", String.class, USER_ID);
        var principal = CustomUserDetails.builder().userId(administrator).esntlId(USER_ID)
                .enabled(true).permissions(List.of("USER_DELETE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        // 실제 UserService→동기 UserDeletionEvent→부모 bulk DELETE의 커밋 경계를 실행한다.
        // 테스트에서 미리 flush하거나 자식 행을 지우면 실제 E2E의 FK 실패를 감춰 버린다.
        users.deleteUser(deletedMember);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id=?", Integer.class, deletedMember)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_cmnty_user_map WHERE user_id=?", Integer.class, deletedMember)).isZero();
        assertThat(jdbc.queryForObject("SELECT mbr_stts_cd FROM tb_cmnty_user_map WHERE cmnty_sn=? AND user_id=?",
                String.class, community, USER_ID)).isEqualTo("A");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_cmnty_info WHERE cmnty_sn=?", Integer.class, community)).isEqualTo(1);
    }

    @Test
    void lateFirstJoinCannotReplaceACommittedApprovalOrCommitAnotherRequest() throws Exception {
        // This scenario starts before any membership exists. The other tests begin with a request row.
        assertThat(jdbc.update("DELETE FROM tb_cmnty_user_map WHERE cmnty_sn=? AND user_id=?",
                community, USER_ID)).isEqualTo(1);
        var absent = new CountDownLatch(1);
        var resumeLateJoin = new CountDownLatch(1);
        var id = new CommunityUserId(community, USER_ID);
        var committedLateRequests = new ConcurrentLinkedQueue<NotificationRequestedEvent>();

        // Pause only after the real SELECT FOR UPDATE returned no row. Repository writes, auditing,
        // constraints and the service body remain real; the same transaction spans the observation
        // and save. A mock returning Optional.empty() without querying PostgreSQL would not prove it.
        var observedMemberships = mock(CommunityUserRepository.class, delegatesTo(memberships));
        doAnswer(call -> {
            var found = memberships.findByIdForUpdate(call.getArgument(0));
            assertThat(found).as("the late request really observed an absent membership").isEmpty();
            absent.countDown();
            await(resumeLateJoin);
            return found;
        }).when(observedMemberships).findByIdForUpdate(id);
        ApplicationEventPublisher observedPublisher = event -> {
            if (event instanceof NotificationRequestedEvent notification) {
                // A publication attempt before a later rollback is not a durable duplicate notice.
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override public void afterCommit() { committedLateRequests.add(notification); }
                });
            }
            eventPublisher.publishEvent(event);
        };
        var lateService = new CommunityService(communityRepository, observedMemberships, queryFactory,
                userRepository, templateAssignmentPolicy, observedPublisher);

        try (var executor = Executors.newSingleThreadExecutor()) {
            Future<RuntimeException> lateJoin = executor.submit(() -> {
                authenticateApplicant();
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(
                            status -> lateService.joinCommunity(community, USER_ID));
                    return null;
                } catch (RuntimeException failure) {
                    return failure;
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            try {
                boolean ready = absent.await(15, TimeUnit.SECONDS);
                if (!ready && lateJoin.isDone()) lateJoin.get(1, TimeUnit.SECONDS);
                assertThat(ready).as("the first join has finished its actual absence query").isTrue();

                // These two proxied service calls each commit before the late request can save.
                authenticateApplicant();
                service.joinCommunity(community, USER_ID);
                authenticate(true);
                service.approveMember(community, USER_ID);
                var approved = jdbc.queryForMap(
                        "SELECT * FROM tb_cmnty_user_map WHERE cmnty_sn=? AND user_id=?", community, USER_ID);
                assertThat(approved.get("mbr_stts_cd")).isEqualTo("P");

                resumeLateJoin.countDown();
                RuntimeException failure = lateJoin.get(20, TimeUnit.SECONDS);

                assertThat(jdbc.queryForMap(
                        "SELECT * FROM tb_cmnty_user_map WHERE cmnty_sn=? AND user_id=?", community, USER_ID))
                        .as("the approved row and its audit must survive the late first join")
                        .isEqualTo(approved);
                new ConflictResponseProbe().assertDuplicate(failure);
                assertThat(committedLateRequests)
                        .as("the rejected late join must not commit another notification request").isEmpty();
            } finally {
                resumeLateJoin.countDown();
                SecurityContextHolder.clearContext();
            }
        }
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

    private static void authenticateApplicant() {
        var principal = CustomUserDetails.builder().userId("community-applicant").esntlId(USER_ID)
                .enabled(true).permissions(List.of()).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    /** Check the real HTTP error mapping without imposing a new service-level exception wrapper. */
    private static class ConflictResponseProbe extends GlobalExceptionHandler {
        void assertDuplicate(RuntimeException failure) {
            assertThat(failure).as("the late first join must fail as a duplicate")
                    .isInstanceOfAny(BusinessException.class, DataIntegrityViolationException.class);
            if (failure instanceof BusinessException business) {
                assertThat(business.getErrorCode()).isEqualTo(CommonErrorCode.DUPLICATE_RESOURCE);
            } else {
                assertThat(((DataIntegrityViolationException) failure).getMostSpecificCause())
                        .isInstanceOfSatisfying(SQLException.class,
                                sql -> assertThat(sql.getSQLState()).isEqualTo("23505"));
            }
            var response = failure instanceof BusinessException business
                    ? handleBusinessException(business)
                    : handleDataIntegrityViolation((DataIntegrityViolationException) failure);
            assertThat(response.getStatusCode().value()).isEqualTo(409);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().code()).isEqualTo(CommonErrorCode.DUPLICATE_RESOURCE.getCode());
        }
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
