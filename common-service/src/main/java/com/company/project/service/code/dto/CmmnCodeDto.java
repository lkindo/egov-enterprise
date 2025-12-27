package com.company.project.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "공통코드(그룹) 정보")
public class CmmnCodeDto {

    @Schema(description = "코드ID", example = "COM001")
    private String codeId;

    @Schema(description = "코드ID명", example = "등록구분")
    private String codeIdNm;

    @Schema(description = "코드ID설명", example = "등록구분을 나타내는 코드입니다.")
    private String codeIdDc;

    @Schema(description = "분류코드", example = "COM")
    private String clCode;

    @Schema(description = "분류코드명", example = "공통")
    private String clCodeNm;

    @Schema(description = "사용여부", example = "Y")
    private String useAt;

    @Schema(description = "최초등록자ID")
    private String frstRegisterId;

    @Schema(description = "최종수정자ID")
    private String lastUpdusrId;
}
