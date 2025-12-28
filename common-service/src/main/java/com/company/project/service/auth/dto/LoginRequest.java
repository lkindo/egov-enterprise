package com.company.project.service.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record LoginRequest(
        @Schema(description = "사용자 ID", example = "USER") String userId,

        @Schema(description = "비밀번호", example = "rhdxhd12") String password) {
}
