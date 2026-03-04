package com.company.project.service.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record LoginRequest(
        @Schema(description = "Description") String userId,

        @Schema(description = "Description") String password) {
}
