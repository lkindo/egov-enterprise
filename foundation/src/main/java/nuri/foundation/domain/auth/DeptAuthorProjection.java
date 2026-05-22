package nuri.foundation.domain.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptAuthorProjection {
    private String deptCode;
    private String deptNm;
    private String userId;
    private String userNm;

    private String authrtId;

    @JsonProperty("authorCode")
    public String getAuthorCode() {
        return authrtId;
    }

    private String scrtyDcsnTrgtId;

    @JsonProperty("uniqId")
    public String getUniqId() {
        return scrtyDcsnTrgtId;
    }
    
    private String regYn;
}
