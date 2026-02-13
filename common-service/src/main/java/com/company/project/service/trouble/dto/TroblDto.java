package com.company.project.service.trouble.dto;

import com.company.project.domain.trouble.Trobl;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TroblDto {
    private String troblId;
    private String troblNm;
    private String troblKnd;
    private String troblKndNm;
    private String troblDc;
    private String troblOccrrncTime;
    private String troblRqesterNm;
    private String troblRequstTime;
    private String troblProcessResult;
    private String troblOpetrNm;
    private String troblProcessTime;
    private String processSttus;
    private String processSttusNm;
    private LocalDateTime frstRegisterPnttm;
    private String frstRegisterId;
    private LocalDateTime lastUpdusrPnttm;
    private String lastUpdusrId;

    public static TroblDto from(Trobl entity) {
        return TroblDto.builder()
                .troblId(entity.getTroblId())
                .troblNm(entity.getTroblNm())
                .troblKnd(entity.getTroblKnd())
                .troblDc(entity.getTroblDc())
                .troblOccrrncTime(entity.getTroblOccrrncTime())
                .troblRqesterNm(entity.getTroblRqesterNm())
                .troblRequstTime(entity.getTroblRequstTime())
                .troblProcessResult(entity.getTroblProcessResult())
                .troblOpetrNm(entity.getTroblOpetrNm())
                .troblProcessTime(entity.getTroblProcessTime())
                .processSttus(entity.getProcessSttus())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .frstRegisterId(entity.getFrstRegisterId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .build();
    }
}
