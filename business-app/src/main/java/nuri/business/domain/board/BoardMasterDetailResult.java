package nuri.business.domain.board;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BoardMasterDetailResult {
    private String bbsId;
    private String bbsTypeCd;
    private String bbsTypeCdNm;
    private String bbsExpln;
    private String bbsAtrbCd;
    private String bbsAtrbCdNm;
    private String bbsTtl;
    private String tmpltId;
    private String fileAtchPsbltyYn;
    private Integer atchPsbltyFileQty;
    private Long atchPsbltyFileSz;
    private String ansPsbltyYn;
    private String frstRgtrId;
    private String frstRegisterNm;
    private String useYn;
    private LocalDateTime crtDt;
    private String authFlag;

}
