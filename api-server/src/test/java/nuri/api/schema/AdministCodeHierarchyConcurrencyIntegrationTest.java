package nuri.api.schema;

import jakarta.persistence.EntityManager;
import nuri.business.repository.code.AdministCodeRepository;
import nuri.business.service.code.AdministCodeService;
import nuri.business.service.code.dto.AdministCodeDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.method.annotation.ExceptionHandlerMethodResolver;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.junit.jupiter.api.Assertions.assertAll;

/** 행정코드의 동시 부모 변경이 커밋된 계층을 다시 검사하는지 실제 PostgreSQL에서 확인한다. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class AdministCodeHierarchyConcurrencyIntegrationTest {
    @Autowired private AdministCodeService service;
    @Autowired private AdministCodeRepository repository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private DataSource dataSource;
    @Autowired private Environment environment;

    private final List<String> createdCodes = new ArrayList<>();
    private String fixture;
    private String first;
    private String second;
    private String third;
    private String fourth;

    @BeforeEach
    void createOnlyOwnRootCodes() {
        fixture = "AH" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String prefix = Long.toString(ThreadLocalRandom.current().nextLong(800_000_000L, 900_000_000L));
        first = prefix + "0";
        second = prefix + "1";
        third = prefix + "2";
        fourth = prefix + "3";
        for (String code : List.of(first, second, third, fourth)) {
            jdbc.update("INSERT INTO tb_admdst_cd(admdst_cd,admdst_se_cd,admdst_zone_nm,use_yn) VALUES (?,'1',?,'Y')",
                    code, code);
            // A rare identifier collision must not give cleanup ownership of an existing row.
            createdCodes.add(code);
        }
    }

    @Test
    void disjointEndpointsCannotCloseAFourNodeCycle() throws Exception {
        jdbc.update("UPDATE tb_admdst_cd SET up_admdst_cd=? WHERE admdst_cd=?", third, second);
        jdbc.update("UPDATE tb_admdst_cd SET up_admdst_cd=? WHERE admdst_cd=?", first, fourth);

        RaceResult result = raceMoves(first, second, third, fourth, false);

        assertAll(
                () -> assertThat(result.failure()).isInstanceOfSatisfying(BusinessException.class,
                        rejected -> assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE)),
                () -> assertThat(parentOf(first)).isEqualTo(second),
                () -> assertThat(parentOf(second)).isEqualTo(third),
                () -> assertThat(parentOf(third)).as("disjoint endpoint pairs cannot close a longer cycle").isNull(),
                () -> assertThat(parentOf(fourth)).isEqualTo(first),
                () -> assertThat(result.blockedByLeader()).isTrue());
    }

    @AfterEach
    void removeOnlyOwnCodes() {
        SecurityContextHolder.clearContext();
        for (String code : createdCodes) {
            jdbc.update("UPDATE tb_admdst_cd SET up_admdst_cd=NULL WHERE admdst_cd=?", code);
        }
        for (String code : createdCodes) {
            jdbc.update("DELETE FROM tb_admdst_cd WHERE admdst_cd=?", code);
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void opposingConcurrentMovesRecheckTheCommittedParentGraph(boolean reverse) throws Exception {
        String child = reverse ? second : first;
        String parent = reverse ? first : second;

        RaceResult result = raceMoves(child, parent, parent, child, false);

        assertAll(
                () -> assertThat(result.failure()).isInstanceOfSatisfying(BusinessException.class,
                        rejected -> assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE)),
                () -> assertThat(parentOf(child)).isEqualTo(parent),
                () -> assertThat(parentOf(parent)).as("the rejected move cannot close a two-node cycle").isNull(),
                () -> assertThat(result.blockedByLeader()).as("the second hierarchy edit waits for the first transaction").isTrue());
    }

    @Test
    void independentMovesBothCommitAfterTheLeadingTransaction() throws Exception {
        RaceResult result = raceMoves(first, second, third, fourth, false);

        assertAll(
                () -> assertThat(result.failure()).isNull(),
                () -> assertThat(parentOf(first)).isEqualTo(second),
                () -> assertThat(parentOf(third)).isEqualTo(fourth),
                () -> assertThat(parentOf(second)).isNull(),
                () -> assertThat(parentOf(fourth)).isNull());
    }

    @Test
    void rollbackReleasesTheHierarchyLockAndTheNextMoveUsesTheRolledBackGraph() throws Exception {
        RaceResult result = raceMoves(first, second, second, first, true);

        assertAll(
                () -> assertThat(result.failure()).isNull(),
                () -> assertThat(parentOf(first)).as("the leading move was rolled back").isNull(),
                () -> assertThat(parentOf(second)).isEqualTo(first));
    }

    @Test
    void hierarchyLockRequiresAnExistingTransaction() {
        assertThatThrownBy(repository::lockHierarchy).isInstanceOf(IllegalTransactionStateException.class);
    }

    @Test
    void hierarchyLockTimesOutAsConflictWithoutPartialChangesAndCanBeRetried() throws Exception {
        assertThat(environment.getRequiredProperty("spring.jpa.properties.jakarta.persistence.lock.timeout", Long.class))
                .isEqualTo(5_000L);
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var followingStarted = new CountDownLatch(1);
        var leadingPid = new AtomicInteger();
        String application = fixture + "-timeout";

        try (Connection observer = dataSource.getConnection(); var executor = Executors.newFixedThreadPool(2)) {
            var leading = executor.submit(() -> {
                authenticate();
                try {
                    transaction().executeWithoutResult(status -> {
                        leadingPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        service.updateAdministCode(first, move(first, second), fixture);
                        // Timing tolerance alone would also accept an accidental 10-second bound.
                        assertThat(jdbc.queryForObject(
                                "SELECT setting::int FROM pg_settings WHERE name='lock_timeout'", Integer.class))
                                .isEqualTo(5_000);
                        entityManager.flush();
                        applied.countDown();
                        awaitRelease(release);
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            TimedFailure outcome;
            try {
                boolean ready = applied.await(10, TimeUnit.SECONDS);
                if (!ready && leading.isDone()) leading.get(1, TimeUnit.SECONDS);
                assertThat(ready).as("the real service transaction holds the hierarchy lock").isTrue();
                var following = executor.submit(() -> {
                    authenticate();
                    try {
                        long started = System.nanoTime();
                        Throwable failure = catchThrowable(() -> transaction().executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            // An ambient database setting must not hide a missing production lock_timeout.
                            jdbc.queryForObject("SELECT set_config('lock_timeout', '0', true)", String.class);
                            // This watchdog only bounds a broken implementation. Without the production
                            // lock_timeout, PostgreSQL cancels at 12s with 57014 and the SQLState assertion fails.
                            jdbc.queryForObject("SELECT set_config('statement_timeout', '12s', true)", String.class);
                            followingStarted.countDown();
                            service.updateAdministCode(third, move(third, fourth), fixture);
                            entityManager.flush();
                        }));
                        return new TimedFailure(failure, Duration.ofNanos(System.nanoTime() - started));
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                boolean started = followingStarted.await(10, TimeUnit.SECONDS);
                if (!started && following.isDone()) {
                    throw new AssertionError("The timeout contender failed before reaching the service", following.get().failure());
                }
                assertThat(started).isTrue();
                assertThat(waitUntilFinishedOrBlocked(observer, application, leadingPid.get(), following))
                        .as("the timeout is caused by the known leading transaction").isTrue();
                // Keep the leader locked until the contender has failed; releasing it after a sleep
                // would let a missing lock_timeout implementation appear to succeed.
                outcome = following.get(15, TimeUnit.SECONDS);
            } finally {
                release.countDown();
            }
            leading.get(15, TimeUnit.SECONDS);

            assertAll(
                    // JdbcTemplate can leave 55P03 uncategorized; the real handler owns SQLState mapping.
                    () -> assertThat(outcome.failure()).isInstanceOf(DataAccessException.class),
                    () -> assertThat(sqlState(outcome.failure())).isEqualTo("55P03"),
                    () -> assertThat(outcome.waited()).isGreaterThanOrEqualTo(Duration.ofMillis(4_500))
                            .isLessThan(Duration.ofSeconds(15)),
                    () -> assertThat(parentOf(first)).isEqualTo(second),
                    () -> assertThat(parentOf(second)).isNull(),
                    () -> assertThat(parentOf(third)).as("the failed edit leaves its graph unchanged").isNull(),
                    () -> assertThat(parentOf(fourth)).isNull());
            ResponseEntity<ApiResponse<Void>> response = conflictResponse((Exception) outcome.failure());
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().code()).isEqualTo("C013");
            assertThat(response.getBody().status()).isEqualTo(409);

            authenticate();
            try {
                service.updateAdministCode(third, move(third, fourth), fixture);
            } finally {
                SecurityContextHolder.clearContext();
            }
            assertThat(parentOf(third)).as("an explicit retry succeeds after the leader commits").isEqualTo(fourth);
            assertThat(parentOf(first)).isEqualTo(second);
        }
    }

    private RaceResult raceMoves(String leadingChild, String leadingParent,
            String followingChild, String followingParent, boolean rollbackLeader) throws Exception {
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var followingStarted = new CountDownLatch(1);
        var leadingPid = new AtomicInteger();
        String application = fixture + "-contender";

        // Three connections suffice: one observer and two independent, real service transactions.
        try (Connection observer = dataSource.getConnection(); var executor = Executors.newFixedThreadPool(2)) {
            var leading = executor.submit(() -> {
                authenticate();
                try {
                    transaction().executeWithoutResult(status -> {
                        assertReadCommitted();
                        leadingPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        service.updateAdministCode(leadingChild, move(leadingChild, leadingParent), fixture);
                        entityManager.flush();
                        applied.countDown();
                        awaitRelease(release);
                        if (rollbackLeader) status.setRollbackOnly();
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            Future<Throwable> following;
            boolean blocked;
            try {
                boolean ready = applied.await(10, TimeUnit.SECONDS);
                if (!ready && leading.isDone()) leading.get(1, TimeUnit.SECONDS);
                assertThat(ready).as("the leading service update is flushed but not committed").isTrue();

                following = executor.submit(() -> {
                    authenticate();
                    try {
                        return catchThrowable(() -> transaction().executeWithoutResult(status -> {
                            assertReadCommitted();
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            followingStarted.countDown();
                            service.updateAdministCode(followingChild, move(followingChild, followingParent), fixture);
                            entityManager.flush();
                        }));
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                boolean started = followingStarted.await(10, TimeUnit.SECONDS);
                if (!started && following.isDone()) {
                    throw new AssertionError("The following transaction failed before reaching the service", following.get());
                }
                assertThat(started).as("the following transaction has reached the service call").isTrue();
                blocked = waitUntilFinishedOrBlocked(observer, application, leadingPid.get(), following);
            } finally {
                // Never wait for both service calls behind a barrier: the corrected service serializes them.
                release.countDown();
            }
            leading.get(15, TimeUnit.SECONDS);
            return new RaceResult(following.get(15, TimeUnit.SECONDS), blocked);
        }
    }

    private boolean waitUntilFinishedOrBlocked(Connection observer, String application, int blockerPid,
            Future<?> following) throws Exception {
        try (var statement = observer.prepareStatement("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_stat_activity
                    WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'
                      AND ? = ANY(pg_blocking_pids(pid))
                )
                """)) {
            statement.setString(1, application);
            statement.setInt(2, blockerPid);
            statement.setQueryTimeout(1);
            // Observe and release before the service's five-second lock wait limit expires.
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
            do {
                // Before the fix the second transaction may finish without waiting. Preserve that
                // outcome so the test reports the actual accepted cycle, not a synchronization timeout.
                if (following.isDone()) return false;
                try (var rows = statement.executeQuery()) {
                    rows.next();
                    if (rows.getBoolean(1)) return true;
                }
                Thread.sleep(20); // Poll interval only; success requires an observed blocker or completion.
            } while (System.nanoTime() < deadline);
            assertThat(following.isDone()).as("the following transaction finishes or is blocked by the known leader").isTrue();
            return false;
        }
    }

    private TransactionTemplate transaction() {
        var transaction = new TransactionTemplate(transactionManager);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transaction.setTimeout(40);
        return transaction;
    }

    private void assertReadCommitted() {
        assertThat(jdbc.queryForObject("SELECT current_setting('transaction_isolation')", String.class))
                .isEqualTo("read committed");
    }

    private AdministCodeDto move(String code, String parent) {
        return AdministCodeDto.builder().admdstCd(code).admdstSeCd("1").admdstZoneNm(code)
                .upAdmdstCd(parent).useYn("Y").build();
    }

    private String parentOf(String code) {
        return jdbc.queryForObject("SELECT up_admdst_cd FROM tb_admdst_cd WHERE admdst_cd=?", String.class, code);
    }

    private void authenticate() {
        var principal = CustomUserDetails.builder().userId(fixture).esntlId(fixture).enabled(true)
                .permissions(List.of("ADMCODE_UPDATE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void awaitRelease(CountDownLatch release) {
        try {
            assertThat(release.await(25, TimeUnit.SECONDS)).as("the observer releases the leading transaction").isTrue();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    private static String sqlState(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql) return sql.getSQLState();
        }
        return null;
    }

    /** Dispatch through the real handler's exception resolution, rather than calling a chosen method. */
    @SuppressWarnings("unchecked")
    private static ResponseEntity<ApiResponse<Void>> conflictResponse(Exception failure) throws Exception {
        var handler = new ExceptionHandlerMethodResolver(GlobalExceptionHandler.class).resolveMethod(failure);
        assertThat(handler).isNotNull();
        handler.setAccessible(true);
        return (ResponseEntity<ApiResponse<Void>>) handler.invoke(new GlobalExceptionHandler(), failure);
    }

    private record RaceResult(Throwable failure, boolean blockedByLeader) {}
    private record TimedFailure(Throwable failure, Duration waited) {}
}
