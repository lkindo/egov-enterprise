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
    private String bbsAttrCd;
    private String bbsAttrCdNm;
    private String bbsTtl;
    private String tmplatId;
    private String useYn;
    private LocalDateTime createdDate;
}
