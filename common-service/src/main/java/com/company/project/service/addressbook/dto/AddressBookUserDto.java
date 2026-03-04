package com.company.project.service.addressbook.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressBookUserDto {
    private String adbkUserId;
    private String adbkId;
    private String emplyrId;
    private String ncrdId;
    private String nm;
    private String emailAdres;
    private String homeTelno;
    private String moblphonNo;
    private String offmTelno;
    private String fxnum;

    // Manual getters to test
    public String getAdbkUserId() {
        return adbkUserId;
    }

    public String getAdbkId() {
        return adbkId;
    }

    public String getEmplyrId() {
        return emplyrId;
    }

    public String getNcrdId() {
        return ncrdId;
    }

    public String getNm() {
        return nm;
    }

    public String getEmailAdres() {
        return emailAdres;
    }

    public String getHomeTelno() {
        return homeTelno;
    }

    public String getMoblphonNo() {
        return moblphonNo;
    }

    public String getOffmTelno() {
        return offmTelno;
    }

    public String getFxnum() {
        return fxnum;
    }
}