package nuri.business.service.auth.mfa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import jakarta.persistence.EntityManager;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import nuri.business.domain.auth.RefreshTokenRepository;
import nuri.business.domain.auth.mfa.*;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.business.service.login.LoginPolicyManageService;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.event.UserCredentialsChangedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.mfa.MfaChallengePolicy;
import nuri.foundation.security.mfa.MfaChallengePolicy.Purpose;
import nuri.foundation.security.mfa.MfaOpaqueTokens;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/** Fast service contracts with real state/crypto. SQL locking and rollback live in MfaFlowIntegrationTest. */
class MfaServiceTest {
    private static final String SUBJECT = "MFA_SUBJECT";
    private static final String LOGIN_ID = "mfa.login+fixture";
    private static final String IP = "127.0.0.1";
    // Public RFC 6238 fixture, never a deployed credential.
    private static final String RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    private static final Instant INITIAL_TIME = Instant.ofEpochSecond(1_111_111_109L);
    private final UserRepository users = mock(UserRepository.class);
    private final MfaCredentialRepository credentials = mock(MfaCredentialRepository.class);
    private final MfaChallengeRepository challenges = mock(MfaChallengeRepository.class);
    private final MfaRecoveryCodeRepository recoveryCodes = mock(MfaRecoveryCodeRepository.class);
    private final RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
    private final AuthorizationSnapshotService snapshots = mock(AuthorizationSnapshotService.class);
    private final AuthorizationAdministrationService administration = mock(AuthorizationAdministrationService.class);
    private final LoginPolicyManageService loginPolicies = mock(LoginPolicyManageService.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final EntityManager entities = mock(EntityManager.class);
    private final SensitiveAuditPort audit = mock(SensitiveAuditPort.class);
    private final Map<String, User> userRows = new HashMap<>();
    private final Map<String, MfaCredential> credentialRows = new HashMap<>();
    private final Map<String, MfaChallenge> challengeRows = new HashMap<>();
    private final Map<String, MfaRecoveryCode> recoveryRows = new HashMap<>();
    private final MfaOpaqueTokens opaqueTokens = new MfaOpaqueTokens();
    private Instant now = INITIAL_TIME;
    private long nextCredentialId = 1;
    private MfaSettings settings;
    private MfaService service;
    private User user;

    @BeforeEach
    void setUp() {
        // Repository doubles only store/query rows; all transition and verification rules execute in production code.
        when(users.findByEsntlIdForUpdate(anyString())).thenAnswer(i -> Optional.ofNullable(userRows.get(i.getArgument(0))));
        when(credentials.findBySubjectForUpdate(anyString())).thenAnswer(i -> Optional.ofNullable(credentialRows.get(i.getArgument(0))));
        when(credentials.findBySubject(anyString())).thenAnswer(i -> Optional.ofNullable(credentialRows.get(i.getArgument(0))));
        when(credentials.saveAndFlush(any())).thenAnswer(i -> {
            MfaCredential row = i.getArgument(0);
            if (row.getId() == null) ReflectionTestUtils.setField(row, "id", nextCredentialId++);
            credentialRows.put(row.getSubject(), row);
            return row;
        });
        when(challenges.save(any())).thenAnswer(i -> {
            MfaChallenge row = i.getArgument(0);
            challengeRows.put(row.getTokenDigest(), row);
            return row;
        });
        when(challenges.findByTokenDigest(anyString())).thenAnswer(i -> Optional.ofNullable(challengeRows.get(i.getArgument(0))));
        when(challenges.findSubjectByDigest(anyString())).thenAnswer(i -> {
            MfaChallenge row = challengeRows.get(i.getArgument(0));
            return row == null ? Optional.empty() : credentialRows.values().stream()
                    .filter(c -> c.getId().equals(row.getCredentialId())).map(MfaCredential::getSubject).findFirst();
        });
        when(challenges.deleteForCredential(anyLong())).thenAnswer(i -> {
            long id = i.getArgument(0);
            int before = challengeRows.size();
            challengeRows.values().removeIf(row -> row.getCredentialId() == id);
            return before - challengeRows.size();
        });
        when(recoveryCodes.save(any())).thenAnswer(i -> {
            MfaRecoveryCode row = i.getArgument(0);
            recoveryRows.put(row.getCodeDigest(), row);
            return row;
        });
        when(recoveryCodes.findByCredentialIdAndCodeDigest(anyLong(), anyString())).thenAnswer(i ->
                Optional.ofNullable(recoveryRows.get(i.getArgument(1)))
                        .filter(row -> row.getCredentialId().equals(i.getArgument(0))));
        when(recoveryCodes.deleteForCredential(anyLong())).thenAnswer(i -> {
            long id = i.getArgument(0);
            int before = recoveryRows.size();
            recoveryRows.values().removeIf(row -> row.getCredentialId() == id);
            return before - recoveryRows.size();
        });
        when(recoveryCodes.countByCredentialIdAndUsedAtIsNull(anyLong())).thenAnswer(i -> recoveryRows.values().stream()
                .filter(row -> row.getCredentialId().equals(i.getArgument(0)) && row.getUsedAt() == null).count());
        when(snapshots.load(anyString())).thenReturn(new AuthorizationSnapshotService.Snapshot(List.of(), List.of(), "authorization-fixture"));
        when(passwords.matches("password-fixture", "hash-fixture")).thenReturn(true);
        user = addUser(SUBJECT, LOGIN_ID);
        settings = configuredSettings(false);
        replaceService(settings);
        authenticate(SUBJECT);
    }

    @AfterEach
    void clearSecurityContext() { SecurityContextHolder.clearContext(); }

    @Test
    void optionalUnenrolledLoginNeedsNeitherCipherNorChallengeAndStatusRequiresSession() {
        replaceService(new MfaSettings("", "", false));
        assertThat(service.beginLogin(principal(user), false)).isNull();
        assertThat(service.status()).isEqualTo(new MfaResults.Status(false, false, false, 0));
        verifyNoInteractions(challenges, recoveryCodes, refreshTokens, audit);
        SecurityContextHolder.clearContext();
        assertThatThrownBy(service::status).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(CommonErrorCode.UNAUTHORIZED));
    }

    @ParameterizedTest
    @ValueSource(strings = {"changed-password", "inactive", "locked", "deleted"})
    void stalePasswordPrincipalAndUnavailableAccountsCannotBeginLogin(String scenario) {
        CustomUserDetails verified = principal(user);
        switch (scenario) {
            case "changed-password" -> user.updatePassword("changed-hash-fixture");
            case "inactive" -> user.updateStatus("D");
            case "locked" -> user.lockAccount();
            case "deleted" -> userRows.remove(SUBJECT);
            default -> throw new AssertionError(scenario);
        }
        assertThatThrownBy(() -> service.beginLogin(verified, false)).isInstanceOf(MfaRejectedException.class);
        verifyNoInteractions(challenges, refreshTokens, audit);
    }

    @Test
    void activeCredentialAlwaysRequiresLoginChallengeEvenWithoutLegacyPolicy() {
        MfaCredential credential = activeCredential(user);
        String version = credential.getCredentialVersion();
        MfaResults.Challenge result = service.beginLogin(principal(user), false);
        MfaChallenge stored = stored(result.token());
        assertThat(result.stage()).isEqualTo("MFA_REQUIRED");
        assertThat(result.expiresAt()).isEqualTo(now.plusSeconds(300));
        assertThat(stored.getPurpose()).isEqualTo(Purpose.LOGIN);
        assertThat(stored.getCredentialVersion()).isEqualTo(version);
        assertThat(stored.getTokenDigest()).isEqualTo(MfaOpaqueTokens.challengeDigest(result.token())).isNotEqualTo(result.token());
        assertThat(stored.getFrstRgtrId()).isEqualTo(LOGIN_ID);
        assertThat(stored.getLastMdfrId()).isEqualTo(LOGIN_ID);
        assertThat(service.status()).isEqualTo(new MfaResults.Status(true, true, true, 0));
        verifyNoInteractions(refreshTokens, audit);
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER_PASSWORD", "AUTHRT_GRANT", "AUTHRT_ASSIGN"})
    void eachProtectedPermissionRequiresEnrollmentWhenEnforcementEnabled(String permission) {
        replaceService(configuredSettings(true));
        when(snapshots.load(SUBJECT)).thenReturn(new AuthorizationSnapshotService.Snapshot(List.of(), List.of(permission), "v"));
        MfaResults.Challenge result = service.beginLogin(principal(user), false);
        assertThat(result.stage()).isEqualTo("ENROLLMENT_REQUIRED");
        assertThat(credentialRows.get(SUBJECT).getState()).isEqualTo("PENDING");
        assertThat(service.status().required()).isTrue();
    }

    @Test
    void recoveryPermissionAloneDoesNotBroadenProtectedClassification() {
        replaceService(configuredSettings(true));
        when(snapshots.load(SUBJECT)).thenReturn(new AuthorizationSnapshotService.Snapshot(List.of(), List.of("MFA_RECOVER"), "v"));
        assertThat(service.beginLogin(principal(user), false)).isNull();
    }

    @Test
    void legacyAndRecoveryRequiredAccountsRemainRestrictedUntilConfirmedEnrollment() {
        MfaResults.Challenge legacy = service.beginLogin(principal(user), true);
        MfaCredential credential = credentialRows.get(SUBJECT);
        assertThat(credential.requiresEnrollment()).isTrue();
        assertThat(legacy.stage()).isEqualTo("ENROLLMENT_REQUIRED");
        String previousVersion = credential.getCredentialVersion();
        MfaResults.Challenge next = service.beginLogin(principal(user), false);
        assertThat(next.stage()).isEqualTo("ENROLLMENT_REQUIRED");
        assertThat(credential.getCredentialVersion()).isNotEqualTo(previousVersion);
        assertThat(credential.requiresEnrollment()).isTrue();
        assertThatThrownBy(() -> service.prepareEnrollment(legacy.token(), IP)).isInstanceOf(MfaRejectedException.class);
    }

    @Test
    void lostKeyringCannotDowngradeActiveMfaToPasswordOnly() {
        activeCredential(user);
        replaceService(new MfaSettings("", "", false));
        assertThat(service.status()).isEqualTo(new MfaResults.Status(true, true, false, 0));
        assertThatThrownBy(() -> service.beginLogin(principal(user), false)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(MfaErrorCode.UNAVAILABLE));
        verifyNoInteractions(challenges, refreshTokens);
    }

    @Test
    void enrollmentConfirmsRealOtpRotatesVersionCreatesHashedRecoveryCodesAndRevokesPriorSessions() {
        MfaResults.Enrollment start = service.startEnrollment("password-fixture");
        MfaCredential credential = credentialRows.get(SUBJECT);
        String pendingVersion = credential.getCredentialVersion();
        MfaChallenge pendingChallenge = stored(start.challengeToken());
        assertThat(start.otpauthUri()).contains("mfa.login%2Bfixture", "digits=6", "period=30");
        assertThat(service.prepareEnrollment(start.challengeToken(), IP).secret()).isEqualTo(start.secret());
        assertThat(credential.getState()).isEqualTo("PENDING");
        assertThat(service.beginLogin(principal(user), false)).isNull();
        MfaResults.Completion result = service.confirmEnrollment(start.challengeToken(), code(start.secret()), IP);
        assertThat(credential.isActive()).isTrue();
        assertThat(result.subject()).isEqualTo(SUBJECT);
        assertThat(result.verifiedAt()).isEqualTo(now);
        assertThat(result.nextChallenge()).isNull();
        assertThat(result.credentialVersion()).isNotEqualTo(pendingVersion).isEqualTo(credential.getCredentialVersion());
        assertThat(pendingChallenge.getUsedAt()).isEqualTo(utc(now));
        assertThat(credential.getLastAcceptedStep()).isEqualTo(now.getEpochSecond() / 30);
        assertRecoveryCodes(result, credential);
        assertThat(service.status().recoveryCodesRemaining()).isEqualTo(10);
        verify(refreshTokens).deleteAllByEsntlIdIn(List.of(SUBJECT));
        verify(audit).recordMutation("MFA_ENROLL", SUBJECT);
        assertThatThrownBy(() -> service.confirmEnrollment(start.challengeToken(), code(start.secret()), IP)).isInstanceOf(MfaRejectedException.class);
        String login = service.beginLogin(principal(user), false).token();
        assertThatThrownBy(() -> service.verifyLogin(login, code(start.secret()), null, IP)).isInstanceOf(MfaRejectedException.class);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"wrong-password-fixture"})
    void enrollmentPasswordFailureConsumesAccountBudget(String password) {
        assertThatThrownBy(() -> service.startEnrollment(password)).isInstanceOf(MfaRejectedException.class);
        assertThat(credentialRows.get(SUBJECT).failures()).isEqualTo(1);
        assertThat(challengeRows).isEmpty();
        verifyNoInteractions(refreshTokens, audit);
    }

    @Test
    void alreadyActiveEnrollmentIsRejectedWithoutRotatingCredential() {
        MfaCredential credential = activeCredential(user);
        String version = credential.getCredentialVersion();
        assertThatThrownBy(() -> service.startEnrollment("password-fixture")).isInstanceOf(BusinessException.class);
        assertThat(credential.getCredentialVersion()).isEqualTo(version);
        verifyNoInteractions(passwords, refreshTokens, audit);
    }

    @Test
    void incorrectEnrollmentCodeNeverActivatesCredentialOrCreatesRecoveryCodes() {
        MfaResults.Enrollment enrollment = service.startEnrollment("password-fixture");
        MfaCredential credential = credentialRows.get(SUBJECT);
        assertThatThrownBy(() -> service.confirmEnrollment(enrollment.challengeToken(), "invalid", IP))
                .isInstanceOf(MfaRejectedException.class);
        assertThat(credential.getState()).isEqualTo("PENDING");
        assertThat(credential.failures()).isEqualTo(1);
        assertThat(stored(enrollment.challengeToken()).getUsedAt()).isNull();
        assertThat(stored(enrollment.challengeToken()).failures()).isEqualTo(1);
        verifyNoInteractions(refreshTokens, recoveryCodes, audit);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACTIVE", "NONE", "missing-secret"})
    void enrollmentProofCannotExposeSecretForNonPendingOrIncompleteCredential(String state) {
        MfaCredential credential = activeCredential(user);
        String token = challenge(credential, Purpose.ENROLL);
        if (state.equals("missing-secret")) {
            ReflectionTestUtils.setField(credential, "state", "PENDING");
            ReflectionTestUtils.setField(credential, "encryptedSecret", null);
        } else {
            ReflectionTestUtils.setField(credential, "state", state);
        }
        assertThatThrownBy(() -> service.prepareEnrollment(token, IP)).isInstanceOf(MfaRejectedException.class);
        assertThatThrownBy(() -> service.confirmEnrollment(token, "081804", IP)).isInstanceOf(MfaRejectedException.class);
        assertThat(credential.getLastAcceptedStep()).isNull();
        verifyNoInteractions(refreshTokens, recoveryCodes, audit);
    }

    @ParameterizedTest
    @ValueSource(strings = {"purpose", "version", "expired", "future", "used", "budget", "wrong-credential", "missing-row", "missing-credential"})
    void invalidChallengeCannotAuthenticateOrConsumeOtp(String scenario) {
        MfaCredential credential = activeCredential(user);
        String token = challenge(credential, Purpose.LOGIN);
        MfaChallenge row = stored(token);
        switch (scenario) {
            case "purpose" -> ReflectionTestUtils.setField(row, "purpose", Purpose.ENROLL);
            case "version" -> ReflectionTestUtils.setField(row, "credentialVersion", "superseded-version");
            case "expired" -> advance(300);
            case "future" -> ReflectionTestUtils.setField(row, "issuedAt", utc(now.plusSeconds(1)));
            case "used" -> row.consume(utc(now));
            case "budget" -> { for (int i = 0; i < 5; i++) row.fail(); }
            case "wrong-credential" -> {
                ReflectionTestUtils.setField(row, "credentialId", 999L);
                when(challenges.findSubjectByDigest(row.getTokenDigest())).thenReturn(Optional.of(SUBJECT));
            }
            case "missing-row" -> {
                when(challenges.findSubjectByDigest(row.getTokenDigest())).thenReturn(Optional.of(SUBJECT));
                challengeRows.clear();
            }
            case "missing-credential" -> {
                when(challenges.findSubjectByDigest(row.getTokenDigest())).thenReturn(Optional.of(SUBJECT));
                credentialRows.clear();
            }
            default -> throw new AssertionError(scenario);
        }
        assertThatThrownBy(() -> service.verifyLogin(token, code(RFC_SECRET), null, IP)).isInstanceOf(MfaRejectedException.class);
        assertThat(credential.getLastAcceptedStep()).isNull();
        verifyNoInteractions(refreshTokens, recoveryCodes, audit);
    }

    @Test
    void malformedAndUnknownProofsAndAmbiguousCodeInputFailBeforeAccountLookup() {
        assertThatThrownBy(() -> service.verifyLogin("invalid", "081804", null, IP)).isInstanceOf(MfaRejectedException.class);
        assertThatThrownBy(() -> service.verifyLogin(opaqueTokens.challenge(), "081804", null, IP)).isInstanceOf(MfaRejectedException.class);
        assertThatThrownBy(() -> service.verifyLogin(opaqueTokens.challenge(), null, null, IP)).isInstanceOf(MfaRejectedException.class);
        assertThatThrownBy(() -> service.verifyLogin(opaqueTokens.challenge(), "081804", opaqueTokens.recoveryCode(), IP)).isInstanceOf(MfaRejectedException.class);
        verifyNoInteractions(users, credentials, refreshTokens, audit);
    }

    @Test
    void successfulLoginConsumesChallengeAndOtpStepAcrossOtherChallenges() {
        MfaCredential credential = activeCredential(user);
        credential.recordFailure(utc(now));
        String first = challenge(credential, Purpose.LOGIN);
        String other = challenge(credential, Purpose.LOGIN);
        MfaResults.Completion completed = service.verifyLogin(first, "081804", null, IP);
        assertThat(completed.verifiedAt()).isEqualTo(now);
        assertThat(completed.credentialVersion()).isEqualTo(credential.getCredentialVersion());
        assertThat(completed.recoveryCodes()).isEmpty();
        assertThat(credential.failures()).isZero();
        assertThat(credential.getConfirmedAt()).isEqualTo(utc(now));
        assertThat(stored(first).getUsedAt()).isEqualTo(utc(now));
        assertThatThrownBy(() -> service.verifyLogin(first, "081804", null, IP)).isInstanceOf(MfaRejectedException.class);
        assertThatThrownBy(() -> service.verifyLogin(other, "081804", null, IP)).isInstanceOf(MfaRejectedException.class);
        assertThat(credential.failures()).isEqualTo(1);
        assertThat(stored(other).failures()).isEqualTo(1);
        advance(30);
        assertThat(service.verifyLogin(other, code(RFC_SECRET), null, IP).verifiedAt()).isEqualTo(now);
        assertThat(credential.failures()).isZero();
        verify(loginPolicies, atLeastOnce()).validateLoginPolicy(LOGIN_ID, IP);
    }

    @Test
    void multipleChallengesShareFiveFailureBudgetAndRecoverOnlyAfterLockDuration() {
        MfaCredential credential = activeCredential(user);
        for (int i = 1; i <= 5; i++) {
            String token = challenge(credential, Purpose.LOGIN);
            assertThatThrownBy(() -> service.verifyLogin(token, "000000", null, IP)).isInstanceOf(MfaRejectedException.class);
            assertThat(credential.failures()).isEqualTo(i);
            assertThat(stored(token).failures()).isEqualTo(1);
        }
        assertThat(credential.getLockedAt()).isEqualTo(utc(now));
        assertThatThrownBy(() -> service.beginLogin(principal(user), false)).isInstanceOf(MfaRejectedException.class);
        advance(899);
        assertThatThrownBy(() -> service.beginLogin(principal(user), false)).isInstanceOf(MfaRejectedException.class);
        advance(1);
        assertThat(service.beginLogin(principal(user), false).stage()).isEqualTo("MFA_REQUIRED");
        assertThat(credential.failures()).isZero();
        assertThat(credential.getLockedAt()).isNull();
    }

    @Test
    void policyDenialInactiveCredentialAndCorruptCipherNeverConsumeChallenge() {
        MfaCredential credential = activeCredential(user);
        String token = challenge(credential, Purpose.LOGIN);
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED)).when(loginPolicies).validateLoginPolicy(LOGIN_ID, IP);
        assertThatThrownBy(() -> service.verifyLogin(token, "081804", null, IP)).isInstanceOf(BusinessException.class);
        doNothing().when(loginPolicies).validateLoginPolicy(LOGIN_ID, IP);
        ReflectionTestUtils.setField(credential, "state", "NONE");
        assertThatThrownBy(() -> service.verifyLogin(token, "081804", null, IP)).isInstanceOf(MfaRejectedException.class);
        credential.activate();
        ReflectionTestUtils.setField(credential, "encryptedSecret", "invalid-cipher-fixture");
        assertThatThrownBy(() -> service.verifyLogin(token, "081804", null, IP)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(MfaErrorCode.UNAVAILABLE));
        assertThat(stored(token).getUsedAt()).isNull();
        assertThat(credential.getLastAcceptedStep()).isNull();
        verifyNoInteractions(refreshTokens, audit);
    }

    @ParameterizedTest
    @ValueSource(strings = {"malformed", "unknown", "used", "old-version"})
    void recoveryCodeFailuresNeverReturnSessionOrEnrollment(String scenario) {
        MfaCredential credential = activeCredential(user);
        String raw = opaqueTokens.recoveryCode();
        MfaRecoveryCode recovery = recovery(credential, raw);
        if (scenario.equals("malformed")) raw = "invalid";
        if (scenario.equals("unknown")) recoveryRows.clear();
        if (scenario.equals("used")) recovery.consume(utc(now));
        if (scenario.equals("old-version")) ReflectionTestUtils.setField(recovery, "credentialVersion", "old-version");
        String supplied = raw;
        String token = challenge(credential, Purpose.LOGIN);
        assertThatThrownBy(() -> service.verifyLogin(token, null, supplied, IP)).isInstanceOf(MfaRejectedException.class);
        assertThat(credential.isActive()).isTrue();
        assertThat(credential.failures()).isEqualTo(1);
        assertThat(stored(token).failures()).isEqualTo(1);
        verifyNoInteractions(refreshTokens, audit);
    }

    @Test
    void recoveryCodeIsOneUseRevokesAllOldProofsAndRequiresNewEnrollment() {
        MfaCredential credential = activeCredential(user);
        String oldVersion = credential.getCredentialVersion();
        String raw = opaqueTokens.recoveryCode();
        MfaRecoveryCode recovery = recovery(credential, raw);
        String token = challenge(credential, Purpose.LOGIN);
        MfaResults.Completion result = service.verifyLogin(token, null, raw, IP);
        assertThat(recovery.getUsedAt()).isEqualTo(utc(now));
        assertThat(credential.requiresEnrollment()).isTrue();
        assertThat(credential.isActive()).isFalse();
        assertThat(credential.getCredentialVersion()).isNotEqualTo(oldVersion);
        assertThat(result.verifiedAt()).isNull();
        assertThat(result.recoveryCodes()).isEmpty();
        assertThat(result.nextChallenge().stage()).isEqualTo("ENROLLMENT_REQUIRED");
        assertThat(recoveryRows).isEmpty();
        assertThatThrownBy(() -> service.verifyLogin(token, null, raw, IP)).isInstanceOf(MfaRejectedException.class);
        assertThatThrownBy(() -> service.verifyLogin(result.nextChallenge().token(), null, raw, IP)).isInstanceOf(MfaRejectedException.class);
        assertThat(service.prepareEnrollment(result.nextChallenge().token(), IP).secret()).isNotEqualTo(RFC_SECRET);
        verify(refreshTokens).deleteAllByEsntlIdIn(List.of(SUBJECT));
        verify(audit).recordMutation("MFA_RECOVERY_CODE_USED", SUBJECT);
    }

    @Test
    void freshPasswordAndOtpProofRegeneratesCodesRotatesVersionAndCannotBeReused() {
        MfaCredential credential = activeCredential(user);
        String version = credential.getCredentialVersion();
        MfaResults.Reauthentication proof = service.reauthenticate("password-fixture", "081804");
        MfaChallenge stored = stored(proof.reauthToken());
        assertThat(stored.getPurpose()).isEqualTo(Purpose.REAUTH);
        assertThat(proof.expiresAt()).isEqualTo(now.plusSeconds(300));
        assertThatThrownBy(() -> service.verifyLogin(proof.reauthToken(), "081804", null, IP)).isInstanceOf(MfaRejectedException.class);
        MfaResults.Completion result = service.regenerateRecoveryCodes(proof.reauthToken(), IP);
        assertThat(stored.getUsedAt()).isEqualTo(utc(now));
        assertThat(result.credentialVersion()).isNotEqualTo(version);
        assertThat(credential.isActive()).isTrue();
        assertRecoveryCodes(result, credential);
        assertThatThrownBy(() -> service.regenerateRecoveryCodes(proof.reauthToken(), IP)).isInstanceOf(MfaRejectedException.class);
        verify(refreshTokens).deleteAllByEsntlIdIn(List.of(SUBJECT));
        verify(audit).recordMutation("MFA_RECOVERY_CODES", SUBJECT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"password", "otp", "missing", "inactive"})
    void reauthenticationCannotUsePasswordOnlyOrInactiveCredential(String scenario) {
        MfaCredential credential = activeCredential(user);
        if (scenario.equals("missing")) credentialRows.clear();
        if (scenario.equals("inactive")) credential.revoke(false);
        assertThatThrownBy(() -> service.reauthenticate(scenario.equals("password") ? "wrong" : "password-fixture",
                scenario.equals("otp") ? "000000" : "081804")).isInstanceOf(MfaRejectedException.class);
        assertThat(challengeRows).isEmpty();
        if (scenario.equals("password") || scenario.equals("otp")) assertThat(credential.failures()).isEqualTo(1);
        verifyNoInteractions(refreshTokens, audit);
    }

    @Test
    void mutationProofRequiresSameActorAndReauthPurpose() {
        MfaCredential credential = activeCredential(user);
        String login = challenge(credential, Purpose.LOGIN);
        assertThatThrownBy(() -> service.disable(login, IP)).isInstanceOf(MfaRejectedException.class);
        String proof = challenge(credential, Purpose.REAUTH);
        authenticate("OTHER_SUBJECT");
        assertThatThrownBy(() -> service.regenerateRecoveryCodes(proof, IP)).isInstanceOf(MfaRejectedException.class);
        assertThatThrownBy(() -> service.disable(proof, IP)).isInstanceOf(MfaRejectedException.class);
        assertThat(credential.isActive()).isTrue();
        assertThat(stored(proof).getUsedAt()).isNull();
        verifyNoInteractions(refreshTokens, audit);
    }

    @Test
    void expiredReauthenticationCannotDisableOrRegenerateCodes() {
        MfaCredential credential = activeCredential(user);
        String proof = service.reauthenticate("password-fixture", "081804").reauthToken();
        advance(300);
        assertThatThrownBy(() -> service.disable(proof, IP)).isInstanceOf(MfaRejectedException.class);
        assertThatThrownBy(() -> service.regenerateRecoveryCodes(proof, IP)).isInstanceOf(MfaRejectedException.class);
        assertThat(credential.isActive()).isTrue();
        assertThat(stored(proof).getUsedAt()).isNull();
        verifyNoInteractions(refreshTokens, audit);
    }

    @Test
    void optionalDisableRevokesCredentialCodesChallengesAndRefreshTokens() {
        MfaCredential credential = activeCredential(user);
        String version = credential.getCredentialVersion();
        recovery(credential, opaqueTokens.recoveryCode());
        String proof = challenge(credential, Purpose.REAUTH);
        MfaChallenge stored = stored(proof);
        service.disable(proof, IP);
        assertThat(stored.getUsedAt()).isEqualTo(utc(now));
        assertThat(credential.getState()).isEqualTo("NONE");
        assertThat(credential.getCredentialVersion()).isNotEqualTo(version);
        assertThat(credential.getEncryptedSecret()).isNull();
        assertThat(challengeRows).isEmpty();
        assertThat(recoveryRows).isEmpty();
        verify(refreshTokens).deleteAllByEsntlIdIn(List.of(SUBJECT));
        verify(audit).recordMutation("MFA_DISABLE", SUBJECT);
    }

    @Test
    void enforcedProtectedAccountCannotDisableButOrdinaryAccountCan() {
        replaceService(configuredSettings(true));
        MfaCredential credential = activeCredential(user);
        String proof = challenge(credential, Purpose.REAUTH);
        when(snapshots.load(SUBJECT)).thenReturn(new AuthorizationSnapshotService.Snapshot(List.of(), List.of("USER_PASSWORD"), "v"));
        assertThatThrownBy(() -> service.disable(proof, IP)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED));
        assertThat(stored(proof).getUsedAt()).isNull();
        assertThat(credential.isActive()).isTrue();
        when(snapshots.load(SUBJECT)).thenReturn(new AuthorizationSnapshotService.Snapshot(List.of(), List.of("MFA_RECOVER"), "v"));
        service.disable(proof, IP);
        assertThat(credential.getState()).isEqualTo("NONE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"dedicated-permission", "protected-target"})
    void administrativeRecoveryHonorsBothAuthorizationDenialsBeforeAnyMutation(String denial) {
        MfaCredential actor = activeCredential(user);
        User target = addUser("TARGET_SUBJECT", "target.login");
        MfaCredential targetCredential = activeCredential(target);
        String originalVersion = targetCredential.getCredentialVersion();
        String proof = challenge(actor, Purpose.REAUTH);
        if (denial.equals("dedicated-permission")) {
            doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED)).when(administration).lockAndAuthorize("MFA_RECOVER");
        } else {
            doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED)).when(administration).authorizeProtectedAccountChange(target.getEsntlId());
        }
        assertThatThrownBy(() -> service.recoverAccount(proof, target.getEsntlId(), "TICKET-2026-001", IP)).isInstanceOf(BusinessException.class);
        assertThat(targetCredential.getCredentialVersion()).isEqualTo(originalVersion);
        assertThat(targetCredential.isActive()).isTrue();
        assertThat(stored(proof).getUsedAt()).isNull();
        verifyNoInteractions(refreshTokens, audit);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "contains space", "ticket\nforged"})
    void administrativeRecoveryRequiresNonSensitiveApprovalReference(String reference) {
        assertThatThrownBy(() -> service.recoverAccount(opaqueTokens.challenge(), "TARGET_SUBJECT", reference, IP))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE));
        verifyNoInteractions(users, credentials, refreshTokens, audit);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void administrativeRecoveryRejectsSelfAndConsumesFreshProofForDifferentAccount(boolean targetEnrolled) {
        MfaCredential actor = activeCredential(user);
        User target = addUser("TARGET_SUBJECT", "target.login");
        if (targetEnrolled) recovery(activeCredential(target), opaqueTokens.recoveryCode());
        String proof = challenge(actor, Purpose.REAUTH);
        MfaChallenge approval = stored(proof);
        assertThatThrownBy(() -> service.recoverAccount(proof, SUBJECT, "TICKET-2026-001", IP)).isInstanceOf(BusinessException.class);
        assertThat(approval.getUsedAt()).isNull();
        service.recoverAccount(proof, target.getEsntlId(), "TICKET-2026-001", IP);
        assertThat(credentialRows.get(target.getEsntlId()).requiresEnrollment()).isTrue();
        assertThat(credentialRows.get(target.getEsntlId()).getEncryptedSecret()).isNull();
        assertThat(recoveryRows).isEmpty();
        assertThat(approval.getUsedAt()).isEqualTo(utc(now));
        assertThat(actor.isActive()).isTrue();
        var order = inOrder(administration, audit);
        order.verify(administration).lockAndAuthorize("MFA_RECOVER");
        order.verify(administration).authorizeProtectedAccountChange(SUBJECT);
        order.verify(administration).lockAndAuthorize("MFA_RECOVER");
        order.verify(administration).authorizeProtectedAccountChange(target.getEsntlId());
        order.verify(audit).recordMfaRecovery(target.getEsntlId(), "TICKET-2026-001");
        verify(refreshTokens).deleteAllByEsntlIdIn(List.of(target.getEsntlId()));
        assertThatThrownBy(() -> service.recoverAccount(proof, target.getEsntlId(), "TICKET-2026-002", IP)).isInstanceOf(MfaRejectedException.class);
    }

    @Test
    void passwordChangeInvalidatesOutstandingChallengesWithoutDisablingMfa() {
        MfaCredential credential = activeCredential(user);
        String version = credential.getCredentialVersion();
        challenge(credential, Purpose.LOGIN);
        service.passwordChanged(new UserCredentialsChangedEvent(SUBJECT));
        assertThat(challengeRows).isEmpty();
        assertThat(credential.isActive()).isTrue();
        assertThat(credential.getCredentialVersion()).isEqualTo(version);
        verifyNoInteractions(refreshTokens, recoveryCodes, audit);
    }

    private MfaSettings configuredSettings(boolean requireProtected) {
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        return new MfaSettings("test", "{\"test\":\"" + Base64.getEncoder().encodeToString(key) + "\"}", requireProtected);
    }

    private void replaceService(MfaSettings configured) {
        settings = configured;
        service = new MfaService(users, credentials, challenges, recoveryCodes, refreshTokens, snapshots,
                administration, loginPolicies, passwords, settings, entities, audit);
        service.useClock(Clock.fixed(now, ZoneOffset.UTC));
    }

    private User addUser(String subject, String loginId) {
        User row = User.builder().esntlId(subject).userId(loginId).userTypeCd("USR03")
                .userNm("synthetic fixture").pswd("hash-fixture").userSttsCd("P").lckYn("N").build();
        userRows.put(subject, row);
        return row;
    }

    private static CustomUserDetails principal(User row) {
        return CustomUserDetails.builder().userId(row.getUserId()).esntlId(row.getEsntlId())
                .password(row.getPswd()).enabled(true).lockAt("N").build();
    }

    private void authenticate(String subject) {
        CustomUserDetails principal = CustomUserDetails.builder().userId(LOGIN_ID).esntlId(subject).enabled(true).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private MfaCredential activeCredential(User row) {
        MfaCredential credential = MfaCredential.create(row.getEsntlId());
        ReflectionTestUtils.setField(credential, "id", nextCredentialId++);
        String version = credential.getCredentialVersion();
        credential.beginEnrollment(settings.cipher().encrypt(RFC_SECRET, row.getEsntlId(), version), version);
        credential.activate();
        credentialRows.put(row.getEsntlId(), credential);
        return credential;
    }

    private String challenge(MfaCredential credential, Purpose purpose) {
        String token = opaqueTokens.challenge();
        MfaChallenge row = MfaChallenge.create(credential.getId(), MfaOpaqueTokens.challengeDigest(token), purpose,
                credential.getCredentialVersion(), utc(now), utc(now.plus(MfaChallengePolicy.LIFETIME)));
        challengeRows.put(row.getTokenDigest(), row);
        return token;
    }

    private MfaChallenge stored(String token) { return challengeRows.get(MfaOpaqueTokens.challengeDigest(token)); }

    private MfaRecoveryCode recovery(MfaCredential credential, String raw) {
        MfaRecoveryCode row = MfaRecoveryCode.create(credential.getId(), credential.getCredentialVersion(),
                MfaOpaqueTokens.recoveryDigest(credential.getSubject(), credential.getCredentialVersion(), raw));
        recoveryRows.put(row.getCodeDigest(), row);
        return row;
    }

    private void assertRecoveryCodes(MfaResults.Completion result, MfaCredential credential) {
        assertThat(result.recoveryCodes()).hasSize(10).doesNotHaveDuplicates();
        assertThat(recoveryRows).hasSize(10);
        for (String raw : result.recoveryCodes()) {
            String digest = MfaOpaqueTokens.recoveryDigest(credential.getSubject(), credential.getCredentialVersion(), raw);
            MfaRecoveryCode row = recoveryRows.get(digest);
            assertThat(row).isNotNull();
            assertThat(row.getCodeDigest()).isNotEqualTo(raw);
            assertThat(row.getCredentialVersion()).isEqualTo(result.credentialVersion());
            assertThat(row.getFrstRgtrId()).isEqualTo(LOGIN_ID);
            assertThat(row.getLastMdfrId()).isEqualTo(LOGIN_ID);
            assertThat(row.getUsedAt()).isNull();
        }
    }

    private String code(String secret) {
        return String.format(Locale.ROOT, "%06d", new GoogleAuthenticator().getTotpPassword(secret, now.toEpochMilli()));
    }

    private void advance(long seconds) { now = now.plusSeconds(seconds); service.useClock(Clock.fixed(now, ZoneOffset.UTC)); }
    private static LocalDateTime utc(Instant instant) { return LocalDateTime.ofInstant(instant, ZoneOffset.UTC); }
}
