package nuri.foundation.service.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record TokenResponse(
        @Schema(description = "Access Token", example = "eyJhbGciOiJIUzI1NiJ9...") String accessToken,

        @Schema(description = "Refresh Token", example = "eyJhbGciOiJIUzI1NiJ9...") String refreshToken,

        @Schema(description = "User Role", example = "ROLE_USER") String role) {
}
