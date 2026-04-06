package nuri.business.service.sms.dto;

import nuri.business.domain.sms.SmsRecptn;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class SmsRecptnDto {

    @Schema(description = "SMS ID")
    private String smsId;

    @Schema(description = "Description")
    private String recptnTelno;

    @Schema(description = "Description")
    private String resultCode;

    @Schema(description = "Description")
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
