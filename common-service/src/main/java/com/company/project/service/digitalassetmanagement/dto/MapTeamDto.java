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
@Schema(description = "조직별 지식 맵 정보")
public class MapTeamDto {
    @Schema(description = "조직(부서) ID")
    private String orgnztId;
    @Schema(description = "조직(부서) 명칭")
    private String orgnztNm;
    @Schema(description = "분류 일자")
    private String clYmd;
    @Schema(description = "지식 URL")
    private String knoUrl;
    @Schema(description = "최종 수정자 ID")
    private String lastUpdusrId;
}
