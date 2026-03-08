package com.company.project.service.usermanagement.dto;

import com.company.project.domain.user.entity.EnterpriseUser;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Enterprise User DTO")
public class EnterpriseUserDto {

    private String esntlId;
    private String entrprsmberId;
    private String entrprsSeCode;
    private String bizrno;
    private String jurirno;
    private String cmpnyNm;
    private String cxfc;
    private String zip;
    private String adres;
    private String areaNo;
    private String entrprsMiddleTelno;
    private String entrprsEndTelno;
    private String fxnum;
    private String indutyCode;
    private String applcntNm;
    private String applcntEmailAdres;
    private String applcntIhidnum;
    private LocalDateTime sbscrbDe;
    private String entrprsMberSttus;
    private String groupId;
    private String detailAdres;
    private String entrprsMberPassword;
    private String entrprsMberPasswordHint;
    private String entrprsMberPasswordCnsr;
    private String lockAt;
    private LocalDateTime createdDate;

    public static EnterpriseUserDto from(EnterpriseUser entity) {
        if (entity == null)
            return null;
        return EnterpriseUserDto.builder()
                .esntlId(entity.getEsntlId())
                .entrprsmberId(entity.getEntrprsmberId())
                .entrprsSeCode(entity.getEntrprsSeCode())
                .bizrno(entity.getBizrno())
                .jurirno(entity.getJurirno())
                .cmpnyNm(entity.getCmpnyNm())
                .cxfc(entity.getCxfc())
                .zip(entity.getZip())
                .adres(entity.getAdres())
                .areaNo(entity.getAreaNo())
                .entrprsMiddleTelno(entity.getEntrprsMiddleTelno())
                .entrprsEndTelno(entity.getEntrprsEndTelno())
                .fxnum(entity.getFxnum())
                .indutyCode(entity.getIndutyCode())
                .applcntNm(entity.getApplcntNm())
                .applcntEmailAdres(entity.getApplcntEmailAdres())
                .applcntIhidnum(entity.getApplcntIhidnum())
                .sbscrbDe(entity.getSbscrbDe())
                .entrprsMberSttus(entity.getEntrprsMberSttus())
                .groupId(entity.getGroupId())
                .detailAdres(entity.getDetailAdres())
                .lockAt(entity.getLockAt())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
