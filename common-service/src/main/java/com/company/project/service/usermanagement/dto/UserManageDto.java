package com.company.project.service.usermanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserManageDto {
    private String userId;
    private String esntlId;
    private String userNm;
    private String password;
    private String passwordHint;
    private String passwordCnsr;
    private String emplNo;
    private String sexdstnCode;
    private String brthdy;
    private String areaNo;
    private String homemiddleTelno;
    private String homeendTelno;
    private String moblphonNo;
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
    private String offmTelno;
    private String fxnum;
    private String lockAt;
    private String subDn;

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

    public String getUniqId() {
        return esntlId;
    }

    public void setUniqId(String uniqId) {
        this.esntlId = uniqId;
    }
}
