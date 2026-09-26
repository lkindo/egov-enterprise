package nuri.business.service.mail.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.mail.SentMail;
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
public class SentMailDto {

    @Schema(description = "Description")
    private Long emlDsptchSn;

    @Schema(description = "Description")
    @Size(max = 256)
    private String sj;

    @Schema(description = "메일 본문(평문). 조회 응답에는 발신자 본인에게만 실리고 그 외에는 비어 있다")
    @Size(max = 4000)
    private String emailCn;

    @Schema(description = "Description")
    private String dsptchPerson;

    @Schema(description = "요청: 수신자 주소 문자열(종전 계약, recipients 를 쓰면 비워도 된다). "
            + "응답: 발송 이력의 수신자 표시값 — 사용자 수신자는 이름, 직접 입력한 주소는 그 주소")
    @Size(max = 100)
    private String recptnPerson;

    /**
     * 수신자 목록 — 수신자마다 발송 이력 1건이 생긴다(2026-09-05 DEC-OPS-035).
     * {@code recptnPerson} 과 함께 오면 둘 다 발송한다(중복 주소는 한 번만).
     */
    @io.swagger.v3.oas.annotations.media.ArraySchema(
            arraySchema = @Schema(description = "수신자 목록 — 사용자(esntlId) 또는 주소(emlAddr). 발송 요청 전용(응답에는 실리지 않는다)",
                    accessMode = Schema.AccessMode.WRITE_ONLY),
            schema = @Schema(implementation = MailRecipientDto.class),
            maxItems = 100)
    // 요청 전용 — 읽기 매퍼가 채우지 않으며 직렬화에서도 제외한다(개인정보 응답 census 의 명시 예외 근거).
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    @Size(max = 100)
    @Builder.Default
    private java.util.List<@NotNull @jakarta.validation.Valid MailRecipientDto> recipients = new java.util.ArrayList<>();

    @Schema(description = "Description")
    private String sndngResultCode;

    @Schema(description = "Description")
    private String sndngDe;

    @Schema(description = "첨부 파일 번호. 메일 첨부 발송은 지원하지 않으므로 요청에 값을 넣으면 400 으로 거부한다. "
            + "응답에는 과거 이력에 남은 번호만 실린다")
    private Long atchFileSn;

    /**
     * 현재 사용자가 이 메일을 다시 보낼 수 있는지(서버 판정, 2026-09-26 DIP B5 F7). 발신자 본인이고, 실패했거나
     * 대기에 멈춰 있으며, 수신자를 다시 찾을 수 있을 때 true 다. 화면 표시용 힌트이며 재발송은 서버가 다시 판정한다.
     */
    @Schema(description = "현재 사용자가 다시 보낼 수 있는지(서버 판정)",
            accessMode = Schema.AccessMode.READ_ONLY)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private Boolean resendable;

    public static SentMailDto from(SentMail entity) {
        if (entity == null) return null;
        return SentMailDto.builder()
                .emlDsptchSn(entity.getEmlDsptchSn())
                .sj(entity.getEmlTtl())
                .emailCn(entity.getEmlCn())
                .dsptchPerson(entity.getSndptyNm())
                .recptnPerson(entity.getRcvrNm())
                .sndngResultCode(entity.getDsptchRsltCd())
                .sndngDe(entity.getDsptchDt() != null ? entity.getDsptchDt().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : null)
                .atchFileSn(entity.getAtchFileSn())
                .build();
    }
}
