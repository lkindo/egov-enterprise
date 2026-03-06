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
@Schema(description = "Description")
public class QustnrIemDto {

    @Schema(description = "Description")
    private String qustnrIemId;

    @Schema(description = "Description")
    private String qestnrQesitmId;

    @Schema(description = "Description")
    private String qestnrId;

    @Schema(description = "Description")
    private Long iemSn;

    @Schema(description = "Description")
    private String iemCn;

    @Schema(description = "Description")
    private String etcAnswerAt;

    @Schema(description = "Description")
    private String qestnrTmplatId;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
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
