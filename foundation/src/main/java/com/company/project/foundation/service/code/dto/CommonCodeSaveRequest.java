package com.company.project.foundation.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Common Code Save Request")
public record CommonCodeSaveRequest(
        @Schema(description = "Code Group ID")
        @NotBlank(message = "{validation.required}")
        String codeGroupId,

        @Schema(description = "Code")
        @NotBlank(message = "{validation.required}")
        @Size(min = 1, max = 20, message = "{validation.size}")
        String code,

        @Schema(description = "Code Name")
        @NotBlank(message = "{validation.required}")
        String codeNm,

        @Schema(description = "Code Description")
        String codeDc,

        @Schema(description = "Use Y/N")
        String useAt) {
}
