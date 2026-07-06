package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.service.survey.SurveyTemplate;
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
    @Size(max = 20)
    private String srvyTmpltId;

    @Schema(description = "설문 템플릿 유형 코드")
    @Size(max = 12)
    private String srvyTmpltTypeCd;

    @Schema(description = "설문 템플릿 이미지 경로 명")
    @Size(max = 100)
    private String srvyTmpltPathNm;

    @Schema(description = "설문 템플릿 설명 내용")
    @Size(max = 4000)
    private String srvyTmpltExpln;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;

    public static SurveyTemplateDto from(SurveyTemplate entity) {
        if (entity == null) return null;
        return SurveyTemplateDto.builder()
                .srvyTmpltId(entity.getSrvyTmpltId())
                .srvyTmpltTypeCd(entity.getSrvyTmpltTypeCd())
                .srvyTmpltPathNm(entity.getSrvyTmpltPathNm())
                .srvyTmpltExpln(entity.getSrvyTmpltExpln())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
