package nuri.business.service.addressbook.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressBookUserDto {
    @JsonProperty("adbkUserId")
    private String adbkConstntId;

    private String adbkId;
    private String userId;

    @JsonProperty("userNm")
    private String nm;

    private String emlAddr;
    private String homeTelno;
    private String mblTelno;

    @JsonProperty("officeTelno")
    private String ofcTelno;

    private String faxNo;

    // ----- [Legacy Aliases for Internal Java Parity] -----
    @JsonIgnore
    public String getAdbkUserId() {
        return adbkConstntId;
    }

    @JsonIgnore
    public void setAdbkUserId(String adbkUserId) {
        this.adbkConstntId = adbkUserId;
    }

    @JsonIgnore
    public String getUserNm() {
        return nm;
    }

    @JsonIgnore
    public void setUserNm(String userNm) {
        this.nm = userNm;
    }

    @JsonIgnore
    public String getOfficeTelno() {
        return ofcTelno;
    }

    @JsonIgnore
    public void setOfficeTelno(String officeTelno) {
        this.ofcTelno = officeTelno;
    }

    // Existing manual getters for backward compatibility
    public String getEmlAddr() { return emlAddr; }
    public String getMblTelno() { return mblTelno; }
    public String getFaxNo() { return faxNo; }
}
