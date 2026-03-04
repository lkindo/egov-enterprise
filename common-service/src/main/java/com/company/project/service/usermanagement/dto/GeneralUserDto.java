package com.company.project.service.usermanagement.dto;

import com.company.project.domain.user.entity.GeneralUser;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class GeneralUserDto {

    @Schema(description = "Description")
    private String esntlId;

    @Schema(description = "Description")
    private String mberId;

    @Schema(description = "Description")
    private String mberNm;

    @Schema(description = "Description")
    private String password;

    @Schema(description = "Description")
    private String passwordHint;

    @Schema(description = "Description")
    private String passwordCnsr;

    @Schema(description = "Description")
    private String ihidnum;

    @Schema(description = "Description")
    private String sexdstnCode;

    @Schema(description = "Description")
    private String zip;

    @Schema(description = "Description")
    private String adres;

    @Schema(description = "Description")
    private String detailAdres;

    @Schema(description = "Description")
    private String areaNo;

    @Schema(description = "Description")
    private String middleTelno;

    @Schema(description = "Description")
    private String endTelno;

    @Schema(description = "Description")
    private String moblphonNo;

    @Schema(description = "Description")
    private String mberEmailAdres;

    @Schema(description = "Description")
    private String mberSttus;

    @Schema(description = "Description")
    private String groupId;

    @Schema(description = "Description")
    private String mberFxnum;

    @Schema(description = "Description")
    private LocalDateTime sbscrbDe;

    @Schema(description = "Description")
    private String lockAt;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static GeneralUserDto from(GeneralUser entity) {
        if (entity == null)
            return null;
        return GeneralUserDto.builder()
                .esntlId(entity.getEsntlId())
                .mberId(entity.getMberId())
                .mberNm(entity.getMberNm())
                .passwordHint(entity.getPasswordHint())
                .passwordCnsr(entity.getPasswordCnsr())
                .ihidnum(entity.getIhidnum())
                .sexdstnCode(entity.getSexdstnCode())
                .zip(entity.getZip())
                .adres(entity.getAdres())
                .detailAdres(entity.getDetailAdres())
                .areaNo(entity.getAreaNo())
                .middleTelno(entity.getMiddleTelno())
                .endTelno(entity.getEndTelno())
                .moblphonNo(entity.getMoblphonNo())
                .mberEmailAdres(entity.getMberEmailAdres())
                .mberSttus(entity.getMberSttus())
                .groupId(entity.getGroupId())
                .mberFxnum(entity.getMberFxnum())
                .sbscrbDe(entity.getSbscrbDe())
                .lockAt(entity.getLockAt())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}