package nuri.business.service.code.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "공통코드 DTO")
public record CommonCodeDto(
        @NotBlank @Size(max = 20) @Schema(description = "코드그룹 ID") String cdId,

        @NotBlank @Size(max = 12) @Schema(description = "코드") String dtlCd,

        @NotBlank @Size(max = 100) @Schema(description = "코드명") String dtlCdNm,

        @Size(max = 4000) @Schema(description = "코드설명") String dtlCdExpln,

        @NotBlank @Size(max = 1) @Schema(description = "사용여부") String useYn) {
}

