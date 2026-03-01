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
@Schema(description = "지???�문가 ?�보")
public class ProfessionalDto {
    @Schema(description = "?�문가 ID")
    private String speId;
    @Schema(description = "?�용??�?)
    private String userNm;
    @Schema(description = "지???�형 코드")
    private String knoTypeCd;
    @Schema(description = "지???�형 명칭")
    private String knoTypeNm;
    @Schema(description = "조직(부?? ID")
    private String orgnztId;
    @Schema(description = "조직(부?? 명칭")
    private String orgnztNm;
    @Schema(description = "?�문가 ?�급 코드")
    private String appTypeCd;
    @Schema(description = "?�문 분야")
    private String speExpCn;
    @Schema(description = "?�인 ?�자")
    private String speConfmDe;
    @Schema(description = "최종 ?�정??ID")
    private String lastUpdusrId;
}
