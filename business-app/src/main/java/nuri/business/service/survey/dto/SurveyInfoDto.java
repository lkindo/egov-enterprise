package nuri.business.service.survey.dto;

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
@Schema(description = "설문정보 DTO (표준화)")
public class SurveyInfoDto {

    @Schema(description = "설문 일련번호")
    private Long srvySn;

    @Schema(description = "설문 제목")
    @Size(max = 100)
    @NotBlank
    private String srvyTtl;

    @Schema(description = "설문 목적")
    @Size(max = 1000)
    private String srvyPrps;

    @Schema(description = "설문 작성 안내 내용")
    @Size(max = 4000)
    private String srvyWrtGdCn;

    @Schema(description = "설문 시작 일자")
    @Size(max = 8)
    private String srvyBgngYmd;

    @Schema(description = "설문 종료 일자")
    @Size(max = 8)
    private String srvyEndYmd;

    @Schema(description = "설문 대상")
    @Size(max = 1000)
    private String srvyTrgt;

    @Schema(description = "설문 템플릿 일련번호")
    @NotNull
    private Long srvyTmpltSn;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;
}
