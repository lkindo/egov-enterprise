package nuri.business.domain.board;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BoardMasterDetailResult {
    private String bbsId;
    private String bbsTypeCd;
    private String bbsTypeCdNm;
    private String bbsIntroCn;
    private String bbsAttrCd;
    private String bbsAttrCdNm;
    private String bbsTtl;
    private String tmplatId;
    private String tmplatNm;
    private String tmplatCours;
    private String fileAtchPsblYn;
    private Integer atchPsblFileCnt;
    private Long atchPsblFileSize;
    private String replyPsblYn;
    private String frstRegisterId;
    private String frstRegisterNm;
    private String useYn;
    private LocalDateTime createdDate;
    private String authFlag;

    // legacy
    public String getBbsNm() { return bbsTtl; }
    public String getBbsTyCode() { return bbsTypeCd; }
    public String getBbsAttrbCode() { return bbsAttrCd; }
    public String getReplyPosblAt() { return replyPsblYn; }
    public String getFileAtchPosblAt() { return fileAtchPsblYn; }
    public Integer getAtchPosblFileNumber() { return atchPsblFileCnt; }
    public String getBbsIntrcn() { return bbsIntroCn; }
    public String getTmpltId() { return tmplatId; }
    public Long getAtchPosblFileSize() { return atchPsblFileSize; }
    public String getUseAt() { return useYn; }
}
