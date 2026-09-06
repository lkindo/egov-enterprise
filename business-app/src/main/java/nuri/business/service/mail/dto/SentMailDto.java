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
    private String sj;

    @Schema(description = "Description")
    private String emailCn;

    @Schema(description = "Description")
    private String dsptchPerson;

    @Schema(description = "수신자 주소 문자열(종전 계약). recipients 를 쓰면 비워도 된다")
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
    @jakarta.validation.Valid
    @Size(max = 100)
    @Builder.Default
    private java.util.List<MailRecipientDto> recipients = new java.util.ArrayList<>();

    @Schema(description = "Description")
    private String sndngResultCode;

    @Schema(description = "Description")
    private String sndngDe;

    @Schema(description = "Description")
    private Long atchFileSn;

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
