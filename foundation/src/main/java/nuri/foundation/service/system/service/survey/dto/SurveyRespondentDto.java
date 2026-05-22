package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyRespondent;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 설문 응답자 DTO (표준화 및 @JsonProperty 가드)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyRespondentDto {

    @JsonProperty("srvyRspdId")
    private String srvyRspdntId;

    @JsonProperty("srvyId")
    private String srvyId;

    @JsonProperty("srvyTmplatId")
    private String srvyTmpltId;

    @JsonProperty("gndrCd")
    private String gndrCd;

    @JsonProperty("jobTypeCd")
    private String crTypeCd;

    @JsonProperty("rspdNm")
    private String rspdntNm;

    @JsonProperty("brthYmd")
    private String brdt;

    @JsonProperty("areaTelno")
    private String rgnTelno;

    @JsonProperty("midTelno")
    private String midTelno;

    @JsonProperty("endTelno")
    private String endTelno;

    @JsonProperty("frstRegisterId")
    private String frstRegisterId;

    @JsonProperty("frstRegisterPnttm")
    private LocalDateTime frstRegisterPnttm;

    @JsonProperty("lastUpdusrId")
    private String lastUpdusrId;

    @JsonProperty("lastUpdusrPnttm")
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
