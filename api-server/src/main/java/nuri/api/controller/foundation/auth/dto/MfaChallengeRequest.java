package nuri.api.controller.foundation.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MfaChallengeRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String challengeToken) {
    @Override public String toString() { return "MfaChallengeRequest[redacted]"; }
}
