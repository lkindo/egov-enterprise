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
@Schema(description = "발송메일 정보 DTO")
public class SentMailDto {

    @Schema(description = "메시지 ID")
    private String mssageId;

    @Schema(description = "제목")
    private String sj;

    @Schema(description = "내용")
    private String emailCn;

    @Schema(description = "발신자")
    private String dsptchPerson;

    @Schema(description = "수신자")
    private String recptnPerson;

    @Schema(description = "발송결과코드")
    private String sndngResultCode;

    @Schema(description = "발송일시")
    private String sndngDe;

    @Schema(description = "첨부파일 ID")
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
