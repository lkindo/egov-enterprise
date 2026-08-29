package nuri.business.service.sms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    @Schema(description = "SMS 전송 일련번호")
    private Long smsTrsmSn;

    @Schema(description = "수신 번호", minLength = 1, maxLength = 13, pattern = "^[0-9-]+$")
    @NotBlank
    @Size(min = 1, max = 13)
    @Pattern(regexp = "^[0-9-]+$")
    private String rcptnTelno;

    @Schema(description = "결과 코드 (P:대기, S:성공, F:실패)")
    private String rsltCd;

    @Schema(description = "결과 메시지")
    private String rsltMsg;
}
