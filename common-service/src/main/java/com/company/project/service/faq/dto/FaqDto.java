package com.company.project.service.faq.dto;

import com.company.project.domain.faq.Faq;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * FAQ DTO
 */
@Getter
@Builder
public class FaqDto {
    private String faqId;
    private String qestnSj;
    private String qestnCn;
    private String answerCn;
    private Integer inqireCo;
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static FaqDto from(Faq entity) {
        return FaqDto.builder()
                .faqId(entity.getFaqId())
                .qestnSj(entity.getQestnSj())
                .qestnCn(entity.getQestnCn())
                .answerCn(entity.getAnswerCn())
                .inqireCo(entity.getInqireCo())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
