package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.QustnrTmplat;
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
@Schema(description = "설문템플릿 DTO")
public class QustnrTmplatDto {

    @Schema(description = "설문템플릿아이디")
    private String srvyTmplatId;

    @Schema(description = "설문템플릿유형코드")
    private String srvyTmplatTypeCd;

    @Schema(description = "설문템플릿이미지경로")
    private String srvyTmplatImgPath;

    @Schema(description = "설문템플릿내용")
    private String srvyTmplatCn;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrTmplatDto from(QustnrTmplat entity) {
        if (entity == null) return null;
        return QustnrTmplatDto.builder()
                .srvyTmplatId(entity.getSrvyTmplatId())
                .srvyTmplatTypeCd(entity.getSrvyTmplatTypeCd())
                .srvyTmplatImgPath(entity.getSrvyTmplatImgPath())
                .srvyTmplatCn(entity.getSrvyTmplatCn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
