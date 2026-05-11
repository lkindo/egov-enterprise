package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.QustnrIem;
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
@Schema(description = "설문항목 DTO")
public class QustnrIemDto {

    @Schema(description = "설문항목아이디")
    private String qustnrIemId;

    @Schema(description = "설문문항아이디")
    private String qustnrQesitmId;

    @Schema(description = "설문아이디")
    private String qustnrId;

    @Schema(description = "항목순번")
    private Long iemSn;

    @Schema(description = "항목내용")
    private String iemCn;

    @Schema(description = "기타답변여부")
    private String etcAnswerAt;

    @Schema(description = "설문템플릿아이디")
    private String qustnrTmplatId;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrIemDto from(QustnrIem entity) {
        if (entity == null) return null;
        return QustnrIemDto.builder()
                .qustnrIemId(entity.getQustnrIemId())
                .qustnrQesitmId(entity.getQustnrQesitmId())
                .qustnrId(entity.getQustnrId())
                .iemSn(entity.getIemSn())
                .iemCn(entity.getIemCn())
                .etcAnswerAt(entity.getEtcAnswerAt())
                .qustnrTmplatId(entity.getQustnrTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
