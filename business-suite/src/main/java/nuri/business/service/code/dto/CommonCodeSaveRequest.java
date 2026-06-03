package nuri.business.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Schema(description = "공통코드 저장 요청 DTO")
public record CommonCodeSaveRequest(
        @Schema(description = "코드그룹 ID")
        @NotBlank(message = "{validation.required}")
        String cdId,

        @Schema(description = "코드")
        @NotBlank(message = "{validation.required}")
        @Size(min = 1, max = 20, message = "{validation.size}")
        String dtlCd,

        @Schema(description = "코드명")
        @NotBlank(message = "{validation.required}")
        String dtlCdNm,

        @Schema(description = "코드설명")
        String dtlCdExpln,

        @Schema(description = "사용여부")
        String useYn) {

}

