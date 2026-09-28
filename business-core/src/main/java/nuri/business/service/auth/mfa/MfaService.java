package nuri.business.service.auth.mfa;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.auth.RefreshTokenRepository;
import nuri.business.domain.auth.mfa.*;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.business.service.auth.mfa.MfaResults.*;
import nuri.business.service.login.LoginPolicyManageService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.mfa.MfaChallengePolicy;
import nuri.foundation.security.mfa.MfaChallengePolicy.Purpose;
import nuri.foundation.security.mfa.MfaOpaqueTokens;
import nuri.foundation.security.mfa.TotpVerifier;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 행→자격 행 순서의 잠금으로 모든 도전·OTP counter·복구코드 소모를 직렬화한다.
 * 실패 횟수는 인증 거부에도 커밋한다. 정상 JWT 발급은 AuthService의 완료 경로만 담당한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MfaService {
    private static final Set<String> PROTECTED = Set.of("USER_PASSWORD", "AUTHRT_GRANT", "AUTHRT_ASSIGN");
    private final UserRepository users;
    private final MfaCredentialRepository credentials;
    private final MfaChallengeRepository challenges;
    private final MfaRecoveryCodeRepository recoveryCodes;
    private final RefreshTokenRepository refreshTokens;
    private final AuthorizationSnapshotService snapshots;
    private final AuthorizationAdministrationService administration;
    private final LoginPolicyManageService loginPolicies;
    private final PasswordEncoder passwordEncoder;
    private final MfaSettings settings;
    private final EntityManager entityManager;
    private final nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit;
    private final TotpVerifier totp = new TotpVerifier();
    private final MfaOpaqueTokens tokens = new MfaOpaqueTokens();
    private Clock clock = Clock.systemUTC();

    void useClock(Clock clock) { this.clock = Objects.requireNonNull(clock); }

    public Status status() {
        String subject = currentSubject();
        var credential = credentials.findBySubject(subject).orElse(null);
        return new Status(credential != null && credential.isActive(), required(subject, credential),
                settings.available(), credential == null ? 0 : recoveryCodes.countByCredentialIdAndUsedAtIsNull(credential.getId()));
    }

    /** 비밀번호 검증 뒤 호출한다. null은 MFA가 필요 없는 현재 자격만 의미한다. */
    @Transactional(noRollbackFor = MfaRejectedException.class)
    public Challenge beginLogin(CustomUserDetails verifiedPrincipal, boolean legacyOtpRequired) {
        User user = lockUser(verifiedPrincipal.getEsntlId());
        if (!Objects.equals(user.getPswd(), verifiedPrincipal.getPassword())) throw new MfaRejectedException();
        MfaCredential credential = lockCredential(user, false);
        if (!legacyOtpRequired && !required(user.getEsntlId(), credential)) return null;
        settings.cipher();
        if (credential == null) credential = lockCredential(user, true);
        assertNotLocked(credential);
        if (credential.isActive()) return issueChallenge(user, credential, Purpose.LOGIN, "MFA_REQUIRED");
        if (legacyOtpRequired && !credential.requiresEnrollment()) credential.revoke(true);
        return beginEnrollment(user, credential);
    }

    @Transactional(noRollbackFor = MfaRejectedException.class)
    public Enrollment startEnrollment(String password) {
        settings.cipher();
        User user = lockUser(currentSubject());
        MfaCredential credential = lockCredential(user, true);
        assertNotLocked(credential);
        if (credential.isActive()) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                "이미 등록되어 있습니다. 인증 수단을 잃었다면 복구 절차를 이용해 주세요.");
        verifyPassword(user, credential, password);
        Challenge challenge = beginEnrollment(user, credential);
        return enrollment(user, credential, challenge.token(), challenge.expiresAt());
    }

    @Transactional(noRollbackFor = MfaRejectedException.class)
    public Enrollment prepareEnrollment(String token, String clientIp) {
        LockedChallenge locked = lockChallenge(token, Purpose.ENROLL, null, clientIp);
        assertPendingEnrollment(locked.credential());
        return enrollment(locked.user(), locked.credential(), token, instant(locked.challenge().getExpiresAt()));
    }

    @Transactional(noRollbackFor = MfaRejectedException.class)
    public Completion confirmEnrollment(String token, String code, String clientIp) {
        LockedChallenge locked = lockChallenge(token, Purpose.ENROLL, null, clientIp);
        MfaCredential credential = locked.credential();
        assertPendingEnrollment(credential);
        verifyTotp(credential, locked.challenge(), code);
        locked.challenge().consume(utcNow());
        credential.activate();
        // 확인 전에 발급한 일반 세션/다른 도전은 새 버전과 맞지 않게 한다.
        rotateCredential(credential);
        challenges.deleteForCredential(credential.getId());
        refreshTokens.deleteAllByEsntlIdIn(List.of(credential.getSubject()));
        List<String> codes = replaceRecoveryCodes(locked.user(), credential);
        sensitiveAudit.recordMutation("MFA_ENROLL", credential.getSubject());
        return completed(credential, codes);
    }

    @Transactional(noRollbackFor = MfaRejectedException.class)
    public Completion verifyLogin(String token, String code, String recoveryCode, String clientIp) {
        if ((code == null) == (recoveryCode == null)) throw new MfaRejectedException();
        LockedChallenge locked = lockChallenge(token, Purpose.LOGIN, null, clientIp);
        MfaCredential credential = locked.credential();
        if (!credential.isActive()) throw new MfaRejectedException();
        if (recoveryCode != null) {
            String digest;
            try {
                digest = MfaOpaqueTokens.recoveryDigest(credential.getSubject(), credential.getCredentialVersion(), recoveryCode);
            } catch (IllegalArgumentException invalid) {
                fail(credential, locked.challenge());
                throw new MfaRejectedException();
            }
            MfaRecoveryCode stored = recoveryCodes.findByCredentialIdAndCodeDigest(credential.getId(), digest).orElse(null);
            if (stored == null || stored.getUsedAt() != null
                    || !credential.getCredentialVersion().equals(stored.getCredentialVersion())) {
                fail(credential, locked.challenge());
                throw new MfaRejectedException();
            }
            stored.consume(utcNow());
            revoke(credential, true);
            Challenge enrollment = beginEnrollment(locked.user(), credential);
            sensitiveAudit.recordMutation("MFA_RECOVERY_CODE_USED", credential.getSubject());
            return new Completion(credential.getSubject(), credential.getCredentialVersion(), null, List.of(), enrollment);
        }
        verifyTotp(credential, locked.challenge(), code);
        locked.challenge().consume(utcNow());
        return completed(credential, List.of());
    }

    @Transactional(noRollbackFor = MfaRejectedException.class)
    public Reauthentication reauthenticate(String password, String code) {
        User user = lockUser(currentSubject());
        MfaCredential credential = lockCredential(user, false);
        if (credential == null || !credential.isActive()) throw new MfaRejectedException();
        assertNotLocked(credential);
        verifyPassword(user, credential, password);
        verifyTotp(credential, null, code);
        Challenge proof = issueChallenge(user, credential, Purpose.REAUTH, "REAUTH");
        return new Reauthentication(proof.token(), proof.expiresAt());
    }

    @Transactional(noRollbackFor = MfaRejectedException.class)
    public Completion regenerateRecoveryCodes(String proof, String clientIp) {
        LockedChallenge locked = lockChallenge(proof, Purpose.REAUTH, currentSubject(), clientIp);
        if (!locked.credential().isActive()) throw new MfaRejectedException();
        locked.challenge().consume(utcNow());
        rotateCredential(locked.credential());
        challenges.deleteForCredential(locked.credential().getId());
        refreshTokens.deleteAllByEsntlIdIn(List.of(locked.user().getEsntlId()));
        List<String> codes = replaceRecoveryCodes(locked.user(), locked.credential());
        sensitiveAudit.recordMutation("MFA_RECOVERY_CODES", locked.user().getEsntlId());
        return completed(locked.credential(), codes);
    }

    @Transactional(noRollbackFor = MfaRejectedException.class)
    public void disable(String proof, String clientIp) {
        LockedChallenge locked = lockChallenge(proof, Purpose.REAUTH, currentSubject(), clientIp);
        if (settings.requireProtected() && protectedAccount(locked.user().getEsntlId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }
        locked.challenge().consume(utcNow());
        revoke(locked.credential(), false);
        sensitiveAudit.recordMutation("MFA_DISABLE", locked.user().getEsntlId());
    }

    @Transactional(noRollbackFor = MfaRejectedException.class)
    public void recoverAccount(String proof, String targetSubject, String verificationReference, String clientIp) {
        administration.lockAndAuthorize("MFA_RECOVER");
        administration.authorizeProtectedAccountChange(targetSubject);
        String actor = currentSubject();
        if (actor.equals(targetSubject) || verificationReference == null || verificationReference.isBlank()
                || !verificationReference.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,199}")) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        // 복구 연산끼리 actor/target을 반대 순서로 잠그지 않는다.
        List.of(actor, targetSubject).stream().sorted().forEach(this::lockUser);
        LockedChallenge approval = lockChallenge(proof, Purpose.REAUTH, actor, clientIp);
        User target = lockUser(targetSubject);
        MfaCredential credential = lockCredential(target, true);
        approval.challenge().consume(utcNow());
        revoke(credential, true);
        sensitiveAudit.recordMfaRecovery(targetSubject, verificationReference);
    }

    /** 비밀번호를 바꾼 트랜잭션이 이미 사용자 행을 잠근 뒤 동기로 호출한다. MFA 자체는 끄지 않는다. */
    @org.springframework.context.event.EventListener
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void passwordChanged(nuri.foundation.core.event.UserCredentialsChangedEvent event) {
        credentials.findBySubjectForUpdate(event.esntlId())
                .ifPresent(credential -> challenges.deleteForCredential(credential.getId()));
    }

    private User lockUser(String subject) {
        User user = users.findByEsntlIdForUpdate(subject).orElseThrow(MfaRejectedException::new);
        entityManager.refresh(user, LockModeType.PESSIMISTIC_WRITE);
        if (!"P".equals(user.getUserSttsCd()) || "Y".equals(user.getLckYn())) throw new MfaRejectedException();
        return user;
    }

    private MfaCredential lockCredential(User user, boolean create) {
        MfaCredential credential = credentials.findBySubjectForUpdate(user.getEsntlId()).orElse(null);
        if (credential != null) {
            entityManager.refresh(credential, LockModeType.PESSIMISTIC_WRITE);
            return credential;
        }
        if (!create) return null;
        credential = MfaCredential.create(user.getEsntlId());
        audit(credential, user);
        return credentials.saveAndFlush(credential);
    }

    private LockedChallenge lockChallenge(String token, Purpose purpose, String expectedSubject, String clientIp) {
        String digest;
        try { digest = MfaOpaqueTokens.challengeDigest(token); }
        catch (IllegalArgumentException invalid) { throw new MfaRejectedException(); }
        String subject = challenges.findSubjectByDigest(digest).orElseThrow(MfaRejectedException::new);
        if (expectedSubject != null && !expectedSubject.equals(subject)) throw new MfaRejectedException();
        User user = lockUser(subject);
        loginPolicies.validateLoginPolicy(user.getUserId(), clientIp);
        MfaCredential credential = lockCredential(user, false);
        if (credential == null) throw new MfaRejectedException();
        assertNotLocked(credential);
        MfaChallenge challenge = challenges.findByTokenDigest(digest).orElseThrow(MfaRejectedException::new);
        entityManager.refresh(challenge);
        if (!Objects.equals(credential.getId(), challenge.getCredentialId())
                || !MfaChallengePolicy.isUsable(challenge.getPurpose(), purpose, challenge.getCredentialVersion(),
                        credential.getCredentialVersion(), instant(challenge.getIssuedAt()), instant(challenge.getExpiresAt()),
                        instant(challenge.getUsedAt()), challenge.failures(), clock.instant())) {
            throw new MfaRejectedException();
        }
        return new LockedChallenge(user, credential, challenge);
    }

    private Challenge beginEnrollment(User user, MfaCredential credential) {
        String version = UUID.randomUUID().toString();
        String encrypted = settings.cipher().encrypt(totp.generateSecret(), user.getEsntlId(), version);
        credential.beginEnrollment(encrypted, version);
        challenges.deleteForCredential(credential.getId());
        return issueChallenge(user, credential, Purpose.ENROLL, "ENROLLMENT_REQUIRED");
    }

    private Enrollment enrollment(User user, MfaCredential credential, String token, Instant expiresAt) {
        String secret = decrypt(credential);
        String label = URLEncoder.encode("eGov Enterprise:" + user.getUserId(), StandardCharsets.UTF_8).replace("+", "%20");
        String uri = "otpauth://totp/" + label + "?secret=" + secret
                + "&issuer=eGov%20Enterprise&algorithm=SHA1&digits=6&period=30";
        return new Enrollment(secret, uri, token, expiresAt);
    }

    private Challenge issueChallenge(User user, MfaCredential credential, Purpose purpose, String stage) {
        String token = tokens.challenge();
        Instant now = clock.instant();
        MfaChallenge challenge = MfaChallenge.create(credential.getId(), MfaOpaqueTokens.challengeDigest(token), purpose,
                credential.getCredentialVersion(), utc(now), utc(now.plus(MfaChallengePolicy.LIFETIME)));
        audit(challenge, user);
        challenges.save(challenge);
        return new Challenge(stage, token, now.plus(MfaChallengePolicy.LIFETIME));
    }

    private void verifyPassword(User user, MfaCredential credential, String password) {
        if (password == null || !passwordEncoder.matches(password, user.getPswd())) {
            fail(credential, null);
            throw new MfaRejectedException();
        }
    }

    private void verifyTotp(MfaCredential credential, MfaChallenge challenge, String code) {
        var accepted = totp.verify(decrypt(credential), code, clock.instant(),
                credential.getLastAcceptedStep() == null ? -1 : credential.getLastAcceptedStep());
        if (accepted.isEmpty()) {
            fail(credential, challenge);
            throw new MfaRejectedException();
        }
        credential.accept(accepted.getAsLong(), utcNow());
    }

    private void assertNotLocked(MfaCredential credential) {
        if (MfaChallengePolicy.isAccountLocked(instant(credential.getLockedAt()), clock.instant())) {
            throw new MfaRejectedException();
        }
        if (credential.getLockedAt() != null) credential.clearFailures();
    }

    private void fail(MfaCredential credential, MfaChallenge challenge) {
        credential.recordFailure(utcNow());
        if (challenge != null) challenge.fail();
    }

    private String decrypt(MfaCredential credential) {
        try {
            return settings.cipher().decrypt(credential.getEncryptedSecret(), credential.getSubject(), credential.getCredentialVersion());
        } catch (IllegalArgumentException invalid) {
            throw new BusinessException(MfaErrorCode.UNAVAILABLE);
        }
    }

    private void rotateCredential(MfaCredential credential) {
        String secret = decrypt(credential);
        String version = UUID.randomUUID().toString();
        credential.rotate(version, settings.cipher().encrypt(secret, credential.getSubject(), version));
    }

    private List<String> replaceRecoveryCodes(User user, MfaCredential credential) {
        recoveryCodes.deleteForCredential(credential.getId());
        List<String> codes = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            String raw = tokens.recoveryCode();
            MfaRecoveryCode code = MfaRecoveryCode.create(credential.getId(), credential.getCredentialVersion(),
                    MfaOpaqueTokens.recoveryDigest(credential.getSubject(), credential.getCredentialVersion(), raw));
            audit(code, user);
            recoveryCodes.save(code);
            codes.add(raw);
        }
        return List.copyOf(codes);
    }

    private void revoke(MfaCredential credential, boolean recoveryRequired) {
        credential.revoke(recoveryRequired);
        challenges.deleteForCredential(credential.getId());
        recoveryCodes.deleteForCredential(credential.getId());
        refreshTokens.deleteAllByEsntlIdIn(List.of(credential.getSubject()));
    }

    private Completion completed(MfaCredential credential, List<String> codes) {
        return new Completion(credential.getSubject(), credential.getCredentialVersion(), clock.instant(), codes, null);
    }

    private static void assertPendingEnrollment(MfaCredential credential) {
        if (!("PENDING".equals(credential.getState()) || credential.requiresEnrollment())
                || credential.getEncryptedSecret() == null) throw new MfaRejectedException();
    }

    private boolean required(String subject, MfaCredential credential) {
        return (credential != null && (credential.isActive() || credential.requiresEnrollment()))
                || (settings.requireProtected() && protectedAccount(subject));
    }

    private boolean protectedAccount(String subject) {
        return snapshots.load(subject).permissions().stream().anyMatch(PROTECTED::contains);
    }

    private static String currentSubject() {
        return SecurityUtil.getCurrentEsntlId().orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
    }

    private static void audit(nuri.foundation.domain.common.BaseEntity entity, User user) {
        entity.setFrstRgtrId(user.getUserId());
        entity.setLastMdfrId(user.getUserId());
    }

    private LocalDateTime utcNow() { return utc(clock.instant()); }
    private static LocalDateTime utc(Instant instant) { return LocalDateTime.ofInstant(instant, ZoneOffset.UTC); }
    private static Instant instant(LocalDateTime value) { return value == null ? null : value.toInstant(ZoneOffset.UTC); }
    private record LockedChallenge(User user, MfaCredential credential, MfaChallenge challenge) {}
}
