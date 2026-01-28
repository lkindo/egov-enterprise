package com.company.project.service.mail.dto;

import com.company.project.domain.mail.SentMail;
import lombok.Builder;
import lombok.Getter;

/**
 * 발송메일 DTO
 */
@Getter
@Builder
public class SentMailDto {
    private String mssageId;
    private String sj;
    private String emailCn;
    private String dsptchPerson;
    private String recptnPerson;
    private String sndngResultCode;
    private String sndngDe;
    private String atchFileId;

    public static SentMailDto from(SentMail entity) {
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
