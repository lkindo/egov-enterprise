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
@Schema(description = "지??�??�보")
public class MapKnoDto {
    @Schema(description = "지???�형 코드")
    private String knoTypeCd;
    @Schema(description = "지???�형 명칭")
    private String knoTypeNm;
    @Schema(description = "조직(부?? ID")
    private String orgnztId;
    @Schema(description = "조직(부?? 명칭")
    private String orgnztNm;
    @Schema(description = "?�문가 ID")
    private String speId;
    @Schema(description = "분류 ?�자")
    private String clYmd;
    @Schema(description = "지??URL")
    private String knoUrl;
    @Schema(description = "최초 ?�록??ID")
    private String frstRegisterId;
}
