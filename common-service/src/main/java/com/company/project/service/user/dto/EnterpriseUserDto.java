package com.company.project.service.user.dto;

import com.company.project.domain.user.entity.EnterpriseUser;
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
@Schema(description = "기업 ?�원 ?�보 DTO")
public class EnterpriseUserDto {

    @Schema(description = "고유 ID")
    private String esntlId;

    @Schema(description = "기업 ?�원 ID")
    private String entrprsmberId;

    @Schema(description = "기업 구분 코드")
    private String entrprsSeCode;

    @Schema(description = "?�업?�등록번??)
    private String bizrno;

    @Schema(description = "법인?�록번호")
    private String jurirno;

    @Schema(description = "?�사 �?)
    private String cmpnyNm;

    @Schema(description = "?�?�자 �?)
    private String cxfc;

    @Schema(description = "?�편번호")
    private String zip;

    @Schema(description = "주소")
    private String adres;

    @Schema(description = "?�세 주소")
    private String detailAdres;

    @Schema(description = "지??번호")
    private String areaNo;

    @Schema(description = "중간 ?�화번호")
    private String entrprsMiddleTelno;

    @Schema(description = "???�화번호")
    private String entrprsEndTelno;

    @Schema(description = "?�스 번호")
    private String fxnum;

    @Schema(description = "?�종 코드")
    private String indutyCode;

    @Schema(description = "?�청??�?)
    private String applcntNm;

    @Schema(description = "?�청???�메??)
    private String applcntEmailAdres;

    @Schema(description = "?�청??주�?번호")
    private String applcntIhidnum;

    @Schema(description = "기업 ?�원 ?�태")
    private String entrprsMberSttus;

    @Schema(description = "비�?번호")
    private String entrprsMberPassword;

    @Schema(description = "비�?번호 ?�트")
    private String entrprsMberPasswordHint;

    @Schema(description = "비�?번호 ?�답")
    private String entrprsMberPasswordCnsr;

    @Schema(description = "그룹 ID")
    private String groupId;

    @Schema(description = "가???�자")
    private LocalDateTime sbscrbDe;

    @Schema(description = "?�금 ?��?")
    private String lockAt;

    @Schema(description = "?�록?�시")
    private LocalDateTime createdDate;

    public static EnterpriseUserDto from(EnterpriseUser entity) {
        if (entity == null) return null;
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
                .detailAdres(entity.getDetailAdres())
                .areaNo(entity.getAreaNo())
                .entrprsMiddleTelno(entity.getEntrprsMiddleTelno())
                .entrprsEndTelno(entity.getEntrprsEndTelno())
                .fxnum(entity.getFxnum())
                .indutyCode(entity.getIndutyCode())
                .applcntNm(entity.getApplcntNm())
                .applcntEmailAdres(entity.getApplcntEmailAdres())
                .applcntIhidnum(entity.getApplcntIhidnum())
                .entrprsMberSttus(entity.getEntrprsMberSttus())
                .entrprsMberPasswordHint(entity.getEntrprsMberPasswordHint())
                .entrprsMberPasswordCnsr(entity.getEntrprsMberPasswordCnsr())
                .groupId(entity.getGroupId())
                .sbscrbDe(entity.getSbscrbDe())
                .lockAt(entity.getLockAt())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
