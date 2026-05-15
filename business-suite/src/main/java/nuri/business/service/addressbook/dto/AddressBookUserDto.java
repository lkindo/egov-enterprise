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
    public String getEmplyrId() { return userId; }
    public String getEmailAdres() { return emlAddr; }
    public String getMoblphonNo() { return mblTelno; }
    public String getOffmTelno() { return officeTelno; }
    public String getFxnum() { return faxNo; }
}
