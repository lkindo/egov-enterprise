package com.company.project.service.qna.dto;

import com.company.project.domain.qna.Qna;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Q&A DTO
 */
@Getter
@Builder
public class QnaDto {
    private String qaId;
    private String qestnSj;
    private String qestnCn;
    private String writngPassword;
    private String wrterNm;
    private String emailAdres;
    private String emailAnswerAt;
    private String areaNo;
    private String middleTelno;
    private String endTelno;
    private String qnaProcessSttusCode;
    private String answerCn;
    private String answerDe;
    private Integer inqireCo;
    private String writngDe;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static QnaDto from(Qna entity) {
        return QnaDto.builder()
                .qaId(entity.getQaId())
                .qestnSj(entity.getQestnSj())
                .qestnCn(entity.getQestnCn())
                .writngPassword(entity.getWritngPassword())
                .wrterNm(entity.getWrterNm())
                .emailAdres(entity.getEmailAdres())
                .emailAnswerAt(entity.getEmailAnswerAt())
                .areaNo(entity.getAreaNo())
                .middleTelno(entity.getMiddleTelno())
                .endTelno(entity.getEndTelno())
                .qnaProcessSttusCode(entity.getQnaProcessSttusCode())
                .answerCn(entity.getAnswerCn())
                .answerDe(entity.getAnswerDe())
                .inqireCo(entity.getInqireCo())
                .writngDe(entity.getWritngDe())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
