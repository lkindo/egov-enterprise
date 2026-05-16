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
    private String tmplatId;
    private String tmplatNm;
    private String tmplatCours;
    private String fileAtchPsblYn;
    private Integer atchPsblFileCnt;
    private Long atchPsblFileSize;
    private String ansPsblYn;
    private String frstRegisterId;
    private String frstRegisterNm;
    private String useYn;
    private LocalDateTime createdDate;
    private String authFlag;

    // legacy
    public String getBbsNm() { return bbsTtl; }
    public String getBbsTyCode() { return bbsTypeCd; }
    public String getBbsAttrbCode() { return bbsAtrbCd; }
    public String getBbsAttrCd() { return bbsAtrbCd; }
    public String getReplyPosblAt() { return ansPsblYn; }
    public String getReplyPsblYn() { return ansPsblYn; }
    public String getFileAtchPosblAt() { return fileAtchPsblYn; }
    public Integer getAtchPosblFileNumber() { return atchPsblFileCnt; }
    public String getBbsIntrcn() { return bbsExpln; }
    public String getBbsIntroCn() { return bbsExpln; }
    public String getTmpltId() { return tmplatId; }
    public Long getAtchPosblFileSize() { return atchPsblFileSize; }
    public String getUseAt() { return useYn; }
}
