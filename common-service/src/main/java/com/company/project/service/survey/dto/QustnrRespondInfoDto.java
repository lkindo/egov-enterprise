package com.company.project.service.survey.dto;

import com.company.project.domain.survey.QustnrRespondInfo;
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
@Schema(description = "설문 응답 결과 DTO")
public class QustnrRespondInfoDto {

    @Schema(description = "응답 결과 ID")
    private String qestnrQesrspnsId;

    @Schema(description = "문항 ID")
    private String qestnrQesitmId;

    @Schema(description = "설문 ID")
    private String qestnrId;

    @Schema(description = "템플릿 ID")
    private String qestnrTmplatId;

    @Schema(description = "항목 ID")
    private String qustnrIemId;

    @Schema(description = "응답 내용")
    private String respondAnswerCn;

    @Schema(description = "응답자 명")
    private String respondNm;

    @Schema(description = "기타 응답 내용")
    private String etcAnswerCn;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrRespondInfoDto from(QustnrRespondInfo entity) {
        if (entity == null) return null;
        return QustnrRespondInfoDto.builder()
                .qestnrQesrspnsId(entity.getQestnrQesrspnsId())
                .qestnrQesitmId(entity.getQestnrQesitmId())
                .qestnrId(entity.getQestnrId())
                .qestnrTmplatId(entity.getQestnrTmplatId())
                .qustnrIemId(entity.getQustnrIemId())
                .respondAnswerCn(entity.getRespondAnswerCn())
                .respondNm(entity.getRespondNm())
                .etcAnswerCn(entity.getEtcAnswerCn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
