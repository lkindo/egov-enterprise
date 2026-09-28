package nuri.foundation.security.mfa;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class MfaChallengePolicyTest {
    private static final Instant ISSUED = Instant.parse("2026-09-28T00:00:00Z");
    private static final Instant EXPIRES = ISSUED.plusSeconds(300);

    @ParameterizedTest
    @EnumSource(MfaChallengePolicy.Purpose.class)
    void aChallengeCannotChangeItsPurpose(MfaChallengePolicy.Purpose stored) {
        for (MfaChallengePolicy.Purpose requested : MfaChallengePolicy.Purpose.values()) {
            assertThat(MfaChallengePolicy.isUsable(stored, requested, "v1", "v1", ISSUED, EXPIRES,
                    null, 0, ISSUED)).isEqualTo(stored == requested);
        }
    }

    @Test
    void rejectsExpiredFutureUsedExhaustedAndSupersededChallenges() {
        var purpose = MfaChallengePolicy.Purpose.LOGIN;
        assertThat(MfaChallengePolicy.isUsable(purpose, purpose, "v1", "v1", ISSUED, EXPIRES,
                null, 4, EXPIRES.minusNanos(1))).isTrue();
        assertThat(MfaChallengePolicy.isUsable(purpose, purpose, "v1", "v1", ISSUED, EXPIRES,
                null, 0, EXPIRES)).isFalse();
        assertThat(MfaChallengePolicy.isUsable(purpose, purpose, "v1", "v1", ISSUED, EXPIRES,
                null, 0, ISSUED.minusNanos(1))).isFalse();
        assertThat(MfaChallengePolicy.isUsable(purpose, purpose, "v1", "v1", ISSUED, EXPIRES,
                ISSUED, 0, ISSUED)).isFalse();
        assertThat(MfaChallengePolicy.isUsable(purpose, purpose, "v1", "v1", ISSUED, EXPIRES,
                null, 5, ISSUED)).isFalse();
        assertThat(MfaChallengePolicy.isUsable(purpose, purpose, "v1", "v2", ISSUED, EXPIRES,
                null, 0, ISSUED)).isFalse();
        assertThat(MfaChallengePolicy.isUsable(purpose, purpose, "v1", "v1", ISSUED, EXPIRES.plusSeconds(1),
                null, 0, ISSUED)).isFalse();
    }

    @Test
    void accountLockIsIndependentOfChallengeLifetimeAndRejectsClockRollback() {
        assertThat(MfaChallengePolicy.isAccountLocked(null, ISSUED)).isFalse();
        assertThat(MfaChallengePolicy.isAccountLocked(ISSUED, EXPIRES.plusSeconds(1))).isTrue();
        assertThat(MfaChallengePolicy.isAccountLocked(ISSUED, ISSUED.minusSeconds(1))).isTrue();
        assertThat(MfaChallengePolicy.isAccountLocked(ISSUED, ISSUED.plusSeconds(899))).isTrue();
        assertThat(MfaChallengePolicy.isAccountLocked(ISSUED, ISSUED.plusSeconds(900))).isFalse();
    }
}
