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
    private String mssageId;

    @Schema(description = "Description")
    private String sj;

    @Schema(description = "Description")
    private String emailCn;

    @Schema(description = "Description")
    private String dsptchPerson;

    @Schema(description = "Description")
    private String recptnPerson;

    @Schema(description = "Description")
    private String sndngResultCode;

    @Schema(description = "Description")
    private String sndngDe;

    @Schema(description = "Description")
    @Size(max = 30)
    private String atchFileId;

    public static SentMailDto from(SentMail entity) {
        if (entity == null) return null;
        return SentMailDto.builder()
                .mssageId(entity.getMsgId())
                .sj(entity.getEmlTtl())
                .emailCn(entity.getEmlCn())
                .dsptchPerson(entity.getSndptyNm())
                .recptnPerson(entity.getRcvrNm())
                .sndngResultCode(entity.getDsptchRsltCd())
                .sndngDe(entity.getDsptchDt() != null ? entity.getDsptchDt().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : null)
                .atchFileId(entity.getAtchFileId())
                .build();
    }
}
