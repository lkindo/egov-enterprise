package com.company.project.service.digitalassetmanagement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "지??Digital Asset) ?�보")
public class KnowledgeDto {
    @Schema(description = "지??ID")
    private String knoId;
    @Schema(description = "지??명칭")
    private String knoNm;
    @Schema(description = "지???�용")
    private String knoCn;
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
    @Schema(description = "?�문가 명칭")
    private String speNm;
    @Schema(description = "공개 ?��?")
    private String othbcAt;
    @Schema(description = "?��? ?�자")
    private String appYmd;
    @Schema(description = "?��? ?�수")
    private String knoAps;
    @Schema(description = "?�기 ?�자")
    private String junkYmd;
    @Schema(description = "첨�? ?�일 ID")
    private String atchFileId;
    @Schema(description = "최초 ?�록??ID")
    private String frstRegisterId;
    @Schema(description = "최초 ?�록 ?�시")
    private LocalDateTime frstRegisterPnttm;
    @Schema(description = "최종 ?�정??ID")
    private String lastUpdusrId;
    @Schema(description = "최종 ?�정 ?�시")
    private LocalDateTime lastUpdusrPnttm;
}
