package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

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

    @Schema(description = "설문 항목 일련번호")
    private Long srvyArtclSn;

    @Schema(description = "설문 문항 일련번호")
    private Long srvyQstnSn;

    @Schema(description = "설문 일련번호")
    private Long srvySn;

    @Schema(description = "항목 순번")
    private Long artclSn;

    @Schema(description = "항목 내용")
    @Size(max = 4000)
    private String artclCn;

    @Schema(description = "기타 답변 여부")
    @Size(max = 1)
    private String etcAnsYn;

    @Schema(description = "설문 템플릿 일련번호")
    private Long srvyTmpltSn;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;
}
