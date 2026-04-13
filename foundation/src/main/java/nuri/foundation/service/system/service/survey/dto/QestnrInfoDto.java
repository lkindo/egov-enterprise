package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.QestnrInfo;
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
public class QestnrInfoDto {

    @Schema(description = "Description")
    private String qestnrId;

    @Schema(description = "Description")
    private String qestnrSj;

    @Schema(description = "Description")
    private String qestnrPurps;

    @Schema(description = "Description")
    private String qestnrWritngGuidanceCn;

    @Schema(description = "Description")
    private String qestnrBeginDe;

    @Schema(description = "Description")
    private String qestnrEndDe;

    @Schema(description = "Description")
    private String qestnrTrget;

    @Schema(description = "Description")
    private String qestnrTmplatId;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static QestnrInfoDto from(QestnrInfo entity) {
        if (entity == null)
            return null;
        return QestnrInfoDto.builder()
                .qestnrId(entity.getQestnrId())
                .qestnrSj(entity.getQestnrSj())
                .qestnrPurps(entity.getQestnrPurps())
                .qestnrWritngGuidanceCn(entity.getQestnrWritngGuidanceCn())
                .qestnrBeginDe(entity.getQestnrBeginDe())
                .qestnrEndDe(entity.getQestnrEndDe())
                .qestnrTrget(entity.getQestnrTrget())
                .qestnrTmplatId(entity.getQestnrTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
