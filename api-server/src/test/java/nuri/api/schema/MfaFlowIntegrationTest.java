package nuri.api.schema;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CompletableFuture;
import javax.sql.DataSource;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.business.service.auth.mfa.MfaRejectedException;
import nuri.business.service.auth.mfa.MfaResults;
import nuri.business.service.auth.mfa.MfaService;
import nuri.business.service.user.UserService;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.mfa.MfaOpaqueTokens;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Actual Flyway/PostgreSQL transactions: restricted proofs never become a session before MFA completes. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@AutoConfigureMockMvc
class MfaFlowIntegrationTest {
    private static final String PASSWORD = "Mfa-fixture-only-482!";
    private static final String IP = "127.0.0.1";
    private static final String TEST_KEY = isolatedKey();

    @DynamicPropertySource
    static void isolatedMfaConfiguration(DynamicPropertyRegistry registry) {
        registry.add("nuri.security.mfa.active-key-id", () -> "isolated");
        registry.add("nuri.security.mfa.keys-json", () -> "{\"isolated\":\"" + TEST_KEY + "\"}");
        registry.add("nuri.security.mfa.require-protected", () -> "true");
    }

    @Autowired private AuthService auth;
    @Autowired private MfaService mfa;
    @Autowired private UserService users;
    @MockitoSpyBean private JwtTokenProvider jwt;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactions;
    @Autowired private MockMvc mvc;
    @Autowired @Qualifier("passwordEncoder") private PasswordEncoder passwords;
    @MockitoSpyBean private SensitiveAuditPort audit;
    private String subject;
    private String operator;
    private String group;
    private String operatorGroup;
    private Instant now;

    @BeforeEach
    void seedIsolatedIdentities() {
        String prefix = "D11" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        subject = prefix + "U";
        operator = prefix + "O";
        group = prefix + "G";
        operatorGroup = prefix + "A";
        now = Instant.ofEpochSecond((Instant.now().getEpochSecond() / 30 - 120) * 30);
        updateClock();
        String hash = passwords.encode(PASSWORD);
        for (String id : List.of(subject, operator)) {
            jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd) "
                    + "VALUES(?,?,?,'MFA fixture','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))", id, loginId(id), hash);
        }
        for (String id : List.of(group, operatorGroup)) {
            jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                    + "VALUES(?,'MFA fixture',to_char(CURRENT_DATE,'YYYYMMDD'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", id);
        }
        membership(subject, group);
        membership(operator, operatorGroup);
    }

    @AfterEach
    void cleanOwnFixtures() {
        SecurityContextHolder.clearContext();
        ReflectionTestUtils.invokeMethod(mfa, "useClock", Clock.systemUTC());
        if (subject == null) return;
        jdbc.update("DELETE FROM tb_auth_rfsh_tk WHERE user_id IN (?,?)", subject, operator);
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id IN (?,?)", subject, operator);
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd IN (?,?)", group, operatorGroup);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd IN (?,?)", group, operatorGroup);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?,?)", subject, operator);
    }

    @Test
    void enrollmentRequiresProofAndInvalidatesPasswordOnlyAccessAndRefresh() throws Exception {
        TokenResponse passwordOnly = login(subject);
        authenticate(passwordOnly);
        MfaResults.Enrollment enrollment = mfa.startEnrollment(PASSWORD);
        assertThatThrownBy(() -> jwt.getAuthentication(passwordOnly.getAccessToken())).isInstanceOf(CredentialsExpiredException.class);
        assertThatThrownBy(() -> auth.reissue(passwordOnly.getRefreshToken(), IP)).isInstanceOf(CredentialsExpiredException.class);
        SecurityContextHolder.clearContext();

        mvc.perform(post("/api/v1/auth/mfa/enrollment/confirm").contentType("application/json")
                        .content("{\"challengeToken\":\"" + enrollment.challengeToken() + "\",\"code\":\"12345\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/auth/mfa/enrollment/confirm").contentType("application/json")
                        .content("{\"challengeToken\":\"" + enrollment.challengeToken() + "\",\"code\":\"" + code(enrollment.secret()) + "\"}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.data.authenticationStage").value("AUTHENTICATED"))
                .andExpect(jsonPath("$.data.recoveryCodes.length()").value(10))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist());
        assertThat(state()).isEqualTo("ACTIVE");
        assertThat(jdbc.queryForObject("SELECT otp_secret_encpt_cn FROM tb_auth_otp_cert WHERE user_insd_idntfr=?", String.class, subject))
                .startsWith("mfa1.").doesNotContain(enrollment.secret());
        assertThatThrownBy(() -> auth.confirmMfaEnrollment(enrollment.challengeToken(), code(enrollment.secret()), IP))
                .isInstanceOf(MfaRejectedException.class);
    }

    @Test
    void passwordLoginCannotIssueTokensAndRefreshPreservesCompletedMfaEvidence() {
        Enrolled enrolled = enroll(subject);
        TokenResponse challenge = login(subject);
        assertRestricted(challenge, "MFA_REQUIRED");
        assertThatThrownBy(() -> auth.verifyMfaLogin(challenge.getMfaChallenge(), code(enrolled.secret()), null, IP))
                .isInstanceOf(MfaRejectedException.class);
        advance(30);
        TokenResponse complete = auth.verifyMfaLogin(challenge.getMfaChallenge(), code(enrolled.secret()), null, IP);
        var evidence = jwt.getMfaEvidence(complete.getAccessToken());
        assertThat(evidence.verifiedAt()).isEqualTo(now);
        TokenResponse refreshed = auth.reissue(complete.getRefreshToken(), IP);
        assertThat(jwt.getMfaEvidence(refreshed.getAccessToken())).isEqualTo(evidence);
        assertThat(jwt.getAuthentication(refreshed.getAccessToken()).isAuthenticated()).isTrue();
    }

    @Test
    void purposeExpiryAndGlobalFailureBudgetCannotBeResetByANewPasswordLogin() {
        Enrolled enrolled = enroll(subject);
        String challenge = login(subject).getMfaChallenge();
        assertThatThrownBy(() -> mfa.prepareEnrollment(challenge, IP)).isInstanceOf(MfaRejectedException.class);
        advance(300);
        assertThatThrownBy(() -> auth.verifyMfaLogin(challenge, code(enrolled.secret()), null, IP)).isInstanceOf(MfaRejectedException.class);
        String current = login(subject).getMfaChallenge();
        String incorrectCode = wrongCode(enrolled.secret());
        for (int attempt = 0; attempt < 5; attempt++) {
            // Valid HTTP input shape, but no matching OTP in the accepted drift window.
            assertThatThrownBy(() -> auth.verifyMfaLogin(current, incorrectCode, null, IP)).isInstanceOf(MfaRejectedException.class);
        }
        assertThat(jdbc.queryForObject("SELECT fail_nmtm FROM tb_auth_otp_cert WHERE user_insd_idntfr=?", Integer.class, subject)).isEqualTo(5);
        assertThatThrownBy(() -> login(subject)).isInstanceOf(MfaRejectedException.class);
        advance(900);
        assertRestricted(login(subject), "MFA_REQUIRED");
    }

    @Test
    void recoveryCodeForcesReenrollmentAcrossNewLoginsAndInvalidatesOldSessionsAndCodes() {
        Enrolled enrolled = enroll(subject);
        String challenge = login(subject).getMfaChallenge();
        TokenResponse recovery = auth.verifyMfaLogin(challenge, null, enrolled.session().getRecoveryCodes().getFirst(), IP);
        assertRestricted(recovery, "ENROLLMENT_REQUIRED");
        assertThat(state()).isEqualTo("RECOVER");
        assertThatThrownBy(() -> jwt.getAuthentication(enrolled.session().getAccessToken())).isInstanceOf(CredentialsExpiredException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_auth_rfsh_tk WHERE user_id=?", Integer.class, subject)).isZero();
        TokenResponse restarted = login(subject);
        assertRestricted(restarted, "ENROLLMENT_REQUIRED");
        assertThatThrownBy(() -> mfa.prepareEnrollment(recovery.getMfaChallenge(), IP)).isInstanceOf(MfaRejectedException.class);
        var setup = mfa.prepareEnrollment(restarted.getMfaChallenge(), IP);
        assertThat(setup.secret()).isNotEqualTo(enrolled.secret());
        var completed = auth.confirmMfaEnrollment(setup.challengeToken(), code(setup.secret()), IP);
        assertThat(completed.getRecoveryCodes()).hasSize(10).doesNotContainAnyElementsOf(enrolled.session().getRecoveryCodes());
        String newChallenge = login(subject).getMfaChallenge();
        assertThatThrownBy(() -> auth.verifyMfaLogin(newChallenge, null, enrolled.session().getRecoveryCodes().getFirst(), IP))
                .isInstanceOf(MfaRejectedException.class);
    }

    @Test
    void sameOtpStepOnDifferentConcurrentChallengesHasExactlyOneWinner() throws Exception {
        Enrolled enrolled = enroll(subject);
        String first = login(subject).getMfaChallenge();
        String second = login(subject).getMfaChallenge();
        advance(30);
        String otp = code(enrolled.secret());
        try (var pool = Executors.newFixedThreadPool(2); var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var statement = blocker.prepareStatement("SELECT esntl_id FROM tb_user_info WHERE esntl_id=? FOR UPDATE")) {
                statement.setString(1, subject);
                statement.executeQuery().close();
            }
            long blockerPid;
            try (var statement = blocker.createStatement(); var rows = statement.executeQuery("SELECT pg_backend_pid()")) {
                rows.next(); blockerPid = rows.getLong(1);
            }
            var one = pool.submit(() -> verifyOutcome(first, otp));
            var two = pool.submit(() -> verifyOutcome(second, otp));
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                int waiting = 0;
                while (waiting < 2 && System.nanoTime() < deadline) {
                    waiting = jdbc.queryForObject("WITH RECURSIVE waiters(pid) AS ("
                            + "SELECT pid FROM pg_stat_activity WHERE ?=ANY(pg_blocking_pids(pid)) UNION "
                            + "SELECT a.pid FROM pg_stat_activity a JOIN waiters w ON w.pid=ANY(pg_blocking_pids(a.pid))) "
                            + "SELECT count(*) FROM waiters", Integer.class, blockerPid);
                    if (waiting < 2) java.util.concurrent.locks.LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
                }
                assertThat(waiting).as("both transactions must actually contend on the user's row").isEqualTo(2);
            } finally { blocker.commit(); }
            assertThat(List.of(one.get(15, TimeUnit.SECONDS), two.get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("authenticated", "rejected");
        }
    }

    @Test
    void concurrentUserDeletionWaitsBeforeRefreshCleanupAndMfaCompletionDoesNotDeadlock() throws Exception {
        TokenResponse passwordOnly = login(subject);
        authenticate(passwordOnly);
        MfaResults.Enrollment enrollment = mfa.startEnrollment(PASSWORD);
        SecurityContextHolder.clearContext();
        grants(operatorGroup, "USER_DELETE");
        TokenResponse operatorSession = login(operator);
        // A real refresh row is essential: the former deletion order held it before waiting for the user.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_auth_rfsh_tk WHERE user_id=?", Integer.class, subject)).isEqualTo(1);
        var userLocked = new CompletableFuture<Long>();
        var allowCompletion = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var completion = pool.submit(() -> {
                try {
                    return new TransactionTemplate(transactions).execute(status -> {
                        jdbc.queryForObject("SELECT esntl_id FROM tb_user_info WHERE esntl_id=? FOR UPDATE", String.class, subject);
                        userLocked.complete(jdbc.queryForObject("SELECT pg_backend_pid()", Long.class));
                        try {
                            if (!allowCompletion.await(15, TimeUnit.SECONDS)) throw new IllegalStateException("completion coordination timeout");
                        } catch (InterruptedException interrupted) {
                            Thread.currentThread().interrupt();
                            throw new IllegalStateException("completion interrupted", interrupted);
                        }
                        return auth.confirmMfaEnrollment(enrollment.challengeToken(), code(enrollment.secret()), IP);
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            long holder = userLocked.get(15, TimeUnit.SECONDS);
            var deletion = pool.submit(() -> {
                try {
                    authenticate(operatorSession);
                    users.deleteUser(loginId(subject));
                    return true;
                } finally { SecurityContextHolder.clearContext(); }
            });
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
                boolean waiting = false;
                while (!waiting && System.nanoTime() < deadline) {
                    waiting = Boolean.TRUE.equals(jdbc.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ?=ANY(pg_blocking_pids(pid)))", Boolean.class, holder));
                    if (!waiting) java.util.concurrent.locks.LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
                }
                assertThat(waiting).as("actual user deletion must wait on the MFA transaction's user lock").isTrue();
            } finally { allowCompletion.countDown(); }
            assertThat(completion.get(15, TimeUnit.SECONDS).getAuthenticationStage()).isEqualTo("AUTHENTICATED");
            assertThat(deletion.get(15, TimeUnit.SECONDS)).isTrue();
        } finally { allowCompletion.countDown(); }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id=?", Integer.class, subject)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_auth_rfsh_tk WHERE user_id=?", Integer.class, subject)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_auth_otp_cert WHERE user_insd_idntfr=?", Integer.class, subject)).isZero();
    }

    @Test
    void acquiringProtectedPermissionRejectsAnExistingPasswordOnlySessionUntilEnrollment() throws Exception {
        TokenResponse before = login(subject);
        grants(group, "USER_PASSWORD");
        assertThatThrownBy(() -> jwt.getAuthentication(before.getAccessToken())).isInstanceOf(CredentialsExpiredException.class);
        assertThatThrownBy(() -> auth.reissue(before.getRefreshToken(), IP)).isInstanceOf(CredentialsExpiredException.class);
        mvc.perform(get("/api/v1/auth/mfa/status").header("Authorization", "Bearer " + before.getAccessToken()))
                .andExpect(status().isUnauthorized());
        TokenResponse challenge = login(subject);
        assertRestricted(challenge, "ENROLLMENT_REQUIRED");
        var setup = mfa.prepareEnrollment(challenge.getMfaChallenge(), IP);
        TokenResponse complete = auth.confirmMfaEnrollment(setup.challengeToken(), code(setup.secret()), IP);
        assertThat(jwt.getAuthentication(complete.getAccessToken()).isAuthenticated()).isTrue();
        authenticate(complete);
        advance(30);
        String proof = mfa.reauthenticate(PASSWORD, code(setup.secret())).reauthToken();
        assertThatThrownBy(() -> mfa.disable(proof, IP)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(state()).isEqualTo("ACTIVE");
    }

    @Test
    void aLoginIdCollisionCannotSubstituteAnotherIdentityForTheSignedSubject() {
        TokenResponse session = login(subject);
        grants(operatorGroup, "USER_READ");
        jdbc.update("UPDATE tb_user_info SET user_id=? WHERE esntl_id=?", subject, operator);
        assertThat(jwt.getAuthentication(session.getAccessToken()).getName()).isEqualTo(subject);
    }

    @Test
    void regeneratingCodesAndOptionalDisableRequireFreshOneUseReauthentication() {
        Enrolled enrolled = enroll(subject);
        authenticate(enrolled.session());
        advance(30);
        String proof = mfa.reauthenticate(PASSWORD, code(enrolled.secret())).reauthToken();
        TokenResponse replaced = auth.regenerateMfaRecoveryCodes(proof, IP);
        assertThat(replaced.getRecoveryCodes()).hasSize(10).doesNotContainAnyElementsOf(enrolled.session().getRecoveryCodes());
        assertThatThrownBy(() -> jwt.getAuthentication(enrolled.session().getAccessToken())).isInstanceOf(CredentialsExpiredException.class);
        assertThatThrownBy(() -> auth.regenerateMfaRecoveryCodes(proof, IP)).isInstanceOf(MfaRejectedException.class);
        authenticate(replaced);
        advance(30);
        String disableProof = mfa.reauthenticate(PASSWORD, code(enrolled.secret())).reauthToken();
        mfa.disable(disableProof, IP);
        assertThat(state()).isEqualTo("NONE");
        assertThatThrownBy(() -> jwt.getAuthentication(replaced.getAccessToken())).isInstanceOf(CredentialsExpiredException.class);
        assertThat(login(subject).getAuthenticationStage()).isEqualTo("AUTHENTICATED");
    }

    @Test
    void recoveryAdministrationNeedsDedicatedPermissionBothProtectedPermissionsAndFreshProof() {
        Enrolled target = enroll(subject);
        Enrolled admin = enroll(operator);
        grants(group, "USER_PASSWORD");
        authenticate(admin.session());
        advance(30);
        String proof = mfa.reauthenticate(PASSWORD, code(admin.secret())).reauthToken();
        grants(operatorGroup, "USER_PASSWORD", "AUTHRT_GRANT", "AUTHRT_ASSIGN");
        authenticate(admin.session());
        denied(() -> mfa.recoverAccount(proof, subject, "APPROVAL-42", IP));
        grants(operatorGroup, "MFA_RECOVER");
        authenticate(admin.session());
        denied(() -> mfa.recoverAccount(proof, subject, "APPROVAL-42", IP));
        grants(operatorGroup, "MFA_RECOVER", "AUTHRT_GRANT", "AUTHRT_ASSIGN");
        authenticate(admin.session());
        assertThatThrownBy(() -> mfa.recoverAccount(proof, operator, "APPROVAL-42", IP)).isInstanceOf(BusinessException.class);
        mfa.recoverAccount(proof, subject, "APPROVAL-42", IP);
        assertThat(state()).isEqualTo("RECOVER");
        assertThat(jdbc.queryForObject("SELECT adt_cn FROM tb_sys_adt_log WHERE job_nm='MFA_RECOVERY_APPROVAL' "
                        + "AND prcs_stts_nm='COMMITTED' AND frst_rgtr_id=?", String.class, loginId(operator)))
                .contains("APPROVAL-42", subject).doesNotContain(proof, PASSWORD, target.secret(), admin.secret());
        assertThatThrownBy(() -> jwt.getAuthentication(target.session().getAccessToken())).isInstanceOf(CredentialsExpiredException.class);
        assertThatThrownBy(() -> mfa.recoverAccount(proof, subject, "APPROVAL-42", IP)).isInstanceOf(MfaRejectedException.class);
        assertRestricted(login(subject), "ENROLLMENT_REQUIRED");
    }

    @Test
    void passwordResetDeletesRestrictedChallengesWithoutDisablingMfa() {
        Enrolled target = enroll(subject);
        String challenge = login(subject).getMfaChallenge();
        Enrolled admin = enroll(operator);
        grants(operatorGroup, "USER_PASSWORD");
        authenticate(admin.session());
        users.updatePasswordByAdmin(loginId(subject), "Replacement-test-482!");
        assertThat(state()).isEqualTo("ACTIVE");
        assertThatThrownBy(() -> auth.verifyMfaLogin(challenge, code(target.secret()), null, IP)).isInstanceOf(MfaRejectedException.class);
        TokenResponse after = auth.login(LoginRequest.builder().userId(loginId(subject)).password("Replacement-test-482!").build(), IP);
        assertRestricted(after, "MFA_REQUIRED");
    }

    @Test
    void durableAuditFailureRollsBackEnrollmentCounterRecoveryCodesAndSession() {
        TokenResponse before = login(subject);
        authenticate(before);
        var setup = mfa.startEnrollment(PASSWORD);
        SecurityContextHolder.clearContext();
        doThrow(new IllegalStateException("isolated audit failure"))
                .when((SensitiveAuditPort) org.springframework.test.util.AopTestUtils.getUltimateTargetObject(audit))
                .recordMutation("MFA_ENROLL", subject);
        assertThatThrownBy(() -> auth.confirmMfaEnrollment(setup.challengeToken(), code(setup.secret()), IP))
                .isInstanceOf(IllegalStateException.class).hasMessage("isolated audit failure");
        assertThat(state()).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT otp_last_scs_sn FROM tb_auth_otp_cert WHERE user_insd_idntfr=?", Long.class, subject)).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_auth_rstr_cd r JOIN tb_auth_otp_cert c USING(otp_cert_sn) WHERE c.user_insd_idntfr=?", Integer.class, subject)).isZero();
        assertThat(jdbc.queryForObject("SELECT rfsh_tkn FROM tb_auth_rfsh_tk WHERE user_id=?", String.class, subject))
                .isEqualTo(nuri.business.domain.auth.RefreshTokenDigest.of(before.getRefreshToken()));
        assertThat(jdbc.queryForObject("SELECT use_dt FROM tb_auth_cert_dmnd WHERE hash_vl=?", java.sql.Timestamp.class,
                MfaOpaqueTokens.challengeDigest(setup.challengeToken()))).isNull();
    }

    @Test
    void tokenIssuanceFailureRollsBackMfaCompletionAndItsAlreadyFlushedSuccessAudit() {
        TokenResponse before = login(subject);
        authenticate(before);
        var setup = mfa.startEnrollment(PASSWORD);
        SecurityContextHolder.clearContext();
        doThrow(new IllegalStateException("isolated token issuer failure")).when(jwt).createAccessToken(
                org.mockito.ArgumentMatchers.eq(subject), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(Instant.class));

        assertThatThrownBy(() -> auth.confirmMfaEnrollment(setup.challengeToken(), code(setup.secret()), IP))
                .isInstanceOf(IllegalStateException.class).hasMessage("isolated token issuer failure");

        assertThat(state()).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT otp_last_scs_sn FROM tb_auth_otp_cert WHERE user_insd_idntfr=?", Long.class, subject)).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_auth_rstr_cd r JOIN tb_auth_otp_cert c USING(otp_cert_sn) WHERE c.user_insd_idntfr=?", Integer.class, subject)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_adt_log WHERE job_nm='MFA_ENROLL' AND adt_cn::jsonb->>'targetId'=?", Integer.class, subject)).isZero();
        assertThat(jdbc.queryForObject("SELECT rfsh_tkn FROM tb_auth_rfsh_tk WHERE user_id=?", String.class, subject))
                .isEqualTo(nuri.business.domain.auth.RefreshTokenDigest.of(before.getRefreshToken()));
        assertThat(jdbc.queryForObject("SELECT use_dt FROM tb_auth_cert_dmnd WHERE hash_vl=?", java.sql.Timestamp.class,
                MfaOpaqueTokens.challengeDigest(setup.challengeToken()))).isNull();
    }

    private Enrolled enroll(String id) {
        TokenResponse initial = login(id);
        authenticate(initial);
        var setup = mfa.startEnrollment(PASSWORD);
        SecurityContextHolder.clearContext();
        TokenResponse completed = auth.confirmMfaEnrollment(setup.challengeToken(), code(setup.secret()), IP);
        assertThat(completed.getRecoveryCodes()).hasSize(10).doesNotHaveDuplicates();
        return new Enrolled(setup.secret(), completed);
    }

    private String verifyOutcome(String challenge, String code) {
        try { auth.verifyMfaLogin(challenge, code, null, IP); return "authenticated"; }
        catch (MfaRejectedException rejected) { return "rejected"; }
        finally { SecurityContextHolder.clearContext(); }
    }

    private TokenResponse login(String id) {
        SecurityContextHolder.clearContext();
        return auth.login(LoginRequest.builder().userId(loginId(id)).password(PASSWORD).build(), IP);
    }

    private void authenticate(TokenResponse session) {
        SecurityContextHolder.getContext().setAuthentication(jwt.getAuthentication(session.getAccessToken()));
    }

    private void membership(String id, String role) {
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", id, role);
    }

    private void grants(String role, String... permissions) {
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=?", role);
        for (String permission : permissions) {
            jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                    + "VALUES(?,'OPERATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", role, permission);
        }
    }

    private String state() { return jdbc.queryForObject("SELECT cert_stts_cd FROM tb_auth_otp_cert WHERE user_insd_idntfr=?", String.class, subject); }
    private String code(String secret) { return String.format(java.util.Locale.ROOT, "%06d", new GoogleAuthenticator().getTotpPassword(secret, now.toEpochMilli())); }
    private String wrongCode(String secret) {
        var generator = new GoogleAuthenticator();
        var accepted = java.util.stream.LongStream.of(-30, 0, 30)
                .mapToObj(offset -> String.format(java.util.Locale.ROOT, "%06d", generator.getTotpPassword(secret, now.plusSeconds(offset).toEpochMilli())))
                .collect(java.util.stream.Collectors.toSet());
        return java.util.stream.IntStream.range(0, 4).mapToObj(value -> String.format(java.util.Locale.ROOT, "%06d", value))
                .filter(value -> !accepted.contains(value)).findFirst().orElseThrow();
    }
    private void advance(long seconds) { now = now.plusSeconds(seconds); updateClock(); }
    private void updateClock() { ReflectionTestUtils.invokeMethod(mfa, "useClock", Clock.fixed(now, ZoneOffset.UTC)); }
    private static String loginId(String id) { return id + "L"; }
    private static void assertRestricted(TokenResponse response, String stage) {
        assertThat(response.getAuthenticationStage()).isEqualTo(stage);
        assertThat(response.getAccessToken()).isNull();
        assertThat(response.getRefreshToken()).isNull();
        assertThat(response.getMfaChallenge()).hasSize(43);
    }
    private static void denied(Runnable call) {
        assertThatThrownBy(call::run).isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }
    private static String isolatedKey() {
        byte[] bytes = new byte[32]; new java.security.SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
    private record Enrolled(String secret, TokenResponse session) {}
}
