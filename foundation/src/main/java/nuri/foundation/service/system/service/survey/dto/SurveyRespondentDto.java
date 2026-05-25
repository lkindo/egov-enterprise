package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyRespondent;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 설문 응답자 DTO (표준화)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "설문 응답자 DTO")
public class SurveyRespondentDto {

    @Schema(description = "설문 응답자 ID")
    private String srvyRspdntId;

    @Schema(description = "설문 ID")
    private String srvyId;

    @Schema(description = "설문 템플릿 ID")
    private String srvyTmpltId;

    @Schema(description = "성별 코드")
    private String gndrCd;

    @Schema(description = "직업 유형 코드")
    private String crTypeCd;

    @Schema(description = "응답자 명")
    private String rspdntNm;

    @Schema(description = "생년월일")
    private String brdt;

    @Schema(description = "지역 전화번호")
    private String rgnTelno;

    @Schema(description = "국번 전화번호")
    private String midTelno;

    @Schema(description = "개별 전화번호")
    private String endTelno;

    @Schema(description = "최초 등록자 ID")
    private String frstRegisterId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "최종 수정자 ID")
    private String lastUpdusrId;

    @Schema(description = "최종 수정 일시")
    private LocalDateTime lastUpdusrPnttm;

    public static SurveyRespondentDto from(SurveyRespondent entity) {
        if (entity == null) return null;
        return SurveyRespondentDto.builder()
                .srvyRspdntId(entity.getSrvyRspdntId())
                .srvyId(entity.getSrvyId())
                .srvyTmpltId(entity.getSrvyTmpltId())
                .gndrCd(entity.getGndrCd())
                .crTypeCd(entity.getCrTypeCd())
                .rspdntNm(entity.getRspdntNm())
                .brdt(entity.getBrdt())
                .rgnTelno(entity.getRgnTelno())
                .midTelno(entity.getMidTelno())
                .endTelno(entity.getEndTelno())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .build();
    }
}
