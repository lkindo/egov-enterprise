package com.company.project.service.adb.dto;

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
}
