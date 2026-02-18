package com.company.project.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사용자 관리 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserManageDto {
    @jakarta.validation.constraints.NotBlank(message = "아이디는 필수 입력 값입니다.")
    @jakarta.validation.constraints.Size(min = 4, max = 20, message = "아이디는 4~20자 사이여야 합니다.")
    private String userId;

    private String esntlId;

    @jakarta.validation.constraints.NotBlank(message = "이름은 필수 입력 값입니다.")
    private String userNm;

    @jakarta.validation.constraints.Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[$@$!%*#?&])[A-Za-z\\d$@$!%*#?&]{8,}$", message = "비밀번호는 8자 이상 영문, 숫자, 특수문자를 포함해야 합니다.")
    private String password;

    @jakarta.validation.constraints.NotBlank(message = "비밀번호 힌트는 필수 입력 값입니다.")
    private String passwordHint;

    @jakarta.validation.constraints.NotBlank(message = "비밀번호 정답은 필수 입력 값입니다.")
    private String passwordCnsr;

    private String emplNo;
    private String sexdstnCode;
    private String brthdy;
    private String areaNo;
    private String homemiddleTelno;
    private String homeendTelno;
    private String moblphonNo;

    @jakarta.validation.constraints.Email(message = "이메일 형식이 올바르지 않습니다.")
    private String emailAdres;

    private String zip;
    private String homeadres;
    private String detailAdres;
    private String ofcpsNm;
    private String groupId;
    private String orgnztId;
    private String insttCode;
    private String emplyrSttusCode;
    private String sbscrbDe;

    // Additional fields for JSP compatibility
    private String offmTelno;
    private String fxnum;
    private String lockAt;
    private String subDn;

    // Manual getters to bypass potential Lombok issues
    public String getUserId() {
        return userId;
    }

    public String getEsntlId() {
        return esntlId;
    }

    public String getUserNm() {
        return userNm;
    }

    public String getPassword() {
        return password;
    }

    public String getPasswordHint() {
        return passwordHint;
    }

    public String getPasswordCnsr() {
        return passwordCnsr;
    }

    public String getEmplNo() {
        return emplNo;
    }

    public String getSexdstnCode() {
        return sexdstnCode;
    }

    public String getBrthdy() {
        return brthdy;
    }

    public String getAreaNo() {
        return areaNo;
    }

    public String getHomemiddleTelno() {
        return homemiddleTelno;
    }

    public String getHomeendTelno() {
        return homeendTelno;
    }

    public String getMoblphonNo() {
        return moblphonNo;
    }

    public String getEmailAdres() {
        return emailAdres;
    }

    public String getZip() {
        return zip;
    }

    public String getHomeadres() {
        return homeadres;
    }

    public String getDetailAdres() {
        return detailAdres;
    }

    public String getOfcpsNm() {
        return ofcpsNm;
    }

    public String getGroupId() {
        return groupId;
    }

    public String getOrgnztId() {
        return orgnztId;
    }

    public String getInsttCode() {
        return insttCode;
    }

    public String getEmplyrSttusCode() {
        return emplyrSttusCode;
    }

    public String getSbscrbDe() {
        return sbscrbDe;
    }

    public String getOffmTelno() {
        return offmTelno;
    }

    public String getFxnum() {
        return fxnum;
    }

    public String getLockAt() {
        return lockAt;
    }

    public String getSubDn() {
        return subDn;
    }

    // Compatibility getters for legacy JSP form:input path
    public String getEmplyrId() {
        return userId;
    }

    public void setEmplyrId(String emplyrId) {
        this.userId = emplyrId;
    }

    public String getEmplyrNm() {
        return userNm;
    }

    public void setEmplyrNm(String emplyrNm) {
        this.userNm = emplyrNm;
    }

    public String getBrth() {
        return brthdy;
    }

    public void setBrth(String brth) {
        this.brthdy = brth;
    }

    public String getUserTy() {
        return "USR";
    }

    public String getUniqId() {
        return esntlId;
    }

    public void setUniqId(String uniqId) {
        this.esntlId = uniqId;
    }

    public String getSttus() {
        return emplyrSttusCode;
    }

    public String getMiddleTelno() {
        return homemiddleTelno;
    }

    public String getEndTelno() {
        return homeendTelno;
    }
}
