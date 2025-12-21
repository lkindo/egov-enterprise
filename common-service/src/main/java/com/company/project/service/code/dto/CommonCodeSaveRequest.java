package com.company.project.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "공통코드 저장 요청")
public record CommonCodeSaveRequest(
                @Schema(description = "코드그룹 ID", example = "GROUP_001") @NotBlank(message = "{validation.required}") String codeGroupId,

                @Schema(description = "코드", example = "CODE_01") @NotBlank(message = "{validation.required}") @Size(min = 1, max = 20, message = "{validation.size}") String code,

                @Schema(description = "코드명", example = "테스트코드") @NotBlank(message = "{validation.required}") String codeNm,

                @Schema(description = "코드설명", example = "설명 내용") String codeDc,
                @Schema(description = "사용여부", example = "Y") String useAt) {
}
