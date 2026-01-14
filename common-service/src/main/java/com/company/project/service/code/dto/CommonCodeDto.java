package com.company.project.service.code.dto;

import com.company.project.domain.code.CommonCode;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "공통코드 정보")
public record CommonCodeDto(
        @Schema(description = "코드그룹 ID", example = "COM001") String codeGroupId,

        @Schema(description = "코드", example = "01") String code,

        @Schema(description = "코드명", example = "테스트코드") String codeNm,

        @Schema(description = "코드설명", example = "설명 내용") String codeDc,

        @Schema(description = "사용여부", example = "Y") String useAt) {
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
                entity.getUseAt());
    }
}
