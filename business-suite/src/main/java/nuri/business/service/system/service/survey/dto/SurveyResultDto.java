package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.service.survey.SurveyResult;
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
@Schema(description = "설문결과 DTO (표준화)")
public class SurveyResultDto {

    @Schema(description = "설문 응답 ID")
    @Size(max = 20)
    private String srvyRspnsId;

    @Schema(description = "설문 문항 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyQstnId;

    @Schema(description = "설문 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyId;

    @Schema(description = "설문 템플릿 ID")
    @Size(max = 20)
    private String srvyTmpltId;

    @Schema(description = "설문 항목 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyArtclId;

    @Schema(description = "응답 답변 내용")
    @Size(max = 4000)
    private String rspdntAnsCn;

    @Schema(description = "응답자 명")
    @Size(max = 100)
    private String rspnsNm;

    @Schema(description = "기타 답변 내용")
    @Size(max = 4000)
    private String etcAnsCn;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    public static SurveyResultDto from(SurveyResult entity) {
        if (entity == null) return null;
        return SurveyResultDto.builder()
                .srvyRspnsId(entity.getSrvyRspnsId())
                .srvyQstnId(entity.getSrvyQstnId())
                .srvyId(entity.getSrvyId())
                .srvyTmpltId(entity.getSrvyTmpltId())
                .srvyArtclId(entity.getSrvyArtclId())
                .rspdntAnsCn(entity.getRspdntAnsCn())
                .rspnsNm(entity.getRspnsNm())
                .etcAnsCn(entity.getEtcAnsCn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
