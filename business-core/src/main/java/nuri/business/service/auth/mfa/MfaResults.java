package nuri.business.service.auth.mfa;

import java.time.Instant;
import java.util.List;

/** 서비스 내부 결과. 비밀이 포함된 결과의 기본 toString 노출을 금지한다. */
public final class MfaResults {
    private MfaResults() {}
    public record Status(boolean enabled, boolean required, boolean available, long recoveryCodesRemaining) {}
    public record Challenge(String stage, String token, Instant expiresAt) {
        @Override public String toString() { return "MfaChallenge[redacted]"; }
    }
    public record Enrollment(String secret, String otpauthUri, String challengeToken, Instant expiresAt) {
        @Override public String toString() { return "MfaEnrollment[redacted]"; }
    }
    public record Reauthentication(String reauthToken, Instant expiresAt) {
        @Override public String toString() { return "MfaReauthentication[redacted]"; }
    }
    public record Completion(String subject, String credentialVersion, Instant verifiedAt,
            List<String> recoveryCodes, Challenge nextChallenge) {
        @Override public String toString() { return "MfaCompletion[redacted]"; }
    }
}
