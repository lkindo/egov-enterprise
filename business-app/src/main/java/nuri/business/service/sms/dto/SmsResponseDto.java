package nuri.business.service.sms.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import nuri.foundation.core.util.PiiMaskUtil;

import java.time.LocalDateTime;
import java.util.List;

/**
 * SMS 조회 응답 DTO — 발신자 본인이 아니면 발신번호를 마스킹하고 발신 내용을 {@code null} 로 비운다.
 *
 * <p>발송 요청 계약({@link SmsDto})과 분리해 마스킹된 전화번호({@code 010****5678})와 비운 본문({@code null})이
 * 응답 스키마의 요청 제약({@code @NotBlank}, {@code @Pattern})에 걸리지 않도록 한다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "SMS 조회 응답 객체")
public class SmsResponseDto {

    @Schema(description = "SMS 전송 일련번호")
    private Long smsTrsmSn;

    @Schema(description = "발신 번호(발신자 외에는 마스킹)")
    private String sndngTelno;

    @Schema(description = "발신 내용(발신자 본인에게만 실리고 타인 발송 건은 null)", nullable = true)
    private String sndngCn;

    @Schema(description = "수신자 수", accessMode = Schema.AccessMode.READ_ONLY)
    private Integer recptnCnt;

    @Schema(description = "전달 완료 수신자 수", accessMode = Schema.AccessMode.READ_ONLY)
    private Integer successCnt;

    @Schema(description = "전달 실패 수신자 수", accessMode = Schema.AccessMode.READ_ONLY)
    private Integer failureCnt;

    @Schema(description = "대기 중 수신자 수", accessMode = Schema.AccessMode.READ_ONLY)
    private Integer pendingCnt;

    @Schema(description = "최초 등록자")
    private String frstRgtrId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime crtDt;

    @ArraySchema(
            arraySchema = @Schema(description = "수신자 목록 — 발송 요청 전용(응답에는 실리지 않는다)",
                    accessMode = Schema.AccessMode.WRITE_ONLY),
            schema = @Schema(implementation = SmsRecptnDto.class))
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Builder.Default
    private List<SmsRecptnDto> recipients = new java.util.ArrayList<>();

    /**
     * SMS 비발신자 조회용 전화번호 마스킹 — 8자리 이하는 앞3+뒤4 조합 시 원문 전체 또는 7/8이 노출되므로 전체 가린다.
     */
    public static String maskPhone(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() <= 8) {
            return "***";
        }
        return PiiMaskUtil.phone(value);
    }
}
