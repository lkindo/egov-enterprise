package nuri.api.controller.foundation.auth.dto;

import java.time.Instant;

public record MfaEnrollmentResponse(String secret, String otpauthUri, String challengeToken, Instant expiresAt) {
    @Override public String toString() { return "MfaEnrollmentResponse[redacted]"; }
}
