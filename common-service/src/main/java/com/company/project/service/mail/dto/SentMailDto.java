package com.company.project.service.mail.dto;

import com.company.project.domain.mail.SentMail;
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
    private String atchFileId;

    public static SentMailDto from(SentMail entity) {
        if (entity == null) return null;
        return SentMailDto.builder()
                .mssageId(entity.getMssageId())
                .sj(entity.getSj())
                .emailCn(entity.getEmailCn())
                .dsptchPerson(entity.getDsptchPerson())
                .recptnPerson(entity.getRecptnPerson())
                .sndngResultCode(entity.getSndngResultCode())
                .sndngDe(entity.getSndngDe())
                .atchFileId(entity.getAtchFileId())
                .build();
    }
}
