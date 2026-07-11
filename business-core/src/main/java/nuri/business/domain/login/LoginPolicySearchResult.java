package nuri.business.domain.login;

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
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;
    private String regYn; // Y or N
}
