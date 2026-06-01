package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.service.survey.SurveyArticle;
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

    @Schema(description = "설문 항목 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyArtclId;

    @Schema(description = "설문 문항 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyQstnId;

    @Schema(description = "설문 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyId;

    @Schema(description = "항목 순번")
    private Long artclSn;

    @Schema(description = "항목 내용")
    @Size(max = 4000)
    private String artclCn;

    @Schema(description = "기타 답변 여부")
    @Size(max = 1)
    private String etcAnsYn;

    @Schema(description = "설문 템플릿 ID")
    @Size(max = 20)
    private String srvyTmpltId;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
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
                .frstRgtrId(entity.getFrstRgtrId())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
