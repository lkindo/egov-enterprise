package nuri.business.service.code.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;

import lombok.Builder;
import lombok.Getter;

/**
 * 공통코드 정보 DTO
 */
@Getter
@Builder
@Schema(description = "공통코드 정보")
public class CodeDto {
    @Schema(description = "코드그룹 ID", example = "COM001")
    private String codeGroupId;

    @Schema(description = "코드", example = "USER")
    private String code;

    @Schema(description = "코드명", example = "사용자")
    private String codeNm;

    @Schema(description = "코드설명", example = "사용자 권한 코드")
    private String codeDc;

    @Schema(description = "사용여부", example = "Y")
    @Size(max = 1)
    @NotBlank
    private String useYn;
}
