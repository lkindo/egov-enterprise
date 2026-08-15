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
@Schema(description = "설문템플릿 DTO (표준화)")
public class SurveyTemplateDto {

    @Schema(description = "설문 템플릿 일련번호")
    private Long srvyTmpltSn;

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
}
