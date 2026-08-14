package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

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

    @Schema(description = "설문 문항 일련번호")
    private Long srvyQstnSn;

    @Schema(description = "설문 일련번호")
    private Long srvySn;

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

    @Schema(description = "설문 템플릿 일련번호")
    private Long srvyTmpltSn;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;

    @Schema(description = "설문 항목 목록")
    private List<SurveyArticleDto> items;
}
