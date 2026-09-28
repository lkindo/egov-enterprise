package nuri.api.controller.foundation.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MfaCodeRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String challengeToken,
        @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {
    @Override public String toString() { return "MfaCodeRequest[redacted]"; }
}
