package nuri.api.controller.foundation.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MfaReauthenticationRequest(@NotBlank @Size(max = 256) String password,
        @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {
    @Override public String toString() { return "MfaReauthenticationRequest[redacted]"; }
}
