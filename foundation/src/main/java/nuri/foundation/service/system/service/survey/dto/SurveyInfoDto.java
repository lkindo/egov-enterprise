package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyInfo;
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
@Schema(description = "설문정보 DTO (표준화)")
public class SurveyInfoDto {

    @JsonProperty("srvyId")
    @Schema(description = "설문아이디")
    private String srvyId;

    @JsonProperty("srvyTtl")
    @Schema(description = "설문제목")
    private String srvyTtl;

    @JsonProperty("srvyPrpsCn")
    @Schema(description = "설문목적")
    private String srvyPrps;

    @JsonProperty("srvyGuidCn")
    @Schema(description = "설문작성안내내용")
    private String srvyWrtGdCn;

    @JsonProperty("srvyBgngYmd")
    @Schema(description = "설문시작일자")
    private String srvyBgngYmd;

    @JsonProperty("srvyEndYmd")
    @Schema(description = "설문종료일자")
    private String srvyEndYmd;

    @JsonProperty("srvyTrgtCn")
    @Schema(description = "설문대상")
    private String srvyTrgt;

    @JsonProperty("srvyTmplatId")
    @Schema(description = "설문템플릿아이디")
    private String srvyTmpltId;

    @JsonProperty("createdBy")
    @Schema(description = "등록자")
    private String createdBy;

    @JsonProperty("createdDate")
    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static SurveyInfoDto from(SurveyInfo entity) {
        if (entity == null) return null;
        return SurveyInfoDto.builder()
                .srvyId(entity.getSrvyId())
                .srvyTtl(entity.getSrvyTtl())
                .srvyPrps(entity.getSrvyPrps())
                .srvyWrtGdCn(entity.getSrvyWrtGdCn())
                .srvyBgngYmd(entity.getSrvyBgngYmd())
                .srvyEndYmd(entity.getSrvyEndYmd())
                .srvyTrgt(entity.getSrvyTrgt())
                .srvyTmpltId(entity.getSrvyTmpltId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
