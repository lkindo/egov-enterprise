package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.QustnrInfo;
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
@Schema(description = "설문정보 DTO")
public class QustnrInfoDto {

    @Schema(description = "설문아이디")
    private String qustnrId;

    @Schema(description = "설문제목")
    private String qustnrSj;

    @Schema(description = "설문목적")
    private String qustnrPurps;

    @Schema(description = "설문작성안내내용")
    private String qustnrWritngGuidanceCn;

    @Schema(description = "설문시작일자")
    private String qustnrBeginDe;

    @Schema(description = "설문종료일자")
    private String qustnrEndDe;

    @Schema(description = "설문대상")
    private String qustnrTrget;

    @Schema(description = "설문템플릿아이디")
    private String qustnrTmplatId;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrInfoDto from(QustnrInfo entity) {
        if (entity == null)
            return null;
        return QustnrInfoDto.builder()
                .qustnrId(entity.getQustnrId())
                .qustnrSj(entity.getQustnrSj())
                .qustnrPurps(entity.getQustnrPurps())
                .qustnrWritngGuidanceCn(entity.getQustnrWritngGuidanceCn())
                .qustnrBeginDe(entity.getQustnrBeginDe())
                .qustnrEndDe(entity.getQustnrEndDe())
                .qustnrTrget(entity.getQustnrTrget())
                .qustnrTmplatId(entity.getQustnrTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
