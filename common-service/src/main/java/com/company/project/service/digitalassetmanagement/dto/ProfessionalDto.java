package com.company.project.service.digitalassetmanagement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "지식 전문가 정보")
public class ProfessionalDto {
    @Schema(description = "전문가 ID")
    private String speId;
    @Schema(description = "사용자 명")
    private String userNm;
    @Schema(description = "지식 유형 코드")
    private String knoTypeCd;
    @Schema(description = "지식 유형 명칭")
    private String knoTypeNm;
    @Schema(description = "조직(부서) ID")
    private String orgnztId;
    @Schema(description = "조직(부서) 명칭")
    private String orgnztNm;
    @Schema(description = "전문가 등급 코드")
    private String appTypeCd;
    @Schema(description = "전문 분야")
    private String speExpCn;
    @Schema(description = "승인 일자")
    private String speConfmDe;
    @Schema(description = "최종 수정자 ID")
    private String lastUpdusrId;
}
