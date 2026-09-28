package nuri.foundation.security.mfa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;

class MfaOpaqueTokensTest {
    @Test
    void randomProofsAreDistinctAndRecoveryHashesAreBoundToSubjectAndCredentialVersion() {
        var generator = new MfaOpaqueTokens();
        String challenge = generator.challenge();
        String code = generator.recoveryCode();
        assertThat(challenge).matches("[A-Za-z0-9_-]{43}").isNotEqualTo(generator.challenge());
        assertThat(code).matches("[A-Za-z0-9_-]{22}").isNotEqualTo(generator.recoveryCode());
        assertThat(MfaOpaqueTokens.challengeDigest(challenge)).matches("[0-9a-f]{64}")
                .isEqualTo(MfaOpaqueTokens.challengeDigest(challenge));
        assertThat(MfaOpaqueTokens.recoveryDigest("USER-A", "version-a", code))
                .isNotEqualTo(MfaOpaqueTokens.recoveryDigest("USER-B", "version-a", code))
                .isNotEqualTo(MfaOpaqueTokens.recoveryDigest("USER-A", "version-b", code));
    }

    @Test
    void proofsCannotBeUsedAcrossPurposesOrAmbiguousContextDelimiters() {
        var generator = new MfaOpaqueTokens();
        assertThatThrownBy(() -> MfaOpaqueTokens.challengeDigest(generator.recoveryCode())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MfaOpaqueTokens.recoveryDigest("USER", "version", generator.challenge())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MfaOpaqueTokens.recoveryDigest("USER\nOTHER", "version", generator.recoveryCode())).isInstanceOf(IllegalArgumentException.class);
    }
}
