package nuri.foundation.domain.user.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInfSearchResult {
    private String uniqId;
    private String userId;
    private String userNm;
    private String userZip;
    private String userAddr;
    private String emlAddr;
    private String useYn;
    private String trgtId;
}
