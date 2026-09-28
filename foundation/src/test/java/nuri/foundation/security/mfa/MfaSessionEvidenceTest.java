package nuri.foundation.security.mfa;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.time.Instant;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.CredentialsExpiredException;

class MfaSessionEvidenceTest {
    @Test
    void currentCredentialVersionAndActualMfaEvidenceAreBothRequired() {
        var current = principal("current", true);
        Instant verified = Instant.now().minusSeconds(60);
        assertThatCode(() -> JwtTokenProvider.assertMfaSession(current, new MfaSessionEvidence("current", verified))).doesNotThrowAnyException();
        assertThatThrownBy(() -> JwtTokenProvider.assertMfaSession(current, null)).isInstanceOf(CredentialsExpiredException.class);
        assertThatThrownBy(() -> JwtTokenProvider.assertMfaSession(current, new MfaSessionEvidence("old", verified))).isInstanceOf(CredentialsExpiredException.class);
        assertThatThrownBy(() -> JwtTokenProvider.assertMfaSession(current, new MfaSessionEvidence("current", null))).isInstanceOf(CredentialsExpiredException.class);
        assertThatThrownBy(() -> JwtTokenProvider.assertMfaSession(current, new MfaSessionEvidence("current", Instant.now().plusSeconds(120))))
                .isInstanceOf(CredentialsExpiredException.class);
    }

    @Test
    void protectedPermissionAcquisitionCannotSilentlyUpgradePasswordOnlySession() {
        assertThatCode(() -> JwtTokenProvider.assertMfaSession(principal(null, false), null)).doesNotThrowAnyException();
        assertThatThrownBy(() -> JwtTokenProvider.assertMfaSession(principal(null, true), null)).isInstanceOf(CredentialsExpiredException.class);
        assertThatThrownBy(() -> JwtTokenProvider.assertMfaSession(principal("disabled-new-version", false),
                new MfaSessionEvidence("old-enabled-version", Instant.now()))).isInstanceOf(CredentialsExpiredException.class);
    }

    private static CustomUserDetails principal(String version, boolean required) {
        return CustomUserDetails.builder().esntlId("MFA-FIXTURE").userId("fixture").enabled(true)
                .mfaCredentialVersion(version).mfaRequired(required).build();
    }
}
