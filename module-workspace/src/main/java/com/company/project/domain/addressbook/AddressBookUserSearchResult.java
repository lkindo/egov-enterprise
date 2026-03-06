package com.company.project.domain.addressbook;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressBookUserSearchResult {
    private String emplyrId;
    private String nm;
    private String emailAdres;
    private String homeTelno;
    private String moblphonNo;
    private String offmTelno;
    private String fxnum;
}
