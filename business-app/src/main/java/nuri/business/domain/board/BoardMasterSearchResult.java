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
    private String bbsAtrbCd;
    private String bbsAtrbCdNm;
    private String bbsTtl;
    private String bbsExpln;
    private String tmpltId;
    private String useYn;
    private LocalDateTime crtDt;
    /** 귀속 커뮤니티 일련번호(없으면 null). [2026-10-26 ADR-0043 결정 3] 이름·이용 가능 여부는 커뮤니티 포트가 따로 알려 준다. */
    private Long cmntySn;

}
