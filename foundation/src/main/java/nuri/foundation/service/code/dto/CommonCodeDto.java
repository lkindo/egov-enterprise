package nuri.foundation.service.code.dto;

import nuri.foundation.domain.code.CommonCode;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Description")
public record CommonCodeDto(
        @Schema(description = "Description") String codeGroupId,

        @Schema(description = "Description") String code,

        @Schema(description = "Description") String codeNm,

        @Schema(description = "Description") String codeDc,

        @Schema(description = "Description") String useAt) {
    public String getCodeGroupId() {
        return codeGroupId;
    }

    public String getCode() {
        return code;
    }

    public String getCodeNm() {
        return codeNm;
    }

    public String getCodeDc() {
        return codeDc;
    }

    public String getUseAt() {
        return useAt;
    }

    public static CommonCodeDto from(CommonCode entity) {
        return new CommonCodeDto(
                entity.getCodeGroupId(),
                entity.getCode(),
                entity.getCodeNm(),
                entity.getCodeDc(),
                entity.getUseYn());
    }
}
