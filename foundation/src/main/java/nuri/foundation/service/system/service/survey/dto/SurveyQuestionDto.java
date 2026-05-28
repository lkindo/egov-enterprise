package nuri.foundation.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

import nuri.foundation.domain.system.service.survey.SurveyQuestion;
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

    @Schema(description = "설문 문항 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyQstnId;

    @Schema(description = "설문 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyId;

    @Schema(description = "질문 순번")
    private Long qstnSn;

    @Schema(description = "질문 유형 코드")
    @Size(max = 12)
    private String qstnTypeCd;

    @Schema(description = "질문 내용")
    @Size(max = 4000)
    private String qstnCn;

    @Schema(description = "최대 선택 수")
    private Integer maxChcCnt;

    @Schema(description = "설문 템플릿 ID")
    @Size(max = 20)
    private String srvyTmpltId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    @Schema(description = "설문 항목 목록")
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
