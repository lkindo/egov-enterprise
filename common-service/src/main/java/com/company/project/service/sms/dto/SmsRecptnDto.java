package com.company.project.service.sms.dto;

import com.company.project.domain.sms.SmsRecptn;
import lombok.Builder;
import lombok.Getter;

/**
 * SMS 수신 정보 DTO
 */
@Getter
@Builder
public class SmsRecptnDto {
    private String smsId;
    private String recptnTelno;
    private String resultCode;
    private String resultMssage;

    public static SmsRecptnDto from(SmsRecptn entity) {
        return SmsRecptnDto.builder()
                .smsId(entity.getSmsId())
                .recptnTelno(entity.getRecptnTelno())
                .resultCode(entity.getResultCode())
                .resultMssage(entity.getResultMssage())
                .build();
    }
}
