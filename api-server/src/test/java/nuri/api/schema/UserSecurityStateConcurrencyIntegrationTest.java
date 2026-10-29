package nuri.api.schema;

import java.sql.Connection;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import javax.sql.DataSource;
import nuri.business.bootstrap.AdminPasswordProvisioner;
import nuri.business.domain.user.exception.UserErrorCode;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserDto;
import nuri.foundation.constants.Constants;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

/**
 * Actual PostgreSQL/real services: profile writes cannot restore old credentials or lock state.
 *
 * <p>The first service joins an outer transaction paused just before commit. The second transaction
 * either commits (the old unlocked path) or waits on the first user row (the corrected serialized
 * path). Observing either outcome before releasing the first transaction avoids a test-only deadlock
 * when the production fix moves the lock earlier. No repository write is mocked.
 */
@Tag("schema-validation")
@SpringBootTest(properties = {
        "nuri.security.login.max-failures=5",
        "spring.datasource.url=jdbc:tc:postgresql:17:///egov_user_security_state?currentSchema=public"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("프로필·보안 상태 교차 갱신 (PostgreSQL)")
class UserSecurityStateConcurrencyIntegrationTest {
    private static final int MAX_FAILURES = 5;
    private static final String ORIGINAL_PASSWORD = "Original-test-482!";
    private static final String REPLACEMENT_PASSWORD = "Replacement-test-593!";
    private static final String REJECTED_PASSWORD = "Rejected-test-604!";
    private static final String UPDATED_NAME = "Updated Profile";

    @Autowired private UserService users;
    @Autowired private AuthService authentication;
    @Autowired @Qualifier("passwordEncoder") private PasswordEncoder passwords;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private UserRepository userRepository;
    @Autowired private Environment environment;

    private String subject;
    private String operator;
    private String operatorGroup;
    private String department;

    @BeforeEach
    void seedOnlyOwnFixtures() {
        String prefix = "UC" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        subject = prefix + "U";
        operator = prefix + "A";
        operatorGroup = prefix + "G";
        department = prefix + "D";
        String hash = passwords.encode(ORIGINAL_PASSWORD);
        for (String id : List.of(subject, operator)) {
            jdbc.update("""
                    INSERT INTO tb_user_info
                        (esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,lck_cnt,
                         tmpr_pswd_yn,sbscrb_ymd,crt_dt,frst_rgtr_id)
                    VALUES (?,?,?,'Original Profile','P','N',0,'N',
                            to_char(CURRENT_DATE,'YYYYMMDD'),CURRENT_TIMESTAMP,'SYSTEM')
                    """, id, login(id), hash);
        }
        jdbc.update("""
                INSERT INTO tb_authrt_info
                    (authrt_cd,authrt_nm,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id)
                VALUES (?,'User race fixture',to_char(CURRENT_DATE,'YYYYMMDD'),
                        CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')
                """, operatorGroup);
        jdbc.update("""
                INSERT INTO tb_authrt_user_map
                    (scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id)
                VALUES (?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')
                """, operator, operatorGroup);
        for (String permission : List.of("USER_PASSWORD", "USER_STATUS", "USER_DEPT", "USER_DELETE")) {
            jdbc.update("""
                    INSERT INTO tb_authrt_grnt_map
                        (authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id)
                    VALUES (?,'OPERATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')
                    """, operatorGroup, permission);
        }
        jdbc.update("""
                INSERT INTO tb_ognz_info (ognz_id,ognz_nm,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id)
                VALUES (?,'User race department',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')
                """, department);
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        if (subject == null) return;
        jdbc.update("DELETE FROM tb_auth_rfsh_tk WHERE user_id IN (?,?)", subject, operator);
        AuditLedgerFixtures.delete(jdbc, "DELETE FROM tb_sys_adt_log WHERE frst_rgtr_id IN (?,?)",
                login(subject), login(operator));
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id IN (?,?)", subject, operator);
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=?", operatorGroup);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd=?", operatorGroup);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?,?)", subject, operator);
        jdbc.update("DELETE FROM tb_ognz_info WHERE ognz_id=?", department);
        jdbc.update("DELETE FROM tb_login_log WHERE user_id IN (?,?)", login(subject), login(operator));
    }

    @ParameterizedTest(name = "{0}, profile first={1}")
    @CsvSource({
            "OWN_PASSWORD,true", "OWN_PASSWORD,false",
            "ADMIN_RESET,true", "ADMIN_RESET,false",
            "LOGIN_LOCK,true", "LOGIN_LOCK,false"
    })
    void profileAndSecurityChangesBothSurviveEitherTransactionOrder(SecurityChange change,
            boolean profileFirst) throws Exception {
        if (change == SecurityChange.LOGIN_LOCK) {
            jdbc.update("UPDATE tb_user_info SET lck_cnt=? WHERE esntl_id=?", MAX_FAILURES - 1, subject);
        } else if (change == SecurityChange.ADMIN_RESET) {
            // Reset clears previous failures too; a concurrent profile write must not restore them.
            jdbc.update("UPDATE tb_user_info SET lck_cnt=2 WHERE esntl_id=?", subject);
        }
        Runnable profile = this::updateOwnProfile;
        Runnable security = () -> changeSecurity(change);
        runOverlapping(profileFirst ? profile : security, profileFirst ? security : profile);

        Map<String, Object> row = jdbc.queryForMap("""
                SELECT user_nm,pswd,chg_pswd_last_dt,tmpr_pswd_yn,lck_yn,lck_cnt,lck_last_pnttm
                FROM tb_user_info WHERE esntl_id=?
                """, subject);
        // Never include a password/hash in assertion messages or compare the whole row.
        assertThat(row.get("user_nm")).as("neither security writer may restore the old profile")
                .isEqualTo(UPDATED_NAME);
        if (change == SecurityChange.LOGIN_LOCK) {
            assertAll(
                    () -> assertThat(row.get("lck_yn")).as("profile save must not unlock the account").isEqualTo("Y"),
                    () -> assertThat(((Number) row.get("lck_cnt")).intValue()).isEqualTo(MAX_FAILURES),
                    () -> assertThat(row.get("lck_last_pnttm")).isNotNull(),
                    () -> assertThat(passwords.matches(ORIGINAL_PASSWORD, (String) row.get("pswd"))).isTrue());
        } else {
            assertAll(
                    () -> assertThat(passwords.matches(REPLACEMENT_PASSWORD, (String) row.get("pswd")))
                            .as("the replacement credential must remain effective").isTrue(),
                    () -> assertThat(passwords.matches(ORIGINAL_PASSWORD, (String) row.get("pswd")))
                            .as("profile save must not restore the old credential").isFalse(),
                    () -> assertThat(row.get("chg_pswd_last_dt"))
                            .as("credential revocation time must survive profile save").isNotNull(),
                    () -> assertThat(row.get("tmpr_pswd_yn"))
                            .isEqualTo(change == SecurityChange.ADMIN_RESET ? "Y" : "N"),
                    () -> assertThat(row.get("lck_yn")).isEqualTo("N"),
                    () -> assertThat(((Number) row.get("lck_cnt")).intValue()).isZero(),
                    () -> assertThat(row.get("lck_last_pnttm")).isNull());
        }
    }

    @ParameterizedTest(name = "password change before {0}")
    @EnumSource(AdministrativeChange.class)
    void administrativeWritesPreserveTheConcurrentPasswordChange(AdministrativeChange change) throws Exception {
        if (change == AdministrativeChange.UNLOCK) {
            // The unlock must dirty the entity, rather than accidentally testing a no-op.
            jdbc.update("UPDATE tb_user_info SET lck_cnt=2 WHERE esntl_id=?", subject);
        }
        // Password change flushes before its credential event, holding the user row lock here.
        // An old administrator implementation can read the previous snapshot then wait on UPDATE;
        // a corrected one waits while refreshing the row, and reads the committed replacement.
        runOverlapping(() -> changeSecurity(SecurityChange.OWN_PASSWORD),
                () -> changeAdministrativeState(change));

        Map<String, Object> row = jdbc.queryForMap("""
                SELECT user_nm,pswd,chg_pswd_last_dt,tmpr_pswd_yn,user_stts_cd,ognz_id,
                       lck_yn,lck_cnt,lck_last_pnttm
                FROM tb_user_info WHERE esntl_id=?
                """, subject);
        assertAll(
                () -> assertThat(passwords.matches(REPLACEMENT_PASSWORD, (String) row.get("pswd")))
                        .as("administrative writes must preserve the replacement credential").isTrue(),
                () -> assertThat(passwords.matches(ORIGINAL_PASSWORD, (String) row.get("pswd"))).isFalse(),
                () -> assertThat(row.get("chg_pswd_last_dt")).isNotNull(),
                () -> assertThat(row.get("tmpr_pswd_yn")).isEqualTo("N"),
                () -> assertThat(row.get("user_nm")).isEqualTo("Original Profile"),
                () -> assertThat(row.get("user_stts_cd"))
                        .isEqualTo(change == AdministrativeChange.STATUS ? "D" : "P"),
                () -> assertThat(row.get("ognz_id"))
                        .isEqualTo(change == AdministrativeChange.DEPARTMENT ? department : null),
                () -> assertThat(row.get("lck_yn")).isEqualTo("N"),
                () -> assertThat(((Number) row.get("lck_cnt")).intValue()).isZero(),
                () -> assertThat(row.get("lck_last_pnttm")).isNull());
    }

    @Test
    void concurrentOwnPasswordChangeMustRecheckTheCredentialAfterAdministratorReset() throws Exception {
        runOverlapping(() -> changeSecurity(SecurityChange.ADMIN_RESET), () -> {
            authenticate(subject, List.of());
            users.changePassword(login(subject), ORIGINAL_PASSWORD, REJECTED_PASSWORD);
        }, failure -> assertThat(failure)
                .as("a password valid before the administrator reset is invalid after the row lock wait")
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.INVALID_PASSWORD));

        Map<String, Object> row = jdbc.queryForMap("""
                SELECT user_nm,pswd,chg_pswd_last_dt,tmpr_pswd_yn,lck_yn,lck_cnt
                FROM tb_user_info WHERE esntl_id=?
                """, subject);
        assertAll(
                () -> assertThat(passwords.matches(REPLACEMENT_PASSWORD, (String) row.get("pswd")))
                        .as("the administrator replacement must remain effective").isTrue(),
                () -> assertThat(passwords.matches(REJECTED_PASSWORD, (String) row.get("pswd"))).isFalse(),
                () -> assertThat(passwords.matches(ORIGINAL_PASSWORD, (String) row.get("pswd"))).isFalse(),
                () -> assertThat(row.get("tmpr_pswd_yn")).isEqualTo("Y"),
                () -> assertThat(row.get("chg_pswd_last_dt")).isNotNull(),
                () -> assertThat(row.get("user_nm")).isEqualTo("Original Profile"),
                () -> assertThat(row.get("lck_yn")).isEqualTo("N"),
                () -> assertThat(((Number) row.get("lck_cnt")).intValue()).isZero());
    }

    @Test
    void concurrentOwnPasswordChangeMustPreserveAdministratorDeactivation() throws Exception {
        runOverlapping(() -> changeAdministrativeState(AdministrativeChange.STATUS),
                () -> changeSecurity(SecurityChange.OWN_PASSWORD));

        Map<String, Object> row = jdbc.queryForMap("""
                SELECT user_nm,pswd,user_stts_cd,chg_pswd_last_dt,tmpr_pswd_yn
                FROM tb_user_info WHERE esntl_id=?
                """, subject);
        assertAll(
                () -> assertThat(row.get("user_stts_cd"))
                        .as("password change must not restore an administrator-deactivated account").isEqualTo("D"),
                () -> assertThat(passwords.matches(REPLACEMENT_PASSWORD, (String) row.get("pswd"))).isTrue(),
                () -> assertThat(passwords.matches(ORIGINAL_PASSWORD, (String) row.get("pswd"))).isFalse(),
                () -> assertThat(row.get("chg_pswd_last_dt")).isNotNull(),
                () -> assertThat(row.get("tmpr_pswd_yn")).isEqualTo("N"),
                () -> assertThat(row.get("user_nm")).isEqualTo("Original Profile"));
    }

    @Test
    void administratorResetMustClearTheLoginLockCommittedWhileItWaited() throws Exception {
        jdbc.update("UPDATE tb_user_info SET lck_cnt=? WHERE esntl_id=?", MAX_FAILURES - 1, subject);
        runOverlapping(() -> changeSecurity(SecurityChange.LOGIN_LOCK),
                () -> changeSecurity(SecurityChange.ADMIN_RESET));

        Map<String, Object> row = jdbc.queryForMap("""
                SELECT pswd,tmpr_pswd_yn,lck_yn,lck_cnt,lck_last_pnttm
                FROM tb_user_info WHERE esntl_id=?
                """, subject);
        assertAll(
                () -> assertThat(passwords.matches(REPLACEMENT_PASSWORD, (String) row.get("pswd"))).isTrue(),
                () -> assertThat(passwords.matches(ORIGINAL_PASSWORD, (String) row.get("pswd"))).isFalse(),
                () -> assertThat(row.get("tmpr_pswd_yn")).isEqualTo("Y"),
                () -> assertThat(row.get("lck_yn"))
                        .as("reset must clear a newly committed lock even if its first snapshot was unlocked")
                        .isEqualTo("N"),
                () -> assertThat(((Number) row.get("lck_cnt")).intValue()).isZero(),
                () -> assertThat(row.get("lck_last_pnttm")).isNull());
    }

    @Test
    void refreshReportsAUserDeletedAfterTheInitialRead() {
        // Pin the real repository exception translated by Spring; the service maps this to 404.
        assertThatThrownBy(() -> transaction().executeWithoutResult(status -> {
            var loaded = userRepository.findById(subject).orElseThrow();
            var deletion = transaction();
            deletion.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            deletion.executeWithoutResult(ignored -> {
                authenticate(operator, List.of("USER_DELETE"));
                users.deleteUser(login(subject));
            });
            userRepository.refreshForUpdate(loaded);
        })).isInstanceOf(org.springframework.orm.ObjectRetrievalFailureException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id=?", Integer.class, subject))
                .isZero();
    }

    @Test
    void delayedBootstrapCannotReplaceACommittedAdministratorReset() throws Exception {
        assertThat(environment.getProperty("spring.datasource.url"))
                .as("bootstrap race requires this class's private disposable PostgreSQL database")
                .isEqualTo("jdbc:tc:postgresql:17:///egov_user_security_state?currentSchema=public");

        String adminId = Constants.User.SYSTEM_ADMIN_ESNTL_ID;
        String initialPassword = "Provisioner-initial-test-704!";
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM tb_auth_rfsh_tk WHERE user_id=?", Integer.class, adminId)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM tb_auth_otp_cert WHERE user_insd_idntfr=?", Integer.class, adminId)).isZero();
        // A protected seed account requires these current database grants, beyond principal claims.
        for (String permission : List.of("AUTHRT_GRANT", "AUTHRT_ASSIGN")) {
            jdbc.update("""
                    INSERT INTO tb_authrt_grnt_map
                        (authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id)
                    VALUES (?,'OPERATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')
                    """, operatorGroup, permission);
        }

        // Keep the seed snapshot in memory only; never print its credential in an assertion/log.
        Map<String, Object> original = jdbc.queryForMap("""
                SELECT pswd,chg_pswd_last_dt,tmpr_pswd_yn,lck_yn,lck_cnt,lck_last_pnttm,
                       mdfcn_dt,last_mdfr_id
                FROM tb_user_info WHERE esntl_id=?
                """, adminId);
        CountDownLatch sentinelRead = new CountDownLatch(1);
        CountDownLatch resumeBootstrap = new CountDownLatch(1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            assertThat(jdbc.update("""
                    UPDATE tb_user_info SET pswd='{disabled}provisioner-race',tmpr_pswd_yn='N'
                    WHERE esntl_id=?
                    """, adminId)).isEqualTo(1);

            // Observation only: every SELECT/refresh/save/flush still uses the real repository.
            var observedUsers = mock(UserRepository.class, delegatesTo(userRepository));
            doAnswer(call -> {
                var found = userRepository.findById(call.getArgument(0, String.class));
                assertThat(found.isPresent()).as("the actual seed administrator was loaded").isTrue();
                assertThat(found.orElseThrow().getPswd().startsWith("{disabled}"))
                        .as("bootstrap really loaded the sentinel before the concurrent reset").isTrue();
                sentinelRead.countDown();
                awaitRelease(resumeBootstrap);
                return found;
            }).when(observedUsers).findById(adminId);

            var provisioner = new AdminPasswordProvisioner(observedUsers, passwords);
            ReflectionTestUtils.setField(provisioner, "initialPassword", initialPassword);
            Future<Throwable> bootstrap = executor.submit(() -> {
                SecurityContextHolder.clearContext();
                try {
                    // Manual construction needs an explicit real transaction around read and flush.
                    return catchThrowable(() -> transaction().executeWithoutResult(status -> {
                        setBoundedLockTimeout();
                        provisioner.provision();
                    }));
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });

            boolean ready = sentinelRead.await(15, TimeUnit.SECONDS);
            if (!ready && bootstrap.isDone()) {
                assertThat(bootstrap.get(1, TimeUnit.SECONDS)).as("bootstrap reaches its actual SELECT").isNull();
            }
            assertThat(ready).as("bootstrap read completed before the real administrator reset").isTrue();

            authenticate(operator, List.of("USER_PASSWORD", "AUTHRT_GRANT", "AUTHRT_ASSIGN"));
            transaction().executeWithoutResult(status -> {
                setBoundedLockTimeout();
                users.updatePasswordByAdmin(adminId, REPLACEMENT_PASSWORD);
            });
            Map<String, Object> committed = jdbc.queryForMap("""
                    SELECT pswd,chg_pswd_last_dt,tmpr_pswd_yn FROM tb_user_info WHERE esntl_id=?
                    """, adminId);
            assertThat(passwords.matches(REPLACEMENT_PASSWORD, (String) committed.get("pswd")))
                    .as("the concurrent administrator reset committed").isTrue();
            assertThat(committed.get("tmpr_pswd_yn")).isEqualTo("Y");

            resumeBootstrap.countDown();
            assertThat(bootstrap.get(25, TimeUnit.SECONDS)).as("bootstrap transaction").isNull();
            Map<String, Object> after = jdbc.queryForMap("""
                    SELECT pswd,chg_pswd_last_dt,tmpr_pswd_yn FROM tb_user_info WHERE esntl_id=?
                    """, adminId);
            assertAll(
                    () -> assertThat(passwords.matches(REPLACEMENT_PASSWORD, (String) after.get("pswd")))
                            .as("bootstrap must preserve the committed administrator credential").isTrue(),
                    () -> assertThat(passwords.matches(initialPassword, (String) after.get("pswd")))
                            .as("a leftover startup value cannot restore the initial credential").isFalse(),
                    () -> assertThat(after.get("tmpr_pswd_yn")).isEqualTo("Y"),
                    () -> assertThat(after.get("chg_pswd_last_dt"))
                            .isEqualTo(committed.get("chg_pswd_last_dt")));
        } finally {
            resumeBootstrap.countDown();
            executor.shutdownNow();
            boolean stopped = executor.awaitTermination(35, TimeUnit.SECONDS);
            SecurityContextHolder.clearContext();
            // Never restore over a live worker; even a failed cleanup stays in the private database.
            if (stopped) {
                jdbc.update("""
                        UPDATE tb_user_info SET pswd=?,chg_pswd_last_dt=?,tmpr_pswd_yn=?,
                               lck_yn=?,lck_cnt=?,lck_last_pnttm=?,mdfcn_dt=?,last_mdfr_id=?
                        WHERE esntl_id=?
                        """, original.get("pswd"), original.get("chg_pswd_last_dt"),
                        original.get("tmpr_pswd_yn"), original.get("lck_yn"), original.get("lck_cnt"),
                        original.get("lck_last_pnttm"), original.get("mdfcn_dt"),
                        original.get("last_mdfr_id"), adminId);
            }
            assertThat(stopped).as("bootstrap fixture worker cleanup").isTrue();
        }
    }

    private void changeAdministrativeState(AdministrativeChange change) {
        authenticate(operator, List.of("USER_STATUS", "USER_DEPT"));
        switch (change) {
            case STATUS -> users.updateUsersStatus(List.of(login(subject)), "D");
            case DEPARTMENT -> users.moveUsersToDept(List.of(login(subject)), department);
            case UNLOCK -> users.unlockUser(login(subject));
        }
    }

    private void runOverlapping(Runnable firstOperation, Runnable secondOperation) throws Exception {
        runOverlapping(firstOperation, secondOperation,
                failure -> assertThat(failure).as("second transaction").isNull());
    }

    private void runOverlapping(Runnable firstOperation, Runnable secondOperation,
            Consumer<Throwable> assertSecondOutcome) throws Exception {
        CountDownLatch firstReady = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        AtomicInteger firstPid = new AtomicInteger();
        String application = "user-state-race-" + subject;
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try (Connection observer = dataSource.getConnection()) {
            Future<Throwable> first = executor.submit(() -> {
                try {
                    return catchThrowable(() -> transaction().executeWithoutResult(status -> {
                        firstPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        setBoundedLockTimeout();
                        firstOperation.run();
                        firstReady.countDown();
                        awaitRelease(releaseFirst);
                    }));
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            Future<Throwable> second;
            try {
                boolean ready = firstReady.await(15, TimeUnit.SECONDS);
                if (!ready && first.isDone()) {
                    assertThat(first.get(1, TimeUnit.SECONDS)).as("first service reaches the commit boundary").isNull();
                }
                assertThat(ready).as("first service completed inside its uncommitted transaction").isTrue();
                second = executor.submit(() -> {
                    try {
                        return catchThrowable(() -> transaction().executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class,
                                    application);
                            setBoundedLockTimeout();
                            secondOperation.run();
                        }));
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                awaitCommittedOrWaiting(observer, application, firstPid.get(), second);
            } finally {
                releaseFirst.countDown();
            }
            assertAll(
                    () -> assertThat(first.get(25, TimeUnit.SECONDS)).as("first transaction").isNull(),
                    () -> assertSecondOutcome.accept(second.get(25, TimeUnit.SECONDS)));
        } finally {
            releaseFirst.countDown();
            executor.shutdownNow();
            assertThat(executor.awaitTermination(35, TimeUnit.SECONDS)).as("fixture worker cleanup").isTrue();
        }
    }

    private void awaitCommittedOrWaiting(Connection observer, String application, int blockerPid,
            Future<Throwable> second) throws Exception {
        try (var statement = observer.prepareStatement("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_stat_activity
                    WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'
                      AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE '%tb_user_info%'
                )
                """)) {
            statement.setString(1, application);
            statement.setInt(2, blockerPid);
            statement.setQueryTimeout(3);
            await().pollDelay(Duration.ZERO).pollInterval(Duration.ofMillis(20)).atMost(Duration.ofSeconds(15))
                    .until(() -> {
                        if (second.isDone()) {
                            // The caller verifies success or its expected exception after both workers finish.
                            return true;
                        }
                        try (var rows = statement.executeQuery()) {
                            rows.next();
                            return rows.getBoolean(1);
                        }
                    });
        }
    }

    private void updateOwnProfile() {
        authenticate(subject, List.of());
        users.updateUser(login(subject), UserDto.builder().userId(login(subject)).userNm(UPDATED_NAME).build());
    }

    private void changeSecurity(SecurityChange change) {
        switch (change) {
            case OWN_PASSWORD -> {
                authenticate(subject, List.of());
                users.changePassword(login(subject), ORIGINAL_PASSWORD, REPLACEMENT_PASSWORD);
            }
            case ADMIN_RESET -> {
                authenticate(operator, List.of("USER_PASSWORD"));
                users.updatePasswordByAdmin(login(subject), REPLACEMENT_PASSWORD);
            }
            case LOGIN_LOCK -> {
                SecurityContextHolder.clearContext();
                assertThatThrownBy(() -> authentication.login(LoginRequest.builder()
                        .userId(login(subject)).password("Wrong-test-793!").build(), "127.0.0.1"))
                        .isInstanceOf(BadCredentialsException.class);
            }
        }
    }

    private void setBoundedLockTimeout() {
        jdbc.queryForObject("SELECT set_config('lock_timeout', '20s', true)", String.class);
    }

    private TransactionTemplate transaction() {
        var transaction = new TransactionTemplate(transactionManager);
        transaction.setTimeout(30);
        return transaction;
    }

    private static void authenticate(String id, List<String> permissions) {
        var principal = CustomUserDetails.builder().esntlId(id).userId(login(id)).enabled(true)
                .lockAt("N").permissions(permissions).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static String login(String id) {
        return id + "L";
    }

    private static void awaitRelease(CountDownLatch release) {
        try {
            assertThat(release.await(25, TimeUnit.SECONDS)).as("release follows observed commit or row lock wait")
                    .isTrue();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError(interrupted);
        }
    }

    enum SecurityChange {
        OWN_PASSWORD, ADMIN_RESET, LOGIN_LOCK
    }

    enum AdministrativeChange {
        STATUS, DEPARTMENT, UNLOCK
    }
}
