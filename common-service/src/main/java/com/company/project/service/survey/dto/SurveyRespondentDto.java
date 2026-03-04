package com.company.project.service.survey.dto;

import com.company.project.domain.survey.SurveyRespondent;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * ???묐떟??DTO
 */
@Getter
@Builder
public class SurveyRespondentDto {
    private String qestnrRespondId;
    private String qestnrId;
    private String qestnrTmplatId;
    private String sexdstnCode;
    private String occpTyCode;
    private String respondNm;
    private String brth;
    private String areaNo;
    private String middleTelno;
    private String endTelno;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static SurveyRespondentDto from(SurveyRespondent entity) {
        return SurveyRespondentDto.builder()
                .qestnrRespondId(entity.getQestnrRespondId())
                .qestnrId(entity.getQestnrId())
                .qestnrTmplatId(entity.getQestnrTmplatId())
                .sexdstnCode(entity.getSexdstnCode())
                .occpTyCode(entity.getOccpTyCode())
                .respondNm(entity.getRespondNm())
                .brth(entity.getBrth())
                .areaNo(entity.getAreaNo())
                .middleTelno(entity.getMiddleTelno())
                .endTelno(entity.getEndTelno())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .build();
    }
}