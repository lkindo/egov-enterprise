package nuri.api.controller.foundation.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MfaLoginVerificationRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String challengeToken,
        @Pattern(regexp = "[0-9]{6}") String code,
        @Pattern(regexp = "[A-Za-z0-9_-]{22}") String recoveryCode) {
    @Override public String toString() { return "MfaLoginVerificationRequest[redacted]"; }
}
