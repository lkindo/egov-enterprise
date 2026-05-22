package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyResult;
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
@Schema(description = "설문결과 DTO (표준화)")
public class SurveyResultDto {

    @JsonProperty("srvyRspdId")
    @Schema(description = "설문응답아이디")
    private String srvyRspnsId;

    @JsonProperty("srvyQitemId")
    @Schema(description = "설문문항아이디")
    private String srvyQstnId;

    @JsonProperty("srvyId")
    @Schema(description = "설문아이디")
    private String srvyId;

    @JsonProperty("srvyTmplatId")
    @Schema(description = "설문템플릿아이디")
    private String srvyTmpltId;

    @JsonProperty("srvyItemId")
    @Schema(description = "설문항목아이디")
    private String srvyArtclId;

    @JsonProperty("rspdAnsCn")
    @Schema(description = "응답답변내용")
    private String rspdntAnsCn;

    @JsonProperty("rspdNm")
    @Schema(description = "응답자명")
    private String rspnsNm;

    @JsonProperty("etcAnsCn")
    @Schema(description = "기타답변내용")
    private String etcAnsCn;

    @JsonProperty("createdBy")
    @Schema(description = "등록자")
    private String createdBy;

    @JsonProperty("createdDate")
    @Schema(description = "등록일시")
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
