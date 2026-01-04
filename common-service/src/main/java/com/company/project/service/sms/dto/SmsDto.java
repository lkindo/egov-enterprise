package com.company.project.service.sms.dto;

import com.company.project.domain.sms.Sms;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * SMS DTO
 */
@Getter
@Builder
public class SmsDto {
    private String smsId;
    private String trnsmitTelno;
    private String trnsmitCn;
    private Integer recptnCnt;
    private String uniqId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private List<SmsRecptnDto> recipients;

    public static SmsDto from(Sms entity) {
        return SmsDto.builder()
                .smsId(entity.getSmsId())
                .trnsmitTelno(entity.getTrnsmitTelno())
                .trnsmitCn(entity.getTrnsmitCn())
                .recptnCnt(entity.getRecptnCnt())
                .uniqId(entity.getUniqId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .recipients(entity.getRecipients().stream()
                        .map(SmsRecptnDto::from)
                        .collect(Collectors.toList()))
                .build();
    }
}
