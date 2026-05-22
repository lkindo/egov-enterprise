package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyArticle;
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
@Schema(description = "설문항목 DTO (표준화)")
public class SurveyArticleDto {

    @JsonProperty("srvyItemId")
    @Schema(description = "설문항목아이디")
    private String srvyArtclId;

    @JsonProperty("srvyQitemId")
    @Schema(description = "설문문항아이디")
    private String srvyQstnId;

    @JsonProperty("srvyId")
    @Schema(description = "설문아이디")
    private String srvyId;

    @JsonProperty("srvyItemSn")
    @Schema(description = "항목순번")
    private Long artclSn;

    @JsonProperty("srvyItemCn")
    @Schema(description = "항목내용")
    private String artclCn;

    @JsonProperty("etcAnsYn")
    @Schema(description = "기타답변여부")
    private String etcAnsYn;

    @JsonProperty("srvyTmplatId")
    @Schema(description = "설문템플릿아이디")
    private String srvyTmpltId;

    @JsonProperty("createdBy")
    @Schema(description = "등록자")
    private String createdBy;

    @JsonProperty("createdDate")
    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static SurveyArticleDto from(SurveyArticle entity) {
        if (entity == null) return null;
        return SurveyArticleDto.builder()
                .srvyArtclId(entity.getSrvyArtclId())
                .srvyQstnId(entity.getSrvyQstnId())
                .srvyId(entity.getSrvyId())
                .artclSn(entity.getArtclSn())
                .artclCn(entity.getArtclCn())
                .etcAnsYn(entity.getEtcAnsYn())
                .srvyTmpltId(entity.getSrvyTmpltId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
