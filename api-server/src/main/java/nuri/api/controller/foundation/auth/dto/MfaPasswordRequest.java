package nuri.api.controller.foundation.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MfaPasswordRequest(@NotBlank @Size(max = 256) String password) {
    @Override public String toString() { return "MfaPasswordRequest[redacted]"; }
}
