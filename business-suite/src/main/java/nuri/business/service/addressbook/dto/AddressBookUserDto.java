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
    private String userNm;
    private String emlAddr;
    private String homeTelno;
    private String mblTelno;
    private String officeTelno;
    private String faxNo;

    // ----- [Legacy Aliases] -----
    public String getNm() { return userNm; }
    public void setNm(String v) { this.userNm = v; }
    
    // Existing manual getters for backward compatibility (can be removed if @Getter is enough, 
    // but kept here for explicit mapping if needed by some frameworks)
    public String getEmlAddr() { return emlAddr; }
    public String getMblTelno() { return mblTelno; }
    public String getOfficeTelno() { return officeTelno; }
    public String getFaxNo() { return faxNo; }
}
