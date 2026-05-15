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
    private String srvyItemId;

    @Schema(description = "설문문항아이디")
    private String srvyQitemId;

    @Schema(description = "설문아이디")
    private String srvyId;

    @Schema(description = "항목순번")
    private Long srvyItemSn;

    @Schema(description = "항목내용")
    private String srvyItemCn;

    @Schema(description = "기타답변여부")
    private String etcAnsYn;

    @Schema(description = "설문템플릿아이디")
    private String srvyTmplatId;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrIemDto from(QustnrIem entity) {
        if (entity == null) return null;
        return QustnrIemDto.builder()
                .srvyItemId(entity.getSrvyItemId())
                .srvyQitemId(entity.getSrvyQitemId())
                .srvyId(entity.getSrvyId())
                .srvyItemSn(entity.getSrvyItemSn())
                .srvyItemCn(entity.getSrvyItemCn())
                .etcAnsYn(entity.getEtcAnsYn())
                .srvyTmplatId(entity.getSrvyTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
