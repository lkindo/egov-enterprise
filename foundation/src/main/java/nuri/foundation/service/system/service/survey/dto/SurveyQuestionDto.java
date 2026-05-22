package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyQuestion;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "설문문항 DTO (표준화)")
public class SurveyQuestionDto {

    @JsonProperty("srvyQitemId")
    @Schema(description = "설문문항아이디")
    private String srvyQstnId;

    @JsonProperty("srvyId")
    @Schema(description = "설문아이디")
    private String srvyId;

    @JsonProperty("srvyQitemSn")
    @Schema(description = "질문순번")
    private Long qstnSn;

    @JsonProperty("srvyQitemTypeCd")
    @Schema(description = "질문유형코드")
    private String qstnTypeCd;

    @JsonProperty("srvyQitemCn")
    @Schema(description = "질문내용")
    private String qstnCn;

    @JsonProperty("maxChcCnt")
    @Schema(description = "최대선택수")
    private Integer maxChcCnt;

    @JsonProperty("srvyTmplatId")
    @Schema(description = "설문템플릿아이디")
    private String srvyTmpltId;

    @JsonProperty("createdBy")
    @Schema(description = "등록자")
    private String createdBy;

    @JsonProperty("createdDate")
    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    @JsonProperty("items")
    @Schema(description = "설문항목목록")
    private List<SurveyArticleDto> items;

    public static SurveyQuestionDto from(SurveyQuestion entity) {
        if (entity == null) return null;
        return SurveyQuestionDto.builder()
                .srvyQstnId(entity.getSrvyQstnId())
                .srvyId(entity.getSrvyId())
                .qstnSn(entity.getQstnSn())
                .qstnTypeCd(entity.getQstnTypeCd())
                .qstnCn(entity.getQstnCn())
                .maxChcCnt(entity.getMaxChcCnt())
                .srvyTmpltId(entity.getSrvyTmpltId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
