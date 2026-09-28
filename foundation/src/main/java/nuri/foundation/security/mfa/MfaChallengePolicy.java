package nuri.foundation.security.mfa;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/** 도전의 제한된 용도와 수명을 검사한다. 정상 업무 토큰 발급 권한을 표현하지 않는다. */
public final class MfaChallengePolicy {
    public static final Duration LIFETIME = Duration.ofMinutes(5);
    public static final int MAX_FAILURES = 5;
    public static final Duration ACCOUNT_LOCK_DURATION = Duration.ofMinutes(15);

    public enum Purpose { ENROLL, LOGIN, REAUTH, RECOVER }

    private MfaChallengePolicy() {}

    /** 검증과 소모는 자격 및 도전의 DB 잠금을 보유한 같은 트랜잭션에서 수행해야 한다. */
    public static boolean isUsable(Purpose storedPurpose, Purpose requestedPurpose,
            String storedVersion, String currentVersion, Instant issuedAt, Instant expiresAt,
            Instant usedAt, int failures, Instant now) {
        return storedPurpose != null && storedPurpose == requestedPurpose
                && storedVersion != null && !storedVersion.isBlank()
                && Objects.equals(storedVersion, currentVersion)
                && issuedAt != null && expiresAt != null && now != null
                && issuedAt.isBefore(expiresAt)
                && Duration.between(issuedAt, expiresAt).compareTo(LIFETIME) <= 0
                && !now.isBefore(issuedAt) && now.isBefore(expiresAt)
                && usedAt == null && failures >= 0 && failures < MAX_FAILURES;
    }

    public static boolean isAccountLocked(Instant lockedAt, Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("MFA verification time is required");
        }
        return lockedAt != null && (now.isBefore(lockedAt)
                || Duration.between(lockedAt, now).compareTo(ACCOUNT_LOCK_DURATION) < 0);
    }
}
