package nuri.business.service.sms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * SMS 수신자 조회 응답 DTO — 발신자 본인이 아니면 수신번호를 마스킹하고 {@code esntlId} 를 비운다.
 *
 * <p>{@link SmsRecptnDto} 의 숫자 전용 정규화 setter 와 {@code @Pattern(regexp = "^[0-9]+$")} 를 분리해
 * 마스킹 문자열({@code 010****5678}, {@code ***})이 보존되고 응답 스키마 검증을 통과하게 한다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "SMS 수신자 조회 응답 DTO")
public class SmsRecptnResponseDto {

    @Schema(description = "SMS 전송 일련번호")
    private Long smsTrsmSn;

    @Schema(description = "수신 번호(발신자 외에는 마스킹)")
    private String rcptnTelno;

    @Schema(description = "수신자 사용자 고유 ID(발신자 본인에게만 실리고 타인 발송 건은 null)", nullable = true)
    private String esntlId;

    @Schema(description = "결과 코드 (P:접수·전달 대기 또는 미확정, S:전달 완료, F:명시적 발송·전달 실패)")
    private String rsltCd;

    @Schema(description = "결과 메시지")
    private String rsltMsg;

    public static SmsRecptnResponseDto from(SmsRecptnDto dto, boolean sender) {
        if (dto == null) {
            return null;
        }
        String phone = sender
                ? dto.getRcptnTelno()
                : SmsResponseDto.maskPhone(dto.getRcptnTelno());
        String recipientId = sender ? dto.getEsntlId() : null;
        return SmsRecptnResponseDto.builder()
                .smsTrsmSn(dto.getSmsTrsmSn())
                .rcptnTelno(phone)
                .esntlId(recipientId)
                .rsltCd(dto.getRsltCd())
                .rsltMsg(dto.getRsltMsg())
                .build();
    }
}
