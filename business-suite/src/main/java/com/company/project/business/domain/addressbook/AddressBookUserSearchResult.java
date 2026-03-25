package com.company.project.business.domain.addressbook;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;

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
