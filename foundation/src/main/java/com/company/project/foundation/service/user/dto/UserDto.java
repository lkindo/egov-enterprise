package com.company.project.foundation.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.lang.NonNull;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * ??????뺣낫 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    @NonNull
    private String userId;
    @NonNull
    private String userNm;
    private String esntlId;
    private String password;
    private String passwordHint;
    private String passwordCnsr;
    private String role;
    private String emplNo;
    private String sexdstnCode;
    private String brth;
    private String areaNo;
    private String homemiddleTelno;
    private String homeendTelno;
    private String mberTyCode;
    private String fxnum;
    private String insttCode;
    private String orgnztId;
    private String groupId;
    private String homeadres;
    private String detailAdres;
    private String zip;
    private String offmTelno;
    private String moblphonNo;
    private String emailAdres;
    private String ofcpsNm;
    private String subDn;
    private String userSe;
    private LocalDateTime createdDate;

    // 레거시 테스트 호환용 생성자
    public UserDto(String userId, String userNm, String esntlId, String role, String emplNo, String ofcpsNm, LocalDateTime createdDate) {
        this.userId = userId;
        this.userNm = userNm;
        this.esntlId = esntlId;
        this.role = role;
        this.emplNo = emplNo;
        this.ofcpsNm = ofcpsNm;
        this.createdDate = createdDate;
    }

    public static UserDto from(com.company.project.foundation.domain.user.entity.User user) {
        if (user == null)
            return null;
        return UserDto.builder()
                .userId(Objects.requireNonNull(user.getUserId()))
                .userNm(Objects.requireNonNull(user.getUserNm()))
                .esntlId(user.getEsntlId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .emplNo(user.getEmplNo())
                .sexdstnCode(user.getSexdstnCode())
                .brth(user.getBrth())
                .areaNo(user.getAreaNo())
                .homemiddleTelno(user.getHomemiddleTelno())
                .homeendTelno(user.getHomeendTelno())
                .fxnum(user.getFxnum())
                .insttCode(user.getInsttCode())
                .orgnztId(user.getOrgnztId())
                .groupId(user.getGroupId())
                .homeadres(user.getHomeadres())
                .detailAdres(user.getDetailAdres())
                .zip(user.getZip())
                .offmTelno(user.getOffmTelno())
                .moblphonNo(user.getMoblphonNo())
                .emailAdres(user.getEmailAdres())
                .ofcpsNm(user.getOfcpsNm())
                .subDn(user.getSubDn())
                .createdDate(user.getCreatedDate())
                .build();
    }
}
