package nuri.business.domain.addressbook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.Builder;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class AddressBookUserSearchResult {
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
