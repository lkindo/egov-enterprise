package com.company.project.service.sms.dto;

import com.company.project.domain.sms.SmsRecptn;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "SMS 수신 정보 DTO")
public class SmsRecptnDto {

    @Schema(description = "SMS ID")
    private String smsId;

    @Schema(description = "수신 전화번호")
    private String recptnTelno;

    @Schema(description = "결과 코드")
    private String resultCode;

    @Schema(description = "결과 메시지")
    private String resultMssage;

    public static SmsRecptnDto from(SmsRecptn entity) {
        if (entity == null) return null;
        return SmsRecptnDto.builder()
                .smsId(entity.getSmsId())
                .recptnTelno(entity.getRecptnTelno())
                .resultCode(entity.getResultCode())
                .resultMssage(entity.getResultMssage())
                .build();
    }
}
