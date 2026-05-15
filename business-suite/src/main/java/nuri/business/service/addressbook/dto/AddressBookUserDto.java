package nuri.business.service.addressbook.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressBookUserDto {
    private String adbkUserId;
    private String adbkId;
    private String userId;
    private String nm;
    private String emlAddr;
    private String homeTelno;
    private String mblTelno;
    private String officeTelno;
    private String faxNo;

    // Compatibility getters
    public String getUserId() { return userId; }
    public String getEmlAddr() { return emlAddr; }
    public String getMblTelno() { return mblTelno; }
    public String getOfficeTelno() { return officeTelno; }
    public String getFaxNo() { return faxNo; }
}
