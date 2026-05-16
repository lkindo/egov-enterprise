package nuri.business.domain.board;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardMasterSearchResult {
    private String bbsId;
    private String bbsTypeCd;
    private String bbsTypeCdNm;
    private String bbsAtrbCd;
    private String bbsAtrbCdNm;
    private String bbsTtl;
    private String bbsExpln;
    private String tmplatId;
    private String useYn;
    private LocalDateTime createdDate;

    // Compatibility getters
    public String getTmpltId() { return tmplatId; }
    public String getBbsIntroCn() { return bbsExpln; }
    public String getBbsNm() { return bbsTtl; }
    public String getBbsTyCode() { return bbsTypeCd; }
    public String getBbsTyCodeNm() { return bbsTypeCdNm; }
    public String getBbsAttrbCode() { return bbsAtrbCd; }
    public String getBbsAttrbCodeNm() { return bbsAtrbCdNm; }
    public String getBbsAttrCd() { return bbsAtrbCd; }
    public String getBbsAttrCdNm() { return bbsAtrbCdNm; }
    public String getUseAt() { return useYn; }
}
