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
@Schema(description = "공통상세코드 정보")
public class CmmnDetailCodeDto {

    @Schema(description = "코드ID", example = "COM001")
    private String codeId;

    @Schema(description = "코드ID명", example = "등록구분")
    private String codeIdNm;

    @Schema(description = "상세코드", example = "REGC01")
    private String code;

    @Schema(description = "상세코드명", example = "신규등록")
    private String codeNm;

    @Schema(description = "상세코드설명", example = "신규 등록 코드입니다.")
    private String codeDc;

    @Schema(description = "사용여부", example = "Y")
    private String useAt;

    @Schema(description = "최초등록자ID")
    private String frstRegisterId;

    @Schema(description = "최종수정자ID")
    private String lastUpdusrId;
}
