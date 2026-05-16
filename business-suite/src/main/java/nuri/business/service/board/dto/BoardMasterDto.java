package nuri.business.service.board.dto;

import nuri.business.domain.board.BoardMaster;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardMasterDto {

    private String bbsId;
    private String bbsTtl;
    private String bbsExpln;
    private String bbsTypeCd;
    private String bbsAtrbCd;
    private String ansPsblYn;
    private String fileAtchPsblYn;
    private Integer atchPsblFileCnt;
    private Long atchPsblFileSize;
    private String tmplatId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;
    private String useYn;
    private String cmntyId;
    private String blogId;
    private String blogYn;
    private String commentYn;
    private String stsfdgYn;

    // Additional fields for completeness
    private String authFlag;
    private String tmplatCours;

    // Compatibility getters for UI
    public String getBbsNm() { return bbsTtl; }
    public void setBbsNm(String v) { this.bbsTtl = v; }
    public String getBbsTyCode() { return bbsTypeCd; }
    public void setBbsTyCode(String v) { this.bbsTypeCd = v; }
    public String getBbsAttrbCode() { return bbsAtrbCd; }
    public void setBbsAttrbCode(String v) { this.bbsAtrbCd = v; }
    public String getBbsAttrCd() { return bbsAtrbCd; }
    public void setBbsAttrCd(String v) { this.bbsAtrbCd = v; }
    public String getBbsIntrcn() { return bbsExpln; }
    public void setBbsIntrcn(String v) { this.bbsExpln = v; }
    public String getBbsIntroCn() { return bbsExpln; }
    public void setBbsIntroCn(String bbsIntroCn) { this.bbsExpln = bbsIntroCn; }
    public String getReplyPosblAt() { return ansPsblYn; }
    public void setReplyPosblAt(String v) { this.ansPsblYn = v; }
    public String getReplyPsblYn() { return ansPsblYn; }
    public void setReplyPsblYn(String v) { this.ansPsblYn = v; }
    public String getFileAtchPosblAt() { return fileAtchPsblYn; }
    public void setFileAtchPosblAt(String v) { this.fileAtchPsblYn = v; }
    public String getUseAt() { return useYn; }
    public void setUseAt(String v) { this.useYn = v; }
    public String getTmpltId() { return tmplatId; }
    public void setTmpltId(String v) { this.tmplatId = v; }

    public static BoardMasterDto from(BoardMaster entity) {
        if (entity == null)
            return null;
        return BoardMasterDto.builder()
                .bbsId(entity.getBbsId())
                .bbsTtl(entity.getBbsTtl())
                .bbsExpln(entity.getBbsExpln())
                .bbsTypeCd(entity.getBbsTypeCd())
                .bbsAtrbCd(entity.getBbsAtrbCd())
                .ansPsblYn(entity.getAnsPsblYn())
                .fileAtchPsblYn(entity.getFileAtchPsblYn())
                .atchPsblFileCnt(entity.getAtchPsblFileCnt())
                .atchPsblFileSize(entity.getAtchPsblFileSize())
                .tmplatId(entity.getTmplatId())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .useYn(entity.getUseYn())
                .cmntyId(entity.getCmntyId())
                .blogId(entity.getBlogId())
                .blogYn(entity.getBlogYn())
                .commentYn(entity.getCommentYn())
                .stsfdgYn(entity.getStsfdgYn())
                .build();
    }
}
