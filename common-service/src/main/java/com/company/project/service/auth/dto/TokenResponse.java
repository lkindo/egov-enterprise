package com.company.project.service.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record TokenResponse(
        @Schema(description = "Access Token (JWT)", example = "eyJhbGciOiJIUzI1NiJ9...") String accessToken,

        @Schema(description = "Refresh Token (JWT)", example = "eyJhbGciOiJIUzI1NiJ9...") String refreshToken) {
}
