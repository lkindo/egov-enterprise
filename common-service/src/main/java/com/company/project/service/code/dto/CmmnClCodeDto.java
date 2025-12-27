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
@Schema(description = "공통분류코드 정보")
public class CmmnClCodeDto {

    @Schema(description = "분류코드", example = "COM")
    private String clCode;

    @Schema(description = "분류코드명", example = "공통")
    private String clCodeNm;

    @Schema(description = "분류코드설명", example = "공통 코드입니다.")
    private String clCodeDc;

    @Schema(description = "사용여부", example = "Y")
    private String useAt;

    @Schema(description = "최초등록자ID")
    private String frstRegisterId;

    @Schema(description = "최종수정자ID")
    private String lastUpdusrId;
}
