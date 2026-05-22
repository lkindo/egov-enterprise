package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyTemplate;
import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("srvyTmplatId")
    @Schema(description = "설문템플릿아이디")
    private String srvyTmpltId;

    @JsonProperty("srvyTmplatTypeCd")
    @Schema(description = "설문템플릿유형코드")
    private String srvyTmpltTypeCd;

    @JsonProperty("srvyTmplatImgPath")
    @Schema(description = "설문템플릿이미지경로")
    private String srvyTmpltPathNm;

    @JsonProperty("srvyTmplatCn")
    @Schema(description = "설문템플릿내용")
    private String srvyTmpltExpln;

    @JsonProperty("createdBy")
    @Schema(description = "등록자")
    private String createdBy;

    @JsonProperty("createdDate")
    @Schema(description = "등록일시")
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
