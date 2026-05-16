package nuri.foundation.domain.login;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginPolicySearchResult {
    private String userId; // User ID
    private String userNm; // User Name
    private String userSe; // User Se
    private String ipAddr;
    private String dpcnPrmYn;
    private String lmtYn;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
    private String regYn; // Y or N

    // Compatibility getters
    public String getEmplyrId() { return userId; }
    public String getIpInfo() { return ipAddr; }
    public String getDplctPermAt() { return dpcnPrmYn; }
    public String getLmttAt() { return lmtYn; }
}
