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

    /**
     * 수신 번호. {@code esntlId} 를 지정하면 비워 둘 수 있다(서버가 해석) — "둘 중 하나" 는 서비스가 집행한다.
     * [2026-09-05 DEC-OPS-035] 종전 {@code @NotBlank} 를 내렸다. 길이·형식 계약은 그대로다(InputContractMirrorLinter).
     */
    @Schema(description = "수신 번호. esntlId 를 지정하면 생략한다", minLength = 1, maxLength = 13, pattern = "^[0-9-]+$")
    @Size(min = 1, max = 13)
    @Pattern(regexp = "^[0-9-]+$")
    private String rcptnTelno;

    @Schema(description = "수신자 사용자 고유 ID(esntlId). 지정하면 서버가 등록된 휴대전화 번호를 해석한다", maxLength = 20)
    @Size(max = 20)
    private String esntlId;

    @Schema(description = "결과 코드 (P:대기, S:성공, F:실패)")
    private String rsltCd;

    @Schema(description = "결과 메시지")
    private String rsltMsg;
}
