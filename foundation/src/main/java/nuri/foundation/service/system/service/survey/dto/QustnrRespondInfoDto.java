package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.QustnrRespondInfo;
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
public class QustnrRespondInfoDto {

    @Schema(description = "Description")
    private String qestnrQesrspnsId;

    @Schema(description = "Description")
    private String qestnrQesitmId;

    @Schema(description = "Description")
    private String qestnrId;

    @Schema(description = "Description")
    private String qestnrTmplatId;

    @Schema(description = "Description")
    private String qustnrIemId;

    @Schema(description = "Description")
    private String respondAnswerCn;

    @Schema(description = "Description")
    private String respondNm;

    @Schema(description = "Description")
    private String etcAnswerCn;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static QustnrRespondInfoDto from(QustnrRespondInfo entity) {
        if (entity == null)
            return null;
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
