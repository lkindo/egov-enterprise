package nuri.api.controller.foundation.auth.dto;

import java.time.Instant;

public record MfaReauthenticationResponse(String reauthToken, Instant expiresAt) {
    @Override public String toString() { return "MfaReauthenticationResponse[redacted]"; }
}
