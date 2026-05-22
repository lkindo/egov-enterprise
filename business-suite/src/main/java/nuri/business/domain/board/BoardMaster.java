package nuri.business.domain.board;

import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.hibernate.annotations.DynamicUpdate;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_bbs_master")
@SecondaryTable(name = "tb_bbs_master_optn", pkJoinColumns = @PrimaryKeyJoinColumn(name = "bbs_id", referencedColumnName = "bbs_id"))
@SuperBuilder
@DynamicUpdate
public class BoardMaster extends BaseEntity {

    @Id
    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Column(name = "bbs_ttl", nullable = false, length = 100)
    private String bbsTtl;

    @Column(name = "bbs_expln", length = 4000)
    private String bbsExpln;

    @Column(name = "bbs_type_cd", length = 12, nullable = false)
    private String bbsTypeCd;

    @Column(name = "bbs_atrb_cd", length = 12, nullable = false)
    private String bbsAtrbCd;

    @Column(name = "ans_psblty_yn", length = 1)
    @Builder.Default
    private String ansPsbltyYn = "N";

    @Column(name = "file_atch_psblty_yn", length = 1, nullable = false)
    @Builder.Default
    private String fileAtchPsbltyYn = "N";

    @Column(name = "atch_psblty_file_qty", nullable = false)
    @Builder.Default
    private Integer atchPsbltyFileQty = 0;

    @Column(name = "atch_psblty_file_sz")
    private Long atchPsbltyFileSz;

    @Column(name = "use_yn", nullable = false, length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "tmplt_id", length = 20)
    private String tmpltId;

    @Column(name = "blog_id", length = 20)
    private String blogId;

    @Column(name = "blog_yn", length = 1)
    @Builder.Default
    private String blogYn = "N";

    @Column(name = "cmnty_id", length = 20)
    private String cmntyId;

    @Column(table = "tb_bbs_master_optn", name = "ans_yn", length = 1)
    @Builder.Default
    private String ansYn = "N";

    @Column(table = "tb_bbs_master_optn", name = "stsfdg_yn", length = 1)
    @Builder.Default
    private String stsfdgYn = "N";

    // TB_BBS_MASTER_OPTN 테이블의 NOT NULL 제약조건 해결을 위한 매핑 (Auditing 필드 중복 활용용)
    @Column(table = "tb_bbs_master_optn", name = "frst_rgtr_id", length = 20, updatable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("optnFrstRegisterId")
    private String optnFrstRgtrId;

    @Column(table = "tb_bbs_master_optn", name = "crt_dt", updatable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("optnFrstRegistPnttm")
    private LocalDateTime optnCrtDt;

    @Column(table = "tb_bbs_master_optn", name = "last_mdfr_id", length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("optnLastUpdusrId")
    private String optnLastMdfrId;

    @Column(table = "tb_bbs_master_optn", name = "mdfcn_dt")
    @com.fasterxml.jackson.annotation.JsonProperty("optnLastUpdtPnttm")
    private LocalDateTime optnMdfcnDt;

    @PrePersist
    protected void onPrePersist() {
        if (this.optnFrstRgtrId == null) {
            this.optnFrstRgtrId = "webmaster";
        }
        if (this.optnCrtDt == null) {
            this.optnCrtDt = LocalDateTime.now();
        }
        if (this.optnMdfcnDt == null) {
            this.optnMdfcnDt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onPreUpdate() {
        this.optnMdfcnDt = LocalDateTime.now();
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public String getOptnFrstRegisterId() { return this.optnFrstRgtrId; }
    public void setOptnFrstRegisterId(String v) { this.optnFrstRgtrId = v; }

    public LocalDateTime getOptnFrstRegistPnttm() { return this.optnCrtDt; }
    public void setOptnFrstRegistPnttm(LocalDateTime v) { this.optnCrtDt = v; }

    public String getOptnLastUpdusrId() { return this.optnLastMdfrId; }
    public void setOptnLastUpdusrId(String v) { this.optnLastMdfrId = v; }

    public LocalDateTime getOptnLastUpdtPnttm() { return this.optnMdfcnDt; }
    public void setOptnLastUpdtPnttm(LocalDateTime v) { this.optnMdfcnDt = v; }

    public static abstract class BoardMasterBuilder<C extends BoardMaster, B extends BoardMasterBuilder<C, B>> extends BaseEntityBuilder<C, B> {

        public B optnFrstRegisterId(String v) {
            return this.optnFrstRgtrId(v);
        }
        public B optnFrstRegistPnttm(LocalDateTime v) {
            return this.optnCrtDt(v);
        }
        public B optnLastUpdusrId(String v) {
            return this.optnLastMdfrId(v);
        }
        public B optnLastUpdtPnttm(LocalDateTime v) {
            return this.optnMdfcnDt(v);
        }
    }

    public void update(String bbsTtl, String bbsExpln, String ansPsbltyYn, String fileAtchPsbltyYn,
            Integer atchPsbltyFileQty, Long atchPsbltyFileSz, String tmpltId, String useYn,
            String ansYn, String stsfdgYn) {
        this.bbsTtl = bbsTtl;
        this.bbsExpln = bbsExpln;
        this.ansPsbltyYn = ansPsbltyYn;
        this.fileAtchPsbltyYn = fileAtchPsbltyYn;
        this.atchPsbltyFileQty = atchPsbltyFileQty;
        this.atchPsbltyFileSz = atchPsbltyFileSz;
        this.tmpltId = tmpltId;
        this.useYn = useYn;
        this.ansYn = ansYn;
        this.stsfdgYn = stsfdgYn;
    }

    public void updateBbsTtl(String bbsTtl) { this.bbsTtl = bbsTtl; }
    public void updateBbsExpln(String bbsExpln) { this.bbsExpln = bbsExpln; }
    public void updateAnsPsbltyYn(String ansPsbltyYn) { this.ansPsbltyYn = ansPsbltyYn; }
    public void updateFileAtchPsbltyYn(String fileAtchPsbltyYn) { this.fileAtchPsbltyYn = fileAtchPsbltyYn; }
    public void updateAtchPsbltyFileQty(Integer atchPsbltyFileQty) { this.atchPsbltyFileQty = atchPsbltyFileQty; }
    public void updateAtchPsbltyFileSz(Long atchPsbltyFileSz) { this.atchPsbltyFileSz = atchPsbltyFileSz; }
    public void updateTmpltId(String tmpltId) { this.tmpltId = tmpltId; }
    public void updateUseYn(String useYn) { this.useYn = useYn; }
    public void updateAnsYn(String ansYn) { this.ansYn = ansYn; }
    public void updateStsfdgYn(String stsfdgYn) { this.stsfdgYn = stsfdgYn; }

    public void delete() {
        this.useYn = "N";
    }

    // legacy
    public String getBbsNm() { return bbsTtl; }
    public String getBbsTyCode() { return bbsTypeCd; }
    public String getBbsAttrbCode() { return bbsAtrbCd; }
    public String getReplyPosblAt() { return ansPsbltyYn; }
    public String getFileAtchPosblAt() { return fileAtchPsbltyYn; }
    public Integer getAtchPosblFileNumber() { return atchPsbltyFileQty; }
    public String getBbsIntrcn() { return bbsExpln; }
    public String getTmpltId() { return tmpltId; }
    public Long getAtchPosblFileSize() { return atchPsbltyFileSz; }
    public String getCommentAt() { return ansYn; }
    public String getStsfdgAt() { return stsfdgYn; }
    public String getBbsAttrCd() { return bbsAtrbCd; }
    public String getReplyPsblYn() { return ansPsbltyYn; }
}
