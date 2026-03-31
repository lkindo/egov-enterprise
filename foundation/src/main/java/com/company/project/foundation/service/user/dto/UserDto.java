package com.company.project.foundation.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.lang.NonNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 사용자 관리 DTO
 * - XSS 방지를 위한 입력 검증 포함
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    @NonNull
    @NotBlank(message = "사용자 ID 는 필수입니다")
    @Size(min = 4, max = 20, message = "사용자 ID 는 4-20 자입니다")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "사용자 ID 는 영문, 숫자, 밑줄만 가능합니다")
    private String userId;

    @NonNull
    @NotBlank(message = "사용자명은 필수입니다")
    @Size(min = 2, max = 50, message = "사용자명은 2-50 자입니다")
    private String userNm;

    private String esntlId;

    @NotBlank(message = "비밀번호는 필수입니다")
    @Size(min = 8, max = 100, message = "비밀번호는 8-100 자입니다")
    private String password;

    private String passwordHint;
    private String passwordCnsr;
    private String role;

    @Size(max = 20, message = "사번은 최대 20 자입니다")
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

    @Size(max = 100, message = "주소는 최대 100 자입니다")
    private String homeadres;

    @Size(max = 100, message = "상세주소는 최대 100 자입니다")
    private String detailAdres;

    private String zip;
    private String offmTelno;

    @Size(max = 20, message = "휴대폰 번호는 최대 20 자입니다")
    private String moblphonNo;

    @Size(max = 100, message = "이메일은 최대 100 자입니다")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "이메일 형식이 올바르지 않습니다")
    private String emailAdres;

    @Size(max = 60, message = "직함은 최대 60 자입니다")
    private String ofcpsNm;
    private String subDn;
    private String userSe;
    private LocalDateTime createdDate;

    // 레거시 테스트 호환용 생성자
    public UserDto(String userId, String userNm, String esntlId, String role, String emplNo, String ofcpsNm,
            LocalDateTime createdDate) {
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
