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
@Schema(description = "설문응답 DTO")
public class QustnrRespondInfoDto {

    @Schema(description = "설문응답아이디")
    private String srvyRspdId;

    @Schema(description = "설문문항아이디")
    private String srvyQitemId;

    @Schema(description = "설문아이디")
    private String srvyId;

    @Schema(description = "설문템플릿아이디")
    private String srvyTmplatId;

    @Schema(description = "설문항목아이디")
    private String srvyItemId;

    @Schema(description = "응답답변내용")
    private String rspdAnsCn;

    @Schema(description = "응답자명")
    private String rspdNm;

    @Schema(description = "기타답변내용")
    private String etcAnsCn;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrRespondInfoDto from(QustnrRespondInfo entity) {
        if (entity == null)
            return null;
        return QustnrRespondInfoDto.builder()
                .srvyRspdId(entity.getSrvyRspdId())
                .srvyQitemId(entity.getSrvyQitemId())
                .srvyId(entity.getSrvyId())
                .srvyTmplatId(entity.getSrvyTmplatId())
                .srvyItemId(entity.getSrvyItemId())
                .rspdAnsCn(entity.getRspdAnsCn())
                .rspdNm(entity.getRspdNm())
                .etcAnsCn(entity.getEtcAnsCn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
