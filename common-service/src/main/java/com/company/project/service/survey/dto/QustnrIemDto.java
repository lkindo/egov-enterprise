package com.company.project.service.survey.dto;

import com.company.project.domain.survey.QustnrIem;
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
@Schema(description = "설문 항목 정보 DTO")
public class QustnrIemDto {

    @Schema(description = "항목 ID")
    private String qustnrIemId;

    @Schema(description = "문항 ID")
    private String qestnrQesitmId;

    @Schema(description = "설문 ID")
    private String qestnrId;

    @Schema(description = "항목 순번")
    private Long iemSn;

    @Schema(description = "항목 내용")
    private String iemCn;

    @Schema(description = "기타 답변 여부")
    private String etcAnswerAt;

    @Schema(description = "템플릿 ID")
    private String qestnrTmplatId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrIemDto from(QustnrIem entity) {
        if (entity == null) return null;
        return QustnrIemDto.builder()
                .qustnrIemId(entity.getQustnrIemId())
                .qestnrQesitmId(entity.getQestnrQesitmId())
                .qestnrId(entity.getQestnrId())
                .iemSn(entity.getIemSn())
                .iemCn(entity.getIemCn())
                .etcAnswerAt(entity.getEtcAnswerAt())
                .qestnrTmplatId(entity.getQestnrTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
