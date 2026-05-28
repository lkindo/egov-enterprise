package nuri.business.service.board.dto;

import jakarta.validation.constraints.*;

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

    @Size(max = 20)
    private String bbsId;
    @Size(max = 100)
    @NotBlank
    private String bbsTtl;
    @Size(max = 4000)
    private String bbsExpln;
    @Size(max = 12)
    @NotBlank
    private String bbsTypeCd;
    @Size(max = 12)
    @NotBlank
    private String bbsAtrbCd;
    @com.fasterxml.jackson.annotation.JsonProperty("ansPsblYn")
    private String ansPsbltyYn;

    @com.fasterxml.jackson.annotation.JsonProperty("fileAtchPsblYn")
    private String fileAtchPsbltyYn;

    @com.fasterxml.jackson.annotation.JsonProperty("atchPsblFileCnt")
    private Integer atchPsbltyFileQty;

    @com.fasterxml.jackson.annotation.JsonProperty("atchPsblFileSize")
    @NotNull
    private Long atchPsbltyFileSz;

    @com.fasterxml.jackson.annotation.JsonProperty("tmplatId")
    @Size(max = 20)
    private String tmpltId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    @Size(max = 20)
    private String cmntyId;
    @Size(max = 20)
    private String blogId;
    @Size(max = 1)
    private String blogYn;
    @com.fasterxml.jackson.annotation.JsonProperty("commentYn")
    private String ansYn;
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
    public String getReplyPosblAt() { return ansPsbltyYn; }
    public void setReplyPosblAt(String v) { this.ansPsbltyYn = v; }
    public String getReplyPsblYn() { return ansPsbltyYn; }
    public void setReplyPsblYn(String v) { this.ansPsbltyYn = v; }
    public String getFileAtchPosblAt() { return fileAtchPsbltyYn; }
    public void setFileAtchPosblAt(String v) { this.fileAtchPsbltyYn = v; }
    public String getUseAt() { return useYn; }
    public void setUseAt(String v) { this.useYn = v; }
    public String getTmpltId() { return tmpltId; }
    public void setTmpltId(String v) { this.tmpltId = v; }

    public static BoardMasterDto from(BoardMaster entity) {
        if (entity == null)
            return null;
        return BoardMasterDto.builder()
                .bbsId(entity.getBbsId())
                .bbsTtl(entity.getBbsTtl())
                .bbsExpln(entity.getBbsExpln())
                .bbsTypeCd(entity.getBbsTypeCd())
                .bbsAtrbCd(entity.getBbsAtrbCd())
                .ansPsbltyYn(entity.getAnsPsbltyYn())
                .fileAtchPsbltyYn(entity.getFileAtchPsbltyYn())
                .atchPsbltyFileQty(entity.getAtchPsbltyFileQty())
                .atchPsbltyFileSz(entity.getAtchPsbltyFileSz())
                .tmpltId(entity.getTmpltId())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .useYn(entity.getUseYn())
                .cmntyId(entity.getCmntyId())
                .blogId(entity.getBlogId())
                .blogYn(entity.getBlogYn())
                .ansYn(entity.getAnsYn())
                .stsfdgYn(entity.getStsfdgYn())
                .build();
    }
}
