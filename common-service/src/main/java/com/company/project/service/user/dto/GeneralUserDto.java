package com.company.project.service.user.dto;

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
@Schema(description = "?�반 ?�원 ?�보 DTO")
public class GeneralUserDto {

    @Schema(description = "고유 ID")
    private String esntlId;

    @Schema(description = "?�원 ID")
    private String mberId;

    @Schema(description = "?�원 �?)
    private String mberNm;

    @Schema(description = "비�?번호")
    private String password;

    @Schema(description = "비�?번호 ?�트")
    private String passwordHint;

    @Schema(description = "비�?번호 ?�답")
    private String passwordCnsr;

    @Schema(description = "주�??�록번호")
    private String ihidnum;

    @Schema(description = "?�별 코드")
    private String sexdstnCode;

    @Schema(description = "?�편번호")
    private String zip;

    @Schema(description = "주소")
    private String adres;

    @Schema(description = "?�세 주소")
    private String detailAdres;

    @Schema(description = "지??번호")
    private String areaNo;

    @Schema(description = "중간 ?�화번호")
    private String middleTelno;

    @Schema(description = "???�화번호")
    private String endTelno;

    @Schema(description = "?��???번호")
    private String moblphonNo;

    @Schema(description = "?�메??주소")
    private String mberEmailAdres;

    @Schema(description = "?�원 ?�태")
    private String mberSttus;

    @Schema(description = "그룹 ID")
    private String groupId;

    @Schema(description = "?�스 번호")
    private String mberFxnum;

    @Schema(description = "가???�자")
    private LocalDateTime sbscrbDe;

    @Schema(description = "?�금 ?��?")
    private String lockAt;

    @Schema(description = "?�록?�시")
    private LocalDateTime createdDate;

    public static GeneralUserDto from(GeneralUser entity) {
        if (entity == null) return null;
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
