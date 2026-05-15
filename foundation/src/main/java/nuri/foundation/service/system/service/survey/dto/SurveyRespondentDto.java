package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.SurveyRespondent;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 설문 응답자 DTO
 */
@Getter
@Builder
public class SurveyRespondentDto {
    private String srvyRspdId;
    private String srvyId;
    private String srvyTmplatId;
    private String gndrCd;
    private String jobTypeCd;
    private String rspdNm;
    private String brthYmd;
    private String areaTelno;
    private String midTelno;
    private String endTelno;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static SurveyRespondentDto from(SurveyRespondent entity) {
        return SurveyRespondentDto.builder()
                .srvyRspdId(entity.getSrvyRspdId())
                .srvyId(entity.getSrvyId())
                .srvyTmplatId(entity.getSrvyTmplatId())
                .gndrCd(entity.getGndrCd())
                .jobTypeCd(entity.getJobTypeCd())
                .rspdNm(entity.getRspdNm())
                .brthYmd(entity.getBrthYmd())
                .areaTelno(entity.getAreaTelno())
                .midTelno(entity.getMidTelno())
                .endTelno(entity.getEndTelno())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .build();
    }
}
