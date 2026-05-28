package nuri.business.service.sms.dto;

import jakarta.validation.constraints.*;

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
@Schema(description = "SMS 수신 정보 DTO")
public class SmsRecptnDto {

    @Schema(description = "SMS ID")
    @Size(max = 20)
    private String smsId;

    @Schema(description = "수신 번호")
    private String recptnTelno;

    @Schema(description = "결과 코드 (P:대기, S:성공, F:실패)")
    private String resultCode;

    @Schema(description = "결과 메시지")
    private String resultMssage;

    public static SmsRecptnDto from(SmsRecptn entity) {
        if (entity == null) return null;
        return SmsRecptnDto.builder()
                .smsId(entity.getSmsId())
                .recptnTelno(entity.getRecptnTelno())
                .resultCode(entity.getRsltCd())
                .resultMssage(entity.getRsltMsg())
                .build();
    }
}
