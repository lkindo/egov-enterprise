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
@Schema(description = "지식(Digital Asset) 정보")
public class KnowledgeDto {
    @Schema(description = "지식 ID")
    private String knoId;
    @Schema(description = "지식 명칭")
    private String knoNm;
    @Schema(description = "지식 내용")
    private String knoCn;
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
    @Schema(description = "전문가 명칭")
    private String speNm;
    @Schema(description = "공개 여부")
    private String othbcAt;
    @Schema(description = "평가 일자")
    private String appYmd;
    @Schema(description = "평가 점수")
    private String knoAps;
    @Schema(description = "폐기 일자")
    private String junkYmd;
    @Schema(description = "첨부 파일 ID")
    private String atchFileId;
    @Schema(description = "최초 등록자 ID")
    private String frstRegisterId;
    @Schema(description = "최초 등록 일시")
    private LocalDateTime frstRegisterPnttm;
    @Schema(description = "최종 수정자 ID")
    private String lastUpdusrId;
    @Schema(description = "최종 수정 일시")
    private LocalDateTime lastUpdusrPnttm;
}
