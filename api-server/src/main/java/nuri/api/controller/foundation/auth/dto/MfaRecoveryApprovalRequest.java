package nuri.api.controller.foundation.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MfaRecoveryApprovalRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String reauthToken,
        @NotBlank @Size(max = 20) String esntlId,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{0,199}") String verificationReference) {
    @Override public String toString() { return "MfaRecoveryApprovalRequest[redacted]"; }
}
