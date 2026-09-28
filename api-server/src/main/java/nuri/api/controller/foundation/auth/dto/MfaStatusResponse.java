package nuri.api.controller.foundation.auth.dto;

public record MfaStatusResponse(boolean enabled, boolean required, boolean available, long recoveryCodesRemaining) {}
