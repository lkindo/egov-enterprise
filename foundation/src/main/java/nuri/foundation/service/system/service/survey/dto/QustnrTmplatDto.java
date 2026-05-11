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
    private String qustnrTmplatId;

    @Schema(description = "설문템플릿유형")
    private String qustnrTmplatTy;

    @Schema(description = "설문템플릿이미지경로")
    private String qustnrTmplatImagepathnm;

    @Schema(description = "설문템플릿내용")
    private String qustnrTmplatCn;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrTmplatDto from(QustnrTmplat entity) {
        if (entity == null) return null;
        return QustnrTmplatDto.builder()
                .qustnrTmplatId(entity.getQustnrTmplatId())
                .qustnrTmplatTy(entity.getQustnrTmplatTy())
                .qustnrTmplatImagepathnm(entity.getQustnrTmplatImagepathnm())
                .qustnrTmplatCn(entity.getQustnrTmplatCn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
