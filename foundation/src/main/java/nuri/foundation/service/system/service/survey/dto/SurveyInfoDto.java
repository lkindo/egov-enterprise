package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyInfo;
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

    @Schema(description = "설문 ID")
    private String srvyId;

    @Schema(description = "설문 제목")
    private String srvyTtl;

    @Schema(description = "설문 목적")
    private String srvyPrps;

    @Schema(description = "설문 작성 안내 내용")
    private String srvyWrtGdCn;

    @Schema(description = "설문 시작 일자")
    private String srvyBgngYmd;

    @Schema(description = "설문 종료 일자")
    private String srvyEndYmd;

    @Schema(description = "설문 대상")
    private String srvyTrgt;

    @Schema(description = "설문 템플릿 ID")
    private String srvyTmpltId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
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
