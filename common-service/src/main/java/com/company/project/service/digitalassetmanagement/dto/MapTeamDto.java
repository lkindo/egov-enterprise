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
@Schema(description = "조직�?지??�??�보")
public class MapTeamDto {
    @Schema(description = "조직(부?? ID")
    private String orgnztId;
    @Schema(description = "조직(부?? 명칭")
    private String orgnztNm;
    @Schema(description = "분류 ?�자")
    private String clYmd;
    @Schema(description = "지??URL")
    private String knoUrl;
    @Schema(description = "최종 ?�정??ID")
    private String lastUpdusrId;
}
