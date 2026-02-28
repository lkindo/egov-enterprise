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
@Schema(description = "지식 맵 정보")
public class MapKnoDto {
    @Schema(description = "지식 유형 코드")
    private String knoTypeCd;
    @Schema(description = "지식 유형 명칭")
    private String knoTypeNm;
    @Schema(description = "조직(부서) ID")
    private String orgnztId;
    @Schema(description = "조직(부서) 명칭")
    private String orgnztNm;
    @Schema(description = "전문가 ID")
    private String speId;
    @Schema(description = "분류 일자")
    private String clYmd;
    @Schema(description = "지식 URL")
    private String knoUrl;
    @Schema(description = "최초 등록자 ID")
    private String frstRegisterId;
}
