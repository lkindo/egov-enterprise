package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyTemplate;
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
@Schema(description = "설문템플릿 DTO (표준화)")
public class SurveyTemplateDto {

    @Schema(description = "설문 템플릿 ID")
    private String srvyTmpltId;

    @Schema(description = "설문 템플릿 유형 코드")
    private String srvyTmpltTypeCd;

    @Schema(description = "설문 템플릿 이미지 경로 명")
    private String srvyTmpltPathNm;

    @Schema(description = "설문 템플릿 설명 내용")
    private String srvyTmpltExpln;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    public static SurveyTemplateDto from(SurveyTemplate entity) {
        if (entity == null) return null;
        return SurveyTemplateDto.builder()
                .srvyTmpltId(entity.getSrvyTmpltId())
                .srvyTmpltTypeCd(entity.getSrvyTmpltTypeCd())
                .srvyTmpltPathNm(entity.getSrvyTmpltPathNm())
                .srvyTmpltExpln(entity.getSrvyTmpltExpln())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
