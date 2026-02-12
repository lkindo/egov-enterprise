package com.company.project.service.user.dto;

import com.company.project.domain.user.EnterpriseUser;
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
@Schema(description = "기업 회원 정보 DTO")
public class EnterpriseUserDto {

    @Schema(description = "고유 ID")
    private String esntlId;

    @Schema(description = "기업 회원 ID")
    private String entrprsmberId;

    @Schema(description = "기업 구분 코드")
    private String entrprsSeCode;

    @Schema(description = "사업자등록번호")
    private String bizrno;

    @Schema(description = "법인등록번호")
    private String jurirno;

    @Schema(description = "회사 명")
    private String cmpnyNm;

    @Schema(description = "대표자 명")
    private String cxfc;

    @Schema(description = "우편번호")
    private String zip;

    @Schema(description = "주소")
    private String adres;

    @Schema(description = "상세 주소")
    private String detailAdres;

    @Schema(description = "지역 번호")
    private String areaNo;

    @Schema(description = "중간 전화번호")
    private String entrprsMiddleTelno;

    @Schema(description = "끝 전화번호")
    private String entrprsEndTelno;

    @Schema(description = "팩스 번호")
    private String fxnum;

    @Schema(description = "업종 코드")
    private String indutyCode;

    @Schema(description = "신청인 명")
    private String applcntNm;

    @Schema(description = "신청인 이메일")
    private String applcntEmailAdres;

    @Schema(description = "신청인 주민번호")
    private String applcntIhidnum;

    @Schema(description = "기업 회원 상태")
    private String entrprsMberSttus;

    @Schema(description = "비밀번호")
    private String entrprsMberPassword;

    @Schema(description = "비밀번호 힌트")
    private String entrprsMberPasswordHint;

    @Schema(description = "비밀번호 정답")
    private String entrprsMberPasswordCnsr;

    @Schema(description = "그룹 ID")
    private String groupId;

    @Schema(description = "가입 일자")
    private LocalDateTime sbscrbDe;

    @Schema(description = "잠금 여부")
    private String lockAt;

    @Schema(description = "등록일시")
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
